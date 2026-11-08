// FarmacIA — Edge Function "farmacia-ia" (Supabase, Deno).
// A chave de IA fica SÓ aqui (secrets). O navegador manda a pergunta + trechos do material local e recebe { texto, modelo, cache }.
// Ordem: Cerebras (principal) -> Groq (reserva). Cada provedor tem um orçamento diário de tokens.
// Acabou o orçamento (ou o provedor avisou que a cota do dia acabou) -> 429 { erro: "cota_diaria" } e o navegador volta ao material local.
//
// Deploy:  supabase functions deploy farmacia-ia --no-verify-jwt
// Secrets: supabase secrets set CEREBRAS_API_KEY=... GROQ_API_KEY=...
//   opcionais: CEREBRAS_MODEL, GROQ_MODEL, CEREBRAS_DAILY_TOKENS, GROQ_DAILY_TOKENS, MAX_PEDIDOS_CID_DIA, ORIGENS_PERMITIDAS
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

type Provedor = { id: string; url: string; chave: string; modelo: string; orcamento: number };
const PROVEDORES: Provedor[] = [
  { id: "cerebras", url: "https://api.cerebras.ai/v1/chat/completions", chave: env("CEREBRAS_API_KEY"), modelo: env("CEREBRAS_MODEL", "llama-3.3-70b"), orcamento: Number(env("CEREBRAS_DAILY_TOKENS", "900000")) },
  { id: "groq", url: "https://api.groq.com/openai/v1/chat/completions", chave: env("GROQ_API_KEY"), modelo: env("GROQ_MODEL", "llama-3.3-70b-versatile"), orcamento: Number(env("GROQ_DAILY_TOKENS", "90000")) },
].filter((p) => p.chave);

const MAX_CID_DIA = Number(env("MAX_PEDIDOS_CID_DIA", "40"));
const ORIGENS = env("ORIGENS_PERMITIDAS", "*").split(",").map((s) => s.trim());
const TIMEOUT_PROVEDOR_MS = 11000;

// ---------- utilidades ----------
const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
function msAteAmanha(): number {
  const agora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const fim = new Date(agora); fim.setHours(24, 0, 5, 0);
  return Math.max(60_000, fim.getTime() - agora.getTime());
}
function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  const ok = ORIGENS.includes("*") || ORIGENS.includes(o);
  return {
    "Access-Control-Allow-Origin": ok ? (ORIGENS.includes("*") ? "*" : o) : ORIGENS[0],
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  };
}
function json(req: Request, corpo: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store", ...extra } });
}
const cortar = (v: unknown, n: number) => String(v ?? "").slice(0, n);

// ---------- limite por minuto (em memória; vale por instância, é só um freio) ----------
const janela = new Map<string, number[]>();
function passouDoRitmo(cid: string): boolean {
  const agora = Date.now(), lista = (janela.get(cid) ?? []).filter((t) => agora - t < 60_000);
  lista.push(agora); janela.set(cid, lista);
  if (janela.size > 5000) janela.clear();
  return lista.length > 6; // até 6 por minuto por usuário
}

