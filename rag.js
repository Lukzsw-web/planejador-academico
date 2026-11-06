/* FarmacIA — RAG: recupera trechos, monta o pedido ao modelo e formata a resposta com as fontes.
 * Os trechos vêm só da base local (conhecimento.js). Nunca se inventa fonte: só são listados materiais
 * que realmente foram recuperados (e, na resposta de IA, só os que o modelo citou com [n]). */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  function preparar(interp, texto) {
    var consulta = texto + ' ' + (interp.conceitos || []).map(function (c) { return c.termo; }).join(' ') + ' ' + (interp.farmacos || []).join(' ');
    var b = M.busca.buscar(consulta, { categorias: interp.categorias || [] });
    return b;
  }

  function cid() {
    var k = M.config.storage.cid, v = M.armazenar.ler(k);
    if (v && /^[a-z0-9-]{12,64}$/.test(v)) return v;
    var r = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8));
    v = String(r).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64);
    M.armazenar.gravar(k, v);
    return v;
  }

  // O que de fato sai do aparelho quando a IA online é usada (ver FARMACIA_ARCHITECTURE.md).
  function payload(interp, resolvido, busca) {
    var c = M.config.ia, trechos = (busca && busca.resultados || []).slice(0, c.maxTrechos).map(function (r, i) {
      return { n: i + 1, titulo: String(r.titulo).slice(0, 160), fonte: String(r.fonte).slice(0, 200), tipo: r.tipo, texto: String(r.trecho).slice(0, c.maxCharsTrecho) };
    });
    var perfil = M.contexto.perfil();
    return {
      v: 1, cid: cid(), pergunta: String(resolvido.texto).slice(0, c.maxPergunta), historico: M.contexto.historico(), trechos: trechos,
      estilo: { intencao: interp.intencao || 'explicar', nivel: interp.nivel, mods: Object.keys(interp.modificadores || {}).filter(function (k) { return interp.modificadores[k]; }) },
      disciplina: M.contexto.academico(interp.disciplina && !interp.conceitos.length ? interp.disciplina : null),
      perfil: { periodo: perfil.periodo, turno: perfil.turno }
    };
  }

  // Markdown mínimo e seguro: escapa tudo primeiro; depois só **negrito**, listas e parágrafos.
  function mdSeguro(t) {
    var blocos = String(t || '').replace(/\r/g, '').trim().split(/\n{2,}/);
    return blocos.map(function (b) {
      var linhas = b.split('\n').map(function (l) { return esc(l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '• ').replace(/^#{1,6}\s*/, '')); });
      var h = linhas.join('<br>').replace(/\*\*([^*<][^*]*?)\*\*/g, '<strong>$1</strong>');
      return '<p>' + h + '</p>';
    }).join('');
  }

  function fontesCitadas(texto, busca) {
    var lista = busca && busca.resultados ? busca.resultados.slice(0, M.config.ia.maxTrechos) : [], usadas = [], m, re = /\[(\d{1,2})\]/g;
    while ((m = re.exec(texto))) { var i = Number(m[1]) - 1; if (lista[i] && usadas.indexOf(i) < 0) usadas.push(i); }
    return { citadas: usadas.sort().map(function (i) { return { n: i + 1, r: lista[i] }; }), todas: lista };
  }
  function linhaFonte(r) { return esc(r.titulo) + ' — ' + esc(r.fonte || (M.conhecimento.TIPOS[r.tipo] || {}).nome || '') + (r.url ? ' (' + esc(r.url) + ')' : ''); }

  function formatarIA(texto, busca) {
    var limpo = String(texto).replace(/\[(\d{1,2})\]/g, function (x, d) { return busca && busca.resultados && busca.resultados[Number(d) - 1] && Number(d) <= M.config.ia.maxTrechos ? x : ''; });
    var f = fontesCitadas(limpo, busca), html = mdSeguro(limpo);
    if (f.citadas.length) html += '<p class="farma-source">Fontes: ' + f.citadas.map(function (c) { return '[' + c.n + '] ' + linhaFonte(c.r); }).join('<br>') + '</p>';
    else if (f.todas.length) html += '<p class="farma-source">Material consultado, sem citação direta: ' + f.todas.map(function (r) { return esc(r.titulo); }).join('; ') + '.</p>';
    else html += '<p class="farma-source">Sem fonte na base local: resposta baseada no conhecimento geral do modelo.</p>';
    html += '<p class="farma-note">Resposta gerada por IA online. Pode conter erros: confira em livro-texto ou com o professor antes de usar em prova ou na prática. Não substitui orientação profissional.</p>';
    return html;
  }

  // Resposta determinística (offline): trechos da base, claramente rotulados como não gerados por IA.
  function formatarLocal(busca, interp) {
    var r = (busca.resultados || []).filter(function (x) { return x.tipo !== 'ementa-ppc' || x.cobertura >= 0.8; });
    if (!r.length) return '';
    var max = interp && interp.intencao === 'comparar' ? 2 : 1, vistos = {}, usados = [];
    r.forEach(function (x) { if (usados.length < max && !vistos[x.itemId]) { vistos[x.itemId] = 1; usados.push(x); } });
    var html = usados.map(function (x) { return '<p><strong>' + esc(x.titulo) + '</strong></p><p>' + esc(x.trecho) + '</p>'; }).join('');
    html += '<p class="farma-source">Fonte: ' + usados.map(function (x) { return linhaFonte(x); }).join('<br>') + '</p>';
    var naoRev = usados.some(function (x) { return !x.revisado && !x.oficial; });
    html += '<p class="farma-note">Resposta do material local da FarmacIA (sem IA online, texto pronto)' + (naoRev ? '; o glossário ainda não foi revisado por docente' : '') + '.</p>';
    return html;
  }

  M.rag = { preparar: preparar, payload: payload, formatarIA: formatarIA, formatarLocal: formatarLocal, mdSeguro: mdSeguro, cid: cid };
})();
