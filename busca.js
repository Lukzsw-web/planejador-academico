/* FarmacIA — busca local: índice invertido + BM25, sinônimos, tolerância a erro de digitação e trechos.
 * Sem embeddings: para o volume atual (dezenas de documentos) a busca textual é suficiente, barata e funciona offline.
 * O índice é construído na primeira busca e refeito só quando a base muda. */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};

  var STOP = {};
  ('a o as os um uma uns umas de do da dos das em no na nos nas por para pra pro com sem sobre entre e ou mas que se qual quais quem como quando onde ' +
   'eh ser sao foi era esta estao tem ter ha isso isto esse essa esses essas este esta aquilo me te nos voce vc eu ao aos ja mais muito tambem so ' +
   'pode podem posso quero queria gostaria saber explica explique explicar fala fale diga dizer favor oi ola ' +
   'o que e eh sobre falar entender detalhadamente detalhada detalhado resumidamente rapidamente brevemente simplesmente basicamente aprofundada aprofundado aprofundar detalhes jeito outro outra forma maneira simples facil leigo ensina ensinar ajuda ajudar curto').split(' ').forEach(function (w) { if (w) STOP[w] = 1; });

  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  // expressões fixas viram um token só ("meia vida" -> "meiavida")
  var FRASES = [[/\bmeia vida\b/g, 'meiavida'], [/\bt1 2\b/g, 'meiavida'], [/\bhalf life\b/g, 'meiavida'], [/\bprimeira passagem\b/g, 'primeirapassagem'],
    [/\bvolume (aparente )?de distribuicao\b/g, 'voldistribuicao'], [/\bindice terapeutico\b/g, 'indiceterapeutico'], [/\bprincipio ativo\b/g, 'principioativo'],
    [/\bforma farmaceutica\b/g, 'formafarmaceutica'], [/\binteracao medicamentosa\b/g, 'interacaomedicamentosa'], [/\bciclo de krebs\b/g, 'ciclokrebs']];
  function frases(n) { FRASES.forEach(function (f) { n = n.replace(f[0], f[1]); }); return n; }

  function stem(t) {
    if (t.length <= 3 || /\d/.test(t)) return t;
    t = t.replace(/coes$/, 'cao').replace(/(oes|aes|aos)$/, 'ao').replace(/ns$/, 'm').replace(/is$/, 'l');
    if (t.length > 3 && /[^s]s$/.test(t)) t = t.slice(0, -1);
    if (t.length >= 7) {
      var suf = ['amente', 'mente', 'idade', 'acao', 'cao', 'ico', 'ica', 'ivo', 'iva', 'oso', 'osa', 'ado', 'ada', 'ar', 'er', 'ir', 'al'];
      for (var i = 0; i < suf.length; i += 1) {
        if (t.length - suf[i].length >= 4 && t.slice(-suf[i].length) === suf[i]) { t = t.slice(0, -suf[i].length); break; }
      }
    }
    return t;
  }
  function palavras(s) { return frases(norm(s)).split(' ').filter(Boolean); }
  function tokens(s, manterStop) {
    return frases(norm(s)).split(' ').filter(function (t) { return t && (manterStop || !STOP[t]); }).map(stem);
  }

  // grupos de sinônimos (já normalizados/frases); a expansão pesa menos que a palavra original
  var GRUPOS = [
    ['medicamento', 'remedio', 'farmaco', 'droga', 'principioativo'], ['absorcao', 'absorver'], ['eliminacao', 'excrecao', 'depuracao', 'clearance'],
    ['meiavida', 'tempo de eliminacao'], ['biotransformacao', 'metabolizacao', 'metabolismo'], ['corpo', 'organismo'], ['posologia', 'dose', 'dosagem'],
    ['bula', 'folheto'], ['tcc', 'monografia'], ['trancamento', 'trancar'], ['biodisponibilidade', 'biodisponivel'], ['adme', 'farmacocinetica'],
    ['receptor', 'alvo'], ['toxicidade', 'toxico', 'toxicologia'], ['bioquimica', 'bioquimico']
  ].map(function (g) { return g.map(function (t) { return tokens(t, true).join(' '); }); });
  var SIN = {};
  GRUPOS.forEach(function (g) { g.forEach(function (t) { if (t.indexOf(' ') < 0) { SIN[t] = (SIN[t] || []).concat(g.filter(function (x) { return x !== t && x.indexOf(' ') < 0; })); } }); });

  function editDistance(a, b) {
    var al = a.length, bl = b.length, i, j, d = [];
    for (i = 0; i <= al; i += 1) d[i] = [i];
    for (j = 0; j <= bl; j += 1) d[0][j] = j;
    for (i = 1; i <= al; i += 1) for (j = 1; j <= bl; j += 1) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[al][bl];
  }

  function dividir(texto, max) {
    var partes = String(texto).split(/(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9])|\n{2,}/), out = [], cur = '';
    partes.forEach(function (p) {
      if (cur && (cur + ' ' + p).length > max) { out.push(cur); cur = p; } else cur = cur ? cur + ' ' + p : p;
    });
    if (cur) out.push(cur);
    return out.reduce(function (acc, c) {   // trecho único maior que o limite: corta em espaço
      while (c.length > max * 1.5) { var cut = c.lastIndexOf(' ', max); if (cut < max * 0.5) cut = max; acc.push(c.slice(0, cut)); c = c.slice(cut).trim(); }
      acc.push(c); return acc;
    }, []);
  }

  var idx = null;
  function construir() {
    var K = M.conhecimento, cfg = M.config.busca;
    var itens = K ? K.todos() : [];
    var chunks = [], inv = Object.create(null), df = Object.create(null), bruto = Object.create(null);
    itens.forEach(function (it) {
      var cabeca = tokens(it.titulo + ' ' + it.aliases.join(' ') + ' ' + it.assunto);
      dividir(it.texto, cfg.maxChunk).forEach(function (txt, i) {
        var tf = Object.create(null), len = 0;
        tokens(txt).forEach(function (t) { tf[t] = (tf[t] || 0) + 1; len += 1; });
        palavras(txt).forEach(function (w) { if (w.length >= 5 && !STOP[w]) bruto[w] = stem(w); });
        cabeca.forEach(function (t) { tf[t] = (tf[t] || 0) + 3; len += 3; });
        chunks.push({ item: it, n: i, texto: txt, tf: tf, len: len });
      });
    });
    var total = 0;
    chunks.forEach(function (c, ci) {
      total += c.len;
      Object.keys(c.tf).forEach(function (t) { (inv[t] = inv[t] || []).push(ci); df[t] = (df[t] || 0) + 1; });
    });
    idx = { src: itens, chunks: chunks, inv: inv, df: df, avg: chunks.length ? total / chunks.length : 1, vocab: Object.keys(df), bruto: bruto, brutoLista: Object.keys(bruto), itens: itens.length };
  }

  // palavra da pergunta que não existe no índice: palavras parecidas do material (erro de digitação), comparando palavras inteiras
  function candidatos(w) {
    var lim = w.length >= 9 ? 2 : w.length >= 5 ? 1 : 0, out = [];
    if (!lim) return out;
    idx.brutoLista.forEach(function (v) { if (v.charAt(0) === w.charAt(0) && Math.abs(v.length - w.length) <= lim && editDistance(w, v) <= lim && out.indexOf(idx.bruto[v]) < 0) out.push(idx.bruto[v]); });
    return out.slice(0, 3);
  }

  /* buscar(texto, { categorias: [ids], k }) -> { resultados, cobertura, suficiente, vazio } */
  function buscar(texto, opts) {
    opts = opts || {};
    var cfg = M.config.busca;
    if (!idx || idx.src !== M.conhecimento.todos()) construir();
    if (!idx.chunks.length) return { resultados: [], cobertura: 0, suficiente: false, vazio: true };
    var brutas = palavras(texto).filter(function (w) { return !STOP[w]; }), seen = {}, qt = [], rawDe = {};
    brutas.forEach(function (w) { var t = stem(w); if (!seen[t]) { seen[t] = 1; qt.push(t); rawDe[t] = w; } });
    if (!qt.length) return { resultados: [], cobertura: 0, suficiente: false, vazio: false };
    var pesos = Object.create(null), grupoDe = Object.create(null);
    qt.forEach(function (t) {
      var alvo = [[t, 1]];
      if (!idx.df[t]) candidatos(rawDe[t]).forEach(function (c) { alvo.push([c, 0.8]); });
      (SIN[t] || []).forEach(function (s) { alvo.push([s, 0.55]); });
      alvo.forEach(function (a) { if (!idx.df[a[0]]) return; if ((pesos[a[0]] || 0) < a[1]) pesos[a[0]] = a[1]; (grupoDe[a[0]] = grupoDe[a[0]] || []).push(t); });
    });
    var desconhecidas = qt.filter(function (t) { return !pesos[t] && !Object.keys(pesos).some(function (a) { return (grupoDe[a] || []).indexOf(t) >= 0; }) && rawDe[t].length >= 8; });
    var N = idx.chunks.length, k1 = 1.2, b = 0.75, score = Object.create(null), achou = Object.create(null);
    Object.keys(pesos).forEach(function (t) {
      var idf = Math.log(1 + (N - idx.df[t] + 0.5) / (idx.df[t] + 0.5));
      idx.inv[t].forEach(function (ci) {
        var c = idx.chunks[ci], f = c.tf[t];
        score[ci] = (score[ci] || 0) + pesos[t] * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * c.len / idx.avg)));
        (achou[ci] = achou[ci] || {});
        grupoDe[t].forEach(function (q) { achou[ci][q] = 1; });
      });
    });
    var cats = opts.categorias || [], ano = new Date().getFullYear();
    var lista = Object.keys(score).map(function (ci) {
      var c = idx.chunks[ci], it = c.item, tipo = M.conhecimento.TIPOS[it.tipo] || { peso: 0.8 };
      var s = score[ci] * tipo.peso * (it.revisado ? 1 : 0.97);
      if (cats.indexOf(it.categoria) >= 0) s *= 1.2;
      var y = parseInt(String(it.data).slice(0, 4), 10);
      if (y && ano - y > 3) s *= 0.95;                // material antigo pesa um pouco menos
      var cob = Object.keys(achou[ci]).length / qt.length;
      return { c: c, score: s, cobertura: cob };
    }).sort(function (a, b2) { return b2.score - a.score; });

    var porItem = {}, res = [], kMax = opts.k || cfg.k;
    for (var i = 0; i < lista.length && res.length < kMax; i += 1) {   // no máximo 2 trechos do mesmo item
      var e = lista[i], id = e.c.item.id;
      if ((porItem[id] || 0) >= 2) continue;
      if (e.cobertura < Math.min(cfg.minCobertura, 0.5) && res.length) continue;
      porItem[id] = (porItem[id] || 0) + 1;
      var it2 = e.c.item;
      res.push({ id: it2.id + '#' + e.c.n, itemId: it2.id, titulo: it2.titulo, trecho: e.c.texto, score: Math.round(e.score * 100) / 100, cobertura: Math.round(e.cobertura * 100) / 100,
        tipo: it2.tipo, oficial: !!(M.conhecimento.TIPOS[it2.tipo] || {}).oficial, fonte: it2.fonte, url: it2.url, data: it2.data, categoria: it2.categoria, revisado: it2.revisado });
    }
    var top = res[0];
    return { resultados: res, cobertura: top ? top.cobertura : 0, suficiente: !!top && !desconhecidas.length && top.score >= cfg.minScore && top.cobertura >= cfg.minCobertura, vazio: false, desconhecidas: desconhecidas.map(function (t) { return rawDe[t]; }) };
  }

  M.busca = { buscar: buscar, palavras: palavras, reconstruir: function () { idx = null; }, tokens: tokens, norm: norm, stem: stem, editDistance: editDistance, _dividir: dividir, estatisticas: function () { if (!idx) construir(); return { trechos: idx.chunks.length, itens: idx.itens, termos: idx.vocab.length }; } };
})();