// ---------- cache de respostas iguais (em memória, 6 h) ----------
const cache = new Map<string, { texto: string; modelo: string; ate: number }>();
async function hash(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// ---------- provedores esgotados no dia ----------
const esgotados = new Map<string, string>(); // provedor -> dia (AAAA-MM-DD)
async function estaEsgotado(p: Provedor, dia: string): Promise<boolean> {
  if (esgotados.get(p.id) === dia) return true;
  const { data } = await db.from("farmacia_ia_cota").select("tokens, esgotada").eq("dia", dia).eq("provedor", p.id).maybeSingle();
  if (data && (data.esgotada || Number(data.tokens) >= p.orcamento)) { esgotados.set(p.id, dia); return true; }
  return false;
}
async function marcarEsgotado(p: Provedor, dia: string) {
  esgotados.set(p.id, dia);
  await db.from("farmacia_ia_cota").upsert({ dia, provedor: p.id, esgotada: true }, { onConflict: "dia,provedor" });
}

// ---------- instruções ao modelo ----------
const SISTEMA = `Você é a FarmacIA, assistente de estudos do curso de Farmácia da UFRJ, dentro do Planejador Acadêmico.
Responda SEMPRE em português do Brasil, de forma clara, correta e curta (uma resposta curta continua curta).
Escopo: conteúdo de Farmácia (farmacologia, farmacotécnica, química farmacêutica, bioquímica, fisiologia, etc.) e vida acadêmica da graduação. Se a pergunta estiver fora disso, responda exatamente: FORA_DO_ESCOPO
Regras:
- Use os trechos numerados do material fornecido como base e cite-os com [1], [2]... só quando de fato usar. Se eles não bastarem, diga o que é conhecimento geral e não invente fonte, número, dose ou dado.
- Não dê orientação clínica individual, diagnóstico nem dose para uma pessoa; para isso, indique um profissional de saúde.
- Nunca invente dados de disciplina, professor, prazo ou regra da UFRJ; use só o que vier em "disciplina".
- Formatação: Markdown simples (títulos curtos, listas, **negrito**, tabelas pequenas). Quando ajudar de verdade, pode usar estes blocos em cercas de código:
  \`\`\`definicao ... \`\`\` (também conceito, atencao, alerta, observacao, dica, exemplo, resumo — texto em Markdown dentro);
  \`\`\`formula com LaTeX simples (\\frac{a}{b}, V_d, t_{1/2}, \\times);
  \`\`\`fluxo com uma linha "Etapa A -> Etapa B -> Etapa C" (use " :: detalhe" após o nome, se quiser);
  \`\`\`comparar com JSON {"titulo":"","itens":["A","B"],"linhas":[{"campo":"","valores":["",""],"destaque":false}]}.
  Use \`\`\`grafico (JSON com tipo, rotulos, series, unidade) SOMENTE se os números estiverem nos trechos fornecidos; nunca crie dados.
  Não use mais blocos do que o necessário.`;
const NIVEL: Record<string, string> = { basico: "Explique de forma simples, para quem está começando.", intermediario: "Nível de graduação.", avancado: "Aprofunde, com terminologia técnica." };
const INTENCAO: Record<string, string> = {
  explicar: "Explique o conceito.", exemplo: "Dê um exemplo concreto.", reformular: "Explique de outro jeito, com outras palavras.",
  aprofundar: "Aprofunde o assunto.", exercicio: "Proponha 2 ou 3 perguntas para o aluno treinar e dê o gabarito no final.", resumir: "Faça um resumo objetivo.",
};

function montarMensagens(b: any) {
  const trechos = (Array.isArray(b.trechos) ? b.trechos : []).slice(0, 4)
    .map((t: any) => `[${Number(t.n) || 0}] ${cortar(t.titulo, 160)} (${cortar(t.fonte, 120)})\n${cortar(t.texto, 650)}`).join("\n\n");
  const e = b.estilo ?? {};
  const ctx = [
    NIVEL[String(e.nivel)] ?? "", INTENCAO[String(e.intencao)] ?? INTENCAO.explicar,
    b.disciplina ? `disciplina (dados públicos): ${cortar(JSON.stringify(b.disciplina), 500)}` : "",
    b.perfil?.periodo ? `O aluno está no ${Number(b.perfil.periodo)}º período.` : "",
    trechos ? `Trechos do material:\n${trechos}` : "Sem trechos do material para esta pergunta.",
  ].filter(Boolean).join("\n");
  const msgs: { role: string; content: string }[] = [{ role: "system", content: SISTEMA }, { role: "system", content: ctx }];
  for (const h of (Array.isArray(b.historico) ? b.historico : []).slice(-4)) {
    msgs.push({ role: h.r === "u" ? "user" : "assistant", content: cortar(h.t, 280) });
  }
  msgs.push({ role: "user", content: cortar(b.pergunta, 500) });
  return msgs;
}

// ---------- chamada ao provedor ----------
type Resultado = { ok: true; texto: string; tokens: number } | { ok: false; motivo: "cota" | "ritmo" | "falha" };
async function chamar(p: Provedor, msgs: unknown[]): Promise<Resultado> {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), TIMEOUT_PROVEDOR_MS);
  try {
    const r = await fetch(p.url, {
      method: "POST", signal: ctl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.chave}` },
      body: JSON.stringify({ model: p.modelo, messages: msgs, temperature: 0.3, max_tokens: 700 }),
    });
    if (r.status === 429) {
      const corpo = (await r.text()).toLowerCase(), espera = Number(r.headers.get("retry-after") ?? 0);
      // "por dia / cota / quota" ou espera longa = acabou o dia; senão é só o limite por minuto
      return { ok: false, motivo: /per day|daily|tokens per day|quota|exceeded your current/.test(corpo) || espera > 3600 ? "cota" : "ritmo" };
    }
    if (r.status === 401 || r.status === 403 || r.status === 404) { console.error(p.id, "recusou:", r.status); return { ok: false, motivo: "falha" }; }
    if (!r.ok) return { ok: false, motivo: "falha" };
    const j = await r.json();
    const texto = String(j?.choices?.[0]?.message?.content ?? "").trim();
    if (!texto) return { ok: false, motivo: "falha" };
    return { ok: true, texto, tokens: Number(j?.usage?.total_tokens ?? Math.ceil((JSON.stringify(msgs).length + texto.length) / 3.5)) };
  } catch { return { ok: false, motivo: "falha" }; } finally { clearTimeout(t); }
}

// ---------- handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { erro: "metodo" }, 405);
  let b: any;
  try { b = await req.json(); } catch { return json(req, { erro: "json_invalido" }, 400); }
  if (!b || b.v !== 1 || typeof b.pergunta !== "string" || b.pergunta.trim().length < 2) return json(req, { erro: "pedido_invalido" }, 400);
  const cid = /^[a-z0-9-]{12,64}$/.test(String(b.cid)) ? String(b.cid) : "";
  if (!cid) return json(req, { erro: "pedido_invalido" }, 400);
  if (!PROVEDORES.length) return json(req, { erro: "sem_provedor" }, 503);

  if (passouDoRitmo(cid)) return json(req, { erro: "limite", retryMs: 30000 }, 429, { "Retry-After": "30" });

  const dia = hojeSP(), msgs = montarMensagens(b), chaveCache = await hash(JSON.stringify(msgs));
  const guardado = cache.get(chaveCache);
  if (guardado && guardado.ate > Date.now()) return json(req, { texto: guardado.texto, modelo: guardado.modelo, cache: true });

  // limite diário por usuário
  const { data: nCid } = await db.rpc("farmacia_ia_contar_cid", { p_dia: dia, p_cid: cid });
  if (Number(nCid) > MAX_CID_DIA) return json(req, { erro: "limite", retryMs: msAteAmanha() }, 429, { "Retry-After": String(Math.round(msAteAmanha() / 1000)) });

  let viuCota = false, viuRitmo = false;
  for (const p of PROVEDORES) {
    if (await estaEsgotado(p, dia)) { viuCota = true; continue; }
    const r = await chamar(p, msgs);
    if (r.ok) {
      const { data } = await db.rpc("farmacia_ia_somar", { p_dia: dia, p_prov: p.id, p_tokens: r.tokens });
      const linha = Array.isArray(data) ? data[0] : data;
      if (linha && Number(linha.tokens) >= p.orcamento) await marcarEsgotado(p, dia); // o próximo pedido já vai para o reserva
      if (/^\s*FORA_DO_ESCOPO\s*$/i.test(r.texto)) return json(req, { erro: "fora_do_escopo" }, 422);
      const texto = r.texto.slice(0, 6000);
      cache.set(chaveCache, { texto, modelo: p.id, ate: Date.now() + 6 * 3600_000 });
      if (cache.size > 300) cache.delete(cache.keys().next().value as string);
      return json(req, { texto, modelo: p.id, cache: false });
    }
    if (r.motivo === "cota") { await marcarEsgotado(p, dia); viuCota = true; } else if (r.motivo === "ritmo") viuRitmo = true;
  }
  // ninguém respondeu
  if (viuCota && !viuRitmo) return json(req, { erro: "cota_diaria", retryMs: msAteAmanha() }, 429, { "Retry-After": String(Math.round(msAteAmanha() / 1000)) });
  if (viuRitmo) return json(req, { erro: "limite", retryMs: 30000 }, 429, { "Retry-After": "30" });
  return json(req, { erro: "indisponivel" }, 503);
});
