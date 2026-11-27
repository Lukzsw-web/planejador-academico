
/*
 * FarmácIA — Interpretador linguístico complementar
 * FarmaGírias v3.0.0
 *
 * Carregar depois de farmacia-ia.js.
 *
 * Complementa o interpretador principal:
 * - entende abreviações e gírias;
 * - reduz letras repetidas;
 * - corrige erros de digitação conhecidos;
 * - reconhece diferentes formas de pedir a mesma coisa;
 * - identifica intenção e modificadores pedagógicos;
 * - aproveita o contexto da conversa.
 *
 * Não substitui nem altera o classificador de segurança,
 * a extração de medicamentos, doses, unidades ou entidades.
 */

(function (root) {
  "use strict";

  var M = root.FarmaMod = root.FarmaMod || {};

  if (root.FarmaGirias && root.FarmaGirias.versao === "3.0.0") return;

  // =========================================================
  // 1. ABREVIAÇÕES E GÍRIAS
  // =========================================================

  var ABREV = {
    oq: "o que",
    oque: "o que",
    pq: "por que",
    pqe: "por que",
    vc: "voce",
    vcs: "voces",
    tb: "tambem",
    tbm: "tambem",
    tmb: "tambem",
    td: "tudo",
    tds: "todos",
    mt: "muito",
    mto: "muito",
    mta: "muita",
    pra: "para",
    pro: "para o",
    qnt: "quanto",
    qto: "quanto",
    qnto: "quanto",
    qts: "quantos",
    dps: "depois",
    hj: "hoje",
    amnh: "amanha",
    agr: "agora",
    msm: "mesmo",
    n: "nao",
    nn: "nao",
    nd: "nada",
    cmg: "comigo",
    pfv: "por favor",
    pf: "por favor",
    pfvr: "por favor",
    blz: "beleza",
    vlw: "valeu",
    obg: "obrigado",
    obgd: "obrigado",
    flw: "falou",
    ta: "esta",
    tao: "estao",
    cm: "como",
    qdo: "quando",
    qd: "quando",
    sbr: "sobre",
    vdd: "verdade",
    dnv: "de novo",
    fzr: "fazer",
    fz: "faz",
    ngm: "ninguem",
    mds: "meu deus",
    mn: "mano",
    ss: "sim",
    explik: "explica",
    xplica: "explica",
    cmo: "como",
    dif: "diferenca",
    difs: "diferencas",
    resumao: "resumo",
    rem: "remedio",
    remedios: "remedio",
    medic: "medicamento",
    ab: "antibiotico",

    // Gírias informadas pelo usuário.
    ko: "cao",
    ox: "oxe",
    oxi: "oxe",
    oxe: "oxe",
    nss: "nossa",
    divei: "arrasei",
    divou: "arrasou",
    plmds: "pelo amor de deus",
    plmdds: "pelo amor de deus",
    tmlc: "ta maluco",
    clr: "claro",
    pdp: "pode pa",
    pdc: "pode crer",
    btf: "boto fe",
    pse: "pois e",
    dmr: "demorou",
    qria: "queria",
    vms: "vamos",
    aq: "aqui",
    aki: "aqui",
    gnt: "gente",
    glr: "galera",
    sla: "sei la",
    sdds: "saudades",
    ctz: "certeza",
    naum: "nao",

    // "Old" costuma significar "claro que sim".
    old: "claro que sim"
  };

  /*
   * "smt" não é convertido em uma instrução literal.
   * É preservado como expressão informal de reprovação.
   */

  // =========================================================
  // 2. CORREÇÃO DE ERROS DE ESCRITA
  // =========================================================

  var CORRECOES = {
    awui: "aqui",
    naum: "nao",
    farmacolojia: "farmacologia",
    interassao: "interacao",
    explicaa: "explica",
    medicamentoo: "medicamento",
    difernca: "diferenca"
  };

  function minusculo(texto) {
    return String(texto == null ? "" : texto)
      .toLocaleLowerCase("pt-BR");
  }

  function semAcento(texto) {
    return minusculo(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // =========================================================
  // 3. REPETIÇÃO DE LETRAS E RISADAS
  // =========================================================

  function reduzirRepeticoes(texto) {
    var s = minusculo(texto);

    /*
     * Risadas são preservadas como um sinal semântico.
     * Assim, "kkkkkk" não vira apenas "k".
     */
    s = s.replace(
      /\b(?:k{3,}|(?:ha){2,}h?a*|(?:ks){2,}|(?:rs){2,}|ahah{1,})\b/gi,
      " risada "
    );

    /*
     * Reduz sequências de três ou mais letras iguais.
     *
     * ooooooi   -> oi
     * naaaaaada -> nada
     * boooom    -> bom
     * siiiiiim  -> sim
     * nãããão    -> não
     *
     * Repetições ortográficas normais de duas letras
     * continuam preservadas: massa, carro, assar.
     */
    s = s.replace(/([a-zà-ú])\1{2,}/giu, "$1");

    return s;
  }

  // =========================================================
  // 4. NORMALIZAÇÃO DE EXPRESSÕES
  // =========================================================

  var FRASES = [
    [/\bqual (e )?(a )?utilidade (de|do|da)\b/g, "para que serve"],
    [/\bserve (pra|para) que\b/g, "para que serve"],
    [/\bpra que serve\b/g, "para que serve"],
    [/\bqual (e )?a funcao (de|do|da)\b/g, "funcao"],
    [/\bo que que e\b/g, "o que e"],
    [/\bme fala sobre\b/g, "explique"],
    [/\bme conta sobre\b/g, "explique"],
    [/\bna pratica\b/g, "exemplo"],
    [/\bno dia a dia\b/g, "exemplo"],
    [/\bcomo eu vejo isso na pratica\b/g, "exemplo"],
    [/\bfaz um resumao\b/g, "resumo"],
    [/\bresume pra mim\b/g, "resumo"],
    [/\bresume isso\b/g, "resumo"],
    [/\bnao entendi nada\b/g, "nao entendi"],
    [/\bn entendi nd\b/g, "nao entendi nada"],
    [/\bexplica como se eu fosse iniciante\b/g, "explica de forma simples"],
    [/\bcomo se eu fosse leigo\b/g, "explica de forma simples"],
    [/\bcompara os dois\b/g, "compare"],
    [/\bqual a diferenca entre eles\b/g, "diferenca"],
    [/\be o outro\b/g, "continuacao outro"],
    [/\be depois\b/g, "continuacao depois"],
    [/\be ai\b/g, "continuacao depois"]
  ];

  function normalizarFrases(texto) {
    var s = semAcento(texto);

    FRASES.forEach(function (regra) {
      s = s.replace(regra[0], regra[1]);
    });

    return s.replace(/\s+/g, " ").trim();
  }

  function normalizar(texto) {
    return normalizarFrases(reduzirRepeticoes(texto));
  }

  // =========================================================
  // 5. CORREÇÃO APROXIMADA CONTROLADA
  // =========================================================

  function corrigirToken(token) {
    if (CORRECOES[token]) return CORRECOES[token];

    if (!token || token.length < 5 || /\d/.test(token)) {
      return token;
    }

    if (!M.busca || typeof M.busca.editDistance !== "function") {
      return token;
    }

    /*
     * A correção aproximada só utiliza palavras-pista
     * do interpretador, nunca o catálogo de medicamentos.
     */
    var pistas = M.norma && M.norma.PISTAS
      ? M.norma.PISTAS
      : [];

    var melhor = null;
    var menorDistancia = 2;
    var empate = false;

    pistas.forEach(function (candidato) {
      if (candidato.charAt(0) !== token.charAt(0)) return;

      if (Math.abs(candidato.length - token.length) > 1) {
        return;
      }

      var distancia = M.busca.editDistance(token, candidato);

      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        melhor = candidato;
        empate = false;
      } else if (
        distancia === menorDistancia &&
        candidato !== melhor
      ) {
        empate = true;
      }
    });

    return melhor && !empate ? melhor : token;
  }

  // =========================================================
  // 6. INTEGRAÇÃO COM O NORMALIZADOR PRINCIPAL
  // =========================================================

  function instalarNormalizador() {
    if (
      !M.norma ||
      typeof M.norma.analisar !== "function" ||
      M.norma.analisar._farmaV3
    ) {
      return false;
    }

    var analisarOriginal = M.norma.analisar;

    if (M.norma.ABREV) {
      Object.keys(ABREV).forEach(function (chave) {
        M.norma.ABREV[chave] = ABREV[chave];
      });
    }

    function analisar(raw) {
      var original = String(raw == null ? "" : raw);

      var preparado = normalizar(original);

      // Mantém o analisador original como base.
      var resultado = analisarOriginal(preparado);

      if (!resultado || !Array.isArray(resultado.tokens)) {
        return resultado;
      }

      var tokens = [];
      var corrigidas = (resultado.corrigidas || []).slice();

      resultado.tokens.forEach(function (token) {
        var corrigido = corrigirToken(token);

        if (corrigido !== token) {
          corrigidas.push({
            de: token,
            para: corrigido,
            origem: "FarmaGírias"
          });
        }

        tokens.push(corrigido);
      });

      resultado.original = original;
      resultado.tokens = tokens;
      resultado.n = tokens.join(" ");
      resultado.corrigidas = corrigidas;
      resultado.risada = /\brisada\b/.test(resultado.n);

      return resultado;
    }

    analisar._farmaV3 = true;
    M.norma.analisar = analisar;

    return true;
  }

  // =========================================================
  // 7. IDENTIFICAÇÃO DA INTENÇÃO DO USUÁRIO
  // =========================================================

  function detectar(texto) {
    var n = normalizar(texto);

    return {
      exemplo: /\b(exemplo|exemplos|na pratica|caso pratico|dia a dia)\b/.test(n),

      resumo: /\b(resumo|resumir|resumao|sintese|em topicos)\b/.test(n),

      exercicio: /\b(questoes|questao|exercicios?|quiz|simulado|flashcards?|me testa|me teste|me pergunta)\b/.test(n),

      comparar: /\b(compar\w*|diferenca|versus|\bvs\b|qual e melhor|qual a diferenca)\b/.test(n),

      reformular: /\b(nao entendi|explica de novo|de outro jeito|de outra forma|mais simples|mais facil|linguagem simples|iniciante|leigo)\b/.test(n),

      aprofundar: /\b(aprofund\w*|mais detalhes|detalha|detalhe|explica melhor|mais a fundo)\b/.test(n),

      explicar: /\b(explica\w*|explique\w*|como funciona|como ocorre|por que|para que serve|funcao)\b/.test(n),

      definir: /\b(o que e|significa|significado|definicao|conceito)\b/.test(n),

      continuar:
        /\b(isso|disso|nisso|aquilo|esse|essa|ele|ela|eles|elas|deles|delas|o outro|a outra|continuacao|depois|mais)\b/.test(n) ||
        /^(e |mais |continua|continue|e agora|e ai|como assim)/.test(n),

      risada: /\brisada\b/.test(n),

      reprovacao: /\bsmt\b/.test(n)
    };
  }

  function contextoAtivo() {
    try {
      return !!(
        M.contexto &&
        M.contexto.topico &&
        M.contexto.topico()
      );
    } catch (e) {
      return false;
    }
  }

  // =========================================================
  // 8. INTEGRAÇÃO COM O INTERPRETADOR PRINCIPAL
  // =========================================================

  function instalarInterpretador() {
    if (
      !M.interpretador ||
      typeof M.interpretador.interpretar !== "function" ||
      M.interpretador.interpretar._farmaV3
    ) {
      return false;
    }

    var interpretarOriginal = M.interpretador.interpretar;

    function interpretar(raw) {
      var resultado = interpretarOriginal(raw);

      if (!resultado || typeof resultado !== "object") {
        return resultado;
      }

      var sinais = detectar(raw);
      var temContexto = contextoAtivo();

      resultado.compreensao = {
        versao: "3.0.0",
        sinais: sinais,
        contextoDisponivel: temContexto,
        textoAnalisado: normalizar(raw)
      };

      /*
       * REGRA DE SEGURANÇA:
       * Se o motor principal sinalizar risco, esta camada não
       * altera intenção, ação, risco ou classificação.
       */
      var v3 = resultado.v3 || {};

      var protegido =
        v3.acao === "seguranca" ||
        v3.risco === "pessoal" ||
        v3.risco === "intoxicacao" ||
        v3.risco === "urgencia" ||
        v3.nivelSeguranca === "critico";

      if (protegido) return resultado;

      resultado.modificadores = resultado.modificadores || {};

      // O usuário quer exemplos ou aplicação prática.
      if (sinais.exemplo) {
        resultado.modificadores.exemplo = true;

        if (!resultado.intencao) {
          resultado.intencao = "exemplo";
        }
      }

      // O usuário quer um resumo.
      if (sinais.resumo) {
        resultado.modificadores.resumo = true;
        resultado.intencao = "resumo";
      }

      // O usuário quer exercícios ou perguntas.
      if (sinais.exercicio) {
        resultado.intencao = "exercicio";
      }

      // O usuário quer comparar assuntos.
      if (sinais.comparar) {
        var conceitos = resultado.conceitos || [];
        var farmacos = resultado.farmacos || [];

        if (
          conceitos.length >= 2 ||
          farmacos.length >= 2 ||
          temContexto
        ) {
          resultado.intencao = "comparar";
        }
      }

      // O usuário não entendeu e quer outra explicação.
      if (sinais.reformular) {
        resultado.intencao = "reformular";
      }

      // O usuário quer aprofundamento.
      if (sinais.aprofundar) {
        resultado.intencao = "aprofundar";
      }

      // Definição ou explicação.
      if (sinais.definir && !resultado.intencao) {
        resultado.intencao = "definir";
      }

      if (sinais.explicar && !resultado.intencao) {
        resultado.intencao = "explicar";
      }

      /*
       * REFERÊNCIAS AO CONTEXTO:
       * "me explica isso", "e na prática?", "e o outro?",
       * "continua", "mais exemplos", "e depois?".
       */
      if (sinais.continuar && temContexto) {
        resultado.seguimento = true;
        resultado.anafora = true;

        if (!resultado.intencao && !sinais.risada) {
          resultado.intencao = "explicar";
        }
      }

      /*
       * Sem assunto anterior, não inventa o referente
       * de "isso", "ele", "o outro" ou "aquilo".
       */
      if (
        sinais.continuar &&
        !temContexto &&
        !(resultado.conceitos || []).length &&
        !(resultado.farmacos || []).length
      ) {
        resultado.faltaContexto = true;
      }

      // Risada isolada é uma interação social.
      if (
        sinais.risada &&
        normalizar(raw).replace(/\brisada\b/g, "").trim() === ""
      ) {
        resultado.intencao = "social";
        resultado.pedagogica = false;
      }

      // Pedido de cálculo (farmacia-calculo.js): o interpretador só sinaliza; quem resolve é o motor local.
      try {
        if (root.FarmaCalculo && root.FarmaCalculo.reconhecer(raw)) {
          resultado.intencao = "calculo";
          resultado.modificadores.calculo = true;
          resultado.pedagogica = false;
          return resultado;
        }
      } catch (_) { /* o motor é opcional */ }

      if (resultado.intencao) {
        resultado.pedagogica = true;
      }

      return resultado;
    }

    interpretar._farmaV3 = true;
    M.interpretador.interpretar = interpretar;

    return true;
  }

  // =========================================================
  // 9. INTEGRAÇÃO AUTOMÁTICA
  // =========================================================

  function integrar() {
    return {
      normalizador: instalarNormalizador(),
      interpretador: instalarInterpretador()
    };
  }

  // =========================================================
  // 10. API PÚBLICA
  // =========================================================

  root.FarmaGirias = {
    versao: "3.0.0",

    integrar: integrar,

    normalizar: normalizar,

    normalizarRepeticoes: reduzirRepeticoes,

    corrigirToken: corrigirToken,

    detectar: detectar,

    interpretar: function (texto) {
      return {
        original: String(texto == null ? "" : texto),
        normalizado: normalizar(texto),
        sinais: detectar(texto),
        integrado: !!(
          M.interpretador &&
          M.interpretador.interpretar
        )
      };
    }
  };

  // A integração acontece automaticamente ao carregar o arquivo.
  integrar();

})(typeof window !== "undefined" ? window : globalThis);