/*
 * FarmácIA — Motor de cálculo offline (matemática, ciência, farmácia, acadêmico)
 * Determinístico, 100% local, sem eval()/Function(), sem rede.
 * Camadas: (1) números e parser seguro  (2) linguagem natural -> expressão
 *          (3) unidades  (4) solucionadores por área  (5) contexto  (6) explicação em HTML.
 * API: FarmaCalculo.tentar(texto) -> { html, chips, id } | null   (null = não é um cálculo; o chat segue o fluxo normal)
 */
(function (root) {
  "use strict";
  if (root.FarmaCalculo && root.FarmaCalculo.versao) return;

  // ======================= 1. NÚMEROS E FORMATAÇÃO =======================
  function ErroCalc(codigo, msg) { this.codigo = codigo; this.message = msg; }
  function erro(c, m) { throw new ErroCalc(c, m); }

  function semAcento(t) {
    return String(t == null ? "" : t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function esc(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // "2,5" "2.5" "1.000" "1.000,5" "1e-3" "-3"
  function lerNumero(s) {
    s = String(s).trim().replace(/\s+/g, "").replace(/−/g, "-");
    if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(",", ".");
    var v = Number(s);
    return isFinite(v) ? v : NaN;
  }

  function sig(x, n) { return Number(Number(x).toPrecision(n || 10)); }

  function fmtNum(x, opc) {
    opc = opc || {};
    if (x === Infinity || x === -Infinity || x !== x) return "indefinido";
    if (x === 0) return "0";
    var a = Math.abs(x), r = sig(x, opc.sig || 10);
    if (a >= 1e12 || a < 1e-4) {
      var e = Math.floor(Math.log10(Math.abs(r))), m = sig(r / Math.pow(10, e), 8);
      if (Math.abs(m) >= 10) { m = m / 10; e += 1; }
      return String(m).replace(".", ",") + " × 10^" + e;
    }
    var s;
    try { s = r.toLocaleString("pt-BR", { maximumFractionDigits: 10, useGrouping: true }); }
    catch (_) { s = String(r).replace(".", ","); }
    if (opc.dec != null) {
      try { s = Number(r.toFixed(opc.dec)).toLocaleString("pt-BR", { minimumFractionDigits: opc.dec, maximumFractionDigits: opc.dec }); } catch (_) {}
    }
    return s;
  }

  function mdc(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a; }
  function mmc(a, b) { return a === 0 || b === 0 ? 0 : Math.abs(a / mdc(a, b) * b); }
  function fatorial(n) {
    if (!(n >= 0) || Math.floor(n) !== n) erro("DOMINIO", "O fatorial só existe para inteiros não negativos.");
    if (n > 170) erro("DOMINIO", "O fatorial de números acima de 170 estoura a capacidade numérica.");
    var r = 1; for (var i = 2; i <= n; i++) r *= i; return r;
  }
  function comb(n, k) {
    if (k < 0 || k > n || Math.floor(n) !== n || Math.floor(k) !== k) erro("DOMINIO", "Combinação inválida: precisa de 0 ≤ k ≤ n inteiros.");
    k = Math.min(k, n - k); var r = 1;
    for (var i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return Math.round(r);
  }
  function arranjo(n, k) {
    if (k < 0 || k > n || Math.floor(n) !== n || Math.floor(k) !== k) erro("DOMINIO", "Arranjo inválido: precisa de 0 ≤ k ≤ n inteiros.");
    var r = 1; for (var i = 0; i < k; i++) r *= (n - i); return r;
  }

  // ======================= 2. PARSER MATEMÁTICO SEGURO =======================
  // Gramática: expr -> termo (('+'|'-') termo)* ; termo -> unário (('*'|'/'|'mod') unário | implícito)* ;
  // unário -> ('-'|'+') unário | potência ; potência -> pós ('^' unário)? ; pós -> primário ('!'|'%')*
  var FUNCS = {
    sqrt: function (x) { if (x < 0) erro("DOMINIO", "Raiz quadrada de número negativo não existe nos reais."); return Math.sqrt(x); },
    raiz: null, cbrt: function (x) { return Math.cbrt(x); },
    ln: function (x) { if (x <= 0) erro("DOMINIO", "O logaritmo só existe para valores positivos."); return Math.log(x); },
    log: function (x, b) {
      if (x <= 0) erro("DOMINIO", "O logaritmo só existe para valores positivos.");
      if (b == null) return Math.log10(x);
      if (b <= 0 || b === 1) erro("DOMINIO", "A base do logaritmo precisa ser positiva e diferente de 1.");
      return Math.log(x) / Math.log(b);
    },
    log2: function (x) { if (x <= 0) erro("DOMINIO", "O logaritmo só existe para valores positivos."); return Math.log2(x); },
    exp: Math.exp, abs: Math.abs, fat: fatorial,
    sin: function (x) { return Math.sin(x * ANG); }, cos: function (x) { return Math.cos(x * ANG); },
    tan: function (x) {
      if (Math.abs(Math.cos(x * ANG)) < 1e-12) erro("DOMINIO", "A tangente é indefinida nesse ângulo.");
      return Math.tan(x * ANG);
    },
    asin: function (x) { if (Math.abs(x) > 1) erro("DOMINIO", "O arco-seno só existe entre -1 e 1."); return Math.asin(x) / ANG; },
    acos: function (x) { if (Math.abs(x) > 1) erro("DOMINIO", "O arco-cosseno só existe entre -1 e 1."); return Math.acos(x) / ANG; },
    atan: function (x) { return Math.atan(x) / ANG; },
    round: function (x, d) { var f = Math.pow(10, d || 0); return Math.round(x * f) / f; },
    floor: Math.floor, ceil: Math.ceil,
    min: Math.min, max: Math.max,
    mod: function (a, b) { if (b === 0) erro("DIV0", "Módulo por zero não é definido."); return a - b * Math.floor(a / b); },
    pow: Math.pow,
    root: function (n, x) {
      if (n === 0) erro("DOMINIO", "O índice da raiz não pode ser zero.");
      if (x < 0) { if (n % 2 === 0 || Math.floor(n) !== n) erro("DOMINIO", "Raiz de índice par de número negativo não existe nos reais."); return -Math.pow(-x, 1 / n); }
      return Math.pow(x, 1 / n);
    },
    comb: comb, arr: arranjo, mmc: mmc, mdc: mdc
  };
  FUNCS.raiz = FUNCS.sqrt;
  var CONST = { pi: Math.PI, e: Math.E };
  var ANG = Math.PI / 180;   // padrão: graus (uso escolar). "rad" muda para radianos.

  function tokenizar(src) {
    var t = [], i = 0, s = String(src);
    while (i < s.length) {
      var c = s.charAt(i);
      if (/\s/.test(c)) { i++; continue; }
      var m = /^(\d+(?:[.,]\d+)?|[.,]\d+)(?:e([+-]?\d+))?/i.exec(s.slice(i));
      if (m && /[\d.,]/.test(c)) {
        var raw = m[1] + (m[2] ? "e" + m[2] : ""), v = lerNumero(raw);
        if (isNaN(v)) erro("SINTAXE", "Número inválido: " + m[0]);
        t.push({ k: "n", v: v }); i += m[0].length; continue;
      }
      if (/[a-z]/i.test(c)) { var w = /^[a-z][a-z0-9]*/i.exec(s.slice(i))[0]; t.push({ k: "id", v: w.toLowerCase() }); i += w.length; continue; }
      if ("+-*/^()!%,".indexOf(c) >= 0) { t.push({ k: "op", v: c }); i++; continue; }
      if (c === "×" || c === "·") { t.push({ k: "op", v: "*" }); i++; continue; }
      if (c === "÷") { t.push({ k: "op", v: "/" }); i++; continue; }
      if (c === "−") { t.push({ k: "op", v: "-" }); i++; continue; }
      if (c === "√") { t.push({ k: "id", v: "sqrt" }); i++; continue; }
      if (c === "π") { t.push({ k: "id", v: "pi" }); i++; continue; }
      erro("SINTAXE", "Caractere não reconhecido: " + c);
    }
    return t;
  }

  function avaliar(src, vars) {
    var tk = tokenizar(src), p = 0, prof = 0;
    function ver() { return tk[p]; }
    function op(v) { var x = tk[p]; return x && x.k === "op" && x.v === v; }
    function consumir(v) { if (!op(v)) erro("SINTAXE", "Esperava '" + v + "'."); p++; }
    function expr() {
      var r = termo();
      while (op("+") || op("-")) {
        var o = tk[p++].v, d = termo();
        if (d.pct && !r.pct) { r = { v: o === "+" ? r.v * (1 + d.v) : r.v * (1 - d.v) }; }  // 100 + 10% = 110
        else r = { v: o === "+" ? r.v + d.v : r.v - d.v };
      }
      return r;
    }
    function inicioPrimario() { var x = ver(); return x && (x.k === "n" || x.k === "id" || (x.k === "op" && (x.v === "(" || x.v === "√"))); }
    function termo() {
      var r = unario();
      for (;;) {
        if (op("*")) { p++; r = { v: r.v * unario().v }; }
        else if (op("/")) { p++; var d = unario().v; if (d === 0) erro("DIV0", "Divisão por zero não é definida."); r = { v: r.v / d }; }
        else if (ver() && ver().k === "id" && ver().v === "mod") { p++; var d2 = unario().v; if (d2 === 0) erro("DIV0", "Módulo por zero não é definido."); r = { v: r.v - d2 * Math.floor(r.v / d2) }; }
        else if (inicioPrimario()) { r = { v: r.v * unario().v }; }   // multiplicação implícita: 2(3+1), 2pi
        else break;
      }
      return r;
    }
    function unario() {
      if (op("-")) { p++; return { v: -unario().v }; }
      if (op("+")) { p++; return unario(); }
      return potencia();
    }
    function potencia() {
      var b = posfixo();
      if (op("^")) { p++; var e = unario().v; var r = Math.pow(b.v, e); if (r !== r) erro("DOMINIO", "Potência indefinida nos reais."); if (b.v === 0 && e < 0) erro("DIV0", "Zero elevado a expoente negativo não é definido."); return { v: r }; }
      return b;
    }
    function posfixo() {
      var r = primario();
      for (;;) {
        if (op("!")) { p++; r = { v: fatorial(r.v) }; }
        else if (op("%") && !inicioDepois()) { p++; r = { v: r.v / 100, pct: true }; }
        else break;
      }
      return r;
    }
    function inicioDepois() { var x = tk[p + 1]; return x && (x.k === "n" || x.k === "id" || (x.k === "op" && x.v === "(")); } // "%" seguido de operando = módulo
    function primario() {
      if (++prof > 60) erro("SINTAXE", "Expressão complexa demais.");
      var x = tk[p++];
      if (!x) erro("SINTAXE", "A expressão terminou antes do esperado.");
      var res;
      if (x.k === "n") res = { v: x.v };
      else if (x.k === "op" && x.v === "(") { res = expr(); consumir(")"); res = { v: res.v }; }
      else if (x.k === "id") {
        if (vars && Object.prototype.hasOwnProperty.call(vars, x.v)) res = { v: vars[x.v] };
        else if (Object.prototype.hasOwnProperty.call(CONST, x.v) && !op("(")) res = { v: CONST[x.v] };
        else if (Object.prototype.hasOwnProperty.call(FUNCS, x.v)) {
          var args = [];
          if (op("(")) {
            p++;
            if (!op(")")) { args.push(expr().v); while (op(",")) { p++; args.push(expr().v); } }
            consumir(")");
          } else args.push(unario().v);
          var f = FUNCS[x.v];
          if (!args.length) erro("SINTAXE", "A função " + x.v + " precisa de argumento.");
          var out = f.apply(null, args);
          if (out !== out) erro("DOMINIO", "Resultado indefinido para " + x.v + ".");
          res = { v: out };
        } else erro("SINTAXE", "Não reconheço '" + x.v + "' na expressão.");
      } else erro("SINTAXE", "Símbolo inesperado: " + x.v);
      prof--; return res;
    }
    if (!tk.length) erro("SINTAXE", "Expressão vazia.");
    var out = expr();
    if (p < tk.length) erro("SINTAXE", "Sobrou algo no fim da expressão.");
    if (!isFinite(out.v)) erro("DOMINIO", "O resultado ultrapassa a capacidade numérica.");
    return out.v;
  }

  // ======================= 3. LINGUAGEM NATURAL -> EXPRESSÃO =======================
  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  // vocabulário de pedidos de cálculo (para tolerar erros de digitação)
  var VOCAB = ["multiplicado", "multiplicar", "multiplica", "dividido", "dividir", "divide", "elevado", "quadrado", "cubo", "quadrada", "cubica",
    "raiz", "porcento", "resultado", "calcula", "calcule", "calcular", "quanto", "somado", "subtraido", "subtrai", "vezes", "mais", "menos", "fatorial",
    "logaritmo", "seno", "cosseno", "tangente", "equacao", "determinante", "concentracao", "diluicao", "molaridade", "porcentagem", "media", "mediana",
    "combinacao", "arranjo", "permutacao", "simplifica", "simplificar", "converte", "converter", "conversao", "densidade", "rendimento", "pureza",
    "ponderada", "frequencia", "faltas", "acertos", "notacao", "cientifica", "decimal", "fracao", "mmc", "mdc", "massa", "molar", "volume", "meia", "vida",
    "clearance", "distribuicao", "biodisponibilidade", "tampao", "limitante", "excesso", "estequiometria", "avogadro", "variacao", "aumento", "desconto",
    "probabilidade", "desvio", "variancia", "sistema", "matriz", "grama", "gramas", "litros", "litro", "miligramas", "mililitros", "microgramas", "quilos", "quilo"];
  function corrigirTipos(n) {
    return n.replace(/[a-z]{5,}/g, function (w) {
      if (VOCAB.indexOf(w) >= 0) return w;
      var melhor = null, dm = 99, emp = false;
      for (var i = 0; i < VOCAB.length; i++) {
        var v = VOCAB[i];
        if (v.charAt(0) !== w.charAt(0) || Math.abs(v.length - w.length) > 2) continue;
        var d = lev(w, v), lim = w.length >= 8 ? 2 : 1;
        if (d <= lim) { if (d < dm) { dm = d; melhor = v; emp = false; } else if (d === dm && v !== melhor) emp = true; }
      }
      return melhor && !emp ? melhor : w;
    });
  }
  var ABREV = { vzs: "vezes", vzes: "vezes", mult: "multiplicado", pq: "porque", qnt: "quanto", qto: "quanto", qnto: "quanto", vc: "voce", pf: "", pfv: "", pfvr: "", plmds: "", hj: "hoje", td: "tudo", tb: "tambem", tbm: "tambem", dps: "depois", pdc: "pode crer" };

  // normaliza a frase para análise: sem acento, abreviações e letras repetidas ajustadas
  function normalizar(t) {
    var s = semAcento(t).replace(/×/g, " * ").replace(/÷/g, " / ").replace(/−/g, "-");
    s = s.replace(/\.(?=\s|$)/g, " ").replace(/[,;]+\s*$/, " ").replace(/:/g, " ");
    s = s.replace(/([a-z])\1{2,}/g, "$1$1");
    s = s.replace(/[a-z]+/g, function (w) { return Object.prototype.hasOwnProperty.call(ABREV, w) ? ABREV[w] : w; });
    s = corrigirTipos(s);
    return s.replace(/\s+/g, " ").trim();
  }

  var NUMEROS_EXT = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
    treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40,
    cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, mil: 1000, meio: 0.5, meia: 0.5 };
  function numerosPorExtenso(s) {
    s = s.replace(/\bpor cento\b/g, "porcento");
    return s.replace(/\b(zero|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|mil)(?:\s+e\s+(um|dois|tres|quatro|cinco|seis|sete|oito|nove))?\b/g,
      function (_, a, b) { return String(NUMEROS_EXT[a] + (b ? NUMEROS_EXT[b] : 0)); });
  }

  var RUIDO = /\b(quanto (e|da|vale|fica|sera|ser|eh|dá)|qual (e )?(o|a) (resultado|valor|conta|calculo)( de| da| do)?|resultado de|calcul\w*|faz(er)? (a |o )?(conta|calculo)( de| da| do)?|faca (a |o )?(conta|calculo)?|resolv\w*|me (ajuda|diz|fala|passa|da)( a)?|por favor|ola|oi|ei|vamos|a conta|o calculo|conta de|quero saber|sabe)\b/g;

  // Converte uma frase em expressão aritmética; devolve null se não for uma conta pura.
  function paraExpressao(texto) {
    var n = normalizar(texto);
    n = n.replace(/\?+|!+(?!\s*[\d(])/g, " ");
    n = numerosPorExtenso(n).replace(RUIDO, " ");
    // "x" entre números é multiplicação
    n = n.replace(/(\d)\s*x\s*(?=[\d(])/g, "$1 * ").replace(/(\d)\s*x\s*10\s*\^/g, "$1 * 10 ^");
    // notação científica "1,5 x 10 ao -3" já cai no caso acima; "10 elevado a -3"
    var regras = [
      [/\braiz (quadrada|cubica|quarta|quinta|sexta) (de|do|da)\s+/g, function (_, k) { return " root(" + ({ quadrada: 2, cubica: 3, quarta: 4, quinta: 5, sexta: 6 })[k] + ", "; }, true],
      [/\braiz (de )?indice (\d+(?:[.,]\d+)?) (de|do|da)\s+/g, function (_, a, i) { return " root(" + i + ", "; }, true],
      [/\braiz (\d+)(?:a|o|ª|º)? (de|do|da)\s+/g, function (_, i) { return " root(" + i + ", "; }, true],
      [/\b(raiz quadrada|raiz) (de|do|da)\s+/g, " sqrt(", "f"],
      [/\blog(aritmo)? natural (de|do|da)?\s*/g, " ln(", "f"], [/\bln (de |do |da )?/g, " ln(", "f"],
      [/\blog(aritmo)? na base (\d+(?:[.,]\d+)?) (de|do|da)?\s*/g, function (_, a, b) { return " logb(" + b + ", "; }, true],
      [/\blog(aritmo)? base (\d+(?:[.,]\d+)?) (de|do|da)?\s*/g, function (_, a, b) { return " logb(" + b + ", "; }, true],
      [/\blog(aritmo)? (decimal )?(de|do|da)?\s*(?=-?[\d(])/g, " log(", "f"],
      [/\b(seno|sen) (de |do )?/g, " sin(", "f"], [/\bcosseno (de |do )?/g, " cos(", "f"], [/\bcos (de |do )?/g, " cos(", "f"], [/\btangente (de |do )?/g, " tan(", "f"], [/\btan (de |do )?/g, " tan(", "f"],
      [/\bfatorial (de |do )?/g, " fat(", "f"], [/\bmodulo (de )?(\d+(?:[.,]\d+)?) (por|e|com|dividido por)\s+(\d+(?:[.,]\d+)?)/g, function (_, a, x, b, y) { return " mod(" + x + ", " + y + ") "; }, true],
      [/\bresto (da divisao )?(de )?(\d+(?:[.,]\d+)?) (por|dividido por|e)\s+(\d+(?:[.,]\d+)?)/g, function (_, a, b, x, c, y) { return " mod(" + x + ", " + y + ") "; }, true]
    ];
    var abertos = 0;
    regras.forEach(function (r) {
      var antes = n, rp = r[1];
      if (typeof rp === "function") { var fn0 = rp; rp = function () { var o = fn0.apply(null, arguments); return o.indexOf(")") < 0 ? o.replace("(", "[") : o; }; }
      else if (rp.indexOf(")") < 0) rp = rp.replace("(", "[");
      n = n.replace(r[0], rp);
      if (n !== antes) abertos++;
    });
    // fecha funções abertas por frase ("raiz de 16" -> sqrt(16)): argumento = próximo número/grupo
    n = n.replace(/\b(sqrt|ln|log|sin|cos|tan|fat)\[\s*(-?\d+(?:[.,]\d+)?|\([^()]*\))/g, "$1($2)")
         .replace(/\b(root|logb)\[\s*([\d.,]+),\s*(-?\d+(?:[.,]\d+)?|\([^()]*\))/g, "$1($2, $3)").replace(/\[/g, "(");
    n = n.replace(/\blogb\(/g, "log(").replace(/\b(\d+(?:[.,]\d+)?|\([^()]*\))\s*(graus?|°)/g, "$1");
    if (/\b(radianos?|rad)\b/.test(n)) return null;       // tratado como pedido trigonométrico em radianos pelo chamador
    var subs = [
      [/\b(ao )?quadrado\b/g, " ^ 2 "], [/\b(ao )?cubo\b/g, " ^ 3 "],
      [/\belevad[oa] (a|à|ao|na|para)( potencia( de)?)?\s*/g, " ^ "], [/\belevad[oa] (a|ao)\b/g, " ^ "],
      [/\b(a )?potencia (de )?(\d+(?:[.,]\d+)?)\s+(de|por)\s+(\d+(?:[.,]\d+)?)/g, " $3 ^ $5 "],
      [/\b(multiplicad[oa]s? (por|com|a)|multiplica(r|ndo)?( por)?|vezes|veses|vzs)\b/g, " * "],
      [/\b(dividid[oa]s? (por|em|com|entre)|divide(r|ndo)?( por)?|sobre|dividir por)\b/g, " / "],
      [/\b(mais|somad[oa]s? (a|com)|soma(r|ndo)?( com| a)?|adicionad[oa] a|adiciona)\b/g, " + "],
      [/\b(menos|subtraid[oa]s? (de|por)|subtrai(r|ndo)?( de)?|tirando|tira)\b/g, " - "],
      [/\b(por cento|porcento|porcentos?|pct)\b/g, " % "],
      [/\bpi\b/g, " pi "], [/\bem cima de\b/g, " / "],
      [/\b(elevado|ao|a|de|do|da|e|com|o|os|as)\b(?=\s*$)/g, " "]
    ];
    subs.forEach(function (s) { n = n.replace(s[0], s[1]); });
    n = n.replace(/\bpor\b/g, " / ");           // "20 por 4" -> divisão apenas se sobrar (frases com "vezes" já trocadas)
    n = n.replace(/\s+/g, " ").trim();
    // resíduo de palavras que não são matemática -> não é uma conta pura
    var resto = n.replace(/\b(sqrt|ln|log|sin|cos|tan|fat|root|pi|exp|abs|mod|e)\b/g, "");
    if (/[a-z]/.test(resto)) return null;
    if (!/\d/.test(n)) return null;
    if (!/[+\-*/^()!%]|sqrt|ln|log|sin|cos|tan|fat|root|mod/.test(n)) return null;
    // balanceia parênteses deixados por frases
    var ab = (n.match(/\(/g) || []).length, fe = (n.match(/\)/g) || []).length;
    while (fe < ab) { n += ")"; fe++; }
    return n;
  }

  // ======================= 4. UNIDADES =======================
  // f = fator para a unidade-base da dimensão. Dimensões compostas usam "a/b".
  var U = {};
  function defU(dim, base, mapa) { Object.keys(mapa).forEach(function (k) { U[k] = { dim: dim, f: mapa[k], nome: k, base: base }; }); }
  defU("massa", "g", { kg: 1e3, g: 1, mg: 1e-3, ug: 1e-6, ng: 1e-9, pg: 1e-12, t: 1e6 });
  defU("volume", "L", { l: 1, ml: 1e-3, ul: 1e-6, dl: 0.1, cl: 0.01, m3: 1000, cm3: 1e-3, kl: 1000 });
  defU("comprimento", "m", { km: 1000, m: 1, cm: 0.01, mm: 1e-3, um: 1e-6, nm: 1e-9 });
  defU("tempo", "s", { s: 1, ms: 1e-3, min: 60, h: 3600, d: 86400, sem: 604800 });
  defU("quantidade", "mol", { mol: 1, mmol: 1e-3, umol: 1e-6, nmol: 1e-9, kmol: 1e3 });
  defU("pressao", "Pa", { pa: 1, kpa: 1e3, mpa: 1e6, atm: 101325, mmhg: 133.322368421, torr: 133.322368421, bar: 1e5, mbar: 100, psi: 6894.757 });
  defU("energia", "J", { j: 1, kj: 1e3, cal: 4.184, kcal: 4184, wh: 3600, kwh: 3.6e6 });
  defU("farmaceutica", "UI", { ui: 1 });
  defU("gotas", "gota", { gota: 1 });
  var ALIAS = {
    quilo: "kg", quilos: "kg", quilograma: "kg", quilogramas: "kg", kilo: "kg", kilos: "kg", kg: "kg",
    grama: "g", gramas: "g", g: "g", gr: "g", miligrama: "mg", miligramas: "mg", mg: "mg", micrograma: "ug", microgramas: "ug", mcg: "ug", ug: "ug", "µg": "ug", "μg": "ug",
    nanograma: "ng", nanogramas: "ng", ng: "ng", picograma: "pg", pg: "pg", tonelada: "t", toneladas: "t",
    litro: "l", litros: "l", l: "l", lt: "l", mililitro: "ml", mililitros: "ml", ml: "ml", microlitro: "ul", microlitros: "ul", ul: "ul", "µl": "ul", "μl": "ul",
    decilitro: "dl", decilitros: "dl", dl: "dl", centilitro: "cl", centilitros: "cl", cl: "cl", cc: "ml", m3: "m3", cm3: "cm3",
    quilometro: "km", quilometros: "km", km: "km", metro: "m", metros: "m", m: "m", centimetro: "cm", centimetros: "cm", cm: "cm", milimetro: "mm", milimetros: "mm", mm: "mm",
    micrometro: "um", micrometros: "um", um: "um", "µm": "um", nanometro: "nm", nm: "nm",
    segundo: "s", segundos: "s", s: "s", seg: "s", milissegundo: "ms", milissegundos: "ms", ms: "ms", minuto: "min", minutos: "min", min: "min",
    hora: "h", horas: "h", h: "h", hr: "h", hrs: "h", dia: "d", dias: "d", semana: "sem", semanas: "sem",
    mol: "mol", mols: "mol", moles: "mol", mmol: "mmol", milimol: "mmol", milimols: "mmol", umol: "umol", "µmol": "umol", nmol: "nmol",
    pa: "pa", pascal: "pa", kpa: "kpa", mpa: "mpa", atm: "atm", atmosfera: "atm", atmosferas: "atm", mmhg: "mmhg", torr: "torr", bar: "bar", mbar: "mbar", psi: "psi",
    j: "j", joule: "j", joules: "j", kj: "kj", cal: "cal", caloria: "cal", calorias: "cal", kcal: "kcal", quilocaloria: "kcal", quilocalorias: "kcal", wh: "wh", kwh: "kwh",
    ui: "ui", gota: "gota", gotas: "gota"
  };
  var TEMPS = { c: "c", "°c": "c", celsius: "c", f: "f", "°f": "f", fahrenheit: "f", k: "k", kelvin: "k" };

  // lê "mg/mL", "g/L", "mol/L", "mg por mL"; devolve {dim, f, rot} ou null
  function lerUnidade(txt) {
    var s = semAcento(txt).replace(/\s+/g, "").replace(/[µμ]/g, "u");
    s = s.replace(/por/g, "/");
    if (ALIAS[s]) { var u = U[ALIAS[s]]; return { dim: u.dim, f: u.f, rot: ALIAS[s].replace("ug", "µg").replace("ul", "µL").replace(/^ml$/, "mL").replace(/^l$/, "L").replace("umol", "µmol").replace("um", "µm") }; }
    var m = /^([a-z0-9µ]+)\/([a-z0-9µ]+)$/.exec(s);
    if (m && ALIAS[m[1]] && ALIAS[m[2]]) {
      var a = U[ALIAS[m[1]]], b = U[ALIAS[m[2]]];
      return { dim: a.dim + "/" + b.dim, f: a.f / b.f, rot: rotUn(ALIAS[m[1]]) + "/" + rotUn(ALIAS[m[2]]) };
    }
    return null;
  }
  function rotUn(k) { return ({ ug: "µg", ul: "µL", ml: "mL", l: "L", umol: "µmol", um: "µm", d: "d" })[k] || k; }
  function converter(v, de, para) {
    if (de.dim !== para.dim) erro("UNIDADES", "Unidades incompatíveis: " + de.rot + " (" + de.dim + ") e " + para.rot + " (" + para.dim + ").");
    return v * de.f / para.f;
  }
  function converterTemp(v, de, para) {
    var c = de === "c" ? v : de === "f" ? (v - 32) * 5 / 9 : v - 273.15;
    if (c < -273.15 - 1e-9) erro("DOMINIO", "Temperatura abaixo do zero absoluto.");
    return para === "c" ? c : para === "f" ? c * 9 / 5 + 32 : c + 273.15;
  }

  // ======================= 5. EXTRAÇÃO DE VALORES =======================
  var NUMRE = "(?:\\d+(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:[.,]\\d+)?)";
  // Lista os valores com unidade da frase: [{v, un, ini, antes}]
  function quantidades(n) {
    var t = String(n).replace(/\bmicro\s*(g|l|mol)\b/g, "u$1").replace(/[µμ]/g, "u");
    var re = new RegExp("(-?" + NUMRE + ")(?:\\s*x\\s*10\\^?\\s*(-?\\d+))?\\s*(?:de\\s+)?(%|[a-z]+(?:\\s*/\\s*[a-z0-9]+|\\s+por\\s+[a-z]+)?)?", "g"), out = [], m;
    while ((m = re.exec(t))) {
      var v = lerNumero(m[1]); if (isNaN(v)) continue;
      if (m[2]) v = v * Math.pow(10, Number(m[2]));
      var un = null, cand = m[3] ? m[3].replace(/\s+/g, " ").trim() : "";
      if (cand === "%") un = { dim: "pct", f: 1, rot: "%" };
      else if (cand) {
        un = lerUnidade(cand);
        if (!un) { var p1 = cand.split(/[\s/]/)[0]; var u1 = lerUnidade(p1); if (u1) un = u1; else if (TEMPS[p1]) un = { dim: "temp", f: 1, rot: p1.toUpperCase(), t: TEMPS[p1] }; }
      }
      out.push({ v: v, un: un, ini: m.index, fim: re.lastIndex, antes: t.slice(Math.max(0, m.index - 28), m.index) });
    }
    return out;
  }
  function numeros(n) {
    var r = [], re = new RegExp("(?:^|[^a-z0-9.,])(-?" + NUMRE + ")", "g"), m, t = " " + String(n);
    while ((m = re.exec(t))) { var v = lerNumero(m[1]); if (!isNaN(v)) r.push(v); }
    return r;
  }
  function porDim(qs, dim) { return qs.filter(function (q) { return q.un && q.un.dim === dim; }); }
  function f(x, d) { return fmtNum(x, d); }
  function fq(v, un) { return f(v) + (un ? " " + un.rot : ""); }
  function pedir(txt, chips) { return { pedido: txt, chips: chips }; }
  function res(o) { o.ok = true; return o; }

  // ======================= 6. MASSA MOLAR E ESTEQUIOMETRIA =======================
  var MA = { H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.085,
    P: 30.974, S: 32.06, Cl: 35.45, K: 39.098, Ca: 40.078, Ti: 47.867, Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38,
    Br: 79.904, Ag: 107.87, Sn: 118.71, I: 126.90, Ba: 137.33, Au: 196.97, Hg: 200.59, Pb: 207.2, Se: 78.971, Mo: 95.95, Li2: 6.94 };
  var NOMES = { agua: "H2O", "gas carbonico": "CO2", "dioxido de carbono": "CO2", glicose: "C6H12O6", "sal de cozinha": "NaCl", "cloreto de sodio": "NaCl",
    "hidroxido de sodio": "NaOH", "soda caustica": "NaOH", "acido cloridrico": "HCl", "acido sulfurico": "H2SO4", "acido nitrico": "HNO3", amonia: "NH3", amoniaco: "NH3",
    metano: "CH4", etanol: "C2H6O", "acido acetico": "C2H4O2", "acido acetilsalicilico": "C9H8O4", aas: "C9H8O4", aspirina: "C9H8O4", paracetamol: "C8H9NO2",
    ibuprofeno: "C13H18O2", "cloreto de potassio": "KCl", "bicarbonato de sodio": "NaHCO3", "carbonato de calcio": "CaCO3", "sulfato de cobre": "CuSO4",
    sacarose: "C12H22O11", ureia: "CH4N2O", cafeina: "C8H10N4O2", dipirona: "C13H16N3NaO4S", metformina: "C4H11N5", "cloreto de calcio": "CaCl2", oxigenio: "O2", hidrogenio: "H2", nitrogenio: "N2" };
  function parseFormula(s) {
    var i = 0;
    function grupo() {
      var cont = {};
      while (i < s.length) {
        var c = s.charAt(i);
        if (c === "(" || c === "[") {
          i++; var sub = grupo(), num = lerInt();
          Object.keys(sub).forEach(function (k) { cont[k] = (cont[k] || 0) + sub[k] * num; });
        } else if (c === ")" || c === "]") { i++; return cont; }
        else if (/[A-Z]/.test(c)) {
          var el = c; i++;
          if (/[a-z]/.test(s.charAt(i))) { el += s.charAt(i); i++; }
          if (!Object.prototype.hasOwnProperty.call(MA, el)) erro("DADOS", "Não conheço o elemento '" + el + "'.");
          cont[el] = (cont[el] || 0) + lerInt();
        } else if (c === "." || c === "·") { i++; var m = lerInt(); var resto = grupo(); Object.keys(resto).forEach(function (k) { cont[k] = (cont[k] || 0) + resto[k] * (m || 1); }); return cont; }
        else erro("DADOS", "Fórmula inválida: " + s);
      }
      return cont;
    }
    function lerInt() { var m = /^\d+/.exec(s.slice(i)); if (!m) return 1; i += m[0].length; return Number(m[0]); }
    var c = grupo(); if (!Object.keys(c).length) erro("DADOS", "Fórmula vazia.");
    return c;
  }
  function massaMolar(formula) {
    var c = parseFormula(formula), tot = 0, partes = [];
    Object.keys(c).forEach(function (k) { tot += MA[k] * c[k]; partes.push(c[k] + " × " + k + " (" + f(MA[k]) + ")"); });
    return { mm: tot, partes: partes, formula: formula };
  }
  // procura uma substância (nome conhecido ou fórmula escrita) no texto original
  function acharSubstancia(original) {
    var n = semAcento(original), nomes = Object.keys(NOMES).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < nomes.length; i++) if (new RegExp("\\b" + nomes[i] + "\\b").test(n)) return { nome: nomes[i], formula: NOMES[nomes[i]] };
    var fm = String(original).match(/\b((?:[A-Z][a-z]?\d*|\([A-Za-z0-9]+\)\d*)+(?:\.\d*H2O)?)\b/g) || [];
    for (var j = 0; j < fm.length; j++) {
      var w = fm[j];
      if (/^[A-Z][a-z]?\d*$/.test(w) && !/\d/.test(w) && !/^(H|C|N|O|S|P|K|I|F|B)$/.test(w) && w.length < 2) continue;
      if (/^(Qual|Quantos|Quanto|Calcule|Mol|Se|Em|De|Sei|Tenho|Dado|Dada|Se|Dados|Massa|Molar)$/.test(w)) continue;
      try { massaMolar(w); if (w.length > 1 || /^[A-Z]$/.test(w)) return { nome: w, formula: w }; } catch (_) { /* não é fórmula */ }
    }
    return null;
  }
  var NA = 6.02214076e23;

  // ======================= 7. SOLUCIONADORES: UNIDADES E QUÍMICA =======================
  function solConversao(c) {
    var n = c.n, m, v, de, para, rot = "(?:para|em|a|pra|equivale a|equivalem a|e igual a|igual a|vale em|ficam em|fica em)";
    m = new RegExp("\\bquant[oa]s?\\s+([a-z/ ]{1,12}?)\\s+(?:existem|existe|tem|ha|cabem|cabe|equivalem|equivale|temos|tenho|possui|tem em|ha em)(?:\\s+(?:em|no|na|num|numa))?\\s+(" + NUMRE + ")\\s*([a-z/ ]{1,14})").exec(n);
    if (m) { para = lerUnidade(m[1].trim()); de = lerUnidade(m[3].trim().split(" ")[0]) || lerUnidade(m[3].trim()); v = lerNumero(m[2]); }
    if (!m || !para || !de) {
      m = new RegExp("(-?" + NUMRE + ")\\s*([a-zµμ/°]{1,14})\\s+" + rot + "\\s+([a-zµμ/°]{1,14})\\b").exec(n);
      if (!m) return null;
      v = lerNumero(m[1]);
      var a1 = m[2], b1 = m[3];
      if (TEMPS[a1] && TEMPS[b1] && (a1.length > 1 || b1.length > 1 || /\b(temperatura|graus?|celsius|fahrenheit|kelvin)\b/.test(n))) {
        var r = converterTemp(v, TEMPS[a1], TEMPS[b1]);
        var nm = { c: "°C", f: "°F", k: "K" };
        return res({ id: "conversao", titulo: "Conversão de temperatura", dados: [f(v) + " " + nm[TEMPS[a1]]],
          passos: [tempFormula(TEMPS[a1], TEMPS[b1], v, r)], resultado: f(v) + " " + nm[TEMPS[a1]] + " = " + f(r, { sig: 8 }) + " " + nm[TEMPS[b1]] });
      }
      de = lerUnidade(a1); para = lerUnidade(b1);
      if (!de || !para) return null;
    }
    if (de.dim !== para.dim && ((de.dim === "massa" && para.dim === "quantidade") || (de.dim === "quantidade" && para.dim === "massa")) && acharSubstancia(c.orig)) return null;
    if (de.dim !== para.dim) erro("UNIDADES", "Não dá para converter " + de.rot + " em " + para.rot + ": são grandezas diferentes (" + de.dim + " e " + para.dim + ").");
    var out = converter(v, de, para), fator = de.f / para.f;
    return res({ id: "conversao", titulo: "Conversão de unidades", dados: ["Valor: " + fq(v, de), "Para: " + para.rot],
      passos: ["1 " + de.rot + " = " + f(fator) + " " + para.rot, f(v) + " × " + f(fator) + " = " + f(out)],
      resultado: f(v) + " " + de.rot + " equivalem a " + f(out) + " " + para.rot });
  }
  function tempFormula(a, b, v, r) {
    if (a === b) return "Mesma escala: o valor não muda.";
    if (a === "c" && b === "f") return "°F = °C × 9/5 + 32 = " + f(v) + " × 1,8 + 32 = " + f(r, { sig: 8 });
    if (a === "f" && b === "c") return "°C = (°F − 32) × 5/9 = (" + f(v) + " − 32) × 5/9 = " + f(r, { sig: 8 });
    if (a === "c" && b === "k") return "K = °C + 273,15 = " + f(v) + " + 273,15 = " + f(r, { sig: 8 });
    if (a === "k" && b === "c") return "°C = K − 273,15 = " + f(v) + " − 273,15 = " + f(r, { sig: 8 });
    return "Passa por °C como etapa intermediária.";
  }

  function solMolar(c) {
    var n = c.n, sub = acharSubstancia(c.orig), qs = c.qs;
    var querMM = /\b(massa molar|massa molecular|peso molecular|mm d[aeo]s?|massa atomica)\b/.test(n);
    var mols = /\b(mols?|moles?|quantidade de materia)\b/.test(n), part = /\b(moleculas?|particulas?|atomos?|entidades|avogadro|unidades)\b/.test(n);
    if (!(querMM || mols || part)) return null;
    if (/\b(concentracao|molaridade|molar\b(?!\s*d)|mol\/l|molal|ph|poh|diluic|titul)/.test(n) && !querMM && !part) return null;
    var massa = porDim(qs, "massa")[0], qmol = porDim(qs, "quantidade")[0];
    if (part && !sub && qmol) {
      var N = converter(qmol.v, qmol.un, U.mol && { dim: "quantidade", f: 1, rot: "mol" }) * NA;
      return res({ id: "avogadro", titulo: "Número de partículas", formula: "N = n × N_A  (N_A = 6,022 × 10²³ mol⁻¹)", dados: ["n = " + fq(qmol.v, qmol.un)],
        passos: ["N = " + f(converter(qmol.v, qmol.un, { dim: "quantidade", f: 1, rot: "mol" })) + " × 6,022 × 10²³"], resultado: "≈ " + f(N, { sig: 4 }) + " partículas" });
    }
    if (!sub) return pedir("Qual é a substância? Escreva o nome (ex.: água, glicose) ou a fórmula (ex.: H2SO4) para eu calcular a massa molar.");
    var mm = massaMolar(sub.formula), passosMM = ["Massa molar de " + sub.formula + ": " + mm.partes.join(" + ") + " = " + f(mm.mm, { sig: 6 }) + " g/mol"];
    if (querMM && !massa && !qmol) return res({ id: "massamolar", titulo: "Massa molar de " + sub.formula, dados: ["Fórmula: " + sub.formula], passos: passosMM, resultado: "M = " + f(mm.mm, { sig: 6 }) + " g/mol" });
    if (massa) {
      var g = converter(massa.v, massa.un, { dim: "massa", f: 1, rot: "g" }), mol = g / mm.mm, p = [passosMM[0], "n = m / M = " + f(g) + " g ÷ " + f(mm.mm, { sig: 6 }) + " g/mol = " + f(mol, { sig: 6 }) + " mol"];
      var rr = f(mol, { sig: 6 }) + " mol";
      if (part) { p.push("N = n × N_A = " + f(mol, { sig: 6 }) + " × 6,022 × 10²³"); rr += " ≈ " + f(mol * NA, { sig: 4 }) + " partículas"; }
      return res({ id: "mols", titulo: "Mols a partir da massa", formula: "n = m / M", dados: ["m = " + fq(massa.v, massa.un), "Substância: " + sub.formula], passos: p, resultado: rr, vars: { mol: mol } });
    }
    if (qmol) {
      var mm2 = converter(qmol.v, qmol.un, { dim: "quantidade", f: 1, rot: "mol" }) * mm.mm;
      return res({ id: "massa", titulo: "Massa a partir dos mols", formula: "m = n × M", dados: ["n = " + fq(qmol.v, qmol.un), "Substância: " + sub.formula],
        passos: [passosMM[0], "m = " + f(qmol.v) + " × " + f(mm.mm, { sig: 6 }) + " = " + f(mm2, { sig: 6 }) + " g"], resultado: "m = " + f(mm2, { sig: 6 }) + " g" });
    }
    return pedir("Qual é a massa (em g, mg...) ou a quantidade em mol de " + sub.formula + "?");
  }

  // concentração comum, % m/v, ppm, molar, molal
  function solConcentracao(c) {
    var n = c.n, qs = c.qs;
    var temC = /\b(concentracao|concentrac|titulo|molaridade|molalidade|molal|normalidade|ppm|ppb|porcentagem|percentual|m\/v|m\/m|v\/v|solucao a|solucao de)\b/.test(n);
    var massa = porDim(qs, "massa")[0], vol = porDim(qs, "volume")[0], mol = porDim(qs, "quantidade")[0], cm = porDim(qs, "massa/volume")[0], pct = porDim(qs, "pct")[0];
    if (/\b(diluic|dilui\w*|c1|v1)\b/.test(n)) return null;
    if (/\bnormalidade\b/.test(n)) return pedir("Para a normalidade preciso do equivalente-grama (ou da valência/nº de H⁺ ou OH⁻ por mol): N = (m ÷ Eq) ÷ V. Qual é a substância e quantos equivalentes por mol?");
    if (/\bmolal/.test(n)) {
      var sub0 = acharSubstancia(c.orig), kg = massa && /\b(solvente|agua)\b/.test(n);
      var mols0 = mol ? converter(mol.v, mol.un, { dim: "quantidade", f: 1, rot: "mol" }) : null;
      var ms = porDim(qs, "massa");
      if (mols0 == null && sub0 && ms.length) mols0 = converter(ms[0].v, ms[0].un, { dim: "massa", f: 1, rot: "g" }) / massaMolar(sub0.formula).mm;
      var solv = ms.length > 1 ? ms[ms.length - 1] : (kg ? massa : null);
      if (mols0 == null || !solv) return pedir("Para a molalidade (W = n soluto ÷ massa do solvente em kg) preciso dos mols (ou massa + substância) do soluto e da massa do solvente.");
      var kgS = converter(solv.v, solv.un, { dim: "massa", f: 1e3, rot: "kg" });
      return res({ id: "molalidade", titulo: "Molalidade", formula: "W = n₁ / m₂(kg)", dados: ["n soluto = " + f(mols0, { sig: 6 }) + " mol", "solvente = " + fq(solv.v, solv.un)], passos: ["W = " + f(mols0, { sig: 6 }) + " ÷ " + f(kgS) + " kg"], resultado: "W = " + f(mols0 / kgS, { sig: 6 }) + " mol/kg" });
    }
    if (/\b(ppm|ppb)\b/.test(n)) {
      var ppb = /\bppb\b/.test(n), alvo = ppb ? 1e9 : 1e6, nome = ppb ? "ppb" : "ppm";
      if (massa && qs.filter(function (q) { return q.un && q.un.dim === "massa"; }).length >= 2) {
        var ms2 = porDim(qs, "massa"), a = converter(ms2[0].v, ms2[0].un, { dim: "massa", f: 1, rot: "g" }), b = converter(ms2[1].v, ms2[1].un, { dim: "massa", f: 1, rot: "g" });
        return res({ id: "ppm", titulo: "Concentração em " + nome, formula: nome + " = (m soluto ÷ m total) × 10" + (ppb ? "⁹" : "⁶"), dados: ["soluto = " + fq(ms2[0].v, ms2[0].un), "total = " + fq(ms2[1].v, ms2[1].un)], passos: [f(a) + " ÷ " + f(b) + " × " + f(alvo)], resultado: f(a / b * alvo) + " " + nome });
      }
      if (cm) { var mgL = converter(cm.v, cm.un, { dim: "massa/volume", f: 1e-3 / 1, rot: "mg/L" }); var fatorB = ppb ? 1000 : 1;
        return res({ id: "ppm", titulo: "Concentração em " + nome, dados: [fq(cm.v, cm.un)], passos: ["Em solução aquosa diluída (densidade ≈ 1 g/mL): 1 mg/L ≈ 1 ppm = 1000 ppb", f(cm.v) + " " + cm.un.rot + " = " + f(mgL) + " mg/L"], resultado: "≈ " + f(mgL * fatorB) + " " + nome });
      }
      if (/\b(ppm|ppb)\b.*\b(para|em)\b.*(mg|g|ug)\/(l|ml)/.test(n)) return null;
      return pedir("Para calcular em " + nome + " preciso da massa do soluto e da massa total (ou da concentração em mg/L).");
    }
    // % m/v, m/m, v/v
    var tipoPct = /\bm\/m\b/.test(n) ? "mm" : /\bv\/v\b/.test(n) ? "vv" : /\bm\/v\b/.test(n) ? "mv" : null;
    var preparar = /\b(preparar|preparo|fazer|obter|quanto .*pesar|pesar|soluto .*necessari|quantidade de soluto|quanta massa|quantos gramas)\b/.test(n);
    if (pct && vol && (preparar || /\bsolucao\b/.test(n)) && !massa && tipoPct !== "mm") {
      var Vml = converter(vol.v, vol.un, { dim: "volume", f: 1e-3, rot: "mL" }), g = pct.v * Vml / 100;
      if (tipoPct === "vv") return res({ id: "percentual", titulo: "Preparo de solução % v/v", formula: "volume de soluto = (% ÷ 100) × V", dados: ["% = " + f(pct.v), "V = " + fq(vol.v, vol.un)], passos: [f(pct.v) + " ÷ 100 × " + f(Vml) + " mL"], resultado: f(g) + " mL de soluto, completando até " + f(Vml) + " mL" });
      return res({ id: "percentual", titulo: "Preparo de solução % m/v", formula: "m (g) = (% ÷ 100) × V (mL)", dados: ["% m/v = " + f(pct.v) + " (g em 100 mL)", "V = " + fq(vol.v, vol.un)],
        passos: [f(pct.v) + " g em cada 100 mL", "m = " + f(pct.v) + " ÷ 100 × " + f(Vml) + " mL = " + f(g) + " g"], resultado: "Pesar " + f(g) + " g de soluto e completar o volume até " + f(Vml) + " mL", vars: { pct: pct, vol: vol } });
    }
    if (pct && massa && !vol && tipoPct === "mm" && preparar) {
      var gm = converter(massa.v, massa.un, { dim: "massa", f: 1, rot: "g" });
      return res({ id: "percentual", titulo: "Solução % m/m", formula: "m soluto = (% ÷ 100) × m total", dados: ["% m/m = " + f(pct.v), "m total = " + fq(massa.v, massa.un)], passos: [f(pct.v) + " ÷ 100 × " + f(gm) + " g"], resultado: "m soluto = " + f(pct.v * gm / 100) + " g" });
    }
    if (!temC && !(massa && vol)) return null;
    if (/\bmolar|molaridade|mol\/l\b/.test(n) && !/\bmassa molar\b/.test(n)) {
      var sub = acharSubstancia(c.orig), nmol = mol ? converter(mol.v, mol.un, { dim: "quantidade", f: 1, rot: "mol" }) : null, pas = [];
      if (nmol == null && massa && sub) { var gg = converter(massa.v, massa.un, { dim: "massa", f: 1, rot: "g" }), mmx = massaMolar(sub.formula); nmol = gg / mmx.mm; pas.push("M(" + sub.formula + ") = " + f(mmx.mm, { sig: 6 }) + " g/mol", "n = m ÷ M = " + f(gg) + " ÷ " + f(mmx.mm, { sig: 6 }) + " = " + f(nmol, { sig: 6 }) + " mol"); }
      if (nmol == null) return pedir("Para a concentração molar (mol/L) preciso dos mols do soluto — ou a massa e a substância (nome ou fórmula) — e do volume da solução.");
      if (!vol) return pedir("Qual é o volume da solução (em L ou mL)?");
      var VL = converter(vol.v, vol.un, { dim: "volume", f: 1, rot: "L" });
      if (VL === 0) erro("DIV0", "O volume não pode ser zero.");
      pas.push("[ ] = n ÷ V = " + f(nmol, { sig: 6 }) + " mol ÷ " + f(VL) + " L");
      return res({ id: "molar", titulo: "Concentração molar", formula: "M = n / V", dados: ["V = " + fq(vol.v, vol.un)], passos: pas, resultado: "M = " + f(nmol / VL, { sig: 6 }) + " mol/L", vars: { n: nmol, vol: vol } });
    }
    // concentração comum: C = m / V
    if (cm && vol && /\b(quant\w*|massa|soluto|pesar|preciso)\b/.test(n) && !massa) {
      var mass = cm.v * converter(vol.v, vol.un, { dim: "volume", f: 1, rot: cm.un.rot.split("/")[1] === "mL" ? "mL" : cm.un.rot.split("/")[1] === "L" ? "L" : "L" });
      var den = cm.un.dim.split("/")[1], VV = converter(vol.v, vol.un, { dim: "volume", f: U[den === "volume" ? (/\/ml$/i.test(cm.un.rot) ? "ml" : "l") : "l"].f, rot: cm.un.rot.split("/")[1] });
      return res({ id: "conc", titulo: "Massa de soluto", formula: "m = C × V", dados: ["C = " + fq(cm.v, cm.un), "V = " + fq(vol.v, vol.un)], passos: ["m = " + f(cm.v) + " " + cm.un.rot + " × " + f(VV) + " " + cm.un.rot.split("/")[1]], resultado: "m = " + f(cm.v * VV) + " " + cm.un.rot.split("/")[0] });
    }
    if (!massa && !(mol)) return pedir("Qual é a massa do soluto (mg, g...)?");
    if (!massa) return null;
    if (!vol) return pedir("Qual é o volume da solução (mL ou L)?");
    var Vq = vol.v; if (Vq === 0) erro("DIV0", "O volume não pode ser zero.");
    var C = massa.v / vol.v, gL = converter(massa.v, massa.un, { dim: "massa", f: 1, rot: "g" }) / converter(vol.v, vol.un, { dim: "volume", f: 1, rot: "L" });
    var extra = massa.un.rot + "/" + vol.un.rot !== "g/L" ? ["Em g/L: " + f(gL) + " g/L"] : [];
    return res({ id: "conc", titulo: "Concentração comum", formula: "C = m / V", dados: ["m = " + fq(massa.v, massa.un), "V = " + fq(vol.v, vol.un)],
      passos: ["C = " + f(massa.v) + " " + massa.un.rot + " ÷ " + f(vol.v) + " " + vol.un.rot].concat(extra), resultado: "C = " + f(C, { sig: 8 }) + " " + massa.un.rot + "/" + vol.un.rot,
      vars: { massa: massa, vol: vol }, ctx: { tipo: "conc", a: { v: massa.v, un: massa.un, nome: "massa" }, b: { v: vol.v, un: vol.un, nome: "volume" }, razao: razaoConc, formula: "C = m / V", simbolo: "C" } });
  }

  // C1·V1 = C2·V2
  function solDiluicao(c) {
    var n = c.n, qs = c.qs;
    if (!/\b(diluic|dilui\w*|diluir|c1|v1|estoque|solucao[- ]mae|concentrad\w*)\b/.test(n) && !/c1\s*[*x×]?\s*v1/.test(n)) return null;
    var cs = qs.filter(function (q) { return q.un && /\//.test(q.un.dim) && /massa|quantidade/.test(q.un.dim); }), vs = porDim(qs, "volume"), ps = porDim(qs, "pct");
    var C1, C2, V1, V2;
    var papel = function (q) { var a = q.antes; return /(final|quero|desejo|preciso|obter|preparar|desejad|alvo)\s*\w*\s*\w*\s*$/.test(a) ? 2 : /(inicial|estoque|tenho|concentrad|mae|disponivel|dispon)\s*\w*\s*\w*\s*$/.test(a) ? 1 : 0; };
    cs.forEach(function (q) { var r = papel(q); if (r === 1 && !C1) C1 = q; else if (r === 2 && !C2) C2 = q; });
    cs.forEach(function (q) { if (q !== C1 && q !== C2) { if (!C1) C1 = q; else if (!C2) C2 = q; } });
    vs.forEach(function (q) { var r = papel(q); if (r === 1 && !V1) V1 = q; else if (r === 2 && !V2) V2 = q; });
    if (cs.length === 0 && ps.length >= 1) { ps.forEach(function (q) { var r = papel(q); if (!C1 && r !== 2) C1 = q; else if (!C2) C2 = q; }); }
    vs.forEach(function (q) { if (q !== V1 && q !== V2) { if (!V2 && C2 && !V1) V2 = q; else if (!V1) V1 = q; else if (!V2) V2 = q; } });
    var falta = [!C1 && "C1", !C2 && "C2", !V1 && "V1", !V2 && "V2"].filter(Boolean);
    if (falta.length !== 1) {
      if (falta.length === 0) return pedir("Você já deu C1, V1, C2 e V2 — o que quer descobrir? Diga qual deles calcular.");
      return pedir("Para diluir uso C₁·V₁ = C₂·V₂ e preciso de três valores. Ainda faltam: " + falta.join(", ") + ". (C₁ = concentração da solução estoque, C₂ = final; V₁ = volume a retirar, V₂ = volume final.)");
    }
    var un = function (q) { return q.un; };
    var uc = (C1 || C2).un, uv = (V1 || V2).un, qq;
    var cc = function (q) { return q.un.dim === "pct" ? q.v : converter(q.v, q.un, uc); };
    var vv = function (q) { return converter(q.v, q.un, uv); };
    var x, nome, rotX, formulaSub;
    if (falta[0] === "V1") { x = cc(C2) * vv(V2) / cc(C1); nome = "V₁"; rotX = uv.rot; formulaSub = "V₁ = (C₂ × V₂) ÷ C₁ = (" + f(cc(C2)) + " × " + f(vv(V2)) + ") ÷ " + f(cc(C1)); }
    else if (falta[0] === "V2") { x = cc(C1) * vv(V1) / cc(C2); nome = "V₂"; rotX = uv.rot; formulaSub = "V₂ = (C₁ × V₁) ÷ C₂ = (" + f(cc(C1)) + " × " + f(vv(V1)) + ") ÷ " + f(cc(C2)); }
    else if (falta[0] === "C1") { x = cc(C2) * vv(V2) / vv(V1); nome = "C₁"; rotX = uc.rot; formulaSub = "C₁ = (C₂ × V₂) ÷ V₁ = (" + f(cc(C2)) + " × " + f(vv(V2)) + ") ÷ " + f(vv(V1)); }
    else { x = cc(C1) * vv(V1) / vv(V2); nome = "C₂"; rotX = uc.rot; formulaSub = "C₂ = (C₁ × V₁) ÷ V₂ = (" + f(cc(C1)) + " × " + f(vv(V1)) + ") ÷ " + f(vv(V2)); }
    if (!isFinite(x)) erro("DIV0", "Divisão por zero na diluição (confira se C₁ ou V não são zero).");
    var dados = []; [["C₁", C1], ["V₁", V1], ["C₂", C2], ["V₂", V2]].forEach(function (p) { if (p[1]) dados.push(p[0] + " = " + fq(p[1].v, p[1].un)); });
    var passos = [formulaSub + " = " + f(x, { sig: 8 }) + " " + rotX], extra = "";
    if (nome === "V₁" && V2) { var solv = vv(V2) - x; passos.push("Solvente a adicionar = V₂ − V₁ = " + f(vv(V2)) + " − " + f(x, { sig: 8 }) + " = " + f(solv, { sig: 8 }) + " " + uv.rot); extra = "; completar com " + f(solv, { sig: 8 }) + " " + uv.rot + " de solvente"; if (x > vv(V2) + 1e-12) passos.push("⚠ V₁ maior que V₂: não é diluição (C₂ maior que C₁)."); }
    return res({ id: "diluicao", titulo: "Diluição", formula: "C₁ · V₁ = C₂ · V₂", dados: dados, passos: passos, resultado: nome + " = " + f(x, { sig: 8 }) + " " + rotX + extra });
  }

  // ======================= 8. pH, FARMACOCINÉTICA, FARMACOTÉCNICA =======================
  function solPH(c) {
    var n = c.n, qs = c.qs;
    if (!/\b(ph|poh|tampao|henderson|hasselbalch|pka|h\+|oh-|\[h|\[oh)\b/.test(n) && !/\bph\b/.test(n)) return null;
    var pka = /\bpka\s*(?:=|de|e)?\s*(-?\d+(?:[.,]\d+)?)/.exec(n);
    if (pka || /\b(tampao|henderson|hasselbalch)\b/.test(n)) {
      if (!pka) return pedir("Para o tampão (Henderson-Hasselbalch: pH = pKa + log([base]/[ácido])) preciso do pKa, da concentração da base conjugada e da do ácido.");
      var b = new RegExp("\\b(?:base|sal|conjugada|acetato|a-|forma ionizada)\\b[^0-9]{0,30}(" + NUMRE + ")").exec(n), a = new RegExp("\\b(?:acido|ha|forma nao ionizada)\\b[^0-9]{0,30}(" + NUMRE + ")").exec(n);
      if (!b || !a) return pedir("Preciso das concentrações da base conjugada e do ácido (ex.: \"base 0,2 mol/L e ácido 0,1 mol/L\").");
      var B = lerNumero(b[1]), A = lerNumero(a[1]), pk = lerNumero(pka[1]);
      if (B <= 0 || A <= 0) erro("DOMINIO", "As concentrações precisam ser positivas.");
      var ph = pk + Math.log10(B / A);
      return res({ id: "tampao", titulo: "Solução tampão (Henderson-Hasselbalch)", formula: "pH = pKa + log([base] / [ácido])", dados: ["pKa = " + f(pk), "[base] = " + f(B) + " mol/L", "[ácido] = " + f(A) + " mol/L"],
        passos: ["pH = " + f(pk) + " + log(" + f(B) + " ÷ " + f(A) + ")", "log(" + f(B / A, { sig: 6 }) + ") = " + f(Math.log10(B / A), { sig: 6 })], resultado: "pH = " + f(ph, { sig: 5 }) });
    }
    var mpH = /\bph\s*(?:=|de|e|igual a)?\s*(-?\d+(?:[.,]\d+)?)\b(?!\s*(?:mol|m\b))/.exec(n), mpOH = /\bpoh\s*(?:=|de|e|igual a)?\s*(-?\d+(?:[.,]\d+)?)/.exec(n);
    var querConc = /\b(concentracao|\[h|h\+|\[oh|oh-|quanto vale a conc)/.test(n);
    var concs = qs.filter(function (q) { return q.un && (q.un.dim === "quantidade/volume"); });
    if (mpOH && querConc) { var pOH0 = lerNumero(mpOH[1]); return res({ id: "ph", titulo: "[OH⁻] a partir do pOH", formula: "[OH⁻] = 10^(−pOH)", dados: ["pOH = " + f(pOH0)], passos: ["[OH⁻] = 10^(−" + f(pOH0) + ")"], resultado: "[OH⁻] = " + f(Math.pow(10, -pOH0), { sig: 6 }) + " mol/L" }); }
    if (mpH && querConc && !concs.length) { var p0 = lerNumero(mpH[1]); return res({ id: "ph", titulo: "[H⁺] a partir do pH", formula: "[H⁺] = 10^(−pH)", dados: ["pH = " + f(p0)], passos: ["[H⁺] = 10^(−" + f(p0) + ")"], resultado: "[H⁺] = " + f(Math.pow(10, -p0), { sig: 6 }) + " mol/L" }); }
    if (mpH && /\b(poh)\b/.test(n) && !mpOH) { var pp = lerNumero(mpH[1]); return res({ id: "ph", titulo: "pOH a partir do pH", formula: "pH + pOH = 14 (a 25 °C)", dados: ["pH = " + f(pp)], passos: ["pOH = 14 − " + f(pp)], resultado: "pOH = " + f(14 - pp) }); }
    var q0 = concs[0] || (qs.filter(function (q) { return q.un && q.un.dim === "quantidade/volume"; })[0]);
    var valor = q0 ? converter(q0.v, q0.un, { dim: "quantidade/volume", f: 1, rot: "mol/L" }) : null;
    if (valor == null) { var m = new RegExp("(" + NUMRE + ")\\s*(?:mol/l|molar|m\\b|mol por litro)").exec(n); if (m) valor = lerNumero(m[1]); }
    if (valor == null) { var m2 = new RegExp("\\[(?:h\\+?|oh-?)\\]\\s*=?\\s*(" + NUMRE + "(?:\\s*e\\s*-?\\d+)?)").exec(n); if (m2) valor = lerNumero(m2[1].replace(/\s*e\s*/, "e")); }
    if (valor == null) return pedir("Qual é a concentração de H⁺ ou OH⁻ (em mol/L)? Com ela eu calculo o pH/pOH. Se for um ácido/base, diga também qual é.");
    if (valor <= 0) erro("DOMINIO", "A concentração precisa ser maior que zero para calcular o pH.");
    var base = /\b(oh|base|hidroxido|naoh|koh|poh)\b/.test(n) && !/\bacido\b/.test(n);
    if (base) { var pOH = -Math.log10(valor), pH = 14 - pOH;
      return res({ id: "ph", titulo: "pOH e pH de uma base", formula: "pOH = −log[OH⁻]; pH = 14 − pOH (25 °C)", dados: ["[OH⁻] = " + f(valor) + " mol/L (base forte, dissociação total)"], passos: ["pOH = −log(" + f(valor) + ") = " + f(pOH, { sig: 6 }), "pH = 14 − " + f(pOH, { sig: 6 })], resultado: "pH = " + f(pH, { sig: 5 }) + "  (pOH = " + f(pOH, { sig: 5 }) + ")" }); }
    var pHa = -Math.log10(valor);
    return res({ id: "ph", titulo: "pH de um ácido", formula: "pH = −log[H⁺]", dados: ["[H⁺] = " + f(valor) + " mol/L (ácido forte monoprótico, dissociação total)"], passos: ["pH = −log(" + f(valor) + ")"], resultado: "pH = " + f(pHa, { sig: 5 }) + "  (pOH = " + f(14 - pHa, { sig: 5 }) + " a 25 °C)" });
  }

  function solFarmacocinetica(c) {
    var n = c.n, qs = c.qs, tempos = porDim(qs, "tempo");
    var t12 = /\b(meia[- ]?vida|t1\/2|t 1\/2|t½)\b/.test(n), ke = /\b(constante de eliminacao|ke|kel)\b/.test(n), cl = /\bclearance|depuracao\b/.test(n), vd = /\b(volume de distribuicao|vd)\b/.test(n), auc = /\bauc\b|area sob a curva/.test(n), bio = /\bbiodisponibilidade\b/.test(n);
    if (!(t12 || ke || cl || vd || auc || bio)) return null;
    var massas = porDim(qs, "massa"), vols = porDim(qs, "volume"), cm = porDim(qs, "massa/volume");
    var LN2 = Math.LN2;
    if (bio) {
      var m = new RegExp("auc\\s*(?:oral|vo|po)[^0-9]{0,12}(" + NUMRE + ")").exec(n), m2 = new RegExp("auc\\s*(?:iv|intravenos\\w*|endovenos\\w*)[^0-9]{0,12}(" + NUMRE + ")").exec(n);
      if (!m || !m2) return pedir("Para a biodisponibilidade (F = AUC_oral·Dose_iv ÷ AUC_iv·Dose_oral) preciso de AUC oral, AUC intravenosa e as doses (ou diga que as doses são iguais). Ex.: \"AUC oral 40, AUC iv 100, mesma dose\".");
      var ao = lerNumero(m[1]), ai = lerNumero(m2[1]), dd = /\b(mesma dose|doses iguais|mesmas doses)\b/.test(n);
      var dOral = new RegExp("dose\\s*(?:oral|vo|po)[^0-9]{0,12}(" + NUMRE + ")").exec(n), dIv = new RegExp("dose\\s*(?:iv|intravenos\\w*)[^0-9]{0,12}(" + NUMRE + ")").exec(n);
      if (!dd && !(dOral && dIv)) return pedir("As doses oral e intravenosa são iguais? Se não, informe cada uma (ex.: \"dose oral 500, dose iv 100\").");
      var F = dd ? ao / ai : (ao * lerNumero(dIv[1])) / (ai * lerNumero(dOral[1]));
      return res({ id: "biodisp", titulo: "Biodisponibilidade", formula: "F = (AUC_oral × Dose_iv) / (AUC_iv × Dose_oral)", dados: ["AUC oral = " + f(ao), "AUC iv = " + f(ai), dd ? "Doses iguais" : "Dose oral = " + f(lerNumero(dOral[1])) + "; dose iv = " + f(lerNumero(dIv[1]))],
        passos: ["F = " + f(ao) + " ÷ " + f(ai) + (dd ? "" : " × " + f(lerNumero(dIv[1])) + " ÷ " + f(lerNumero(dOral[1])))], resultado: "F = " + f(F, { sig: 6 }) + " (" + f(F * 100, { sig: 5 }) + " %)" });
    }
    if (auc) {
      var lt = /tempos?\s*[:=]?\s*([\d.,;\s]+?)(?:\s+(?:e\s+)?(?:concentracoes?|conc)|$)/.exec(n), lc = /concentra\w*\s*[:=]?\s*([\d.,;\s]+)$/.exec(n);
      if (!lt || !lc) return pedir("Para a AUC (regra dos trapézios) informe os tempos e as concentrações. Ex.: \"AUC tempos 0, 1, 2, 4 concentrações 10, 8, 6, 3\".");
      var T = lt[1].split(/[;\s]+|,\s+/).map(lerNumero).filter(function (x) { return !isNaN(x); }), Cc = lc[1].split(/[;\s]+|,\s+/).map(lerNumero).filter(function (x) { return !isNaN(x); });
      if (T.length !== Cc.length || T.length < 2) return pedir("A lista de tempos e a de concentrações precisam ter o mesmo tamanho (mínimo 2 pontos).");
      var tot = 0, pas = [];
      for (var i = 1; i < T.length; i++) { var a = (T[i] - T[i - 1]) * (Cc[i] + Cc[i - 1]) / 2; tot += a; pas.push("[" + f(T[i - 1]) + "→" + f(T[i]) + "]: (" + f(Cc[i - 1]) + " + " + f(Cc[i]) + ")/2 × " + f(T[i] - T[i - 1]) + " = " + f(a)); }
      return res({ id: "auc", titulo: "AUC pela regra dos trapézios", formula: "AUC = Σ (Cᵢ + Cᵢ₊₁)/2 × Δt", dados: ["t = " + T.map(f).join("; "), "C = " + Cc.map(f).join("; ")], passos: pas, resultado: "AUC₀–" + f(T[T.length - 1]) + " = " + f(tot, { sig: 8 }) });
    }
    if (cl) {
      var kk = /\b(?:ke|kel|constante de eliminacao)\s*(?:=|de|e)?\s*(-?\d+(?:[.,]\d+)?)/.exec(n), vdm = new RegExp("\\bvd\\s*(?:=|de|e)?\\s*(" + NUMRE + ")\\s*([a-z]+)").exec(n);
      if (kk && (vdm || vols.length)) { var K = lerNumero(kk[1]), VD = vdm ? lerNumero(vdm[1]) : vols[0].v, uVD = vdm ? vdm[2] : vols[0].un.rot;
        return res({ id: "clearance", titulo: "Clearance (depuração)", formula: "CL = ke × Vd", dados: ["ke = " + f(K) + " (unidade de tempo⁻¹)", "Vd = " + f(VD) + " " + uVD], passos: ["CL = " + f(K) + " × " + f(VD)], resultado: "CL = " + f(K * VD, { sig: 6 }) + " " + uVD + "/(unidade de tempo de ke)" }); }
      var dose = new RegExp("dose\\s*(?:=|de)?\\s*(" + NUMRE + ")").exec(n), au = new RegExp("auc\\s*(?:=|de)?\\s*(" + NUMRE + ")").exec(n);
      if (dose && au) { var D = lerNumero(dose[1]), AU = lerNumero(au[1]); if (AU === 0) erro("DIV0", "A AUC não pode ser zero."); return res({ id: "clearance", titulo: "Clearance a partir da AUC", formula: "CL = Dose / AUC", dados: ["Dose = " + f(D), "AUC = " + f(AU)], passos: ["CL = " + f(D) + " ÷ " + f(AU)], resultado: "CL = " + f(D / AU, { sig: 6 }) }); }
      return pedir("Para o clearance preciso de ke e Vd (CL = ke × Vd) ou de dose e AUC (CL = Dose ÷ AUC).");
    }
    if (vd && !t12) {
      var dm = massas[0], c0 = new RegExp("(?:c0|concentracao (?:inicial|plasmatica))\\s*(?:=|de)?\\s*(" + NUMRE + ")\\s*([a-z]+/[a-z]+)").exec(n) || null, c0q = cm[0];
      if (dm && (c0q || c0)) { var cc = c0q || { v: lerNumero(c0[1]), un: lerUnidade(c0[2]) }; if (!cc.un) return null; var gD = dm.v, den = U[cc.un.rot.split("/")[1] === "mL" ? "ml" : "l"];
        var vdv = converter(gD, dm.un, { dim: "massa", f: U[cc.un.rot.split("/")[0].replace("µg", "ug")].f, rot: cc.un.rot.split("/")[0] }) / cc.v;
        return res({ id: "vd", titulo: "Volume de distribuição", formula: "Vd = Dose / C₀", dados: ["Dose = " + fq(dm.v, dm.un), "C₀ = " + fq(cc.v, cc.un)], passos: ["Vd = " + f(converter(dm.v, dm.un, { dim: "massa", f: U[cc.un.rot.split("/")[0].replace("µg", "ug")].f, rot: cc.un.rot.split("/")[0] })) + " ÷ " + f(cc.v)], resultado: "Vd = " + f(vdv, { sig: 6 }) + " " + cc.un.rot.split("/")[1] }); }
      return pedir("Para o volume de distribuição (Vd = Dose ÷ C₀) preciso da dose e da concentração plasmática inicial. Ex.: \"dose 500 mg, C0 10 mg/L\".");
    }
    // meia-vida <-> ke e decaimento
    var kv = /\b(?:ke|kel|constante de eliminacao)\s*(?:=|de|e|igual a)?\s*(-?\d+(?:[.,]\d+)?)/.exec(n);
    var th = tempos[0];
    if (kv && th && Math.abs(th.v - lerNumero(kv[1])) < 1e-12) th = null;   // "ke = 0,1 h⁻¹": o "h" é a unidade de ke, não um tempo informado
    if (/\b(quanto resta|restam|sobra|concentracao apos|depois de|apos|decorridas?|passadas?)\b/.test(n) && (th || kv) && massas.length) {
      var th2 = tempos[0], tt = tempos[1] || null;
      if (!tt) return pedir("Preciso do tempo decorrido (além da meia-vida) para calcular quanto resta.");
      var dose0 = massas[0], tmeia = converter(th2.v, th2.un, { dim: "tempo", f: 1, rot: "s" }), tdec = converter(tt.v, tt.un, { dim: "tempo", f: 1, rot: "s" });
      var rest = dose0.v * Math.pow(0.5, tdec / tmeia);
      return res({ id: "decaimento", titulo: "Decaimento de primeira ordem", formula: "C = C₀ × (1/2)^(t / t½)", dados: ["C₀ = " + fq(dose0.v, dose0.un), "t½ = " + fq(th2.v, th2.un), "t = " + fq(tt.v, tt.un)], passos: ["Meias-vidas decorridas = " + f(tdec / tmeia), "C = " + f(dose0.v) + " × 0,5^" + f(tdec / tmeia)], resultado: "Resta " + f(rest, { sig: 6 }) + " " + dose0.un.rot + " (" + f(rest / dose0.v * 100, { sig: 5 }) + " %)" });
    }
    if (t12 && th) { var tm = th.v; if (tm <= 0) erro("DOMINIO", "A meia-vida precisa ser positiva.");
      return res({ id: "ke", titulo: "Constante de eliminação", formula: "ke = ln 2 / t½  ≈ 0,693 / t½", dados: ["t½ = " + fq(th.v, th.un)], passos: ["ke = 0,693147 ÷ " + f(tm)], resultado: "ke = " + f(LN2 / tm, { sig: 6 }) + " " + th.un.rot + "⁻¹" }); }
    if (kv && (!t12 || !th)) { var kx = lerNumero(kv[1]); var uk = /\b(?:ke|kel)\s*(?:=|de|e|igual a)?\s*-?\d+(?:[.,]\d+)?\s*([a-z]+)\s*(?:\^?\s*-1|⁻¹)/.exec(n); if (kx <= 0) erro("DOMINIO", "ke precisa ser positivo."); return res({ id: "t12", titulo: "Meia-vida", formula: "t½ = ln 2 / ke", dados: ["ke = " + f(kx) + " (por unidade de tempo)"], passos: ["t½ = 0,693147 ÷ " + f(kx)], resultado: "t½ = " + f(LN2 / kx, { sig: 6 }) + (uk ? " " + uk[1] : " (na mesma unidade de tempo de ke)") }); }
    return pedir("Qual é a meia-vida (ex.: 6 h) ou a constante de eliminação ke?");
  }

  function solFarmacotecnica(c) {
    var n = c.n, qs = c.qs;
    if (/\bfator de correcao|\bfc\b/.test(n)) {
      var pur = porDim(qs, "pct")[0];
      if (!pur) return pedir("O fator de correção depende da pureza (e/ou do teor de água). Qual é a pureza da matéria-prima, em %?");
      var fc = 100 / pur.v; if (pur.v <= 0) erro("DIV0", "A pureza não pode ser zero.");
      var ms = porDim(qs, "massa")[0], p = ["FC = 100 ÷ " + f(pur.v) + " = " + f(fc, { sig: 6 })], r = "FC = " + f(fc, { sig: 6 });
      if (ms) { p.push("Massa a pesar = " + f(ms.v) + " " + ms.un.rot + " × " + f(fc, { sig: 6 })); r += "; pesar " + f(ms.v * fc, { sig: 6 }) + " " + ms.un.rot; }
      return res({ id: "fc", titulo: "Fator de correção (pureza)", formula: "FC = 100 / pureza(%)", dados: ["Pureza = " + f(pur.v) + " %"], passos: p, resultado: r });
    }
    if (/\bfator de equivalencia|\bfe\b/.test(n)) {
      var a = /\b(?:sal|forma salina)\b[^0-9]{0,15}(\d+(?:[.,]\d+)?)/.exec(n), b = /\b(?:base|forma base|principio ativo)\b[^0-9]{0,15}(\d+(?:[.,]\d+)?)/.exec(n);
      if (!a || !b) return pedir("Para o fator de equivalência (FE = massa molar do sal ÷ massa molar da base) preciso das duas massas molares. Ex.: \"sal 450, base 400\".");
      var fe = lerNumero(a[1]) / lerNumero(b[1]); return res({ id: "fe", titulo: "Fator de equivalência", formula: "FE = MM(sal) / MM(base)", dados: ["MM sal = " + a[1], "MM base = " + b[1]], passos: ["FE = " + a[1] + " ÷ " + b[1]], resultado: "FE = " + f(fe, { sig: 6 }) });
    }
    if (/\bcapsulas?\b/.test(n)) {
      var nc = /(\d+)\s*capsulas?/.exec(n), dose = porDim(qs, "massa")[0];
      if (!nc || !dose) return pedir("Quantas cápsulas e qual a dose de princípio ativo por cápsula (ex.: 250 mg)?");
      var N = Number(nc[1]), tot = dose.v * N;
      return res({ id: "capsulas", titulo: "Matéria-prima para cápsulas", formula: "massa total = dose por cápsula × nº de cápsulas", dados: ["Dose = " + fq(dose.v, dose.un), "Cápsulas = " + N], passos: [f(dose.v) + " × " + N], resultado: f(tot) + " " + dose.un.rot + (dose.un.rot === "mg" && tot >= 1000 ? " (= " + f(tot / 1000) + " g)" : "") + " de princípio ativo (sem correção de pureza nem excesso)" });
    }
    if (/\bdensidade\b/.test(n)) {
      var ms2 = porDim(qs, "massa")[0], v2 = porDim(qs, "volume")[0], dq = porDim(qs, "massa/volume")[0];
      if (ms2 && v2) { var g = converter(ms2.v, ms2.un, { dim: "massa", f: 1, rot: "g" }), ml = converter(v2.v, v2.un, { dim: "volume", f: 1e-3, rot: "mL" }); if (ml === 0) erro("DIV0", "O volume não pode ser zero.");
        return res({ id: "densidade", titulo: "Densidade", formula: "d = m / V", dados: ["m = " + fq(ms2.v, ms2.un), "V = " + fq(v2.v, v2.un)], passos: ["d = " + f(g) + " g ÷ " + f(ml) + " mL"], resultado: "d = " + f(g / ml, { sig: 6 }) + " g/mL", vars: { m: ms2, V: v2 } }); }
      if (dq && v2) { var gm = dq.v * converter(1, dq.un, { dim: "massa/volume", f: 1e-3 / 1e-3, rot: "g/mL" }) * converter(v2.v, v2.un, { dim: "volume", f: 1e-3, rot: "mL" }); return res({ id: "densidade", titulo: "Massa a partir da densidade", formula: "m = d × V", dados: [fq(dq.v, dq.un), fq(v2.v, v2.un)], passos: ["m = d × V"], resultado: "m = " + f(gm, { sig: 6 }) + " g" }); }
      if (dq && ms2) { var gg = converter(ms2.v, ms2.un, { dim: "massa", f: 1, rot: "g" }), den = converter(dq.v, dq.un, { dim: "massa/volume", f: 1, rot: "g/mL" }); return res({ id: "densidade", titulo: "Volume a partir da densidade", formula: "V = m / d", dados: [fq(ms2.v, ms2.un), fq(dq.v, dq.un)], passos: ["V = " + f(gg) + " ÷ " + f(den)], resultado: "V = " + f(gg / den, { sig: 6 }) + " mL" }); }
      return pedir("Para a densidade (d = m ÷ V) preciso da massa e do volume.");
    }
    if (/\b(rendimento|pureza)\b/.test(n)) {
      var ms3 = porDim(qs, "massa"), pc = porDim(qs, "pct")[0], isPur = /\bpureza\b/.test(n);
      if (isPur && ms3.length >= 2) { var a1 = converter(ms3[0].v, ms3[0].un, { dim: "massa", f: 1, rot: "g" }), b1 = converter(ms3[1].v, ms3[1].un, { dim: "massa", f: 1, rot: "g" }); return res({ id: "pureza", titulo: "Pureza", formula: "pureza = (m pura ÷ m da amostra) × 100", dados: ["m pura = " + fq(ms3[0].v, ms3[0].un), "m amostra = " + fq(ms3[1].v, ms3[1].un)], passos: [f(a1) + " ÷ " + f(b1) + " × 100"], resultado: "Pureza = " + f(a1 / b1 * 100, { sig: 6 }) + " %" }); }
      if (isPur && pc && ms3.length === 1) return res({ id: "pureza", titulo: "Massa pura", formula: "m pura = m amostra × pureza/100", dados: [fq(ms3[0].v, ms3[0].un), "pureza " + f(pc.v) + " %"], passos: [f(ms3[0].v) + " × " + f(pc.v) + " ÷ 100"], resultado: f(ms3[0].v * pc.v / 100, { sig: 6 }) + " " + ms3[0].un.rot + " de substância pura" });
      if (!isPur && ms3.length >= 2) { var real = /\b(real|obtid\w+|isolad\w+|experiment\w+)\b/, rr, tt; var o = ms3.map(function (q) { return { q: q, real: /(real|obtid\w*|isolad\w*|experiment\w*)\s*\w*\s*\w*\s*$/.test(q.antes) }; });
        var R = o.filter(function (x) { return x.real; })[0], Tq = o.filter(function (x) { return !x.real; })[0];
        if (!R || !Tq) return pedir("Qual é a massa obtida (real) e qual é a massa teórica? Rendimento = (real ÷ teórico) × 100.");
        var r1 = converter(R.q.v, R.q.un, { dim: "massa", f: 1, rot: "g" }), t1 = converter(Tq.q.v, Tq.q.un, { dim: "massa", f: 1, rot: "g" });
        return res({ id: "rendimento", titulo: "Rendimento percentual", formula: "η = (real ÷ teórico) × 100", dados: ["Real = " + fq(R.q.v, R.q.un), "Teórico = " + fq(Tq.q.v, Tq.q.un)], passos: [f(r1) + " ÷ " + f(t1) + " × 100"], resultado: "η = " + f(r1 / t1 * 100, { sig: 6 }) + " %" }); }
      return pedir("Para o rendimento preciso da massa real (obtida) e da massa teórica; para a pureza, da massa pura e da massa da amostra.");
    }
    return null;
  }

  // ======================= 9. MATEMÁTICA E ESTATÍSTICA =======================
  function listaNumeros(n) { return numeros(n.replace(/\b(\d+)\s*(?:o|a)\b/g, "$1")); }
  function exato(x) { return fmtNum(x, { sig: 12 }); }

  function solPorcentagem(c) {
    var n = c.n;
    var N = NUMRE, m;
    if ((m = new RegExp("variacao\\s+(?:percentual\\s+)?(?:de|entre)\\s+(-?" + N + ")\\s+(?:para|a|e|ate)\\s+(-?" + N + ")").exec(n)) ||
        (m = new RegExp("(?:de|foi de)\\s+(-?" + N + ")\\s+(?:para|a|ate)\\s+(-?" + N + ")[^0-9]*(?:variacao|aumento|reducao|crescimento|queda)").exec(n))) {
      var a = lerNumero(m[1]), b = lerNumero(m[2]); if (a === 0) erro("DIV0", "A variação percentual não é definida quando o valor inicial é zero.");
      var v = (b - a) / Math.abs(a) * 100;
      return res({ id: "variacao", titulo: "Variação percentual", formula: "Δ% = (final − inicial) ÷ inicial × 100", dados: ["Inicial = " + f(a), "Final = " + f(b)], passos: ["(" + f(b) + " − " + f(a) + ") ÷ " + f(Math.abs(a)) + " × 100"], resultado: (v >= 0 ? "Aumento de " : "Redução de ") + f(Math.abs(v), { sig: 8 }) + " %  (Δ% = " + f(v, { sig: 8 }) + " %)" });
    }
    if ((m = new RegExp("(-?" + N + ")\\s*(?:e|eh)\\s+(?:quantos|quanto)\\s+(?:por cento|%|porcento)\\s+(?:de|do|da)\\s+(-?" + N + ")").exec(n)) ||
        (m = new RegExp("(?:quanto por cento|quantos por cento|quantos %|qual (?:a )?porcentagem)\\s+(?:que\\s+)?(-?" + N + ")\\s+(?:representa|e|eh|corresponde)\\s+(?:de|do|da|em)\\s+(-?" + N + ")").exec(n)) ||
        (m = new RegExp("(-?" + N + ")\\s+(?:representa|corresponde a)\\s+quantos\\s+(?:por cento|%)\\s+(?:de|do|da)\\s+(-?" + N + ")").exec(n))) {
      var p = lerNumero(m[1]), t = lerNumero(m[2]); if (t === 0) erro("DIV0", "Não existe porcentagem de zero.");
      return res({ id: "percentual", titulo: "Que porcentagem é", formula: "% = parte ÷ total × 100", dados: ["Parte = " + f(p), "Total = " + f(t)], passos: [f(p) + " ÷ " + f(t) + " × 100"], resultado: f(p / t * 100, { sig: 8 }) + " %" });
    }
    if ((m = new RegExp("(-?" + N + ")\\s*(?:e|eh)\\s+(" + N + ")\\s*(?:%|por cento)\\s+de\\s+quanto").exec(n))) {
      var parte = lerNumero(m[1]), pp = lerNumero(m[2]); if (pp === 0) erro("DIV0", "Zero por cento de qualquer valor é zero.");
      return res({ id: "percentual", titulo: "Valor total a partir da porcentagem", formula: "total = parte ÷ (% ÷ 100)", dados: ["Parte = " + f(parte), "% = " + f(pp)], passos: [f(parte) + " ÷ (" + f(pp) + " ÷ 100)"], resultado: "Total = " + f(parte / (pp / 100), { sig: 8 }) });
    }
    if ((m = new RegExp("(aumento|acrescimo|reajuste|desconto|reducao|abatimento)\\s+de\\s+(" + N + ")\\s*(?:%|por cento)\\s+(?:sobre|em|no|na|de|do|da)\\s+(?:r\\$\\s*)?(" + N + ")").exec(n)) ||
        (m = new RegExp("(" + N + ")\\s*(?:reais|r\\$)?\\s*(?:com|tem|recebe\\w*|sofre\\w*)\\s+(aumento|acrescimo|reajuste|desconto|reducao)\\s+de\\s+(" + N + ")\\s*(?:%|por cento)").exec(n))) {
      var tipo, pc, base;
      if (/^(aumento|acrescimo|reajuste|desconto|reducao|abatimento)$/.test(m[1])) { tipo = m[1]; pc = lerNumero(m[2]); base = lerNumero(m[3]); } else { base = lerNumero(m[1]); tipo = m[2]; pc = lerNumero(m[3]); }
      var neg = /desconto|reducao|abatimento/.test(tipo), val = base * pc / 100, fim = neg ? base - val : base + val;
      return res({ id: "percentual", titulo: neg ? "Desconto" : "Aumento", formula: neg ? "final = valor × (1 − %/100)" : "final = valor × (1 + %/100)", dados: ["Valor = " + f(base), "% = " + f(pc)], passos: [f(pc) + " % de " + f(base) + " = " + f(val, { sig: 8 }), f(base) + (neg ? " − " : " + ") + f(val, { sig: 8 })], resultado: "Valor final = " + f(fim, { sig: 8 }) });
    }
    if ((m = new RegExp("(" + N + ")\\s*(?:%|por cento|porcento)\\s+(?:de|do|da)\\s+(?:r\\$\\s*)?(-?" + N + ")").exec(n))) {
      var pc2 = lerNumero(m[1]), b2 = lerNumero(m[2]);
      return res({ id: "percentual", titulo: "Porcentagem de um valor", formula: "x = (% ÷ 100) × valor", dados: ["% = " + f(pc2), "Valor = " + f(b2)], passos: [f(pc2) + " ÷ 100 × " + f(b2)], resultado: f(pc2 * b2 / 100, { sig: 10 }) });
    }
    return null;
  }

  function solRegraDeTres(c) {
    var n = c.n;
    n = n.replace(/\bregra de (?:tres|3)\b/g, " regra de tres ");
    if (!/\b(regra de tres|esta para|estao para|proporcao|proporcional|diretamente|inversamente)\b/.test(n)) return null;
    if (/\bcomposta\b/.test(n)) return pedir("Na regra de três composta eu preciso das grandezas organizadas: quais são as grandezas, quais valores são conhecidos e se cada uma é direta ou inversamente proporcional à incógnita. Escreva em linhas (ex.: \"3 máquinas, 4 dias, 120 peças; 5 máquinas, 6 dias, x peças\" e diga o tipo de cada relação).");
    var nums = listaNumeros(n.replace(/\bregra de tres\b/g, " "));
    if (nums.length < 3) return pedir("Para a regra de três preciso de três valores conhecidos. Ex.: \"3 comprimidos custam 12; quanto custam 5?\" ou \"A está para B assim como C está para x\".");
    var a = nums[0], b = nums[1], cc = nums[2], inv = /\binversamente|inversa\b/.test(n);
    if (!inv && a === 0) erro("DIV0", "O primeiro valor não pode ser zero na proporção direta.");
    if (inv && cc === 0) erro("DIV0", "O terceiro valor não pode ser zero na proporção inversa.");
    var x = inv ? a * b / cc : cc * b / a;
    return res({ id: "regra3", titulo: "Regra de três " + (inv ? "inversa" : "simples direta"), formula: inv ? "a·b = c·x  →  x = a·b ÷ c" : "a/b = c/x  →  x = (b·c) ÷ a", dados: ["a = " + f(a), "b = " + f(b), "c = " + f(cc), inv ? "Grandezas inversamente proporcionais" : "Grandezas diretamente proporcionais (assumido: diga se for inversa)"],
      passos: [inv ? "x = (" + f(a) + " × " + f(b) + ") ÷ " + f(cc) : "x = (" + f(b) + " × " + f(cc) + ") ÷ " + f(a)], resultado: "x = " + f(x, { sig: 10 }) });
  }

  function solInteiros(c) {
    var n = c.n, nums = listaNumeros(n.replace(/\b(mmc|mdc)\b/g, " "));
    var mm = /\b(mmc|minimo multiplo comum)\b/.test(n), md = /\b(mdc|maximo divisor comum)\b/.test(n);
    if (!(mm || md)) return null;
    if (nums.length < 2) return pedir("Preciso de pelo menos dois números (ex.: \"mmc de 12 e 18\").");
    if (nums.some(function (x) { return Math.floor(x) !== x || x <= 0; })) erro("DOMINIO", "MMC e MDC se definem para inteiros positivos.");
    var out = [], pas = [];
    if (md) { var d = nums.reduce(mdc); out.push("MDC(" + nums.join(", ") + ") = " + f(d)); pas.push("Algoritmo de Euclides: MDC = " + f(d)); }
    if (mm) { var m = nums.reduce(mmc); out.push("MMC(" + nums.join(", ") + ") = " + f(m)); pas.push("MMC(a, b) = a·b ÷ MDC(a, b); aplicado em sequência = " + f(m)); }
    return res({ id: "mmcmdc", titulo: mm && md ? "MMC e MDC" : mm ? "Mínimo múltiplo comum" : "Máximo divisor comum", dados: ["Números: " + nums.join(", ")], passos: pas, resultado: out.join("  |  ") });
  }

  function solFracoes(c) {
    var n = c.n, m;
    if ((m = /\bsimplific\w*\s*(?:a\s+)?(?:fracao\s+)?(\d+)\s*\/\s*(\d+)/.exec(n))) {
      var a = Number(m[1]), b = Number(m[2]); if (b === 0) erro("DIV0", "O denominador não pode ser zero.");
      var d = mdc(a, b);
      return res({ id: "fracao", titulo: "Simplificação de fração", formula: "divide-se numerador e denominador pelo MDC", dados: ["Fração " + a + "/" + b], passos: ["MDC(" + a + ", " + b + ") = " + d, a + " ÷ " + d + " = " + a / d + " ; " + b + " ÷ " + d + " = " + b / d], resultado: a / d + "/" + b / d + (d === 1 ? " (já é irredutível)" : "") + "  =  " + f(a / b, { sig: 10 }) });
    }
    if ((m = /(\d+)\s*\/\s*(\d+)\s*(?:em|para|a|pra)\s*(?:decimal|numero decimal|forma decimal)/.exec(n)) || (m = /(?:converte|transforma|passa)\s*(?:a fracao\s*)?(\d+)\s*\/\s*(\d+)\s*(?:em|para)?\s*decimal/.exec(n))) {
      var nu = Number(m[1]), de = Number(m[2]); if (de === 0) erro("DIV0", "O denominador não pode ser zero.");
      return res({ id: "fracao", titulo: "Fração em decimal", formula: "numerador ÷ denominador", dados: ["Fração " + nu + "/" + de], passos: [nu + " ÷ " + de], resultado: nu + "/" + de + " = " + f(nu / de, { sig: 10 }) });
    }
    var fr = /^\s*(\d+)\s*\/\s*(\d+)\s*([+\-*÷x/])\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(n.replace(/\b(quanto e|calcul\w+|qual o resultado de)\b/g, "").replace(/[?]/g, "").replace(/\bmais\b/g, "+").replace(/\bmenos\b/g, "-").replace(/\bvezes\b/g, "*").replace(/\bdividido por\b/g, "÷"));
    if (fr) {
      var a1 = Number(fr[1]), b1 = Number(fr[2]), o = fr[3], a2 = Number(fr[4]), b2 = Number(fr[5]);
      if (b1 === 0 || b2 === 0) erro("DIV0", "O denominador não pode ser zero.");
      var num, den, pas = [];
      if (o === "+" || o === "-") { var L = mmc(b1, b2); var x1 = a1 * (L / b1), x2 = a2 * (L / b2); num = o === "+" ? x1 + x2 : x1 - x2; den = L; pas.push("MMC(" + b1 + ", " + b2 + ") = " + L, "(" + x1 + " " + o + " " + x2 + ")/" + L + " = " + num + "/" + den); }
      else if (o === "*" || o === "x") { num = a1 * a2; den = b1 * b2; pas.push("(" + a1 + "×" + a2 + ")/(" + b1 + "×" + b2 + ") = " + num + "/" + den); }
      else { if (a2 === 0) erro("DIV0", "Divisão por fração nula."); num = a1 * b2; den = b1 * a2; pas.push("multiplica pelo inverso: " + a1 + "/" + b1 + " × " + b2 + "/" + a2 + " = " + num + "/" + den); }
      var g = mdc(num, den) || 1; if (den < 0) { num = -num; den = -den; }
      var sn = num / g, sd = den / g; pas.push("Simplificando (MDC " + g + "): " + sn + "/" + sd);
      return res({ id: "fracao", titulo: "Operação com frações", dados: [fr[1] + "/" + fr[2] + " " + o + " " + fr[4] + "/" + fr[5]], passos: pas, resultado: (sd === 1 ? String(sn) : sn + "/" + sd) + "  =  " + f(sn / sd, { sig: 10 }) });
    }
    return null;
  }

  function solNotacao(c) {
    var n = c.n, m = new RegExp("notacao\\s+cientifica(?:\\s+(?:de|do|para))?\\s*(-?" + NUMRE + ")").exec(n) || new RegExp("(-?" + NUMRE + ")\\s+(?:em|para)\\s+notacao\\s+cientifica").exec(n);
    if (!m) return null;
    var v = lerNumero(m[1]); if (v === 0) return res({ id: "notacao", titulo: "Notação científica", dados: ["0"], passos: [], resultado: "0 = 0 × 10⁰" });
    var e = Math.floor(Math.log10(Math.abs(v))), mant = v / Math.pow(10, e);
    return res({ id: "notacao", titulo: "Notação científica", formula: "N = a × 10^b, com 1 ≤ |a| < 10", dados: ["Número = " + f(v, { sig: 12 })], passos: ["Expoente b = " + e, "Mantissa a = " + f(v, { sig: 12 }) + " ÷ 10^" + e + " = " + f(mant, { sig: 10 })], resultado: f(v, { sig: 12 }) + " = " + f(mant, { sig: 10 }) + " × 10^" + e });
  }

  function solCombinatoria(c) {
    var n = c.n, m, nums;
    if ((m = new RegExp("\\b(combinacao|combinacoes|arranjo|arranjos)\\s*(?:simples\\s*)?(?:de\\s*)?(" + NUMRE + ")\\s*(?:elementos\\s*)?(?:tomados\\s*)?(?:em|a|de|por|,)?\\s*(" + NUMRE + ")").exec(n)) ||
        (m = new RegExp("\\b(c|a)\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)").exec(n)) ||
        (m = new RegExp("\\b(\\d+)\\s+(?:escolhe|tomados)\\s+(\\d+)").exec(n))) {
      var tipo = m[1], N, K;
      if (/^\d+$/.test(m[1])) { tipo = "combinacao"; N = Number(m[1]); K = Number(m[2]); } else { N = lerNumero(m[2]); K = lerNumero(m[3]); }
      var arr = /^(arranjo|arranjos|a)$/.test(tipo);
      var r = arr ? arranjo(N, K) : comb(N, K);
      return res({ id: "combinatoria", titulo: arr ? "Arranjo simples" : "Combinação simples", formula: arr ? "A(n,k) = n! ÷ (n−k)!" : "C(n,k) = n! ÷ [k!·(n−k)!]", dados: ["n = " + N, "k = " + K],
        passos: [arr ? "A = " + N + "! ÷ " + (N - K) + "!" : "C = " + N + "! ÷ (" + K + "! × " + (N - K) + "!)"], resultado: (arr ? "A(" : "C(") + N + "," + K + ") = " + f(r) });
    }
    if ((m = new RegExp("\\bpermutac\\w*\\s*(?:simples\\s*)?(?:de\\s*)?(" + NUMRE + ")").exec(n))) {
      var P = lerNumero(m[1]); return res({ id: "combinatoria", titulo: "Permutação simples", formula: "P(n) = n!", dados: ["n = " + P], passos: ["P = " + P + "!"], resultado: P + "! = " + f(fatorial(P)) });
    }
    if ((m = new RegExp("\\bfatorial\\s*(?:de\\s*)?(" + NUMRE + ")").exec(n)) || (m = /\b(\d+)\s*!/.exec(n)) && /^\s*(?:quanto e |qual e |calcul\w+ )?\d+\s*!\s*\??\s*$/.test(n)) {
      var F = lerNumero(m[1]); return res({ id: "fatorial", titulo: "Fatorial", formula: "n! = n × (n−1) × … × 1", dados: ["n = " + F], passos: [F <= 12 && F > 1 ? Array.from({ length: F }, function (_, i) { return F - i; }).join(" × ") : "produto de 1 até " + F], resultado: F + "! = " + f(fatorial(F)) });
    }
    return null;
  }

  function solEstatistica(c) {
    var n = c.n;
    if (/\bponderada\b|\bpeso\b|\bnota\b|\bnotas\b/.test(n) && !/\b(desvio|variancia|mediana|moda)\b/.test(n)) return null;
    var pedeMedia = /\b(media|mediana|moda|desvio|variancia|amplitude)\b/.test(n);
    if (!pedeMedia) return null;
    var antes = n.replace(/^.*?\b(?:de|dos|das|do|da|para|dados|valores|numeros)\b\s*/, ""), nums = listaNumeros(n.replace(/\b(desvio padrao|variancia|mediana|moda|media|amplitude)\b/g, " "));
    if (nums.length < 2) return pedir("Preciso de pelo menos dois valores. Ex.: \"média e desvio padrão de 4, 8, 6, 5\".");
    var N = nums.length, soma = nums.reduce(function (a, b) { return a + b; }, 0), med = soma / N, ord = nums.slice().sort(function (a, b) { return a - b; });
    var mediana = N % 2 ? ord[(N - 1) / 2] : (ord[N / 2 - 1] + ord[N / 2]) / 2;
    var cont = {}, maxf = 0; nums.forEach(function (x) { cont[x] = (cont[x] || 0) + 1; maxf = Math.max(maxf, cont[x]); });
    var moda = maxf === 1 ? "não há moda (todos aparecem uma vez)" : Object.keys(cont).filter(function (k) { return cont[k] === maxf; }).map(function (k) { return f(Number(k)); }).join(" e ");
    var ssq = nums.reduce(function (a, b) { return a + (b - med) * (b - med); }, 0), vPop = ssq / N, vAm = ssq / (N - 1);
    var want = { media: /\bmedia\b/.test(n), mediana: /\bmediana\b/.test(n), moda: /\bmoda\b/.test(n), desvio: /\bdesvio\b/.test(n), variancia: /\bvariancia\b/.test(n), amplitude: /\bamplitude\b/.test(n) };
    var out = [];
    if (want.media) out.push("Média = " + f(soma) + " ÷ " + N + " = " + f(med, { sig: 8 }));
    if (want.mediana) out.push("Mediana = " + f(mediana, { sig: 8 }));
    if (want.moda) out.push("Moda: " + moda);
    if (want.variancia) out.push("Variância populacional = " + f(vPop, { sig: 8 }) + " ; amostral = " + f(vAm, { sig: 8 }));
    if (want.desvio) out.push("Desvio padrão populacional = " + f(Math.sqrt(vPop), { sig: 8 }) + " ; amostral = " + f(Math.sqrt(vAm), { sig: 8 }));
    if (want.amplitude) out.push("Amplitude = " + f(ord[N - 1]) + " − " + f(ord[0]) + " = " + f(ord[N - 1] - ord[0]));
    return res({ id: "estatistica", titulo: "Estatística descritiva", dados: ["Valores (n = " + N + "): " + nums.map(function (x) { return f(x); }).join("; ")], passos: out.slice(0, -1), resultado: out[out.length - 1], nota: (want.desvio || want.variancia) ? "Use o populacional se os dados são toda a população e o amostral se são uma amostra." : "" });
  }

  function solProbabilidade(c) {
    var n = c.n, m;
    if (!/\bprobabilidade|chance\b/.test(n)) return null;
    if ((m = new RegExp("(" + NUMRE + ")\\s*(?:casos\\s*)?favoraveis?[^0-9]{0,30}(" + NUMRE + ")\\s*(?:casos\\s*)?(?:possiveis|total)").exec(n)) || (m = new RegExp("(?:favoraveis?)[^0-9]{0,6}(" + NUMRE + ")[^0-9]{0,30}(?:possiveis|total)[^0-9]{0,6}(" + NUMRE + ")").exec(n))) {
      var fv = lerNumero(m[1]), ps = lerNumero(m[2]); if (ps === 0) erro("DIV0", "O espaço amostral não pode ser vazio."); if (fv > ps) erro("DOMINIO", "Casos favoráveis não podem superar os possíveis.");
      return res({ id: "probabilidade", titulo: "Probabilidade", formula: "P = casos favoráveis ÷ casos possíveis", dados: ["Favoráveis = " + f(fv), "Possíveis = " + f(ps)], passos: ["P = " + f(fv) + "/" + f(ps)], resultado: "P = " + f(fv / ps, { sig: 8 }) + " = " + f(fv / ps * 100, { sig: 6 }) + " %" });
    }
    if (/\bdado\b/.test(n) && (m = /\b(?:sair|cair|face|numero)\s*(?:o\s*)?(?:numero\s*)?([1-6])\b/.exec(n))) return res({ id: "probabilidade", titulo: "Probabilidade num dado honesto", formula: "P = 1/6", dados: ["Dado de 6 faces, resultados equiprováveis"], passos: ["1 caso favorável em 6 possíveis"], resultado: "P = 1/6 = " + f(1 / 6, { sig: 6 }) + " ≈ " + f(100 / 6, { sig: 4 }) + " %" });
    if (/\bmoeda\b/.test(n) && /\b(cara|coroa)\b/.test(n)) return res({ id: "probabilidade", titulo: "Probabilidade numa moeda honesta", dados: ["Moeda com 2 faces equiprováveis"], passos: ["1 caso favorável em 2 possíveis"], resultado: "P = 1/2 = 50 %" });
    if ((m = new RegExp("(?:probabilidade[^0-9]*)(0?[.,]\\d+|1)\\s*(?:e|x|vezes|\\*)\\s*(0?[.,]\\d+|1)").exec(n)) && /\bindependentes?\b/.test(n)) { var p1 = lerNumero(m[1]), p2 = lerNumero(m[2]); return res({ id: "probabilidade", titulo: "Eventos independentes (A e B)", formula: "P(A∩B) = P(A) × P(B)", dados: ["P(A) = " + f(p1), "P(B) = " + f(p2)], passos: [f(p1) + " × " + f(p2)], resultado: "P = " + f(p1 * p2, { sig: 8 }) }); }
    return pedir("Para a probabilidade preciso dos casos favoráveis e dos casos possíveis (ex.: \"probabilidade com 3 favoráveis em 10 possíveis\"), ou de um experimento conhecido (dado, moeda).");
  }

  function solMatriz(c) {
    var n = c.n;
    if (!/\b(determinante|det|matriz)\b/.test(n)) return null;
    var nm = n.replace(/\b(\d+)\s*x\s*(\d+)\b/g, " "); if (/[\[{(]/.test(nm)) nm = nm.replace(/,/g, " "); nm = nm.replace(/[\[\](){}]/g, " ");
    var nums = listaNumeros(nm);
    if (!/\bdeterminante|\bdet\b/.test(n)) return null;
    if (nums.length === 4) { var d = nums[0] * nums[3] - nums[1] * nums[2]; return res({ id: "determinante", titulo: "Determinante 2×2", formula: "det = a·d − b·c", dados: ["Matriz [[" + nums[0] + ", " + nums[1] + "], [" + nums[2] + ", " + nums[3] + "]]"], passos: ["det = " + f(nums[0]) + "·" + f(nums[3]) + " − " + f(nums[1]) + "·" + f(nums[2])], resultado: "det = " + f(d) }); }
    if (nums.length === 9) { var a = nums; var d3 = a[0] * (a[4] * a[8] - a[5] * a[7]) - a[1] * (a[3] * a[8] - a[5] * a[6]) + a[2] * (a[3] * a[7] - a[4] * a[6]);
      return res({ id: "determinante", titulo: "Determinante 3×3 (regra de Laplace)", formula: "det = a(ei − fh) − b(di − fg) + c(dh − eg)", dados: ["Matriz [[" + a.slice(0, 3).join(", ") + "], [" + a.slice(3, 6).join(", ") + "], [" + a.slice(6).join(", ") + "]]"], passos: ["det = " + f(a[0]) + "·(" + f(a[4] * a[8] - a[5] * a[7]) + ") − " + f(a[1]) + "·(" + f(a[3] * a[8] - a[5] * a[6]) + ") + " + f(a[2]) + "·(" + f(a[3] * a[7] - a[4] * a[6]) + ")"], resultado: "det = " + f(d3) }); }
    return pedir("Informe os elementos da matriz linha a linha: 4 números para 2×2 ou 9 para 3×3 (ex.: \"determinante de [[1,2],[3,4]]\").");
  }

  // equações de 1º/2º grau e sistemas 2×2 (avaliação pelo parser seguro, sem eval)
  function prepararEq(s) {
    return String(s).replace(/²/g, "^2").replace(/³/g, "^3").replace(/(\d|\))\s*([xy])/gi, "$1*$2").replace(/,/g, ".").toLowerCase();
  }
  function solEquacao(c) {
    var o = String(c.orig).toLowerCase().replace(/[?]/g, "");
    if (o.indexOf("=") < 0) return null;
    var cleaned = o.replace(/\b(resolva|resolve|resolver|calcule|calcula|equacao|sistema|encontre|ache|determine|qual o valor de|valor de|a seguir|de|do|segundo|primeiro|grau)\b\s*/g, " ").replace(/\s+/g, " ").trim();
    var eqs = cleaned.split(/\s*(?:;|\n|\be\b(?=\s*[-+0-9xy(]))\s*/).filter(function (x) { return x.indexOf("=") > 0; });
    if (!eqs.length) return null;
    function f2(eq, vars) {
      var parts = eq.split("="); if (parts.length !== 2) erro("SINTAXE", "A equação precisa ter um único sinal de igual.");
      return avaliar("(" + prepararEq(parts[0]) + ") - (" + prepararEq(parts[1]) + ")", vars);
    }
    var temY = /\by\b/.test(cleaned.replace(/[^a-z]+/g, " ").replace(/\b(?!y\b)[a-z]+\b/g, "")) || /(^|[^a-z])y([^a-z]|$)/.test(cleaned);
    if (eqs.length >= 2 && temY) {
      var E1 = eqs[0], E2 = eqs[1], fa = function (e) { return { a: f2(e, { x: 1, y: 0 }) - f2(e, { x: 0, y: 0 }), b: f2(e, { x: 0, y: 1 }) - f2(e, { x: 0, y: 0 }), k: -f2(e, { x: 0, y: 0 }) }; };
      var A = fa(E1), B = fa(E2), det = A.a * B.b - A.b * B.a;
      if (Math.abs(det) < 1e-12) { var det0 = Math.abs(A.a * B.k - A.k * B.a) < 1e-12 && Math.abs(A.b * B.k - A.k * B.b) < 1e-12; return res({ id: "sistema", titulo: "Sistema linear 2×2", dados: [E1, E2], passos: ["Determinante principal D = 0"], resultado: det0 ? "Sistema possível e indeterminado (infinitas soluções)" : "Sistema impossível (sem solução)" }); }
      var x = (A.k * B.b - A.b * B.k) / det, y = (A.a * B.k - A.k * B.a) / det;
      return res({ id: "sistema", titulo: "Sistema linear 2×2 (regra de Cramer)", formula: "x = Dx/D ; y = Dy/D", dados: [E1, E2], passos: ["Forma padrão: " + f(A.a) + "x + " + f(A.b) + "y = " + f(A.k) + " ; " + f(B.a) + "x + " + f(B.b) + "y = " + f(B.k), "D = " + f(A.a) + "·" + f(B.b) + " − " + f(A.b) + "·" + f(B.a) + " = " + f(det), "Dx = " + f(A.k * B.b - A.b * B.k) + " ; Dy = " + f(A.a * B.k - A.k * B.a)], resultado: "x = " + f(x, { sig: 10 }) + " ; y = " + f(y, { sig: 10 }) });
    }
    var eq = eqs[0], c0 = f2(eq, { x: 0 }), c1 = f2(eq, { x: 1 }), cm1 = f2(eq, { x: -1 }), c2 = f2(eq, { x: 2 });
    var qa = (c1 + cm1) / 2 - c0, lb = (c1 - cm1) / 2, qc = c0;
    if (Math.abs(c2 - (4 * qa + 2 * lb + qc)) > 1e-7 * (1 + Math.abs(c2))) erro("SINTAXE", "Só resolvo equações de 1º e 2º grau (um polinômio em x).");
    if (Math.abs(qa) < 1e-12) {
      if (Math.abs(lb) < 1e-12) return res({ id: "equacao", titulo: "Equação", dados: [eq], passos: [], resultado: Math.abs(qc) < 1e-12 ? "Identidade: qualquer x é solução" : "Sem solução (impossível)" });
      var xv = -qc / lb;
      return res({ id: "equacao", titulo: "Equação do 1º grau", formula: "ax + b = 0  →  x = −b/a", dados: [eq], passos: ["Forma padrão: " + f(lb) + "x + " + f(qc) + " = 0", "x = −(" + f(qc) + ") ÷ " + f(lb)], resultado: "x = " + f(xv, { sig: 10 }) });
    }
    var disc = lb * lb - 4 * qa * qc, pas = ["Forma padrão: " + f(qa) + "x² + " + f(lb) + "x + " + f(qc) + " = 0", "Δ = b² − 4ac = " + f(lb) + "² − 4·" + f(qa) + "·" + f(qc) + " = " + f(disc, { sig: 10 })];
    if (disc < 0) return res({ id: "equacao", titulo: "Equação do 2º grau", formula: "x = (−b ± √Δ) ÷ 2a", dados: [eq], passos: pas, resultado: "Δ < 0: não há raízes reais" });
    var r1 = (-lb + Math.sqrt(disc)) / (2 * qa), r2 = (-lb - Math.sqrt(disc)) / (2 * qa);
    pas.push("x = (" + f(-lb) + " ± √" + f(disc, { sig: 10 }) + ") ÷ " + f(2 * qa));
    return res({ id: "equacao", titulo: "Equação do 2º grau (Bhaskara)", formula: "x = (−b ± √Δ) ÷ 2a", dados: [eq], passos: pas, resultado: disc === 0 ? "x = " + f(r1, { sig: 10 }) + " (raiz dupla)" : "x₁ = " + f(r1, { sig: 10 }) + " ; x₂ = " + f(r2, { sig: 10 }) });
  }

  // ======================= 10. ACADÊMICO =======================
  function solAcademico(c) {
    var n = c.n, qs = c.qs, m;
    if (/\b(desvio|variancia|mediana|moda|amplitude)\b/.test(n) && !/\b(nota|notas|prova|provas|peso)\b/.test(n)) return null;
    // frequência / faltas / limite de faltas
    if (/\b(falt\w*|frequencia|presenca)\b/.test(n) && !/\b(nota|notas|tirei|tirar|prova|provas|media|peso|avaliac\w*)\b/.test(n)) {
      var nums = listaNumeros(n.replace(/\d+(?:[.,]\d+)?\s*%/g, " ")), pm = new RegExp("(" + NUMRE + ")\\s*%").exec(n);
      if (/\b(quantas|quantos|maximo|posso|limite|ate)\b.*\bfalt/.test(n) || /\bfalt\w*.*\b(posso|maximo|limite)\b/.test(n)) {
        if (!pm) return pedir("Para o limite de faltas preciso da frequência mínima exigida (em %) e do total de aulas. Não presumo a regra: qual é a frequência mínima?");
        var tot = nums[0]; if (!(tot > 0)) return pedir("Quantas aulas (ou horas) tem a disciplina no total?");
        var p = lerNumero(pm[1]), lim = Math.floor(tot * (1 - p / 100) + 1e-9);
        return res({ id: "faltas", titulo: "Limite de faltas", formula: "faltas máx. = total × (1 − frequência mínima)", dados: ["Total = " + f(tot), "Frequência mínima = " + f(p) + " %"], passos: [f(tot) + " × (1 − " + f(p) + "/100) = " + f(tot * (1 - p / 100), { sig: 8 })], resultado: "No máximo " + lim + " falta(s)" });
      }
      if (nums.length < 2) return pedir("Quantas faltas e quantas aulas no total? (ex.: \"faltei 8 de 60 aulas\")");
      var fa = nums[0], to = nums[1]; if (to <= 0) erro("DIV0", "O total de aulas precisa ser maior que zero."); if (fa > to) erro("DOMINIO", "As faltas não podem superar o total de aulas.");
      return res({ id: "faltas", titulo: "Faltas e frequência", formula: "% faltas = faltas ÷ total × 100", dados: ["Faltas = " + f(fa), "Total = " + f(to)], passos: [f(fa) + " ÷ " + f(to) + " × 100 = " + f(fa / to * 100, { sig: 6 }) + " %"], resultado: "Faltas: " + f(fa / to * 100, { sig: 5 }) + " %  |  Frequência: " + f((1 - fa / to) * 100, { sig: 5 }) + " %", nota: "Compare com a frequência mínima da sua disciplina; não presumo a regra." });
    }
    if (/\b(acert\w*|erros?|errei)\b/.test(n) && !/\bmedia\b/.test(n)) {
      var nu = listaNumeros(n); if (nu.length < 2) return pedir("Quantas questões acertou e quantas havia no total? (ex.: \"acertei 18 de 25\")");
      var ac = /\berr/.test(n) && !/\bacert/.test(n) ? nu[1] - nu[0] : nu[0], tt = nu[1]; if (tt <= 0) erro("DIV0", "O total de questões precisa ser maior que zero."); if (ac > tt || ac < 0) erro("DOMINIO", "Os acertos precisam estar entre 0 e o total.");
      return res({ id: "acertos", titulo: "Percentual de acertos", formula: "% = acertos ÷ total × 100", dados: ["Acertos = " + f(ac), "Total = " + f(tt)], passos: [f(ac) + " ÷ " + f(tt) + " × 100"], resultado: f(ac / tt * 100, { sig: 6 }) + " %  (nota na escala de 10: " + f(ac / tt * 10, { sig: 4 }) + ")" });
    }
    var temNota = /\b(nota|notas|prova|provas|avaliac\w*|tirei|tirar|media|trabalho|p1|p2|p3)\b/.test(n);
    if (!temNota) return null;
    // nota necessária
    if (/\b(preciso|precisa|quanto (?:eu )?(?:tenho que|devo|preciso) tirar|nota necessaria|para (?:passar|ser aprovad\w*|aprovar)|quanto falta|nota minima|media minima|media de aprovacao|falt\w*\s+\d+\s+(?:prova|avaliac)\w*)\b/.test(n)) {
      var alvo = new RegExp("\\bmedia\\s*(?:minima|de aprovacao|para aprovacao|para passar|final)?\\s*(?:de|igual a|=|e|eh)?\\s*(" + NUMRE + ")").exec(n) || new RegExp("\\bpassar com\\s*(" + NUMRE + ")").exec(n) || new RegExp("\\b(?:alvo|objetivo|meta)\\s*(?:de|=)?\\s*(" + NUMRE + ")").exec(n);
      if (!alvo) return pedir("Qual é a média mínima para aprovação? (Não presumo a regra da disciplina.) Informe também as notas que já tem e quantas avaliações faltam.");
      var T = lerNumero(alvo[1]);
      var antes = n.replace(alvo[0], " "), faltam = /\b(ultima|derradeira)\b/.test(n) ? 1 : (m = /\bfalt\w*\s+(\d+)\s*(?:prova|avaliac|nota|trabalho)/.exec(n)) ? Number(m[1]) : (m = /\b(\d+)\s+(?:prova|avaliac|nota)\w*\s+(?:restantes?|faltando|pela frente)/.exec(n)) ? Number(m[1]) : 0;
      if (!faltam) return pedir("Quantas avaliações ainda faltam? E elas têm o mesmo peso das que você já fez (ou quais são os pesos)?");
      var pesosParesRe = new RegExp("(" + NUMRE + ")\\s*(?:com |de |x )?peso\\s*(" + NUMRE + ")", "g"), pares = [], mm;
      while ((mm = pesosParesRe.exec(antes))) pares.push([lerNumero(mm[1]), lerNumero(mm[2])]);
      var iguais = /\b(mesmo peso|pesos iguais|peso igual|todas (?:valem|tem) o mesmo)\b/.test(n);
      var notas = listaNumeros(antes.replace(/\bfalt\w*\s+\d+/g, " ").replace(/\b\d+\s+(?:prova|avaliac)\w*/g, " "));
      if (pares.length) {
        var wr = /\bpeso\s*(?:da|de)\s*(?:ultima|proxima|prova|avaliacao)\s*(?:que falta|restante|final)?\s*(?:e|eh|=|de)?\s*(" + NUMRE + ")/.exec(n);
        var wRest = new RegExp("\\bpeso\\s*(?:da|de|das)\\s*(?:ultima|proxima|prova|avaliacao|avaliacoes|restantes?)[^0-9]{0,20}(" + NUMRE + ")").exec(n);
        if (!wRest) return pedir("Qual é o peso total da(s) avaliação(ões) que falta(m)? (ex.: \"peso da última prova 3\")");
        var W = pares.reduce(function (a, p2) { return a + p2[1]; }, 0), S = pares.reduce(function (a, p2) { return a + p2[0] * p2[1]; }, 0), wr2 = lerNumero(wRest[1]);
        var need = (T * (W + wr2) - S) / wr2;
        return res({ id: "notanec", titulo: "Nota necessária (média ponderada)", formula: "nota = (média alvo × Σpesos − Σ nota·peso) ÷ peso restante", dados: ["Média alvo = " + f(T), "Notas e pesos: " + pares.map(function (p2) { return f(p2[0]) + " (peso " + f(p2[1]) + ")"; }).join("; "), "Peso restante = " + f(wr2)], passos: ["(" + f(T) + " × " + f(W + wr2) + " − " + f(S) + ") ÷ " + f(wr2)], resultado: "Nota necessária: " + f(need, { sig: 6 }) + (need > 10 ? "  (acima de 10 — pode não ser alcançável)" : need < 0 ? "  (já garantida)" : "") });
      }
      if (!iguais) return pedir("As avaliações têm o mesmo peso? Se não, informe os pesos (ex.: \"6 peso 2, 5 peso 3, peso da última prova 5\"). Não presumo pesos.");
      if (!notas.length) return pedir("Quais notas você já tirou?");
      var k = notas.length, soma = notas.reduce(function (a, b) { return a + b; }, 0), need2 = (T * (k + faltam) - soma) / faltam;
      return res({ id: "notanec", titulo: "Nota necessária (pesos iguais)", formula: "média por avaliação restante = (alvo × total de avaliações − soma atual) ÷ nº restante", dados: ["Média alvo = " + f(T), "Notas atuais = " + notas.map(function (x) { return f(x); }).join("; "), "Avaliações que faltam = " + faltam], passos: ["(" + f(T) + " × " + (k + faltam) + " − " + f(soma) + ") ÷ " + faltam], resultado: "Média necessária " + (faltam > 1 ? "em cada uma das " + faltam + " avaliações restantes" : "na avaliação que falta") + ": " + f(need2, { sig: 6 }) + (need2 > 10 ? "  (acima de 10 — pode não ser alcançável)" : need2 < 0 ? "  (já garantida)" : "") });
    }
    // média ponderada
    var pr = new RegExp("(" + NUMRE + ")\\s*(?:com |de |x |\\()?\\s*peso\\s*(" + NUMRE + ")\\)?", "g"), pp = [], mt;
    while ((mt = pr.exec(n))) pp.push([lerNumero(mt[1]), lerNumero(mt[2])]);
    if (/\bponderada\b|\bpeso\b|\bpesos\b/.test(n)) {
      if (!pp.length) {
        var all = listaNumeros(n.replace(/\bponderada\b/g, " "));
        var pe = /\bpesos?\b[^0-9]*((?:\d+(?:[.,]\d+)?[\s,;e]*)+)$/.exec(n), ne = /\bnotas?\b[^0-9]*((?:\d+(?:[.,]\d+)?[\s,;e]*)+?)\s*(?:e\s+)?pesos?/.exec(n);
        if (pe && ne) { var A1 = listaNumeros(ne[1]), B1 = listaNumeros(pe[1]); if (A1.length === B1.length) A1.forEach(function (x, i) { pp.push([x, B1[i]]); }); }
        if (!pp.length) return pedir("Informe cada nota com o seu peso. Ex.: \"média ponderada: 7 peso 2, 8 peso 3, 5 peso 5\".");
      }
      var Wt = pp.reduce(function (a, p3) { return a + p3[1]; }, 0); if (Wt === 0) erro("DIV0", "A soma dos pesos não pode ser zero.");
      var St = pp.reduce(function (a, p3) { return a + p3[0] * p3[1]; }, 0);
      return res({ id: "ponderada", titulo: "Média ponderada", formula: "M = Σ(nota × peso) ÷ Σ(pesos)", dados: pp.map(function (p3) { return "nota " + f(p3[0]) + ", peso " + f(p3[1]); }), passos: ["Σ(nota × peso) = " + pp.map(function (p3) { return f(p3[0]) + "×" + f(p3[1]); }).join(" + ") + " = " + f(St, { sig: 10 }), "Σ pesos = " + f(Wt), "M = " + f(St, { sig: 10 }) + " ÷ " + f(Wt)], resultado: "Média ponderada = " + f(St / Wt, { sig: 8 }) });
    }
    // simulação / média simples
    var vals = listaNumeros(n.replace(/\b(p|n)\s*\d\b/g, " "));
    if (/\b(se eu tirar|simula\w*|se tirar|e se eu tirar)\b/.test(n)) {
      if (!/\b(mesmo peso|pesos iguais)\b/.test(n)) return pedir("Para simular a média preciso saber se todas as avaliações têm o mesmo peso (ou os pesos de cada uma). Não presumo pesos.");
    }
    if (vals.length >= 1 && /\bmedia\b/.test(n)) {
      var s = vals.reduce(function (a, b) { return a + b; }, 0);
      return res({ id: "media", titulo: "Média aritmética", formula: "M = Σ notas ÷ quantidade (todas com o mesmo peso)", dados: ["Notas: " + vals.map(function (x) { return f(x); }).join("; ")], passos: ["Σ = " + f(s, { sig: 10 }), "M = " + f(s, { sig: 10 }) + " ÷ " + vals.length], resultado: "Média = " + f(s / vals.length, { sig: 8 }) });
    }
    return null;
  }

  // ======================= 11. EXPRESSÃO ARITMÉTICA / CIENTÍFICA =======================
  function bonita(e) { return String(e).replace(/\*/g, " × ").replace(/\//g, " ÷ ").replace(/\^/g, "^").replace(/\s+/g, " ").trim(); }
  function solExpressao(c) {
    var ex = paraExpressao(c.orig), rad = false;
    if (ex == null && /\b(radianos?|rad)\b/.test(c.n)) { ex = paraExpressao(c.orig.replace(/\b(radianos?|rad)\b/gi, " ")); rad = ex != null; }
    if (ex == null) return null;
    var old = ANG; ANG = rad ? 1 : Math.PI / 180;
    var v; try { v = avaliar(ex); } finally { ANG = old; }
    var trig = /\b(sin|cos|tan)\(/.test(ex);
    var nOps = (ex.match(/[+\-*/^]|\b(sqrt|root|log|ln|fat|sin|cos|tan|mod)\b|!/g) || []).length;
    var lin = bonita(ex);
    return res({ id: "expressao", simples: nOps <= 2, titulo: "Cálculo", dados: [], passos: nOps > 2 ? ["Interpretei como: " + lin] : [], resultado: lin + " = " + f(v, { sig: 12 }), nota: trig ? (rad ? "Ângulos em radianos." : "Ângulos em graus.") : "", valor: v });
  }

  // ======================= 12. CONTEXTO E ACOMPANHAMENTO =======================
  var memo = { ultimo: null, pend: null, t: 0 };
  function lembrar(r) {
    if (r && r.ctx) { memo.ultimo = r.ctx; memo.t = Date.now(); }
  }
  function razaoConc(a, b) { return { v: a.v / b.v, rot: a.un.rot + "/" + b.un.rot }; }
  function seguimento(c) {
    var u = memo.ultimo; if (!u || Date.now() - memo.t > 30 * 60 * 1000) return null;
    var n = c.n;
    var mult = /\b(dobr\w*|duplic\w*)\b/.test(n) ? 2 : /\btriplic\w*\b/.test(n) ? 3 : /\bquadruplic\w*\b/.test(n) ? 4 : /\b(metade|pela metade|dividir\w* (?:por )?2|reduz\w* (?:a|pela) metade)\b/.test(n) ? 0.5 : null;
    var mm = new RegExp("\\b(?:aument\\w*|multiplic\\w*)\\w*\\s*(?:\\w+\\s+){0,2}?(?:em|por|para)\\s*(" + NUMRE + ")\\s*(?:vezes|x)?").exec(n);
    var dm = new RegExp("\\b(?:dividi\\w*|diminu\\w*|reduz\\w*)\\s*(?:\\w+\\s+){0,2}?(?:por|em)\\s*(" + NUMRE + ")").exec(n);
    if (mult == null && mm) mult = lerNumero(mm[1]); if (mult == null && dm) mult = 1 / lerNumero(dm[1]);
    var explicito = null, qs = c.qs;
    var alvo = /\bvolume\b/.test(n) ? "b" : /\b(massa|soluto|quantidade|mols?|dose)\b/.test(n) ? "a" : null;
    if (mult == null) {
      if (!/^(e |mas |entao |agora |se |e se )/.test(n) && !/\bse fosse|e se for|se eu usar|se usar|com \d/.test(n)) return null;
      var q = qs.filter(function (z) { return z.un && z.un.dim === (alvo === "a" ? u.a.un.dim : u.b.un.dim); })[0] || qs.filter(function (z) { return z.un && (z.un.dim === u.a.un.dim || z.un.dim === u.b.un.dim); })[0];
      if (!q) return null; explicito = q; alvo = q.un.dim === u.b.un.dim ? "b" : "a";
    }
    if (!alvo) return pedir("O que você quer alterar: o volume ou a quantidade de soluto (massa)?");
    var a = { v: u.a.v, un: u.a.un }, b = { v: u.b.v, un: u.b.un };
    var antes = u.razao(a, b), alt = alvo === "a" ? a : b;
    if (explicito) { alt.v = explicito.v; alt.un = explicito.un; } else alt.v = alt.v * mult;
    var depois = u.razao(a, b);
    if (!isFinite(depois.v)) erro("DIV0", "Divisão por zero ao recalcular.");
    var nome = alvo === "a" ? u.a.nome : u.b.nome, antigo = alvo === "a" ? u.a : u.b;
    var rel = antes.v !== 0 ? depois.v / antes.v : NaN;
    return res({ id: "recalculo", titulo: "Recalculando com a nova condição", formula: u.formula, dados: ["Antes: " + nome + " = " + fq(antigo.v, antigo.un) + "  →  Agora: " + nome + " = " + fq(alt.v, alt.un), "Outra grandeza mantida: " + (alvo === "a" ? u.b.nome + " = " + fq(b.v, b.un) : u.a.nome + " = " + fq(a.v, a.un))],
      passos: [u.simbolo + " = " + f(a.v) + " ÷ " + f(b.v) + " = " + f(depois.v, { sig: 8 }) + " " + depois.rot, "Antes era " + f(antes.v, { sig: 8 }) + " " + antes.rot + (isFinite(rel) ? " (mudou por um fator de " + f(rel, { sig: 6 }) + ")" : "")],
      resultado: u.simbolo + " = " + f(depois.v, { sig: 8 }) + " " + depois.rot, ctx: { tipo: u.tipo, a: a, b: b, razao: u.razao, formula: u.formula, simbolo: u.simbolo } });
  }

  // ======================= 13. RENDERIZAÇÃO (explicação em linguagem natural) =======================
  function li(arr, tag) { return "<" + tag + ">" + arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</" + tag + ">"; }
  function renderResultado(r) {
    if (r.simples) return "<p><strong>" + esc(r.resultado) + "</strong></p>" + (r.nota ? '<p class="farma-source">' + esc(r.nota) + "</p>" : "");
    var h = "<p><strong>" + esc(r.titulo) + "</strong></p>";
    if (r.formula) h += "<p>Fórmula: <em>" + esc(r.formula) + "</em></p>";
    if (r.dados && r.dados.length) h += "<p>Valores identificados:</p>" + li(r.dados, "ul");
    if (r.passos && r.passos.length) h += "<p>Desenvolvimento:</p>" + li(r.passos, "ol");
    h += "<p><strong>" + esc(r.resultado) + "</strong></p>";
    if (r.nota) h += '<p class="farma-source">' + esc(r.nota) + "</p>";
    return h;
  }
  function renderErro(e) {
    var tit = e.codigo === "DIV0" ? "Divisão por zero" : e.codigo === "UNIDADES" ? "Unidades incompatíveis" : e.codigo === "DOMINIO" ? "Resultado indefinido" : e.codigo === "DADOS" ? "Dados insuficientes" : "Não consegui montar essa conta";
    return "<p><strong>" + esc(tit) + "</strong></p><p>" + esc(e.message) + "</p>";
  }

  // ======================= 14. ENCAMINHAMENTO =======================
  // "tenho 500 mg em 10 mL, quanto tem em 2 mL?": a quantidade é proporcional ao volume (regra de três direta)
  function solProporcaoVolume(c) {
    var n = c.n, qs = c.qs;
    if (/\b(diluic|dilui\w*|c1|v1)\b/.test(n)) return null;
    if (!/\bquanto\b.*\b(tem|ha|existe|existem|contem|fica|ficaria|tera|vai ter|sobra)\b.*\b(em|nos|nas|nesse|nessa|nesses|numa?|num|dentro de|a cada)\b/.test(n)) return null;
    var vols = porDim(qs, "volume"); if (vols.length < 2) return null;
    var outra = qs.filter(function (q) { return q.un && q.un.dim !== "volume"; })[0]; if (!outra) return null;
    var v1 = converter(vols[0].v, vols[0].un, { dim: "volume", f: 1e-3, rot: "mL" }), v2 = converter(vols[1].v, vols[1].un, { dim: "volume", f: 1e-3, rot: "mL" });
    if (v1 === 0) erro("DIV0", "O volume de referência não pode ser zero.");
    var x = outra.v * v2 / v1;
    return res({ id: "proporcao", titulo: "Proporção entre quantidade e volume", formula: "x = quantidade × V₂ ÷ V₁",
      dados: [fq(outra.v, outra.un) + " em " + fq(vols[0].v, vols[0].un), "volume pedido = " + fq(vols[1].v, vols[1].un)],
      passos: ["Concentração constante: " + f(outra.v) + " " + outra.un.rot + " ÷ " + f(v1) + " mL", "x = " + f(outra.v) + " × " + f(v2) + " ÷ " + f(v1)], resultado: "x = " + fq(x, outra.un) });
  }
  // "3 cartelas com 10 comprimidos cada; usei 7; quantos restam?" (multiplicação e subtração em enunciado curto)
  function solProblemaTexto(c) {
    var n = c.n, m = /\b(\d+(?:[.,]\d+)?)\s+([a-z]+)\s+(?:com|de|contendo|tem|tendo)\s+(\d+(?:[.,]\d+)?)\s+([a-z]+)\s+cada\b/.exec(n);
    if (!m || /\d\s*(?:mg|g|ml|l|%|mcg|ug)\b/.test(n)) return null;
    var grupos = lerNumero(m[1]), por = lerNumero(m[3]), total = grupos * por;
    var ret = new RegExp("\\b(?:usad\\w+|tomad\\w+|retirad\\w+|vendid\\w+|consumid\\w+|gast\\w+|perdid\\w+|usei|tomei|vendi|gastei|retirei|foram)\\s+(?:usad\\w+\\s+|tomad\\w+\\s+|retirad\\w+\\s+|vendid\\w+\\s+|consumid\\w+\\s+)?(\\d+(?:[.,]\\d+)?)\\s+" + m[4].slice(0, 4)).exec(n);
    var pede = /\b(quant\w+ rest\w*|sobr\w+|quant\w+ fic\w+|quant\w+ falt\w+)\b/.test(n), tot = /\b(quant\w+ (?:ha|tem|existem|sao|tenho)|no total|total)\b/.test(n);
    if (ret && pede) { var k = lerNumero(ret[1]), r = total - k;
      return res({ id: "problema", titulo: "Problema de enunciado", dados: [f(grupos) + " " + m[2] + " × " + f(por) + " " + m[4] + " cada", "retirados/usados: " + f(k)], passos: [f(grupos) + " × " + f(por) + " = " + f(total), f(total) + " − " + f(k) + " = " + f(r)], resultado: f(r) + " " + m[4] + " restam" }); }
    if (tot || pede) return res({ id: "problema", titulo: "Problema de enunciado", dados: [f(grupos) + " " + m[2] + " × " + f(por) + " " + m[4] + " cada"], passos: [f(grupos) + " × " + f(por) + " = " + f(total)], resultado: f(total) + " " + m[4] + " no total" });
    return null;
  }
  var SOLUCIONADORES = [solProblemaTexto, solProporcaoVolume, solConversao, solMolar, solDiluicao, solPorcentagem, solPH, solConcentracao, solFarmacocinetica, solFarmacotecnica,
    solRegraDeTres, solInteiros, solFracoes, solNotacao, solCombinatoria, solProbabilidade, solMatriz, solEquacao,
    solAcademico, solEstatistica, solExpressao];

  var VERBO_CALCULO = /\b(calcul\w*|converte\w*|converter|conversao|quanto (?:e|da|vale|fica|sera)|resolv\w*|simplific\w*|determin\w*|qual (?:o|a) (?:valor|resultado|concentracao|massa|volume|ph|media))\b/;
  var CONTEXTO_CLINICO = /\b(posso|devo|pode|podem|tomar|tomo|tomei|crianca|bebe|gravida|gestante|amament\w*|overdose|intoxic\w*|dose maxima|dor\b|febre|efeito colateral|contraindic\w*|interac\w*|alergi\w*|sintoma\w*|suicid\w*|me matar)\b/;
  var CONTEXTO_CURSO = /\b(disciplina|periodo|grade|credito|creditos|coeficiente|prerequisito|corequisito|optativa|obrigatoria|escolha condicionada|planejador|matricula|horario|professor|departamento)\b/;
  var TEMPLATES_MATERIA = /\b[a-z]{3}\s?\d{3,4}\b/;

  function contexto(texto) {
    var orig = String(texto == null ? "" : texto).slice(0, 600), n = normalizar(orig);
    n = numerosPorExtenso(n);
    return { orig: orig, n: n, qs: quantidades(n) };
  }
  function pareceCalculo(c) {
    if (c.n.split(" ").length > 70) return false;
    if (temNumeroReal(c)) return true;
    return /\b(massa molar|massa molecular|peso molecular|avogadro|fatorial|mmc|mdc|raiz|logaritmo|quanto (?:eu )?(?:preciso|tenho que|devo) tirar)\b/.test(c.n) || (memo.ultimo && /^(e |mas |entao |agora |se )/.test(c.n));
  }

  // número de verdade na frase: dígito ou número por extenso (não conta "um"/"uma"/"meia"/"meio", que aparecem em "meia vida", "de um jeito")
  function temNumeroReal(c) {
    if (/\d/.test(c.orig)) return true;
    var t = normalizar(c.orig).replace(/\bmeia vida\b|\bde (?:um|uma) (?:jeito|forma|maneira|modo|exemplo)\b|\b(?:meia|meio)\b|\bum pouco\b|\b(?:um|uma) (?:conceito|assunto|medicamento|remedio|farmaco)\b/g, " ");
    return /\d/.test(numerosPorExtenso(t));
  }
  function resolverCtx(c) {
    // dados que faltavam numa pergunta anterior: junta com a nova mensagem
    if (memo.pend && Date.now() - memo.pend.t < 5 * 60 * 1000 && temNumeroReal(c) && c.n.split(" ").length <= 25) {
      var junto = contexto(memo.pend.orig + " " + c.orig);
      var r = rodar(junto, true);
      if (r && r.ok) { memo.pend = null; return r; }
      if (r && r.pedido) { memo.pend = { orig: junto.orig, t: Date.now() }; return r; }
    }
    memo.pend = null;
    return rodar(c, false);
  }
  function rodar(c, ehJunto) {
    var sg;
    try { sg = seguimento(c); } catch (e) { if (e instanceof ErroCalc) return { erro: e }; sg = null; }
    if (sg) return sg;
    for (var i = 0; i < SOLUCIONADORES.length; i++) {
      var out;
      try {
        var fn = SOLUCIONADORES[i];
        if ((fn === solAcademico || fn === solEstatistica) && CONTEXTO_CURSO.test(c.n) && !VERBO_CALCULO.test(c.n)) continue;
        out = fn(c);
      } catch (e) {
        if (e instanceof ErroCalc) return { erro: e };
        out = null;
      }
      if (out) return out;
    }
    return null;
  }

  function tentar(texto) {
    var c = contexto(texto);
    if (!c.n || !pareceCalculo(c)) return null;
    if (CONTEXTO_CLINICO.test(c.n) && !VERBO_CALCULO.test(c.n) && !/\b(concentracao|diluic\w*|mg\/ml|falt\w*|aulas?|frequencia|nota|notas|prova|provas|media)\b/.test(c.n)) return null;
    if (TEMPLATES_MATERIA.test(c.n) && !VERBO_CALCULO.test(c.n) && !/[+*/^=]/.test(c.n)) return null;
    var r = resolverCtx(c);
    if (!r) return null;
    if (r.erro) return { id: "erro", html: renderErro(r.erro), chips: [] };
    if (r.pedido) { memo.pend = { orig: c.orig, t: Date.now() }; return { id: "pedido", html: "<p>" + esc(r.pedido) + "</p>", chips: r.chips || [] }; }
    lembrar(r);
    return { id: r.id, html: renderResultado(r), chips: [], valor: r.valor };
  }
  // reconhece sem calcular (para o interpretador sinalizar a intenção)
  function reconhecer(texto) {
    try { var c = contexto(texto); if (!c.n || !pareceCalculo(c)) return false; var saved = { u: memo.ultimo, p: memo.pend }; var r = rodar(c, false); memo.ultimo = saved.u; memo.pend = saved.p; return !!(r && (r.ok || r.pedido || r.erro)); } catch (_) { return false; }
  }
  function limparContexto() { memo.ultimo = null; memo.pend = null; }

  root.FarmaCalculo = {
    versao: "1.0.0", tentar: tentar, reconhecer: reconhecer, limparContexto: limparContexto,
    avaliar: avaliar, converter: converter, massaMolar: massaMolar, normalizar: normalizar, paraExpressao: paraExpressao,
    _fmt: fmtNum, _lerNumero: lerNumero, ErroCalc: ErroCalc
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.FarmaCalculo;
})(typeof window !== "undefined" ? window : globalThis);
