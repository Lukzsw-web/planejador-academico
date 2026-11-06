/* FarmacIA — interpretação de linguagem natural (camada v2).
 * Identifica intenção pedagógica, entidades (conceitos, fármacos, disciplina, período), ambiguidade e estilo pedido.
 * As intenções acadêmicas (pré-requisitos, créditos, regras...) continuam no classify() do farmacia.js; esta camada
 * trata o que o classify não entende: explicações, definições, comparações, exemplos, revisão e perguntas encadeadas. */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};
  var B = function () { return M.busca; };
  function norm(s) { return B().norm(s); }

  // Conceitos reconhecidos (só rótulos: o conteúdo vem da base de conhecimento ou do modelo, nunca daqui).
  var CONCEITOS = [
    ['farmacologia', 'farmacologia'], ['farmacocinetica', 'farmacocinetica'], ['farmacodinamica', 'farmacodinamica'], ['adme', 'farmacocinetica'],
    ['absorcao', 'farmacocinetica'], ['distribuicao', 'farmacocinetica'], ['metabolismo', 'farmacocinetica'], ['excrecao', 'farmacocinetica'], ['eliminacao', 'farmacocinetica'],
    ['biotransformacao', 'farmacocinetica'], ['biodisponibilidade', 'farmacocinetica'], ['bioequivalencia', 'assuntos-regulatorios'], ['meia vida', 'farmacocinetica'],
    ['depuracao', 'farmacocinetica'], ['clearance', 'farmacocinetica'], ['volume de distribuicao', 'farmacocinetica'], ['primeira passagem', 'farmacocinetica'],
    ['receptor', 'farmacodinamica'], ['agonista', 'farmacodinamica'], ['antagonista', 'farmacodinamica'], ['indice terapeutico', 'toxicologia'],
    ['interacao medicamentosa', 'farmacologia'], ['reacao adversa', 'farmacologia'], ['efeito adverso', 'farmacologia'], ['farmaco', 'farmacologia'], ['medicamento', 'farmacologia'],
    ['principio ativo', 'tecnologia-farmaceutica'], ['excipiente', 'tecnologia-farmaceutica'], ['forma farmaceutica', 'tecnologia-farmaceutica'], ['dissolucao', 'tecnologia-farmaceutica'],
    ['solubilidade', 'tecnologia-farmaceutica'], ['esterilidade', 'tecnologia-farmaceutica'], ['posologia', 'farmacologia'], ['dispensacao', 'assistencia-farmaceutica'],
    ['glicolise', 'bioquimica'], ['gliconeogenese', 'bioquimica'], ['ciclo de krebs', 'bioquimica'], ['fosforilacao oxidativa', 'bioquimica'], ['enzima', 'bioquimica'],
    ['cinetica enzimatica', 'bioquimica'], ['beta oxidacao', 'bioquimica'], ['lipoproteina', 'bioquimica'], ['aminoacido', 'bioquimica'], ['proteina', 'bioquimica'],
    ['homeostase', 'fisiologia'], ['potencial de acao', 'fisiologia'], ['sistema nervoso autonomo', 'fisiologia'], ['filtracao glomerular', 'fisiologia'],
    ['antibiotico', 'microbiologia'], ['antimicrobiano', 'microbiologia'], ['resistencia bacteriana', 'microbiologia'], ['bacteria', 'microbiologia'], ['virus', 'microbiologia'],
    ['imunidade', 'imunologia'], ['anticorpo', 'imunologia'], ['vacina', 'imunologia'], ['antigeno', 'imunologia'], ['parasita', 'parasitologia'],
    ['toxicologia', 'toxicologia'], ['toxicidade', 'toxicologia'], ['dose letal', 'toxicologia'], ['fitoterapia', 'farmacognosia'], ['metabolito secundario', 'farmacognosia'],
    ['atencao farmaceutica', 'assistencia-farmaceutica'], ['farmacovigilancia', 'assuntos-regulatorios'], ['registro sanitario', 'assuntos-regulatorios'], ['bula', 'assuntos-regulatorios'],
    ['anvisa', 'assuntos-regulatorios'], ['hemograma', 'analises-clinicas'], ['anemia', 'patologia'], ['inflamacao', 'patologia'], ['quimica organica', 'quimica-organica'],
    ['estereoquimica', 'quimica-organica'], ['titulacao', 'quimica-analitica'], ['ph', 'quimica-geral'], ['ionizacao', 'quimica-geral'], ['ligacao quimica', 'quimica-geral']
  ];
  var CONC_IDX = null;
  function indice() {
    if (CONC_IDX) return CONC_IDX;
    CONC_IDX = CONCEITOS.map(function (c) {
      return { termo: c[0], categoria: c[1], toks: B().palavras(c[0]) };
    }).sort(function (a, b) { return b.toks.length - a.toks.length; });
    return CONC_IDX;
  }
  var NOME_CONC = { 'meia vida': 'meia-vida', 'ciclo de krebs': 'ciclo de Krebs', 'beta oxidacao': 'beta-oxidação' };
  function rotulo(termo) {
    if (NOME_CONC[termo]) return NOME_CONC[termo];
    var acc = { farmacocinetica: 'farmacocinética', farmacodinamica: 'farmacodinâmica', absorcao: 'absorção', excrecao: 'excreção', eliminacao: 'eliminação', biotransformacao: 'biotransformação',
      depuracao: 'depuração', 'volume de distribuicao': 'volume de distribuição', 'primeira passagem': 'efeito de primeira passagem', 'indice terapeutico': 'índice terapêutico', 'interacao medicamentosa': 'interação medicamentosa',
      'reacao adversa': 'reação adversa', farmaco: 'fármaco', 'principio ativo': 'princípio ativo', 'forma farmaceutica': 'forma farmacêutica', dissolucao: 'dissolução', 'dispensacao': 'dispensação',
      glicolise: 'glicólise', gliconeogenese: 'gliconeogênese', 'fosforilacao oxidativa': 'fosforilação oxidativa', 'cinetica enzimatica': 'cinética enzimática', aminoacido: 'aminoácido', proteina: 'proteína',
      'potencial de acao': 'potencial de ação', 'sistema nervoso autonomo': 'sistema nervoso autônomo', 'filtracao glomerular': 'filtração glomerular', antibiotico: 'antibiótico', bacteria: 'bactéria', virus: 'vírus',
      antigeno: 'antígeno', 'atencao farmaceutica': 'atenção farmacêutica', farmacovigilancia: 'farmacovigilância', 'registro sanitario': 'registro sanitário', inflamacao: 'inflamação', 'quimica organica': 'química orgânica',
      estereoquimica: 'estereoquímica', titulacao: 'titulação', ionizacao: 'ionização', 'ligacao quimica': 'ligação química', bioequivalencia: 'bioequivalência', 'resistencia bacteriana': 'resistência bacteriana',
      'metabolito secundario': 'metabólito secundário', 'dose letal': 'dose letal', imunidade: 'imunidade', 'sistema nervoso': 'sistema nervoso', toxicidade: 'toxicidade', 'efeito adverso': 'efeito adverso', 'lipoproteina': 'lipoproteína' };
    return acc[termo] || termo;
  }

  function conceitosEm(texto) {
    var qw = B().palavras(texto), out = [], usado = {};
    function igual(a, b) {
      if (a === b || B().stem(a) === B().stem(b)) return true;
      var lim = b.length >= 10 ? 2 : b.length >= 7 ? 1 : 0;
      return lim > 0 && a.charAt(0) === b.charAt(0) && Math.abs(a.length - b.length) <= lim && B().editDistance(a, b) <= lim;
    }
    indice().forEach(function (c) {
      var n = c.toks.length;
      for (var i = 0; i + n <= qw.length; i += 1) {
        var ok = true;
        for (var j = 0; j < n; j += 1) { if (usado[i + j] || !igual(qw[i + j], c.toks[j])) { ok = false; break; } }
        if (ok) { for (var k = 0; k < n; k += 1) usado[i + k] = 1; out.push({ pos: i, termo: c.termo, rotulo: rotulo(c.termo), categoria: c.categoria }); break; }
      }
    });
    return out.sort(function (a, b) { return a.pos - b.pos; }).map(function (c) { return { termo: c.termo, rotulo: c.rotulo, categoria: c.categoria }; });
  }

  var FARMACOS = /\b(paracetamol|dipirona|ibuprofeno|aspirina|acido acetilsalicilico|amoxicilina|penicilina|omeprazol|losartana|metformina|insulina|varfarina|digoxina|atenolol|captopril|fluoxetina|diazepam|morfina|cafeina|dexametasona|prednisona|cetoconazol|rifampicina)\b|\b[a-z]{3,}(cilina|micina|floxacino|prazol|pril|sartana|olol|dipino|statina|formina|azepam|triptilina|oxetina|tidina|cortisona|conazol)\b/g;
  function farmacosEm(n) { var out = [], m; FARMACOS.lastIndex = 0; while ((m = FARMACOS.exec(n))) { if (out.indexOf(m[0]) < 0) out.push(m[0]); } return out; }

  var P = {
    exercicio: /\b(questoes|questao|exercicios?|me (pergunta|perguntas|teste|testa|faz perguntas|faca perguntas)|quiz|simulado|treinar|praticar|flashcards?|revisao)\b/,
    erro: /\b(errei|onde errei|meu raciocinio|minha resposta|meu erro|esta certo|ta certo|estou certo)\b/,
    comparar: /\b(diferenca|diferencas|difere|diferem|compar\w*|versus|vs|semelhanca|distingu\w*|confund\w*)\b/,
    reformular: /\b(de outro jeito|de outra forma|de outra maneira|nao entendi|expliqu?e? de novo|explica de novo|repete|reformul\w*|mais simples|mais facil|como se eu|pra leigo|para leigo|em linguagem simples)\b/,
    exemplo: /\b(exemplo|exemplos|exemplifica\w*|caso pratico|na pratica)\b/,
    resumo: /\b(resum\w*|em poucas palavras|sintese|em topicos|topicos principais)\b/,
    aprofundar: /\b(aprofund\w*|detalhad\w*|a fundo|completo|completa|mais detalhes|detalhes|detalha|detalhe|em detalhes)\b/,
    analogia: /\b(analogia|metafora|como se fosse)\b/,
    fatores: /\b(o que (pode )?(alter\w*|influenc\w*|afet\w*|interfer\w*|modific\w*|muda)|fatores|de que depende|do que depende)\b/,
    onde: /\b(em qual (orgao|local|parte|tecido|sistema)|onde (isso |ele |ela )?(acontece|ocorre|age|atua)|qual orgao)\b/,
    definir: /\b(o que (e|eh|sao|significa|quer dizer|seria)|defini\w*|conceito|significado)\b/,
    explicar: /\b(expli[cq]\w*|como (funciona|ocorre|acontece|age|atua|se|o corpo|o organismo|um|uma)|por que|porque|mecanismo|me ensina|ensina|entender|para que serve|pra que serve)\b/,
    anafora: /\b(isso|disso|nisso|aquilo|esse|essa|esses|essas|desse|dessa|dele|dela|nele|nela|o mesmo|a mesma|ele|ela|eles|elas)\b/,
    academico: /\b(posso puxar|puxar|progresso|faltam|falta|formar|pre ?requisito|co ?requisito|creditos?|carga horaria|tranca\w*|periodo|ementa|disciplina|grade|matricula|siga)\b/
  };
  function t(re, n) { return re.test(n); }

  var AMBIGUOS = [
    { termo: 'metabolismo', re: /\bmetabolism\w*\b/, desambigua: /\b(farmaco\w*|medicamento\w*|droga\w*|biotransformacao|figado|hepatic\w*|cyp|citocromo|energia|energetic\w*|glicose|glicidio\w*|carboidrato\w*|lipidio\w*|aminoacido\w*|atp|celular|krebs|glicolise|basal|primeira passagem)\b/,
      pergunta: 'Metabolismo pode significar coisas bem diferentes. Qual deles você quer estudar?',
      opcoes: [['Metabolismo de fármacos (biotransformação)', 'Explique o metabolismo de fármacos (biotransformação)'], ['Metabolismo energético (glicose, ATP)', 'Explique o metabolismo energético celular']] },
    { termo: 'resistencia', re: /\bresistencia\b/, desambigua: /\b(bacteri\w*|antibiotic\w*|antimicrobian\w*|microb\w*|insulina|glicose|diabet\w*|fisica|exercicio)\b/,
      pergunta: 'Resistência a quê? Posso falar de coisas diferentes:',
      opcoes: [['Resistência bacteriana a antibióticos', 'Explique a resistência bacteriana a antibióticos'], ['Resistência à insulina', 'Explique a resistência à insulina']] },
    { termo: 'interacao', re: /\binteracoes?\b/, desambigua: /\b(medicamentos?\w*|farmaco\w*|receptor\w*|alimento\w*|nutriente\w*|proteina\w*|enzima\w*|molecular\w*|ligante|droga\w*)\b/,
      pergunta: 'Interação entre o quê? Algumas opções:',
      opcoes: [['Interação entre medicamentos', 'Explique interação medicamentosa'], ['Interação fármaco-receptor', 'Explique a interação fármaco-receptor']] }
  ];

  function interpretar(raw) {
    var n = norm(raw), nw = n ? n.split(' ').length : 0;
    var conc = conceitosEm(raw), farm = farmacosEm(n);
    var mods = { simples: t(/\b(simples|simplific\w*|leigo|facil|poucas palavras)\b/, n), aprofundar: t(P.aprofundar, n), exemplo: t(P.exemplo, n), resumo: t(P.resumo, n), analogia: t(P.analogia, n) };
    var anafora = conc.length === 0 && farm.length === 0 && t(P.anafora, n);
    var intencao = null;
    if (t(P.exercicio, n)) intencao = 'exercicio';
    else if (t(P.erro, n)) intencao = 'erro';
    else if (t(P.comparar, n) && (conc.length >= 2 || /\bdiferenca\b/.test(n) || anafora)) intencao = 'comparar';
    else if (t(P.reformular, n)) intencao = 'reformular';
    else if (mods.exemplo) intencao = 'exemplo';
    else if (mods.resumo) intencao = 'resumo';
    else if (t(P.fatores, n)) intencao = 'fatores';
    else if (t(P.onde, n)) intencao = 'onde';
    else if (t(P.definir, n)) intencao = 'definir';
    else if (t(P.explicar, n)) intencao = 'explicar';
    else if (mods.aprofundar) intencao = 'aprofundar';
    else if (!intencao && (conc.length || farm.length) && nw <= 4) intencao = 'definir';
    var seguimento = !conc.length && !farm.length && (anafora || ['reformular', 'exemplo', 'resumo', 'aprofundar', 'fatores', 'onde', 'exercicio', 'erro'].indexOf(intencao) >= 0 || /^e (se |como |por que |quando |o que |qual |quais |onde )/.test(n) || /^(mais|continua|continue|e ai|e depois)$/.test(n));
    var nivel = mods.aprofundar ? 'aprofundado' : (mods.simples || mods.resumo || (intencao === 'definir' && nw <= 7 && !mods.exemplo)) ? 'curto' : 'normal';
    var ambiguidade = null;
    if (!seguimento && nw <= 8 && !t(P.academico, n)) {
      for (var i = 0; i < AMBIGUOS.length; i += 1) {
        var a = AMBIGUOS[i];
        if (a.re.test(n) && !a.desambigua.test(n)) { ambiguidade = { termo: a.termo, pergunta: a.pergunta, opcoes: a.opcoes }; break; }
      }
    }
    var disc = null;
    try { var f = window.FarmacIA && window.FarmacIA._findSubjects ? window.FarmacIA._findSubjects(raw) : null; if (f && f.list && f.list.length === 1) disc = f.list[0].codigo; } catch (e) { disc = null; }
    var codigoExplicito = /\b[A-Za-z]{3}\d{3}\b/.test(String(raw));
    var numeral = /\b(i|ii|iii|iv|v|vi|vii|viii|\d)\b/.test(n.replace(/\be\b/g, ''));
    return {
      n: n, palavras: nw, intencao: intencao, pedagogica: !!intencao, modificadores: mods, nivel: nivel, conceitos: conc, farmacos: farm,
      categorias: conc.map(function (c) { return c.categoria; }), disciplina: disc, codigoExplicito: codigoExplicito, numeral: numeral,
      academica: t(P.academico, n), anafora: anafora, seguimento: seguimento, ambiguidade: ambiguidade
    };
  }

  M.interpretador = { interpretar: interpretar, conceitosEm: conceitosEm, farmacosEm: farmacosEm, CONCEITOS: CONCEITOS };
})();
