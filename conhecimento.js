/* FarmacIA — base de conhecimento: categorias, tipos de fonte e registro de materiais.
 * Não copia dados curriculares: disciplinas continuam só em disciplinas.js. Ementas e regras são lidas
 * de onde já existem (window.FarmaEmentas, window.FarmaRegras) e viram itens em memória, sob demanda.
 * Item: { id, titulo, categoria, texto, aliases[], tipo, fonte, autor, data, url, assunto, revisado } */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};

  var CATEGORIAS = [
    ['farmacologia', 'Farmacologia'], ['farmacocinetica', 'Farmacocinética'], ['farmacodinamica', 'Farmacodinâmica'],
    ['quimica-geral', 'Química geral'], ['quimica-organica', 'Química orgânica'], ['quimica-analitica', 'Química analítica'],
    ['bioquimica', 'Bioquímica'], ['fisiologia', 'Fisiologia'], ['anatomia', 'Anatomia'], ['microbiologia', 'Microbiologia'],
    ['imunologia', 'Imunologia'], ['parasitologia', 'Parasitologia'], ['patologia', 'Patologia'],
    ['tecnologia-farmaceutica', 'Tecnologia farmacêutica'], ['farmacognosia', 'Farmacognosia'], ['toxicologia', 'Toxicologia'],
    ['analises-clinicas', 'Análises clínicas'], ['saude-coletiva', 'Saúde coletiva'],
    ['assistencia-farmaceutica', 'Assistência farmacêutica'], ['assuntos-regulatorios', 'Assuntos regulatórios'],
    ['academico', 'Conhecimento acadêmico'], ['institucional', 'Conhecimento institucional']
  ];
  // peso = qualidade da fonte na busca; oficial > ementa > glossário do projeto > material de estudante.
  var TIPOS = {
    'oficial': { nome: 'Documento oficial (UFRJ/PPC)', peso: 1.15, oficial: true },
    'ementa-ppc': { nome: 'Ementa do PPC de Farmácia', peso: 1.05, oficial: true },
    'glossario-projeto': { nome: 'Glossário do projeto (não oficial)', peso: 0.95, oficial: false },
    'estudante': { nome: 'Material de estudante (não oficial)', peso: 0.8, oficial: false }
  };
  var catIds = {};
  CATEGORIAS.forEach(function (c) { catIds[c[0]] = c[1]; });

  var packs = {};        // id -> { itens: [...] }
  var dinamicas = {};    // id -> function () -> itens[]
  var cache = null;

  function limpar(it, packId) {
    if (!it || !it.id || !it.titulo || !it.texto) return null;
    return {
      id: packId + ':' + it.id, titulo: String(it.titulo), texto: String(it.texto),
      categoria: catIds[it.categoria] ? it.categoria : 'academico',
      aliases: (it.aliases || []).map(String), tipo: TIPOS[it.tipo] ? it.tipo : 'estudante',
      fonte: String(it.fonte || ''), autor: it.autor || '', data: it.data || '', url: it.url || '',
      assunto: it.assunto || '', revisado: it.revisado === true
    };
  }
  function registrar(pack) {
    if (!pack || !pack.id || !Array.isArray(pack.itens)) return 0;
    packs[pack.id] = pack.itens.map(function (i) { return limpar(i, pack.id); }).filter(Boolean);
    cache = null;
    return packs[pack.id].length;
  }
  function registrarDinamica(id, fn) { dinamicas[id] = fn; cache = null; }
  function remover(id) { delete packs[id]; delete dinamicas[id]; cache = null; }
  function todos() {
    if (cache) return cache;
    var out = [];
    Object.keys(packs).forEach(function (k) { out = out.concat(packs[k]); });
    Object.keys(dinamicas).forEach(function (k) {
      try { out = out.concat((dinamicas[k]() || []).map(function (i) { return limpar(i, k); }).filter(Boolean)); } catch (e) { /* fonte indisponível: segue sem ela */ }
    });
    cache = out;
    return out;
  }
  function porId(id) { return todos().filter(function (i) { return i.id === id; })[0] || null; }
  function categoriasComConteudo() {
    var c = {};
    todos().forEach(function (i) { c[i.categoria] = (c[i.categoria] || 0) + 1; });
    return CATEGORIAS.map(function (x) { return { id: x[0], nome: x[1], itens: c[x[0]] || 0 }; });
  }

  // ---- fontes dinâmicas já existentes no projeto ----
  function texto(html) {
    return String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
  var PREFIXO_CAT = { BQM: 'bioquimica', CFF: 'fisiologia', BMF: 'farmacologia', BMW: 'anatomia', IQA: 'quimica-analitica', IQO: 'quimica-organica', IQG: 'quimica-geral', IQF: 'quimica-geral', IMW: 'microbiologia', FFC: 'analises-clinicas', FFM: 'farmacologia', FFP: 'farmacognosia' };
  function categoriaDaDisciplina(cod, nome) {
    var n = String(nome || '').toLowerCase();
    if (/toxicolog/.test(n)) return 'toxicologia';
    if (/parasit/.test(n)) return 'parasitologia';
    if (/imunolog/.test(n)) return 'imunologia';
    if (/farmacogn|fitoter/.test(n)) return 'farmacognosia';
    if (/assist[êe]ncia|sa[úu]de (p[úu]blica|coletiva)/.test(n)) return 'saude-coletiva';
    if (/regulat|vigil[âa]ncia/.test(n)) return 'assuntos-regulatorios';
    return PREFIXO_CAT[String(cod).slice(0, 3)] || 'academico';
  }
  registrarDinamica('ementas', function () {
    var E = window.FarmaEmentas || {}, out = [];
    Object.keys(E).forEach(function (cod) {
      var d = typeof getDisciplinaByCode === 'function' ? getDisciplinaByCode(cod) : null;
      if (!d || !E[cod] || !E[cod][0]) return;
      out.push({
        id: cod, titulo: 'Ementa de ' + d.nome + ' (' + cod + ')', categoria: categoriaDaDisciplina(cod, d.nome),
        texto: E[cod][0] + (E[cod][1] ? ' Objetivo: ' + E[cod][1] : ''), aliases: [d.nome, cod], tipo: 'ementa-ppc',
        fonte: 'PPC de Farmácia, ementa da disciplina ' + cod, assunto: d.nome, revisado: true
      });
    });
    return out;
  });
  registrarDinamica('regras', function () {
    var R = window.FarmaRegras && window.FarmaRegras.all ? window.FarmaRegras.all() : [], out = [];
    R.forEach(function (r) {
      var fm = /<p class="farma-source">Fonte: ([\s\S]*?)<\/p>/.exec(r.html);
      var t1 = /<strong>([^<]+)<\/strong>/.exec(r.html);
      var corpo = texto(String(r.html).replace(/<p class="farma-source">[\s\S]*?<\/p>/g, ''));
      if (corpo.length < 20) return;
      out.push({
        id: r.id, titulo: t1 ? t1[1] : r.id, categoria: 'institucional', texto: corpo, aliases: [r.id],
        tipo: 'oficial', fonte: fm ? texto(fm[1]) : 'Manual Estudantil da UFRJ / PPC de Farmácia', revisado: true
      });
    });
    return out;
  });

  M.conhecimento = {
    CATEGORIAS: CATEGORIAS, TIPOS: TIPOS, registrar: registrar, registrarDinamica: registrarDinamica, remover: remover,
    todos: todos, porId: porId, categoriasComConteudo: categoriasComConteudo, invalidar: function () { cache = null; }, _texto: texto
  };
})();
