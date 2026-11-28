/* FarmacIA · camada central de interpretação (100% local, sem rede).
 *
 * Fica ENTRE o texto digitado e os motores já existentes (classificador do farmacia.js, orquestrador do
 * farmacia-ia.js e motor de cálculo). Não os substitui: prepara a frase e, quando ela é só conversa, gíria
 * ou pedido de ajuda sem dados, responde com uma pergunta de esclarecimento do contexto, em vez de
 * "não entendi".
 *
 *   FarmaInterp.normalizar(txt)   -> { original, normalizado, tokens }   (as duas versões são sempre preservadas)
 *   FarmaInterp.preparar(txt)     -> { original, normalizado, canonico, prefixo, intencao, resposta|null }
 *   FarmaInterp.esclarecer(txt)   -> { html, chips }  pergunta contextual usada no lugar do "não entendi" genérico
 *
 * "original" é o que o aluno digitou (mostrado no balão); "normalizado" é a versão sem acento/gíria/repetições;
 * "canonico" é a frase reescrita que os classificadores antigos entendem (só existe quando a reescrita foi
 * necessária; senão o texto original segue intacto para eles).
 */
(function (root) {
  'use strict';
  var M = root.FarmaMod = root.FarmaMod || {};

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function p(h) { return '<p>' + h + '</p>'; }
  function semAcento(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  /* ---------- 1. normalização central ---------- */
  var ABREV = { oq: 'o que', oque: 'o que', oq_: 'o que', 'o q': 'o que', pq: 'por que', vc: 'voce', vcs: 'voces', tb: 'tambem', tbm: 'tambem', td: 'tudo',
    n: 'nao', nn: 'nao', naum: 'nao', nd: 'nada', mt: 'muito', mto: 'muito', pra: 'para', qnt: 'quanto', qto: 'quanto', dps: 'depois', hj: 'hoje', blz: 'beleza',
    vlw: 'valeu', obg: 'obrigado', flw: 'falou', dnv: 'de novo', msm: 'mesmo', tmb: 'tambem', cmo: 'como', xplica: 'explica', explik: 'explica', q: 'que', e: 'e', eh: 'e', ta: 'esta' };
  function normalizar(original) {
    original = String(original == null ? '' : original);
    var t = semAcento(original).replace(/[^a-z0-9%\/.,+\-*^=()\s?]/g, ' ');
    var g = root.FarmaGirias;
    try { if (g && g.normalizar) t = semAcento(g.normalizar(original)); } catch (_) { /* usa a normalização simples */ }
    t = t.replace(/([a-z])\1{2,}/g, '$1$1').replace(/\s+/g, ' ').trim();   // "aaaah" -> "aah"
    var toks = t.replace(/[?!.,;:]+/g, ' ').split(' ').filter(Boolean).map(function (x) { return ABREV[x] !== undefined ? ABREV[x] : x; });
    var n = toks.join(' ').replace(/\bo q\b/g, 'o que').replace(/\s+/g, ' ').trim();
    return { original: original, normalizado: n, tokens: n ? n.split(' ') : [] };
  }

  /* ---------- 2. contexto ---------- */
  function topicoAtual() {
    try { var t = M.contexto && M.contexto.topico && M.contexto.topico(); return t && t.rotulo ? String(t.rotulo) : ''; } catch (_) { return ''; }
  }

  /* ---------- 3. conversa e gírias que sozinhas não são pergunta ---------- */
  var CLASSES = [
    { id: 'comemora', re: /^(divou|divei|arrasou|arrasei|arrasa|mandou bem|show|massa|top|dahora|da hora|toppp?|boa|boaa|lindo|perfeito|amei|adorei|gostei)( demais| muito)?$/,
      msg: 'Que bom!' },
    { id: 'surpresa', re: /^(oxe|oxi|ox|eita|vish|nossa|nss|uai|oi?e|ue|eitaa?)( (gente|mano|nossa|que isso))?$/, msg: 'Oxe, o que foi?' },
    { id: 'presenca', re: /^(awui|aqui|aki|aq|to aqui|presente|ola\?|alo|alou|e ai\??|eai|tem alguem( ai)?)$/, msg: 'Tô por aqui!' },
    { id: 'risada', re: /^(risada|k{2,}|ha(ha)+|rs(rs)+|kkk+|ks+|he(he)+)$/, msg: 'Hehe.' },
    { id: 'hesita', re: /^(hum+|hmm+|ah+|ahn|aff+|ixi|sei la|nao sei|sla|talvez|tipo|ne|ne\?)$/, msg: 'Tudo bem, sem pressa.' }
  ];
  function chipsGerais() {
    return [{ label: 'Explicar um conceito', q: 'O que é farmacocinética?' }, { label: 'Fazer uma conta', q: 'Quanto é 20% de 500?' },
      { label: 'O que posso puxar?', q: 'O que posso puxar?' }, { label: 'O que você pode fazer?', q: 'O que você pode fazer?' }];
  }
  function perguntaDeRetorno(top) {
    if (top) return { html: p('Quer continuar falando de <strong>' + esc(top) + '</strong> ou prefere outro assunto?'),
      chips: [{ label: 'Mais sobre ' + top, q: 'Me explica mais sobre ' + top }, { label: 'Outro assunto', q: 'O que você pode fazer?' }] };
    return { html: p('Sobre o que você quer falar: um <strong>conceito</strong> de Farmácia, uma <strong>conta</strong> ou a sua <strong>grade</strong>?'), chips: chipsGerais() };
  }

  /* ---------- 4. pedido de ajuda com conta, sem dados ---------- */
  var AJUDA_CONTA = [
    /\b(me ajuda|ajuda|ajudar|ajude|pode me ajudar|consegue|consegue me ajudar|preciso de ajuda|queria ajuda|quero ajuda)\b.*\b(conta|contas|calculo|calculos|calcular|matematica|continha|problema de (quimica|fisica|matematica)|exercicio de (calculo|quimica|matematica))\b/,
    /\b(faz|faca|fazer|resolve|resolva|resolver|calcula|calcule|monta|monte)\b.*\b(esse|essa|este|esta|isso|um|uma|o|a)?\s*\b(calculo|conta|continha|problema)\b/,
    /\b(preciso|quero|queria|tenho que|vou) (calcular|fazer (uma )?(conta|calculo|continha))\b/,
    /\bcomo (eu )?(faco|fazer|faz|resolvo|resolver|calculo|calcular)\b.*\b(conta|calculo|continha)\b/,
    /^(calculo|conta|calculadora|matematica|calcular)$/,
    /\b(voce|vc) (sabe|consegue|pode) (fazer|resolver|calcular)\b.*\b(conta|contas|calculo|calculos|matematica)\b/
  ];
  // pedidos de conta com um tipo já dito, mas sem dados: pergunta exatamente o que falta
  var DADOS_DA_CONTA = [
    [/\bconcentrac\w*\b/, 'a <strong>massa</strong> (ou mols) do soluto e o <strong>volume</strong> da solução', [{ label: 'Exemplo', q: 'Tenho 500 mg em 100 mL, qual é a concentração?' }]],
    [/\bdiluic\w*|\bdilui\w*/, 'a <strong>concentração inicial</strong> (C₁), a <strong>final</strong> (C₂) e um dos volumes (V₁ ou V₂)', [{ label: 'Exemplo', q: 'Diluir 10 mL de solução a 20% para 5%: qual o volume final?' }]],
    [/\bporcentagem\b|\bpercentual\b/, 'o <strong>percentual</strong> e o <strong>valor total</strong>', [{ label: 'Exemplo', q: 'Quanto é 20% de 500?' }]],
    [/\bregra de (tres|3)\b/, 'os <strong>três valores conhecidos</strong> e dizer se a relação é direta ou inversa', [{ label: 'Exemplo', q: 'Regra de três: 3 comprimidos custam 12, quanto custam 5?' }]],
    [/\bconversao\b|\bconverter\b/, 'o <strong>valor</strong> com a unidade de origem e a unidade de destino', [{ label: 'Exemplo', q: 'Quantos mg existem em 2,5 g?' }]],
    [/\bmolaridade\b|\bmassa molar\b|\bmols?\b/, 'a <strong>substância</strong> (fórmula) e a massa ou o volume', [{ label: 'Exemplo', q: 'Qual a massa molar do NaCl?' }]]
  ];
  function dadosFaltando(n) {
    if (/\d/.test(n) || /\b(disciplina|periodo|grade|credito|creditos|coeficiente|trancar|matricula|ementa)\b/.test(n)) return null;
    if (!/\b(calcul\w*|conta|contas|continha|faz|faca|fazer|resolv\w*|preciso|quero|como)\b/.test(n)) return null;
    for (var i = 0; i < DADOS_DA_CONTA.length; i++) if (DADOS_DA_CONTA[i][0].test(n))
      return { html: p('Dá para fazer. Para essa conta preciso destes dados: ' + DADOS_DA_CONTA[i][1] + '. Me manda os valores (com as unidades) que eu resolvo passo a passo.'), chips: DADOS_DA_CONTA[i][2] };
    return null;
  }
  // situações em que um número isolado não permite concluir nada (segurança): pede o que falta em vez de arriscar
  function pedidoSeguranca(n) {
    if (/\b(explod\w*|estour\w*|rompe\w*|arrebent\w*|vazar|vaza)\b/.test(n) && /\b(pressao|recipiente|frasco|vidro|garrafa|tubo|ampola|reator|autoclave|tanque)\b/.test(n))
      return { html: p('Só com esse número eu <strong>não consigo dizer</strong> se o recipiente aguenta. Para avaliar preciso saber:') +
        '<ul><li>a <strong>unidade</strong> da pressão (atm, kPa, bar, mmHg…);</li><li>se é pressão <strong>absoluta</strong> ou <strong>manométrica</strong>;</li><li>o <strong>recipiente</strong> e a pressão máxima da especificação dele;</li><li>a <strong>temperatura</strong> e a condição de uso.</li></ul>' +
        p('Sem esses dados, não é seguro concluir. Em caso de dúvida, confira a especificação do fabricante ou o responsável do laboratório.'), chips: [] };
    return null;
  }
  function pedidoDeConta(n) {
    if (/\d/.test(n)) return false;                       // já tem números: quem resolve é o motor de cálculo
    if (/\b(diluic\w*|dilui\w*|concentrac\w*|porcentagem|percentual|conversao|converter|massa molar|molaridade|ph|dose|regra de tres|media|nota|probabilidade|fracao|equacao|mmc|mdc)\b/.test(n)) return false;   // já diz que tipo de conta: o motor pede os dados que faltam
    if (/\b(disciplina|periodo|grade|credito|creditos|coeficiente|prerequisito|materia|ementa|trancar|matricula)\b/.test(n)) return false;
    return AJUDA_CONTA.some(function (re) { return re.test(n); });
  }
  var RESP_CONTA = {
    html: p('Claro! Me manda a <strong>conta</strong> ou os <strong>valores</strong> que eu resolvo e mostro o passo a passo.') +
      p('Por exemplo: porcentagem, conversão de unidades (mg, g, mL), diluição, concentração, massa molar, pH, média e nota para passar.'),
    chips: [{ label: '20% de 500', q: 'Quanto é 20% de 500?' }, { label: 'Converter unidades', q: 'Quantos mg existem em 2,5 g?' },
      { label: 'Diluição', q: 'Quero fazer uma diluição' }, { label: 'Concentração', q: 'Tenho 500 mg em 100 mL, qual é a concentração?' }]
  };

  /* ---------- 5. frase com ruído -> frase canônica ---------- */
  var ABERTURA = /^(oxe|oxi|oi|ola|ei|opa|ue|uai|entao|tipo|ah+|hm+|mano|gente|eita|vish|nossa|bom|mas|e ai|e|ai|olha|ow|po|poxa|caramba)\b[ ,!.]*/;
  var REFORMULA = /^(nao entendi|nao compreendi|nao peguei|nao saquei|nao entendo|fiquei confus[oa]|nao fez sentido|nao ficou claro)( nada| direito| bem| essa parte| isso)?\b[ ,.;:-]*/;
  var JEITO = /\s+(de um jeito|de uma forma|de forma|de maneira|em linguagem|com palavras)( mais)? (facil|simples|simplificad[oa]|bem simples|resumid[oa]|leve)$|\s+(pra|para) (leigo|iniciante|crianca|dummies)$|\s+em poucas palavras$|\s+rapidinho$|\s+por favor$|\s+pfv$|\s+pf$/;
  var NAO_CONCEITO = /^(novo|nada|tudo|jeito|forma|maneira|de novo|melhor|isso|isso ai|aquilo|ele|ela|esse|essa|mais|outra vez|de outro jeito|de outra forma|de outra maneira|por que|porque|como|mais detalhes|detalhado|passo a passo|um exemplo|exemplo|exemplos|a conta|o calculo|a resposta|a pergunta|a questao)$/;
  var ACADEMICO = /\b(disciplina|materia|ementa|periodo|grade|prerequisito|corequisito|credito|creditos|trancar|matricula|horario|professor|coordenacao|ufrj|bolsa|estagio|tcc|[a-z]{3}\s?\d{3,4})\b/;
  function limpaFim(s) { return s.replace(/[?!.,;: ]+$/g, '').trim(); }

  function reescrever(n) {
    var r = { canonico: null, prefixo: '', reformular: false, resto: n };
    var t = n, mudou = false, k;
    for (k = 0; k < 3 && ABERTURA.test(t) && t.replace(ABERTURA, '').length > 0; k++) { t = t.replace(ABERTURA, ''); mudou = true; }
    var mR = REFORMULA.exec(t);
    if (mR) { r.reformular = true; t = t.slice(mR[0].length); mudou = true; }
    t = limpaFim(t);
    var jeito = JEITO.test(t); if (jeito) { t = limpaFim(t.replace(JEITO, '')); mudou = true; }
    r.resto = t;
    if (!t) return r;                                         // sobrou só "não entendi" (ou nada)
    var m;
    // "o que significa X", "o que quer dizer X", "o que é X", "o que seria X"
    if ((m = /^(?:tem como )?(?:me )?(?:explicar |explica |dizer )?o que (?:significa|quer dizer|seria|e|eh|sao|e que e)\s+(?:o |a |os |as |um |uma )?(.+)$/.exec(t)) && !ACADEMICO.test(t) && !NAO_CONCEITO.test(m[1])) {
      r.canonico = 'o que é ' + limpaFim(m[1]); }
    // "me explica X", "explica X", "fala sobre X", "quero entender X", "queria saber X"
    else if ((m = /^(?:tem como |pode |consegue |voce pode |por favor )*(?:me )?(?:explicar?|explique|fala|fale|falar|conta|contar|ensina|ensine|ensinar|quero entender|queria entender|quero saber|queria saber|preciso entender|me ajuda a entender|ajuda a entender)(?: sobre| de| do| da| dos| das| a| o| as| os)?(?: o que e| o que significa)?\s+(?:o |a |os |as |um |uma )?(.+)$/.exec(t)) && !ACADEMICO.test(t) && !NAO_CONCEITO.test(limpaFim(m[1])) && m[1].split(' ').length <= 6) {
      r.canonico = 'o que é ' + limpaFim(m[1]); }
    else if (mudou) { r.canonico = t; }
    if (r.canonico && !mudou && /^o que (e|eh) /.test(t)) r.canonico = null;   // já estava na forma que os classificadores entendem
    if (r.canonico && (r.reformular || jeito)) r.prefixo = r.reformular ? 'Sem problema, vou explicar de outro jeito.' : 'Vou direto ao ponto.';
    return r;
  }

  /* ---------- 6. API principal ---------- */
  function preparar(txt) {
    var nz = normalizar(txt), n = nz.normalizado;
    var out = { original: nz.original, normalizado: n, canonico: null, prefixo: '', intencao: null, resposta: null };
    if (!n) return out;
    var top = topicoAtual();

    // conversa/gíria isolada
    for (var i = 0; i < CLASSES.length; i++) {
      if (CLASSES[i].re.test(n)) {
        var pr = perguntaDeRetorno(top);
        out.intencao = 'social:' + CLASSES[i].id;
        out.resposta = { html: p(esc(CLASSES[i].msg)) + pr.html, chips: pr.chips };
        return out;
      }
    }
    // pacote de conhecimento offline: elementos, fórmulas, grupos funcionais (farmacia-conhecimento.js)
    if (root.FarmaConhecimento) {
      var kr = root.FarmaConhecimento.responder(n);
      if (kr) { out.intencao = 'conhecimento:' + kr.id; out.resposta = { html: kr.html, chips: kr.chips || [] }; return out; }
    }
    // pedido de ajuda com conta, sem números
    var seg = pedidoSeguranca(n);
    if (seg) { out.intencao = 'seguranca:dados'; out.resposta = seg; return out; }
    var faltam = dadosFaltando(n);
    if (faltam) { out.intencao = 'calculo:dados'; out.resposta = faltam; return out; }
    // "tenho uma solução e preciso saber quanto usar": pergunta o contexto antes de qualquer número
    if (!/\d/.test(n) && /\b(solucao|medicamento|remedio|xarope|suspensao|diluicao|concentrado)\b/.test(n) && /\bquanto (usar|uso|preciso|pegar|colocar|devo usar|devo pegar|tenho que usar|se usa)\b/.test(n)) {
      out.intencao = 'calculo:dados';
      out.resposta = { html: p('Para dizer <strong>quanto usar</strong> eu preciso de mais informações:') + '<ul><li>a <strong>concentração</strong> da solução que você tem;</li><li>o <strong>volume ou a quantidade</strong> que você quer obter;</li><li>o <strong>contexto</strong> (preparo, diluição, exercício da disciplina).</li></ul>' + p('Não vou supor valores. Se for um caso de uso em pessoa, isso é com o farmacêutico ou o médico.'),
        chips: [{ label: 'Fazer uma diluição', q: 'Quero fazer uma diluição' }, { label: 'Exemplo de conta', q: 'Tenho 500 mg em 100 mL, qual é a concentração?' }] };
      return out;
    }
    if (pedidoDeConta(n)) { out.intencao = 'calculo:pedido'; out.resposta = RESP_CONTA; return out; }

    var rw = reescrever(n);
    // "n entendi essa conta": volta para o cálculo em vez de reexplicar um conceito
    if (rw.reformular && rw.resto && !/\d/.test(rw.resto) && /\b(conta|calculo|continha|exercicio|questao|resultado)\b/.test(rw.resto)) {
      out.intencao = 'calculo:reformular';
      out.resposta = { html: p('Sem problema! Me manda de novo a conta (ou o enunciado completo) e eu resolvo <strong>passo a passo</strong>, explicando cada etapa.'), chips: RESP_CONTA.chips };
      return out;
    }
    // "não entendi" sozinho: sem assunto anterior, pergunta o que não foi entendido
    if (rw.reformular && !rw.resto) {
      out.intencao = 'reformular';
      if (!top) {
        out.resposta = { html: p('Sem problema! O que você não entendeu? Me diz o <strong>termo</strong> ou cola a frase que eu explico de outro jeito.'),
          chips: [{ label: 'Explicar um conceito', q: 'O que é farmacocinética?' }, { label: 'Ver o que sei fazer', q: 'O que você pode fazer?' }] };
        return out;
      }
      out.resposta = { html: p('Sem problema! Qual parte de <strong>' + esc(top) + '</strong> ficou confusa? Posso explicar de outro jeito:'),
        chips: [{ label: 'Mais simples', q: 'Me explica ' + top + ' de forma mais simples' }, { label: 'Com um exemplo', q: 'Me dá um exemplo de ' + top },
          { label: 'Só o resumo', q: 'Resumo de ' + top }, { label: 'Outro assunto', q: 'O que você pode fazer?' }] };
      return out;
    }
    if (rw.canonico) { out.canonico = rw.canonico; out.prefixo = rw.prefixo; out.intencao = rw.reformular ? 'reformular' : 'conteudo'; }
    return out;
  }

  /* ---------- 7. pergunta de esclarecimento (substitui o "não entendi" genérico) ---------- */
  function esclarecer(txt) {
    var nz = normalizar(txt), n = nz.normalizado, top = topicoAtual(), toks = nz.tokens;
    var citacao = nz.original.trim().length && nz.original.trim().length <= 40 ? '“' + esc(nz.original.trim()) + '”' : '';
    var abre = citacao ? 'Não consegui ligar ' + citacao + ' a um assunto que eu conheça.' : 'Não consegui ligar essa frase a um assunto que eu conheça.';
    var chips = chipsGerais(), corpo;
    if (/\?\s*$/.test(nz.original) || /^(o que|qual|quais|como|quando|onde|por que|quem|quanto|quantos|tem como|pode|posso)\b/.test(n)) {
      corpo = p(abre) + p('Parece uma pergunta. Sobre <strong>qual assunto</strong>: um conceito de Farmácia, uma conta ou a sua grade?');
    } else if (toks.length <= 2) {
      corpo = p(abre) + p('Pode escrever a frase completa? Se for um termo, me diga também <strong>o que você quer dele</strong> (explicação, comparação, exemplo).');
    } else {
      corpo = p(abre) + p('Qual destas se aproxima do que você quer?');
    }
    if (top) {
      corpo += p('Ou você quer continuar com <strong>' + esc(top) + '</strong>?');
      chips = [{ label: 'Mais sobre ' + top, q: 'Me explica mais sobre ' + top }].concat(chips.slice(0, 3));
    }
    return { html: corpo, chips: chips };
  }

  root.FarmaInterp = { versao: '1.0.0', normalizar: normalizar, preparar: preparar, esclarecer: esclarecer, _reescrever: reescrever };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.FarmaInterp;
})(typeof window !== 'undefined' ? window : globalThis);
