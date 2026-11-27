/* farmacia-ia.js — FarmacIA, camada v2 (módulos em window.FarmaMod): configuração, conhecimento, busca, interpretação, contexto, RAG, provedor de IA e orquestrador.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Seção: configuracao
// =====================================================================
/* FarmacIA — configuração do assistente e acesso seguro ao armazenamento local.
 * Módulo novo (v2). Sem dependências. Os demais módulos leem tudo daqui. */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};

  M.config = {
    versao: '2.0.0',
    ia: {
      habilitada: true,          // chave geral: false desliga a IA online para todos
      funcao: 'farmacia-ia',     // nome da Edge Function no Supabase
      endpoint: '',              // vazio = {SUPABASE_URL}/functions/v1/{funcao}
      timeoutMs: 20000,          // o servidor corta antes (18 s); o cliente desiste aos 20 s
      intervaloMinMs: 2500,      // intervalo mínimo entre duas chamadas online
      maxPorSessao: 40,          // teto de chamadas online por sessão do navegador
      maxPergunta: 500,          // caracteres enviados da pergunta
      academicoRiscoOnline: false, // pergunta ACADÊMICA sobre efeitos adversos/interações (risco 'geral'): false = só material local; true = pode ir à IA online, com instrução de resposta só conceitual
      maxHistorico: 4,           // mensagens anteriores enviadas (pares pergunta/resposta recentes)
      maxCharsHistorico: 280,    // cada mensagem do histórico é cortada neste tamanho
      maxTrechos: 4,             // trechos do material local enviados como contexto
      maxCharsTrecho: 650,
      falhasParaPausar: 3,       // disjuntor: após N falhas seguidas, pausa as chamadas
      pausaMs: 60000
    },
    busca: { k: 4, maxChunk: 600, minScore: 2.2, minCobertura: 0.5 },
    storage: {
      consentimento: 'planejador_farma_ia_consent_v1',
      modo: 'planejador_farma_ia_mode_v1',   // 'auto' | 'offline'
      cid: 'planejador_farma_cid_v1',        // identificador anônimo aleatório (só para limite de uso)
      cota: 'planejador_farma_ia_cota_v1'    // dia (fuso de São Paulo) em que a cota diária da IA online acabou
    }
  };

  // localStorage pode lançar exceção (modo privado, armazenamento bloqueado): tudo passa por aqui.
  M.armazenar = {
    ler: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    gravar: function (k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    apagar: function (k) { try { window.localStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } }
  };

  M.endpointIA = function () {
    var c = M.config.ia;
    if (c.endpoint) return c.endpoint;
    var cfg = window.Comunicados && window.Comunicados.cfg;
    return cfg && cfg.url ? String(cfg.url).replace(/\/+$/, '') + '/functions/v1/' + c.funcao : '';
  };
  M.chavePublica = function () {
    var cfg = window.Comunicados && window.Comunicados.cfg;
    return cfg && cfg.key ? String(cfg.key) : '';
  };
})();

// =====================================================================
// Seção: conhecimento
// =====================================================================
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

// =====================================================================
// Seção: base-conhecimento
// =====================================================================
/* FarmacIA — glossário básico do projeto (conceitos gerais de Farmacologia e Bioquímica).
 * ATENÇÃO: texto escrito para o projeto (tipo 'glossario-projeto'), NÃO é documento oficial e ainda NÃO foi
 * revisado por docente (revisado: false). As respostas mostram essa origem. Só entram definições
 * de livro-texto, sem doses, sem estudos e sem referências bibliográficas. Categorias sem material
 * ficam vazias de propósito: nada é inventado para "preencher". Para ampliar, acrescente itens ou
 * registre outro pacote com FarmaMod.conhecimento.registrar({ id, itens }). */
(function () {
  'use strict';
  var FONTE = 'Glossário da FarmacIA (conceito geral escrito para o projeto; confira em livro-texto ou com o professor)';
  function g(id, titulo, categoria, texto, aliases) { return { id: id, titulo: titulo, categoria: categoria, texto: texto, aliases: aliases || [], tipo: 'glossario-projeto', fonte: FONTE, revisado: false }; }
  var itens = [
    g('farmacocinetica', 'Farmacocinética', 'farmacocinetica', 'Farmacocinética é o estudo do que o organismo faz com o fármaco ao longo do tempo. Ela descreve quatro etapas, conhecidas pela sigla ADME: absorção (entrada na circulação), distribuição (chegada aos tecidos), metabolismo ou biotransformação (modificação química do fármaco) e excreção (eliminação do organismo). Parâmetros típicos são biodisponibilidade, volume de distribuição, depuração e meia-vida.', ['pk', 'adme', 'cinetica de farmacos']),
    g('farmacodinamica', 'Farmacodinâmica', 'farmacodinamica', 'Farmacodinâmica é o estudo do que o fármaco faz com o organismo: seus mecanismos de ação e os efeitos, desejados ou adversos. Envolve a interação do fármaco com alvos como receptores, enzimas, canais iônicos e transportadores, e a relação entre concentração (ou dose) e intensidade do efeito.', ['pd', 'mecanismo de acao']),
    g('pk-vs-pd', 'Diferença entre farmacocinética e farmacodinâmica', 'farmacologia', 'A farmacocinética descreve o que o corpo faz com o fármaco (absorção, distribuição, metabolismo e excreção), enquanto a farmacodinâmica descreve o que o fármaco faz com o corpo (mecanismo de ação e efeitos). A primeira determina quanto fármaco chega ao local de ação e por quanto tempo; a segunda determina o que acontece quando ele chega lá. Na prática, as duas se combinam para explicar a resposta ao medicamento.', ['diferenca farmacocinetica farmacodinamica', 'pk pd']),
    g('processamento-corpo', 'Como o corpo processa um medicamento', 'farmacocinetica', 'Depois de administrado, o medicamento passa por quatro etapas. Absorção: o fármaco sai do local de administração (por exemplo, o trato gastrointestinal, quando tomado por via oral) e chega ao sangue. Distribuição: o sangue leva o fármaco aos tecidos, e parte dele se liga a proteínas do plasma. Metabolismo: o fármaco é transformado, principalmente no fígado, em metabólitos que podem ser ativos ou inativos. Excreção: fármaco e metabólitos saem do organismo, principalmente pelos rins, na urina, e também pela bile e fezes.', ['adme', 'o que o corpo faz com o remedio', 'processamento de medicamentos']),
    g('orgaos-adme', 'Órgãos envolvidos na farmacocinética', 'farmacocinetica', 'A absorção de fármacos orais ocorre sobretudo no trato gastrointestinal (principalmente o intestino delgado). O metabolismo acontece principalmente no fígado, embora também ocorra em intestino, rins, pulmões e outros tecidos. A excreção é feita principalmente pelos rins, e também pela bile e fezes, pelos pulmões (substâncias voláteis), suor e leite materno em menor grau.', ['em qual orgao acontece', 'onde ocorre o metabolismo', 'orgaos adme']),
    g('biodisponibilidade', 'Biodisponibilidade', 'farmacocinetica', 'Biodisponibilidade é a fração da dose administrada que chega à circulação sistêmica na forma inalterada, e a velocidade com que isso ocorre. Por definição, a via intravenosa tem biodisponibilidade de 100%, pois a dose entra direto na circulação. Em outras vias ela pode ser menor, porque parte do fármaco não é absorvida ou é metabolizada antes de chegar à circulação.', ['biodisponivel', 'fracao absorvida', 'f']),
    g('fatores-biodisponibilidade', 'O que pode alterar a biodisponibilidade', 'farmacocinetica', 'Entre os fatores que alteram a biodisponibilidade estão: a via de administração; a forma farmacêutica e os excipientes, que influenciam a dissolução; a solubilidade e a ionização do fármaco (que dependem do pH); o efeito de primeira passagem no fígado e na parede intestinal; a presença de alimentos; interações com outros fármacos ou substâncias; o tempo de esvaziamento e a motilidade gastrointestinal; e doenças que afetam o intestino ou o fígado.', ['o que altera a biodisponibilidade', 'fatores biodisponibilidade', 'o que pode alterar isso']),
    g('exemplo-biodisponibilidade', 'Exemplo de biodisponibilidade', 'farmacocinetica', 'Exemplo ilustrativo (valores fictícios, só para entender a ideia): se 100 mg de um fármaco são tomados por via oral e apenas 60 mg chegam à circulação sistêmica sem sofrer alteração, a biodisponibilidade oral é de 60%. Se a mesma dose fosse dada por via intravenosa, os 100 mg chegariam à circulação, ou seja, 100%. A diferença se deve à absorção incompleta e ao metabolismo de primeira passagem.', ['exemplo biodisponibilidade']),
    g('primeira-passagem', 'Efeito de primeira passagem', 'farmacocinetica', 'Efeito de primeira passagem é o metabolismo que um fármaco administrado por via oral sofre na parede do intestino e no fígado antes de alcançar a circulação sistêmica. Como parte da dose é transformada nessa etapa, a biodisponibilidade oral pode ficar reduzida.', ['metabolismo de primeira passagem', 'primeira passagem hepatica']),
    g('meia-vida', 'Meia-vida de eliminação', 'farmacocinetica', 'Meia-vida de eliminação (t½) é o tempo necessário para que a concentração plasmática de um fármaco caia pela metade durante a fase de eliminação. Ela depende do volume de distribuição e da depuração (t½ = 0,693 × Vd / CL). Quanto maior a meia-vida, mais lenta a eliminação. Em cinética de primeira ordem, após cerca de 5 meias-vidas o fármaco está quase todo eliminado, e em doses repetidas o estado de equilíbrio é atingido em tempo semelhante.', ['meia vida', 't1/2', 'tempo de meia vida', 'half life']),
    g('volume-distribuicao', 'Volume de distribuição', 'farmacocinetica', 'Volume de distribuição (Vd) é um volume aparente que relaciona a quantidade de fármaco no organismo com a sua concentração no plasma (Vd = quantidade no corpo / concentração plasmática). Valores altos indicam que o fármaco se distribui bastante para os tecidos; valores baixos indicam que ele fica mais restrito ao plasma.', ['vd', 'volume aparente de distribuicao']),
    g('depuracao', 'Depuração (clearance)', 'farmacocinetica', 'Depuração, ou clearance (CL), é o volume de plasma completamente depurado do fármaco por unidade de tempo. Representa a eficiência dos órgãos de eliminação, como fígado e rins, e determina junto com o volume de distribuição a meia-vida do fármaco.', ['clearance', 'cl', 'depuracao renal']),
    g('metabolismo-farmacos', 'Metabolismo de fármacos (biotransformação)', 'farmacocinetica', 'Metabolismo de fármacos, ou biotransformação, é a conversão química do fármaco em metabólitos, em geral mais polares e mais fáceis de excretar. Ocorre principalmente no fígado e costuma ser dividido em fase I (reações como oxidação, muitas feitas por enzimas do citocromo P450) e fase II (conjugação, como glicuronidação). Os metabólitos podem ser inativos, ativos ou, às vezes, tóxicos.', ['biotransformacao', 'metabolismo de medicamentos', 'metabolismo de farmacos', 'citocromo p450', 'cyp450', 'metabolismo hepatico']),
    g('metabolismo-energetico', 'Metabolismo energético', 'bioquimica', 'Metabolismo energético é o conjunto de reações pelas quais as células obtêm e usam energia, principalmente na forma de ATP, a partir de glicídeos, lipídeos e aminoácidos. Inclui vias como glicólise, ciclo de Krebs e fosforilação oxidativa. O estudo do metabolismo celular e de sua integração é tema de Bioquímica (por exemplo, Bioquímica II no currículo).', ['metabolismo celular', 'metabolismo de glicose', 'metabolismo de carboidratos', 'bioenergetica', 'metabolismo intermediario']),
    g('absorcao', 'Absorção de fármacos', 'farmacocinetica', 'Absorção é a passagem do fármaco do local de administração para a circulação sistêmica. Depende de fatores como via de administração, solubilidade, forma farmacêutica, pH do meio, ionização do fármaco, área e fluxo sanguíneo do local e presença de alimentos.', ['absorcao oral', 'absorcao de medicamentos']),
    g('excrecao', 'Excreção', 'farmacocinetica', 'Excreção é a eliminação do fármaco e de seus metabólitos do organismo. A via principal é a renal (filtração glomerular, secreção tubular ativa e reabsorção tubular); outras vias são biliar/fecal e, em menor grau, pulmonar, suor e leite materno.', ['eliminacao', 'excrecao renal']),
    g('bioequivalencia', 'Bioequivalência', 'assuntos-regulatorios', 'Bioequivalência é a comparação entre duas formulações do mesmo fármaco (por exemplo, referência e genérico) quanto à velocidade e à extensão de absorção, avaliadas por parâmetros de biodisponibilidade. Quando as formulações são equivalentes farmacêuticas e a biodisponibilidade não difere de forma relevante, considera-se que têm bioequivalência. Os critérios exatos são definidos pela regulação sanitária vigente.', ['bioequivalente', 'generico equivalencia']),
    g('receptor-agonista', 'Receptor, agonista e antagonista', 'farmacodinamica', 'Receptor é uma macromolécula, em geral uma proteína, com a qual o fármaco interage para produzir um efeito. Agonista é o fármaco que se liga ao receptor e o ativa, gerando resposta. Antagonista é o que se liga ao receptor sem ativá-lo e bloqueia a ação do agonista.', ['agonista', 'antagonista', 'receptores', 'interacao farmaco receptor']),
    g('indice-terapeutico', 'Índice terapêutico', 'toxicologia', 'Índice terapêutico é uma medida de segurança que compara a dose (ou concentração) que causa efeito tóxico com a que produz o efeito terapêutico desejado. Quanto menor a margem entre as duas, mais cuidado é necessário e, em muitos casos, mais importante é o monitoramento do fármaco.', ['margem terapeutica', 'indice terapeutico estreito', 'janela terapeutica']),
    g('farmaco-medicamento', 'Fármaco, medicamento e excipiente', 'tecnologia-farmaceutica', 'Fármaco (ou princípio ativo) é a substância responsável pelo efeito terapêutico. Medicamento é o produto farmacêutico completo, com fármaco e demais componentes, preparado numa forma farmacêutica para uso em prevenção, diagnóstico ou tratamento. Excipientes são os componentes que acompanham o fármaco na formulação e que, em princípio, não têm ação terapêutica própria, mas ajudam em estabilidade, dissolução, volume e administração.', ['farmaco', 'medicamento', 'principio ativo', 'excipiente', 'excipientes', 'remedio'])
  ];
  if (window.FarmaMod && window.FarmaMod.conhecimento) window.FarmaMod.conhecimento.registrar({ id: 'glossario', itens: itens });
})();

// =====================================================================
// Seção: busca
// =====================================================================
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

// =====================================================================
// Seção: normalizacao
// =====================================================================
/* FarmacIA — normalização do português brasileiro (camada v3, etapa 1).
 * Prepara uma CÓPIA da mensagem para análise (o texto original nunca é alterado nem exibido a partir daqui):
 * minúsculas, sem acentos, letras repetidas ("oiii"), abreviações e gírias de chat ("oq", "pq", "vc", "q") e correção
 * controlada de digitação SÓ em palavras-pista de intenção ("explcia", "difernça").
 * Nomes de medicamentos, siglas, números e unidades NÃO são "corrigidos" aqui: isso é feito, com limites e checagem de
 * ambiguidade, na extração de entidades. Dicionários abaixo são dados simples e editáveis. */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};

  // abreviações e gírias gerais (nenhuma altera sentido clínico)
  var ABREV = {
    oq: 'o que', oque: 'o que', pq: 'por que', pqe: 'por que', q: 'que', qe: 'que', vc: 'voce', vcs: 'voces', voc: 'voce', tb: 'tambem', tbm: 'tambem', td: 'tudo', tds: 'todos',
    mt: 'muito', mto: 'muito', mta: 'muita', pra: 'para', pro: 'para o', p: 'para', qnt: 'quanto', qto: 'quanto', qnto: 'quanto', qts: 'quantos', dps: 'depois', hj: 'hoje',
    msm: 'mesmo', n: 'nao', nd: 'nada', cmg: 'comigo', pfv: 'por favor', pf: 'por favor', pfvr: 'por favor', blz: 'beleza', vlw: 'valeu', obg: 'obrigado', obgd: 'obrigado',
    obrigadx: 'obrigado', flw: 'falou', ta: 'esta', tao: 'estao', cm: 'como', qdo: 'quando', qd: 'quando', sbr: 'sobre', agr: 'agora', vdd: 'verdade', dnv: 'de novo',
    fzr: 'fazer', fz: 'faz', ngm: 'ninguem', mds: 'meu deus', mn: 'mano', s: 'sim', ss: 'sim', nn: 'nao', ne: 'nao e', tmb: 'tambem', explik: 'explica', xplica: 'explica',
    msg: 'mensagem', cmo: 'como', dif: 'diferenca', difs: 'diferencas', resumao: 'resumo', rem: 'remedio', remedios: 'remedio', remedio: 'remedio', medic: 'medicamento', ab: 'antibiotico'
  };
  // palavras-pista de intenção que podem receber correção de digitação (distância 1, mesma inicial, único candidato)
  var PISTAS = ('explica explique explicar explicacao diferenca diferencas comparar compara comparacao questoes questao exercicios exercicio resumo resumir resume significa funciona funcionam mecanismo ' +
    'interacao interacoes interage interagem quando porque sintese conceito defina define efeitos adversos colaterais contraindicacao contraindicacoes indicacoes posologia simulado flashcards ' +
    'aprofunda detalhes exemplos exemplo continua converter converte equivale gravida alergia dobro overdose quanto serve usado remedio medicamento antibiotico exame resultado referencia ' +
    'misturar juntos junto tomar posso devo bula dose dosagem classe grupo quais quantos').split(' ');
  var PISTA_SET = {}; PISTAS.forEach(function (w) { PISTA_SET[w] = 1; });
  var PISTA_POR_INICIAL = {}; PISTAS.forEach(function (w) { (PISTA_POR_INICIAL[w.charAt(0)] = PISTA_POR_INICIAL[w.charAt(0)] || []).push(w); });

  function corrigirPista(tok) {
    if (tok.length < 5 || PISTA_SET[tok] || PISTA_SET[tok.replace(/s$/, '')] || PISTA_SET[tok + 's'] || /\d/.test(tok)) return tok;   // plural/singular de uma pista não é erro de digitação
    var lst = PISTA_POR_INICIAL[tok.charAt(0)] || [], melhor = null, empate = false;
    for (var i = 0; i < lst.length; i += 1) {
      var w = lst[i]; if (Math.abs(w.length - tok.length) > 1) continue;
      var d = M.busca.editDistance(tok, w);
      if (d === 1) { if (melhor && melhor !== w) empate = true; melhor = w; }
    }
    return melhor && !empate ? melhor : tok;
  }

  // Devolve { original, n, tokens, corrigidas }. "n" é a forma de análise (sem acentos, abreviações expandidas).
  function analisar(raw) {
    var original = String(raw == null ? '' : raw);
    var s = original.replace(/([a-zà-úA-ZÀ-Ú])\1{2,}/g, '$1');          // letras repetidas (oiii, kkkk); dígitos ficam
    var base = M.busca.norm(s), tokens = [], corrigidas = [];
    base.split(' ').forEach(function (t) {
      if (!t) return;
      if (ABREV[t] !== undefined) { var e = ABREV[t]; if (e !== t) corrigidas.push({ de: t, para: e }); e.split(' ').forEach(function (x) { tokens.push(x); }); return; }
      var c = corrigirPista(t); if (c !== t) corrigidas.push({ de: t, para: c });
      tokens.push(c);
    });
    return { original: original, n: tokens.join(' '), tokens: tokens, corrigidas: corrigidas };
  }

  M.norma = { analisar: analisar, ABREV: ABREV, PISTAS: PISTAS };
})();

// =====================================================================
// Seção: entidades
// =====================================================================
/* FarmacIA — extração de entidades (camada v3, etapa 2).
 * Reconhece NOMES (medicamentos, substâncias, classes, exames, conceitos e áreas) e quantidades com unidade.
 * Este dicionário serve só para RECONHECER e distinguir termos: não contém indicação, dose, contraindicação,
 * interação nem classe de nenhum fármaco. Conteúdo farmacológico só entra pela base de conhecimento revisada.
 * Casamento: (1) frase exata, mais longa primeiro; (2) variações de singular/plural e junto/separado;
 * (3) aproximado, só para palavras com 6+ letras, mesma inicial e distância 1 (ou 2 a partir de 9 letras), e SÓ
 * quando houver um único candidato mais próximo. Empate entre candidatos = incerteza (não adivinha). */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};
  var CAT = { med: 'farmacologia', subst: 'farmacologia', classe: 'farmacologia', exame: 'analises-clinicas', area: 'conteudo', conc: 'bioquimica' };

  // [nome canônico, 'alias;alias', categoria opcional]
  var DADOS = {
    med: [
      ['paracetamol', 'acetaminofeno;tylenol'], ['dipirona', 'metamizol;novalgina'], ['ibuprofeno', 'advil'], ['ácido acetilsalicílico', 'aas;aspirina;acido acetil salicilico'], ['diclofenaco', ''], ['naproxeno', ''],
      ['cetoprofeno', ''], ['nimesulida', ''], ['amoxicilina', ''], ['azitromicina', ''], ['ciprofloxacino', ''], ['cefalexina', ''], ['penicilina', ''], ['doxiciclina', ''], ['claritromicina', ''],
      ['metronidazol', ''], ['fluconazol', ''], ['cetoconazol', ''], ['omeprazol', ''], ['pantoprazol', ''], ['esomeprazol', ''], ['ranitidina', ''], ['losartana', ''], ['enalapril', ''], ['captopril', ''],
      ['atenolol', ''], ['propranolol', ''], ['metoprolol', ''], ['carvedilol', ''], ['anlodipino', ''], ['nifedipino', ''], ['hidroclorotiazida', ''], ['furosemida', ''], ['espironolactona', ''],
      ['digoxina', ''], ['varfarina', ''], ['heparina', ''], ['enoxaparina', ''], ['clopidogrel', ''], ['sinvastatina', ''], ['atorvastatina', ''], ['rosuvastatina', ''], ['metformina', ''],
      ['glibenclamida', ''], ['insulina', ''], ['levotiroxina', ''], ['prednisona', ''], ['prednisolona', ''], ['dexametasona', ''], ['hidrocortisona', ''], ['fluoxetina', ''], ['sertralina', ''],
      ['amitriptilina', ''], ['diazepam', ''], ['clonazepam', ''], ['alprazolam', ''], ['fenobarbital', ''], ['carbamazepina', ''], ['fenitoína', ''], ['ácido valproico', 'valproato'], ['morfina', ''],
      ['codeína', ''], ['tramadol', ''], ['loratadina', ''], ['cetirizina', ''], ['salbutamol', ''], ['budesonida', ''], ['lidocaína', ''], ['adrenalina', 'epinefrina'], ['atropina', ''],
      ['dopamina', ''], ['noradrenalina', 'norepinefrina'], ['sildenafila', 'sildenafil'], ['ondansetrona', ''], ['metoclopramida', ''], ['domperidona', ''], ['loperamida', ''], ['simeticona', ''],
      ['bisacodil', ''], ['lactulose', ''], ['nistatina', ''], ['aciclovir', ''], ['oseltamivir', ''], ['ivermectina', ''], ['albendazol', ''], ['cloroquina', ''], ['hidroxicloroquina', ''],
      ['isoniazida', ''], ['rifampicina', ''], ['vancomicina', ''], ['gentamicina', ''], ['ceftriaxona', ''], ['haloperidol', ''], ['risperidona', ''], ['olanzapina', ''], ['levodopa', ''],
      ['metotrexato', ''], ['tamoxifeno', ''], ['sulfato ferroso', ''], ['lítio', 'carbonato de litio'], ['fenilefrina', ''], ['pseudoefedrina', ''], ['bromexina', ''], ['acetilcisteína', 'acetilcisteina']
    ],
    subst: [['cafeína', ''], ['álcool etílico', 'etanol;alcool'], ['nicotina', ''], ['vitamina C', 'acido ascorbico'], ['vitamina D', 'colecalciferol'], ['vitamina K', ''], ['vitamina B12', 'cianocobalamina'], ['ácido fólico', 'folato']],
    classe: [
      ['anti-inflamatórios', 'antiinflamatorios;anti inflamatorios;antiinflamatorio'], ['AINEs', 'aine;anti inflamatorios nao esteroides;anti inflamatorios nao esteroidais;antiinflamatorios nao esteroidais'], ['beta-bloqueadores', 'betabloqueadores;bloqueadores beta;bloqueadores beta adrenergicos'],
      ['IECA', 'inibidores da eca;inibidores da enzima conversora de angiotensina'], ['BRA', 'bloqueadores do receptor de angiotensina;antagonistas da angiotensina ii'], ['antibióticos', 'antibacterianos'],
      ['antifúngicos', ''], ['antivirais', ''], ['antiparasitários', 'antiparasitarios;antihelminticos'], ['anti-histamínicos', 'antihistaminicos;antialergicos'], ['antidepressivos', ''], ['ansiolíticos', ''],
      ['benzodiazepínicos', 'benzodiazepinicos;benzos'], ['anticoagulantes', ''], ['antiagregantes plaquetários', 'antiplaquetarios;antiagregantes'], ['estatinas', ''], ['diuréticos', ''],
      ['anti-hipertensivos', 'antihipertensivos'], ['anticonvulsivantes', 'antiepilepticos'], ['antipsicóticos', 'neurolepticos'], ['opioides', 'opiaceos;opioide'], ['corticoides', 'corticosteroides;glicocorticoides'],
      ['broncodilatadores', ''], ['inibidores da bomba de prótons', 'ibp;ibps'], ['antiácidos', ''], ['analgésicos', ''], ['antitérmicos', 'antipireticos'], ['antieméticos', ''], ['laxantes', ''],
      ['hipoglicemiantes', 'antidiabeticos'], ['penicilinas', ''], ['cefalosporinas', ''], ['macrolídeos', 'macrolideos'], ['quinolonas', 'fluoroquinolonas'], ['tetraciclinas', ''],
      ['bloqueadores de canal de cálcio', 'bloqueadores dos canais de calcio'], ['anestésicos', ''], ['relaxantes musculares', ''], ['vitaminas', '']
    ],
    exame: [
      ['hemograma', ''], ['hemoglobina', ''], ['hematócrito', ''], ['hemácias', 'eritrocitos'], ['leucócitos', 'globulos brancos'], ['plaquetas', ''], ['VHS', 'velocidade de hemossedimentacao'],
      ['proteína C reativa', 'pcr'], ['creatinina', ''], ['ureia', ''], ['TGO', 'ast'], ['TGP', 'alt'], ['TSH', ''], ['T4 livre', 't4'], ['glicemia', 'glicemia de jejum;glicose em jejum'],
      ['hemoglobina glicada', 'hba1c;a1c;glicada'], ['urina tipo 1', 'eas;urina tipo i;exame de urina'], ['coagulograma', ''], ['INR', 'rni'], ['ferritina', ''], ['ácido úrico', 'acido urico'], ['PSA', ''], ['LDL', ''], ['HDL', '']
    ],
    conc: [
      ['lipídios', 'lipidios;lipideos;lipidio;gorduras'], ['triglicerídeos', 'triglicerideos;triglicerides;triacilgliceróis'], ['colesterol', ''], ['ácido graxo', 'acidos graxos;acidos gordos'],
      ['ácido graxo saturado', 'acidos graxos saturados;gordura saturada'], ['ácido graxo insaturado', 'acidos graxos insaturados;gordura insaturada'], ['carboidratos', 'carboidrato;glicidios'], ['glicose', ''],
      ['glicogênio', 'glicogenio'], ['ATP', ''], ['hipoglicemia', '', 'patologia'], ['hiperglicemia', '', 'patologia'], ['hipertensão', 'hipertensao;pressao alta', 'patologia'], ['hipotensão', 'hipotensao;pressao baixa', 'patologia'],
      ['hipotireoidismo', '', 'patologia'], ['hipertireoidismo', '', 'patologia'], ['diabetes', 'diabetes mellitus', 'patologia'], ['interação medicamentosa', 'interacao entre medicamentos;interacoes entre medicamentos;interacoes medicamentosas', 'farmacologia'],
      ['reação em cadeia da polimerase', 'pcr', 'analises-clinicas'], ['hormônio', 'hormonio;hormonios', 'fisiologia'], ['vitamina', '', 'fisiologia'], ['fígado', 'figado;hepatico', 'fisiologia'], ['rim', 'rins;renal', 'fisiologia'], ['coração', 'coracao', 'fisiologia'],
      ['pulmão', 'pulmao;pulmoes', 'fisiologia'], ['estômago', 'estomago', 'fisiologia'], ['intestino', '', 'fisiologia'], ['cérebro', 'cerebro', 'fisiologia'], ['pâncreas', 'pancreas', 'fisiologia']
    ],
    area: [['bioquímica', 'bioquimica'], ['fisiologia', ''], ['microbiologia', ''], ['imunologia', ''], ['farmacognosia', ''], ['parasitologia', ''], ['patologia', ''], ['anatomia', ''], ['histologia', ''],
      ['genética', 'genetica'], ['bioestatística', 'bioestatistica'], ['tecnologia farmacêutica', ''], ['química analítica', ''], ['análises clínicas', 'analises clinicas']]
  };
  // "ácido graxo saturado e insaturado": o substantivo da frente vale para os dois
  var ELIPSE = [{ cabeca: /\bacidos? graxos?\b/, mods: [['saturado', 'conc:acido graxo saturado'], ['insaturado', 'conc:acido graxo insaturado']] }];
  var MAXN = 5;
  var IDX = null;

  function nz(s) { return M.busca.norm(String(s).replace(/-/g, ' ')); }
  function variantes(k) {
    var out = {}, partes = k.split(' '), ult = partes[partes.length - 1], pre = partes.slice(0, -1).join(' ');
    function pu(x) { out[(pre ? pre + ' ' : '') + x] = 1; }
    out[k] = 1; out[k.replace(/ /g, '')] = 1;
    if (/oes$/.test(ult)) pu(ult.replace(/oes$/, 'ao')); else if (/ao$/.test(ult)) pu(ult.replace(/ao$/, 'oes'));
    if (/[rlz]es$/.test(ult)) pu(ult.slice(0, -2)); else if (/s$/.test(ult)) pu(ult.slice(0, -1)); else { pu(ult + 's'); if (/[rlz]$/.test(ult)) pu(ult + 'es'); }
    return Object.keys(out);
  }
  function construir() {
    var exato = Object.create(null), vari = Object.create(null), unig = Object.create(null), n = 0;
    Object.keys(DADOS).forEach(function (tipo) {
      DADOS[tipo].forEach(function (d) {
        var ent = { id: tipo + ':' + nz(d[0]), nome: d[0], tipo: tipo, categoria: d[2] || CAT[tipo] };
        [d[0]].concat(d[1] ? d[1].split(';') : []).forEach(function (a) {
          var k = nz(a); if (!k) return;
          (exato[k] = exato[k] || []);
          if (exato[k].every(function (x) { return x.id !== ent.id; })) exato[k].push(ent);
          variantes(k).forEach(function (v) { if (v !== k) { (vari[v] = vari[v] || []); if (vari[v].every(function (x) { return x.id !== ent.id; })) vari[v].push(ent); } });
          if (k.indexOf(' ') < 0 && k.length >= 6) { var c = k.charAt(0); (unig[c] = unig[c] || []).push({ k: k, ent: ent }); }
          var junto = k.replace(/ /g, ''); if (junto !== k && junto.length >= 6) { var c2 = junto.charAt(0); (unig[c2] = unig[c2] || []).push({ k: junto, ent: ent }); }
        });
        n += 1;
      });
    });
    IDX = { exato: exato, vari: vari, unig: unig, total: n, porId: null };
    var porId = {}; Object.keys(exato).forEach(function (k) { exato[k].forEach(function (e) { porId[e.id] = e; }); }); IDX.porId = porId;
    return IDX;
  }
  function indice() { return IDX || construir(); }

  var QTD = /(\d+(?:[.,]\d+)?)\s*(mcg|mg|kg|ml|mmol|mol|meq|ui|ug|µg|g|l|%|gramas?|miligramas?|microgramas?|quilos?|litros?|mililitros?|comprimidos?|gotas?|capsulas?|cápsulas?)(?![a-zà-ú])/gi;
  function quantidades(raw) {
    var out = [], m; QTD.lastIndex = 0;
    while ((m = QTD.exec(String(raw)))) out.push({ tipo: 'quantidade', valor: Number(m[1].replace(',', '.')), unidade: m[2].toLowerCase(), texto: m[1] + ' ' + m[2].toLowerCase() });
    return out;
  }
  function ehNumero(t) { return /^\d+$/.test(t); }
  function limite(len) { return len >= 10 ? 2 : len >= 6 ? 1 : 0; }
  var CONHECIDAS = null;   // palavras de conceitos que o interpretador antigo já reconhece: não passam por correção aproximada (evita "glicólise" virar "glicose")
  function conhecidas() {
    if (CONHECIDAS) return CONHECIDAS;
    CONHECIDAS = {};
    try { (M.interpretador && M.interpretador.CONCEITOS || []).forEach(function (c) { M.busca.palavras(c[0]).forEach(function (w) { CONHECIDAS[w] = 1; }); }); } catch (e) { /* segue sem a lista */ }
    return CONHECIDAS;
  }

  function extrair(an, raw) {
    var I = indice(), toks = an.tokens, usado = [], itens = [], incertas = [], i, len;
    function marcar(a, b) { for (var q = a; q < b; q += 1) usado[q] = true; }
    function livre(a, b) { for (var q = a; q < b; q += 1) if (usado[q]) return false; return true; }
    function colocar(lista, pos, texto, aprox, dist) {
      if (lista.length === 1) { var e = lista[0]; itens.push({ id: e.id, nome: e.nome, tipo: e.tipo, categoria: e.categoria, texto: texto, pos: pos, aprox: !!aprox, dist: dist || 0, ambigua: false }); }
      else { itens.push({ id: null, nome: null, tipo: lista[0].tipo, categoria: lista[0].categoria, texto: texto, pos: pos, aprox: !!aprox, dist: dist || 0, ambigua: true, candidatos: lista.map(function (e) { return e.nome; }) }); }
    }
    // 1) exato, depois variações; frase mais longa primeiro
    [I.exato, I.vari].forEach(function (mapa) {
      for (i = 0; i < toks.length; i += 1) {
        if (usado[i]) continue;
        for (len = Math.min(MAXN, toks.length - i); len >= 1; len -= 1) {
          if (!livre(i, i + len)) continue;
          var chave = toks.slice(i, i + len).join(' ');
          if (len === 1 && (ehNumero(chave) || chave.length < 2)) continue;
          var lst = mapa[chave];
          if (lst) { colocar(lst, i, chave, false, 0); marcar(i, i + len); break; }
        }
      }
    });
    // 2) aproximado, palavra a palavra
    for (i = 0; i < toks.length; i += 1) {
      var t = toks[i];
      if (usado[i] || t.length < 6 || !/^[a-z]+$/.test(t) || M.norma.PISTAS.indexOf(t) >= 0 || conhecidas()[t]) continue;
      var lim = limite(t.length), cands = I.unig[t.charAt(0)] || [], melhor = 9, ids = {}, lista = [];
      for (var c = 0; c < cands.length; c += 1) {
        var k = cands[c].k; if (Math.abs(k.length - t.length) > lim) continue;
        var d = M.busca.editDistance(t, k); if (d > lim) continue;
        if (d < melhor) { melhor = d; ids = {}; lista = []; }
        if (d === melhor && !ids[cands[c].ent.id]) { ids[cands[c].ent.id] = 1; lista.push(cands[c].ent); }
      }
      if (!lista.length) continue;
      if (lista.length === 1) { colocar(lista, i, t, true, melhor); marcar(i, i + 1); }
      else { incertas.push({ texto: t, candidatos: lista.map(function (e) { return e.nome; }) }); marcar(i, i + 1); }
    }
    // 3) elipse ("saturado e insaturado")
    ELIPSE.forEach(function (el) {
      if (!el.cabeca.test(an.n)) return;
      el.mods.forEach(function (m) {
        if (toks.indexOf(m[0]) < 0) return;
        var e = I.porId[m[1]]; if (e && !itens.some(function (x) { return x.id === e.id; })) itens.push({ id: e.id, nome: e.nome, tipo: e.tipo, categoria: e.categoria, texto: m[0], pos: toks.indexOf(m[0]), aprox: false, dist: 0, ambigua: false });
      });
    });
    // elipse: "acido graxo" isolado some quando os dois específicos aparecem
    if (itens.some(function (x) { return x.id === 'conc:acido graxo saturado'; }) || itens.some(function (x) { return x.id === 'conc:acido graxo insaturado'; })) itens = itens.filter(function (x) { return x.id !== 'conc:acido graxo'; });
    itens.sort(function (a, b) { return a.pos - b.pos; });
    var amb = itens.filter(function (x) { return x.ambigua; });
    return { itens: itens, incertas: incertas.concat(amb.map(function (x) { return { texto: x.texto, candidatos: x.candidatos }; })), quantidades: quantidades(raw || an.original), ambigua: incertas.length > 0 || amb.length > 0 };
  }

  function resolver(termo) { var l = indice().exato[nz(termo)] || indice().vari[nz(termo)]; return l && l.length === 1 ? l[0] : null; }
  M.entidades = { extrair: extrair, resolver: resolver, _dados: DADOS, _indice: indice, total: function () { return indice().total; } };
})();

// =====================================================================
// Seção: intencao
// =====================================================================
/* FarmacIA — classificação de intenção por múltiplos sinais (camada v3, etapa 3).
 * Cada intenção soma evidências ponderadas (palavras-pista, tipos de entidade, quantidades, contexto da conversa, similaridade
 * com exemplos curtos) e perde pontos por sinais contraditórios. O resultado traz pontuação, confiança, ranking e os sinais que
 * pesaram (para depuração). Esta etapa só CLASSIFICA e sinaliza risco: quem decide responder, perguntar ou admitir limitação
 * é a camada de confiança/segurança (etapa seguinte). Não cria intenção para o que a FarmacIA não faz. */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};

  function R(s) { return new RegExp(s); }
  var C = {
    saudacao: R('^(oi+|ola|opa|eae|e ai|salve|hey|hello|hi|ei|oie|fala ai|bom dia|boa tarde|boa noite)\\b|\\btudo (bem|bom|certo|joia)\\b|\\bcomo (voce )?(vai|esta)\\b'),
    social: R('\\b(obrigad[oa]|obrigadao|brigadao|brigada|valeu|falou|tchau|ate (mais|logo|amanha|depois)|beleza|show|tamo junto|tmj|top|massa|entendi|ok|okay|certo|perfeito|otimo|legal|de nada)\\b'),
    naoEntendi: R('\\bnao (entendi|compreendi|fez sentido)\\b'),
    exerc: R('\\b(questoes|questao|exercicios?|quiz|simulado|flashcards?|treinar|praticar|me (pergunta|perguntas|testa|teste)|perguntas (de|sobre))\\b|\\b(faz\\w*|faca|gera\\w*|cri[ae]\\w*|mont[ae]\\w*|elabor\\w*|me da|quero|preciso de|bota)\\b(\\s+\\w+){0,3}\\s+(perguntas|questoes|exercicios)\\b'),
    resumo: R('\\b(resum\\w*|sintese|em topicos|topicos principais)\\b'),
    compF: R('\\b(diferenca|diferencas|difere|diferem|diferencia\\w*|compar\\w*|versus|vs|mesma coisa|o mesmo que|a mesma que|igual a|semelhan\\w*|parecid\\w*|similares?|equivalentes?)\\b'),
    compM: R('\\bqual (e )?(o |a )?(melhor|mais forte|mais seguro|mais fraco)\\b|\\bqual (remedio|medicamento) (e|eh) (melhor|mais forte|mais seguro|mais fraco)\\b'),
    clfCop: R('\\b(e|eh|sao)\\b.{1,40}\\bou\\b'),
    clfArt: R('\\b\\w+ (e|eh|sao) (um|uma|uns|umas|o|a|os|as|considerad[oa]s?|classificad[oa]s?)\\b'),
    clfPal: R('\\b(classificad[oa]s?|e do tipo|tipo de|categoria de)\\b'),
    s11: R('\\bo que acontece (se|quando|com)\\b'),
    compX: R('\\b(x|vs|ou)\\b'),
    intF: R('\\b(interac\\w*|interag\\w*)\\b'),
    intM: R('\\b(juntos?|misturar|mistura|associa\\w*|combinar|combinacao|ao mesmo tempo)\\b'),
    intV: R('\\b(potencializ\\w*|interfere\\w*|atrapalh\\w*|anula\\w*|reduz o efeito|diminui o efeito|aumenta o efeito|inibe o metabolismo|induz o metabolismo|altera o efeito)\\b'),
    mecF: R('\\b(mecanismo|modo de acao)\\b|\\bacao (d(o|a|os|as)|farmacologica|terapeutica)\\b'),
    mecW: R('\\b(como|de que (jeito|forma|modo|maneira)|por meio de qual|por qual (mecanismo|via))\\b.*\\b(age|agem|atua|atuam|funciona|funcionam|trabalha|trabalham|reduz|diminui|aumenta|inibe|bloqueia|estimula|combate|alivia|baixa|eleva|controla)\\b|\\bpor que\\b.*\\b(reduz|reduzir|diminui|diminuir|aumenta|aumentar|inibe|inibir|bloqueia|bloquear|estimula|estimular|baixa|baixar|eleva|elevar|causa|causar|provoca|provocar|lesa|lesar|lesiona|gera|gerar|desencadeia|desencadear|se liga|age|atua|funciona|potencializa)\\b|\\bpor que\\b.*\\b(tem|apresenta|possui)\\b.*\\b(risco|toxicidade|dependencia)\\b|\\bo que .{1,30}\\bfaz (no|pelo|com o) (corpo|organismo)\\b'),
    intP: R('\\b(da problema|tem problema|faz mal|e perigoso|tem risco|corta o efeito|anula)\\b|\\bpode(m)?\\s*$'),
    s7: R('\\b(melhor|mais forte|mais seguro) (remedio|medicamento|antibiotico|analgesico)\\b|\\bqual (remedio|medicamento) (e|eh) (melhor|mais forte|mais seguro)\\b'),
    s10: R('\\be (muito|pouco|demais|alto|baixo|seguro|perigoso|normal)\\b'),
    def: R('\\b(o que (e|sao|significa|quer dizer|seria)|defin\\w*|conceito|significado|me fala|fala sobre|fale sobre)\\b'),
    expl: R('\\b(explic\\w*|entender|entendo|me ensina|ensina|duvida sobre|ajuda\\w* (com|em|sobre)|ajudar (com|em|sobre))\\b'),
    med: R('\\b(para que (serve|e usado|usa)|serve para que|serve para|e usad[oa] para|indicac\\w*|indicad[oa]|efeitos? (adversos?|colaterais?|indesejados?)|reacoes? adversas?|contraindicac\\w*|bula|posologia|usos?|colaterais|faz mal|e bom para|como (usar|tomar|se usa|se toma)|dose|dosagem)\\b'),
    exame: R('\\bexames?\\b|\\bvalor(es)? de referencia\\b|\\breferencia\\b|\\bresultado\\b|\\bdeu \\d|\\b(alto|alta|baixo|baixa|elevado|elevada|aumentad[oa]|diminuid[oa])\\b|\\binterpret\\w*|\\blaudo\\b'),
    classeC: R('\\b(classe|grupo|pertence|o que (caracteriza|define|torna)|exemplos? de|quais (sao )?(os |as )?(medicamentos|remedios|farmacos|exemplos)|me fala (dos|das)|quais sao)\\b'),
    funcaoBio: R('\\b(funcao|funcoes|papel|importancia|responsavel por|transporta\\w*|se liga|ligacao ao|armazena\\w*)\\b'),
    calc: R('\\b(quanto (e|da|fica|vale)|converte\\w*|transform\\w*|passa (para|pra)|em (mg|g|ml|l|mcg|gramas|miligramas|litros|mililitros|microgramas)|conversao|equivale\\w*|quantos? (mg|g|ml|l|mcg|gramas|miligramas|litros|mililitros|microgramas|comprimidos|gotas)|regra de tres|dilui\\w*|concentracao|calcul\\w*|molaridade)\\b'),
    anaf: R('\\b(isso|disso|nisso|esse|essa|esses|essas|desse|dessa|dele|dela|deles|delas|ele|ela|eles|elas|o mesmo|a mesma)\\b'),
    seq: R('^(e |mais |continua|prossiga|pode continuar|de novo|de outro jeito|de outra forma|aprofunda|detalha)|\\b(de novo|de outro jeito|de outra forma|mais simples|mais facil|mais detalhes|aprofund\\w*|detalh\\w*|exemplos?|continua)\\b'),
    s1: R('\\b(dobro|dobrar|em dobro|tomar mais|mais um comprimido|mais uma dose|passar da dose|dose maxima|overdose|a mais|por engano|duas vezes|tres vezes|de uma (so )?vez|esqueci (de )?tomar|esqueci a dose|pular (a )?dose)\\b'),
    s2: R('\\bposso (tomar|dar|usar|misturar|cortar|parar|trocar|suspender|beber|comer|dirigir)\\b|\\btomar\\b.*\\bjuntos?\\b|\\bpode(m)? ser (tomad\\w*|usad\\w*|trocad\\w*|misturad\\w*)\\b|\\bdevo (parar|tomar|trocar|suspender|continuar)\\b|\\bda para (tomar|misturar)\\b|\\bpode(m)? (tomar|misturar|trocar)\\b'),
    s3: R('\\b(alergia|alergic[oa]|gravidez|gravida|gestante|gestacao|amament\\w*|lactante|bebe|crianca|neonato|idoso|renal|hepatic\\w*)\\b'),
    s4: R('\\b(vencido|sem receita|sem prescricao|automedic\\w*|emagrecer|emagrecimento|abortivo|energetico|alcool|bebida alcoolica|cerveja)\\b'),
    s5: R('\\b(dose|quanto)\\b.*\\bpara mim\\b|\\b(minha|meu) (dose|remedio)\\b|\\bqual (remedio|medicamento) (eu|devo)\\b|\\bdose (certa|ideal|correta|segura)\\b'),
    s6: R('\\btomei\\b|\\btomamos\\b|\\bengoli\\b|\\bingeri\\b|\\btomou\\b'),
    s8: R('\\b(meu|minha) \\w+ (veio|deu|esta|ficou|saiu)\\b|\\be grave\\b|\\bdevo me preocupar\\b|\\bpreocupante\\b|\\bperigoso\\b'),
    doseX: R('\\bdose (resposta|efetiva|letal|terapeutica|toxica)\\b|\\bdose-resposta\\b'),
    dose: R('\\bdose\\b|\\bdosagem\\b|\\bposologia\\b|\\bquanto .*\\b(tomar|dar)\\b|\\bcomo (tomar|usar|dar)\\b'),
    forma: R('\\b(comprimidos?|remedios?|medicamentos?|capsulas?|doses?|antibioticos?|pilulas?|injecao|injecoes|xarope|gotas|cartelas?|anticoncepcional|analgesicos?)\\b'),
    ajuda: R('\\b(o que (voce|vc) (sabe|pode|consegue) fazer|em que (voce|vc) (pode|consegue) (me )?ajudar|como (voce|vc) funciona|quem (e|eh) (voce|vc)|quem (te )?(criou|fez)|o que (voce|vc) faz|quais (sao )?(suas|seus) (funcoes|recursos)|me conta uma piada|me indica|me recomenda)\\b'),
    ajudaObj: R('\\bajuda (com|em|sobre)\\s+\\w+'),
    interrog: R('^(qual|quais|quem|quando|onde|quanto|quantos|como|por que|o que|receita|previsao)\\b'),
    interrogQ: R('\\b(qual|quais|quem|quando|onde|quanto|quantos|como|por que)\\b'),
    vago: R('^(ajuda|me ajuda( ai)?|preciso de (ajuda|uma coisa)|tenho uma duvida|duvida|nao sei|hmm+|e ai|\\?+|\\.+)$'),
    acad: R('\\b(escolha condicionada|condicionadas?|obrigatorias?|optativas?|eletivas?|coeficiente|jubilamento|reprovacao|aproveitamento|equivalencia|historico escolar|sigaa|ufrj|coordenacao|pre requisitos?|co requisitos?|ementa|creditos?|carga horaria|trancamento|tranca\\w*|matricula\\w*|periodo|grade|disciplinas?|formar|formatura|tcc|estagio|puxar)\\b'),
    dominio: R('\\b(farmac\\w*|medic\\w*|remedio\\w*|droga\\w*|doenca\\w*|sintoma\\w*|saude|organismo|celulas?|tecido\\w*|hormon\\w*|molecul\\w*|sangue|urina|figado|rins?|enzim\\w*|vitamin\\w*|bacteri\\w*|virus|infec\\w*|dor|febre|pressao|diabet\\w*|colesterol|laborat\\w*|quimic\\w*|bioquimic\\w*|fisiolog\\w*|patolog\\w*|toxic\\w*|veneno|substancia\\w*|composto\\w*|comprimido\\w*|capsula\\w*|terapi\\w*|tratamento\\w*|clinic\\w*|anatomi\\w*|dose\\w*)\\b'),
    sufixo: R('(azol|pril|sartana|olol|statina|prazol|oxacino|micina|cilina|emia|ase|coide)$')
  };

  // sinais de risco para a classificação de risco/ação (texto já normalizado: minúsculas, sem acento)
  var RX = {
    medPal: R('\\b(calmante|antibiotico|remedio|medicamento|comprimido|xarope|pilula|capsula|injecao|pomada|colirio|tarja|antidepressivo|ansiolitico|descongestionante|anticoncepcional|anti-?inflamatorio|analgesico|antialergico|laxante|diuretico|corticoide|antiacido|antitermico|antifungico|antiviral|sedativo|hipnotico|suplemento|vitamina)s?\\b'),
    sujPessoal: R('\\b(eu|posso|devo|meu|minha|meus|minhas|comigo|mim|tenho|sou|estou (tomando|usando|gravida|amamentando|com)|quero tomar|preciso tomar|filh[oa]s?|bebe|crianca|idos[oa]|gestante|gravida|hipertens[oa]|diabetic[oa]|alergic[oa]|asmatic[oa])\\b'),
    usoVerbo: R('\\b(tomar|tomo|tomando|dar|dou|damos|usar|usando|misturar|misturo|parar|partir|cortar|trocar|beber|ingerir|aplicar)\\b'),
    hipot: R('\\b(posso|devo|pode|podem|se eu|e se|o que acontece se|da para|seria)\\b'),
    verboIng: R('\\b(tomei|tomou|tomamos|tomaram|engoli|engoliu|ingeri|ingeriu|bebeu|bebi|dei|demos|usei|usou)\\b'),
    excesso: R('\\b(dobro|demais|a mais|por engano|sem querer|duas vezes|tres vezes|de uma (so )?vez|cartela|frasco|caixa inteira|overdose|todos os (comprimidos|remedios)|mais do que (o )?(indicado|receitado|prescrito|devia))\\b|\\b(\\d{2,}|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|vinte|varios|varias|muitos|muitas)\\s*(comprimidos|capsulas|gotas|pilulas|cartelas|frascos)\\b'),
    grave: R('\\b(desmai\\w*|convuls\\w*|inconsciente|desacordad\\w*|nao (esta )?(respira\\w*|acorda|reage)|falta de ar|dificuldade (pra|para|de) respirar|garganta (fechando|inchando|fechou|inchou)|(boca|lingua|rosto|labios?) inchad\\w*|(boca|lingua|rosto|labios?) inchando|peito apertad\\w*|dor no peito|vomitando sangue|anafila\\w*|roxo|roxa|corpo todo vermelho|confus[oa]|sonolent\\w* demais|muito sonolent\\w*|desorientad\\w*)\\b'),
    pessoa: R('\\b(estou|esta|estao|fiquei|ficou|ficando|meu|minha|ele|ela|dele|dela|eu)\\b'),
    depois: R('\\b(depois|apos|desde|logo (que|apos)|ao tomar)\\b'),
    fazMal: R('\\b(faz mal|da problema|tem problema|e perigoso|tem risco|prejudica)\\b'),
    primeira: R('\\b(pra mim|para mim|eu|tomo|uso|todo dia|estou|meu|minha|meus|minhas|comigo|me faz|minha mae|meu pai)\\b'),
    sintoma: R('\\b(apareceu|apareceram|senti|sinto|sentindo|surgiu|surgiram|comecei a sentir|fiquei com|deu (enjoo|dor|alergia|coceira|diarreia))\\b'),
    parou: R('\\b(parei|larguei|suspendi|deixei de tomar|parar de tomar|por conta propria)\\b'),
    adverso: R('\\b(efeitos? (advers\\w*|colaterais?|indesejados?)|reacoes? advers\\w*|contraindicac\\w*|toxicidade|hepatotox\\w*|nefrotox\\w*|faz mal|riscos?|perigos?|agranulocitose|dependencia|lesar|lesao|lesionar|causa|causam|causar|provoca|provocam|provocar|induz\\w*|pode(m)? (aumentar|reduzir|diminuir|elevar|baixar|piorar|levar))\\b'),
    molduraAcad: R('\\b(estudo de caso|caso clinico|questao de prova|para fins de estudo|para estudar|de aula|na aula|trabalho da faculdade|do ponto de vista|hipotetic\\w*|explique|descreva|justifique|discuta|mecanismo|farmacocinetic\\w*|farmacodinamic\\w*|inducao|inibicao enzimatic\\w*|cyp\\w*)\\b'),
    pessoalForte: R('\\b(eu|mim|comigo|meu|meus|minha|minhas|tomo|uso|usando|usei|estou|posso|devo|podemos|receitou|receitaram|passou|prescreveu|tomei|tomou|tomamos|nosso|nossa|filh[oa]s?|bebe|crianca|mae|pai|avo|avos|marido|esposa|namorad[oa]|amig[oa]|vizinh[oa]|dar para|da para)\\b'),
    deitico: R('\\b(aquilo|aquele|aquela|aqueles|aquelas|negocio|coisa|troco|tenho uma duvida|uma duvida sobre)\\b')
  };
  var ATRIBUTOS = ['efeito adverso', 'reacao adversa', 'posologia', 'interacao medicamentosa', 'toxicidade', 'dose letal'];
  var EXEMPLOS = {
    explicar_conceito: ['me conta como funciona o conceito de osmose', 'quero entender melhor esse assunto da matéria'],
    consultar_medicamento: ['esse remédio é indicado para quê', 'para que é usado esse medicamento'],
    criar_exercicios: ['gera perguntas de revisão para eu treinar', 'monta uma prova de treino'],
    resumir_conteudo: ['faz um resumo curto desse capítulo', 'resume a matéria em tópicos'],
    comparar_conceitos: ['qual a diferença entre esses dois termos', 'o que distingue um do outro']
  };

  function t(re, n) { return re.test(n); }
  function gibberish(toks) {
    if (!toks.length) return false;
    var ruins = toks.filter(function (w) {
      if (w.length < 3) return false;
      var v = (w.match(/[aeiou]/g) || []).length;
      return /^(asdf|qwer|zxcv|hjkl|qaz|wsx)/.test(w) || /(asdf|qwert|zxcv|hjkl)/.test(w) || v === 0 || /^(\w{2,3})\1{2,}$/.test(w) || /(bla){2,}/.test(w) || /[bcdfghjklmnpqrstvwxz]{5,}/.test(w) || v / w.length < 0.2;
    });
    return ruins.length === toks.length || (toks.length >= 3 && ruins.length >= toks.length - 1);
  }
  function simExemplo(n, id) {
    var ex = EXEMPLOS[id]; if (!ex) return 0;
    var a = M.busca.tokens(n), melhor = 0;
    if (!a.length) return 0;
    ex.forEach(function (e) {
      var b = M.busca.tokens(e), inter = 0, u = {};
      a.forEach(function (x) { u[x] = 1; }); b.forEach(function (x) { u[x] = 1; if (a.indexOf(x) >= 0) inter += 1; });
      var j = inter / (Object.keys(u).length || 1); if (j > melhor) melhor = j;
    });
    return melhor >= 0.3 ? melhor * 3 : 0;
  }

  // info: { ents:[{nome,tipo,categoria}], incertas, quantidades, academica, codigoExplicito, ctx:{rotulo}|null }
  function classificar(an, info) {
    var n = an.n, nw = an.tokens.length, S = {}, sinais = [], ents = info.ents || [], qtd = info.quantidades || [];
    var nMed = 0, nClasse = 0, nExame = 0, nConc = 0;
    ents.forEach(function (e) { if (e.tipo === 'med' || e.tipo === 'subst') nMed += 1; else if (e.tipo === 'classe') nClasse += 1; else if (e.tipo === 'exame') nExame += 1; else nConc += 1; });
    var E = nMed + nClasse + nExame + nConc, ctx = info.ctx || null, drog0 = nMed + nClasse > 0;
    var cue = {}; Object.keys(C).forEach(function (k) { cue[k] = t(C[k], n); });
    // conceitos que são "atributo" de um assunto já em curso (não trocam o assunto numa pergunta de continuação)
    var eNovo = ents.filter(function (e) { return !(e.tipo === 'conc' && ATRIBUTOS.indexOf(M.busca.norm(e.nome)) >= 0); }).length;
    var sinalDom = cue.dominio || an.tokens.some(function (w) { return w.length >= 6 && C.sufixo.test(w); }) || E > 0 || (info.incertas || []).length > 0 || qtd.length > 0;
    function add(id, v, why) { if (!v) return; S[id] = (S[id] || 0) + v; if (why) sinais.push(id + (v > 0 ? '+' : '') + v + ':' + why); }

    var def = cue.def || cue.expl || (cue.mecW && !drog0);
    // ---- segurança
    var sc = 0;
    if (cue.s1) sc += 3; if (cue.s2) sc += 3; if (cue.s3) sc += 2.5; if (cue.s4) sc += 2; if (cue.s6) sc += 3; if (cue.s5) sc += 5; if (cue.s7 && nMed + nClasse < 2) sc += 2.5; if (cue.s10 && qtd.length && nMed) sc += 4;
    if (cue.s2 && nMed >= 2) sc += 1;
    if (cue.s6 && nMed) sc += 1;
    if (cue.compM && E === 1) sc += 2;
    if (cue.s11) sc += 2.5;
    var temS = sc > 0;
    if (temS && (cue.forma || nMed)) sc += 1.5;
    if (temS && cue.intM && (cue.s2 || cue.s6)) sc += 1;
    if (cue.dose && cue.s3) sc += 4;
    if (cue.s8 && E) sc += 2;
    var doseMed = cue.dose && !cue.doseX && (nMed > 0 || nClasse > 0 || !!ctx);
    add('seguranca_farmaceutica', sc >= 4 ? sc : 0, 'risco');
    // ---- conteúdo
    var comp = cue.compF || (cue.compM && E >= 2);
    // pergunta de classificação conceitual ("X é A ou B?", "X é um Y?"): não é comparação entre substâncias
    var perguntaDef = /\b(o que|como|qual|quais|quando|onde|por que) (e|eh|sao)\b/.test(n);
    var clf = E >= 1 && !cue.compF && !cue.compM && !cue.social && !cue.saudacao && !/\b(classe|grupo)\b/.test(n) && ((cue.clfCop && nMed + nClasse < 2) || (cue.clfArt && !perguntaDef) || cue.clfPal);
    var par = E >= 2 && nw <= 7 && (cue.compX && !cue.compF) && !clf ? 5 : 0;
    var compScore = (cue.compF ? 5 : 0) + (cue.compM && E >= 2 ? 3 : 0) + (E >= 2 && comp ? 2 : 0) + par;
    add((nMed + nClasse >= 2) ? 'comparar_substancias' : 'comparar_conceitos', compScore, 'comparação');
    var intScore = (cue.intF ? 5 : (cue.intM ? 3 : (cue.intP && nMed + nClasse >= 2 ? 4 : (cue.intV && nMed >= 2 ? 4 : 0))));
    if (intScore) { intScore += (nMed >= 1 ? 1.5 : 0) + (nMed >= 2 ? 1 : 0); if (nMed + nClasse === 0) intScore -= 2.5; add('explicar_interacao', intScore, 'interação'); }
    var drog = nMed + nClasse > 0;
    if (cue.mecF || cue.mecW) add('explicar_mecanismo_acao', (cue.mecF ? 5 : 4) + (drog ? 2 : 0) - (drog ? 0 : (cue.mecF ? 1 : 3.5)) - (E === 0 && cue.mecF ? 2 : 0), 'mecanismo');
    if (cue.exerc) add('criar_exercicios', 5 + (E ? 1 : 0), 'exercícios');
    if (cue.resumo) add('resumir_conteudo', 5 + (E ? 1 : 0), 'resumo');
    var medBase = nMed ? 3 + (cue.med ? 3 : 0) + (nw <= 3 ? 2 : 0) + (def ? 1.5 : 0) : 0;
    add('consultar_medicamento', medBase, 'medicamento');
    if (nClasse) add('consultar_classe_farmacologica', 4 + (cue.classeC ? 2 : 0) + (def ? 1 : 0) + (nMed ? 3 : 0), 'classe');
    if (nMed && /\b(classe|grupo|faz parte|pertence|categoria|tipo de (remedio|medicamento))\b/.test(n)) add('consultar_classe_farmacologica', 4, 'pergunta de classe');
    var bioFn = nExame > 0 && cue.funcaoBio && !cue.exame;   // analito (hemoglobina, albumina…) perguntado pela função biológica, não pelo exame
    if (bioFn) add('explicar_conceito', 5, 'função biológica de analito');
    if (nExame || (cue.exame && E)) add('explicar_exame', (nExame ? (bioFn ? 1.5 : 4) : 0) + (cue.exame ? 3 : 0) + (nExame && def ? 1 : 0) + (cue.s8 ? 1 : 0), 'exame');
    if (qtd.length || /\d+\s*[+*/x-]\s*\d+/.test(n)) { if (cue.calc || /\d+\s*[+*/x-]\s*\d+/.test(n)) add('resolver_calculo', (qtd.length ? 3 : 0) + (cue.calc ? 4 : 0) + 1, 'cálculo'); }
    if (clf) add('explicar_conceito', 5, 'classificação conceitual');
    if (nConc || (E === 0 && def && sinalDom)) add('explicar_conceito', (nConc ? 3 : 0) + (def ? 3 : 0) + (E === 0 ? -1 : 0) + (nConc && nw <= 5 ? 1.5 : 0), 'conceito');
    else if (E === 0 && def) add('explicar_conceito', 2, 'conceito sem termo conhecido');
    if (nExame === 0 && nMed === 0 && nClasse === 0 && nConc === 0 && cue.def && !sinalDom) { /* fora do domínio: tratado abaixo */ }
    var sim = Object.keys(EXEMPLOS).map(function (id) { return [id, simExemplo(n, id)]; });
    sim.forEach(function (p) { if (p[1] > 0) add(p[0], p[1], 'exemplo parecido'); });
    // ---- contexto / continuação
    var contCue = (cue.anaf || cue.seq) && !cue.saudacao;
    if (contCue && (eNovo === 0 || /\b(de novo|de outro jeito|de outra forma)\b/.test(n))) {
      if (ctx) add('continuar_assunto', (cue.anaf ? 4 : 0) + (cue.seq ? 4 : 0) + 2 + (eNovo === 0 ? 1 : 0), 'continuação do assunto');
      else add('pedir_esclarecimento', 4, 'continuação sem assunto anterior');
    }
    // ---- social
    var curto = nw <= 6;
    if (curto && cue.saudacao) add('saudacao', 5 - (E ? 4 : 0), 'saudação');
    if (curto && cue.social && !cue.naoEntendi && !cue.exerc) add('social', 5 - (E ? 4 : 0), 'agradecimento/despedida');
    // ---- acadêmico (o motor antigo responde)
    if (info.academica || info.codigoExplicito || cue.acad) add('academico', 6, 'tema acadêmico do curso');
    // ---- ajuda geral / fora do domínio / esclarecimento
    var foraDominio = false;
    if (cue.ajuda) add('ajuda_geral', 6, 'pergunta sobre a FarmácIA');
    else if (E === 0 && !sinalDom && nw >= 3 && !contCue && !cue.acad && (cue.interrog || cue.ajudaObj || def || (cue.interrogQ && /\?/.test(an.original)))) { add('ajuda_geral', 3.5, 'pergunta geral sem termo de Farmácia'); foraDominio = true; }
    else if (cue.ajudaObj && E === 0 && !cue.acad) { add('ajuda_geral', 3.5, 'pedido de ajuda geral'); foraDominio = true; }
    var gib = !cue.social && !cue.saudacao && gibberish(an.tokens);
    add('pedir_esclarecimento', 1.5, 'base');
    if (gib) add('pedir_esclarecimento', 6, 'texto sem sentido');
    if (cue.vago) add('pedir_esclarecimento', 4, 'pedido vago');
    if (nw <= 2 && E === 0 && !cue.saudacao && !cue.social) add('pedir_esclarecimento', 2, 'mensagem muito curta');
    if ((cue.resumo || cue.exerc) && E === 0 && !ctx && nw <= 3) add('pedir_esclarecimento', 3, 'falta o assunto');
    if (cue.s5 && nMed === 0) add('pedir_esclarecimento', 5, 'dose pessoal sem medicamento');
    if ((info.incertas || []).length && E === 0) add('pedir_esclarecimento', 4, 'termo ambíguo');
    if (cue.s5 && nMed === 0) S.seguranca_farmaceutica = 0;
    // ---- decisão
    var ranking = Object.keys(S).map(function (k) { return { id: k, score: Math.round(S[k] * 100) / 100 }; }).sort(function (a, b) { return b.score - a.score; });
    var top = ranking[0], seg = ranking[1] || { score: 0 }, margem = top.score - seg.score;
    var conf = Math.max(0, Math.min(1, 0.5 * Math.min(top.score, 8) / 8 + 0.5 * Math.min(margem, 4) / 4));
    var nivel = conf >= 0.6 ? 'alta' : conf >= 0.4 ? 'media' : 'baixa';
    // risco sinalizado independentemente da intenção
    var nivelSeg = null, riscos = [];
    var ctxFarma = cue.forma || nMed > 0 || nClasse > 0 || cue.s5, semFarma = cue.acad && nMed + nClasse === 0;
    var interMed = ((cue.intF || cue.intM || (cue.intP && nMed + nClasse >= 2)) && (nMed + nClasse > 0 || !!ctx)) || (/\b(corta o efeito|anula o efeito|atrapalha o efeito)\b/.test(n) && (nMed + nClasse > 0 || RX.medPal.test(n)));
    if (!semFarma) {
      if (doseMed || (cue.dose && !cue.doseX && ctxFarma) || cue.s5) riscos.push('dose');
      if (interMed || top.id === 'explicar_interacao') riscos.push('interacao');
      if ((cue.s3 && ctxFarma) || cue.s5) riscos.push('populacao');
      if ((cue.s1 || cue.s6) && (ctxFarma || top.id === 'seguranca_farmaceutica')) riscos.push('excesso');
      if (cue.s8 && E) riscos.push('exame_pessoal');
      if ((cue.s4 && ctxFarma) || cue.s7 || (cue.compM && nMed > 0)) riscos.push('recomendacao');
    }
    if (top.id === 'seguranca_farmaceutica') nivelSeg = 'critico';
    else if (top.id === 'explicar_interacao') nivelSeg = 'critico';
    else if (riscos.length) nivelSeg = 'atencao';
    // ---- classe de risco e ação (etapas 4–6): none | geral | pessoal | intoxicacao | urgencia  ·  responder | esclarecer | seguranca
    var novos = ents.filter(function (e) { return !(e.tipo === 'conc' && ATRIBUTOS.indexOf(M.busca.norm(e.nome)) >= 0); });
    var trocaAssunto = !!ctx && novos.some(function (e) { return e.tipo === 'conc' || e.tipo === 'exame' || e.tipo === 'area'; });
    var medCtx = cue.forma || nMed > 0 || nClasse > 0 || RX.medPal.test(n);
    var hipot = RX.hipot.test(n);
    var intox = !hipot && RX.verboIng.test(n) && RX.excesso.test(n) && medCtx;
    var urg = RX.grave.test(n) && medCtx && RX.pessoa.test(n) && (RX.depois.test(n) || RX.verboIng.test(n));
    var pFaz = RX.fazMal.test(n) && RX.primeira.test(n);
    var sint = RX.sintoma.test(n) && RX.depois.test(n) && (nMed > 0 || cue.forma);
    var parou = RX.parou.test(n) && (nMed > 0 || cue.forma);
    var pedido = (cue.s2 && (nMed + nClasse > 0)) || (medCtx && RX.sujPessoal.test(n) && RX.usoVerbo.test(n));   // "posso tomar/misturar/parar… <medicamento ou classe>": pedido sobre o uso por uma pessoa, qualquer que seja a intenção mais pontuada
    var popCtx = cue.s3 && (ctxFarma || !!ctx);
    var herda = !!ctx && !!ctx.risco && !trocaAssunto && !cue.def && (contCue || nw <= 4);
    var genVazio = E === 0 && !ctx && !qtd.length && (nw <= 3 || !!info.ctxIncompativel) && !cue.s1 && !cue.s3 && !cue.s4 && !cue.s5 && !cue.s6 && !cue.s7 && !pFaz && !sint && !parou && !intox && !urg && (cue.dose || cue.intP || /\bposso\b/.test(n));
    var conteudoIds0 = { explicar_conceito: 1, explicar_mecanismo_acao: 1, consultar_medicamento: 1, consultar_classe_farmacologica: 1, explicar_exame: 1, comparar_conceitos: 1, comparar_substancias: 1 };
    var relacao = ctx ? (trocaAssunto ? 'troca' : (top.id === 'continuar_assunto' ? 'continua' : 'independente')) : (info.ctxIncompativel ? 'incompativel' : 'nenhum');
    var risco = 'none', novoRisco = false;
    if (urg) { risco = 'urgencia'; novoRisco = true; }
    else if (intox) { risco = 'intoxicacao'; novoRisco = true; }
    else if (pFaz || sint || parou || popCtx || pedido) { risco = 'pessoal'; novoRisco = true; }
    else if (herda) { risco = ctx.risco; novoRisco = true; }
    else if (nivelSeg && !genVazio) risco = 'pessoal';
    else if (!semFarma && RX.adverso.test(n) && (nMed + nClasse > 0 || (ctx && (cue.anaf || contCue)))) risco = 'geral';
    if (genVazio) { nivelSeg = null; if (top.id === 'seguranca_farmaceutica') top = { id: 'pedir_esclarecimento', score: top.score }; }
    if (risco !== 'none' && risco !== 'geral') {
      nivelSeg = 'critico';
      var forte = risco === 'urgencia' || risco === 'intoxicacao';
      if (novoRisco && (forte || top.id !== 'academico') && !(!forte && info.academica && nMed + nClasse === 0 && !pFaz)) top = { id: 'seguranca_farmaceutica', score: Math.max(top.score, 4) };
    }
    // interação medicamentosa em termos acadêmicos: só com moldura explícita de estudo (estudo de caso, mecanismo, questão de prova…) E sem nenhum marcador de uso real
    // (eu/meu/posso/tomo/mãe/filho/receitou…), de população, dose, excesso, exame ou sintoma. Qualquer marcador pessoal mantém o fluxo de segurança.
    var acadInter = (top.id === 'explicar_interacao' || cue.intF || (cue.intV && nMed >= 2)) && nMed + nClasse > 0 && RX.molduraAcad.test(n) && !RX.pessoalForte.test(n) && !cue.s1 && !cue.s2 && !cue.s3 && !cue.s5 && !cue.s6 && !cue.s8 && !cue.s4 && !cue.s11 && !pFaz && !sint && !parou && !intox && !urg && !(ctx && ctx.risco) && riscos.every(function (x) { return x === 'interacao'; });
    if (acadInter) { nivelSeg = null; risco = 'geral'; novoRisco = false; if (top.id !== 'explicar_interacao') top = { id: 'explicar_interacao', score: Math.max(top.score, 6) }; }
    var topId = top.id;
    var conteudoIds = { explicar_conceito: 1, explicar_mecanismo_acao: 1, consultar_medicamento: 1, consultar_classe_farmacologica: 1, explicar_exame: 1, comparar_conceitos: 1, comparar_substancias: 1, criar_exercicios: 1, resumir_conteudo: 1 };
    var motivo = '';
    var acao = (risco === 'pessoal' || risco === 'intoxicacao' || risco === 'urgencia') ? 'seguranca' : 'responder';
    if (acao === 'responder' && topId !== 'academico') {
      var incE = (info.incertas || []).length && E === 0;
      var faltaSujeito = E === 0 && !ctx && !qtd.length && ((cue.intP || cue.dose || /\bposso\b/.test(n)) || (conteudoIds[topId] && (cue.compF || cue.compM) && nw <= 4));
      var vagoDeitico = E === 0 && RX.deitico.test(n) && nw <= 8 && !cue.acad;
      var fazMalCtx = !!ctx && cue.intP && E === 0 && !pFaz && !/\b(efeitos?|reacoes?|riscos?)\b/.test(n);
      var baixa = nivel === 'baixa' && !{ saudacao: 1, social: 1, academico: 1, ajuda_geral: 1 }[topId] && E === 0 && !qtd.length;
      if (info.ctxIncompativel && E === 0 && (contCue || topId === 'pedir_esclarecimento')) motivo = 'antecedente'; else if (incE) motivo = 'ambiguo'; else if (fazMalCtx) motivo = 'faz_mal'; else if (faltaSujeito || (topId === 'pedir_esclarecimento' && !!contCue && !ctx)) motivo = (cue.dose || cue.intP || /\bposso\b/.test(n)) ? 'sem_assunto_seg' : 'sem_assunto'; else if (vagoDeitico || topId === 'pedir_esclarecimento' || baixa) motivo = 'vago';
      if (motivo) acao = 'esclarecer';
    }
    if (acao === 'esclarecer') risco = 'none';
    if (acao === 'esclarecer') topId = top.id === 'academico' ? top.id : 'pedir_esclarecimento';
    if (acao === 'esclarecer' && top.id !== topId) top = { id: topId, score: top.score };
    var entidades = ents.map(function (e) { return { nome: e.nome, tipo: e.tipo, categoria: e.categoria, aprox: !!e.aprox }; }).concat(qtd);
    return { id: top.id, score: top.score, confianca: Math.round(conf * 100) / 100, nivel: nivel, ranking: ranking.slice(0, 3), sinais: sinais, entidades: entidades, incertas: info.incertas || [], ambigua: !!(info.incertas || []).length,
      seguranca: !!nivelSeg, nivelSeguranca: nivelSeg, riscos: riscos, risco: risco, acao: acao, motivo: motivo, relacaoCtx: relacao, trocaAssunto: trocaAssunto, subtipo: (clf && top.id === 'explicar_conceito') ? 'classificacao' : null, referencia: ctx ? ctx.rotulo : null, faltaContexto: top.id === 'pedir_esclarecimento' && !!contCue && !ctx, foraDominio: foraDominio && top.id === 'ajuda_geral', normalizada: n, corrigidas: an.corrigidas };
  }

  M.intencao = { classificar: classificar, INTENCOES: ['explicar_conceito', 'consultar_medicamento', 'explicar_mecanismo_acao', 'consultar_classe_farmacologica', 'comparar_substancias', 'comparar_conceitos', 'explicar_interacao', 'explicar_exame', 'resolver_calculo', 'criar_exercicios', 'resumir_conteudo', 'continuar_assunto', 'saudacao', 'social', 'ajuda_geral', 'pedir_esclarecimento', 'seguranca_farmaceutica', 'academico'] };
})();

// =====================================================================
// Seção: interpretador
// =====================================================================
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
    var v3 = null, anV3 = null;
    try {   // camada v3 (normalização, entidades, intenção): se falhar, o interpretador antigo segue sozinho
      anV3 = M.norma.analisar(raw);
      var exV3 = M.entidades.extrair(anV3, raw), ents = [];
      exV3.itens.forEach(function (e) { if (!e.ambigua) ents.push(e); });
      var sg = function (x) { return norm(x).replace(/s\b/g, ''); };
      conc.forEach(function (c) { if (!ents.some(function (e) { return sg(e.nome) === sg(c.termo) || e.nome === c.rotulo; })) ents.push({ nome: c.rotulo, tipo: 'conc', categoria: c.categoria }); });
      farm.forEach(function (f) { var r = M.entidades.resolver(f); if (!ents.some(function (e) { return norm(e.nome) === f || (r && e.id === r.id); })) ents.push({ nome: f, tipo: 'med', categoria: 'farmacologia' }); });
      v3 = M.intencao.classificar(anV3, { ents: ents, incertas: exV3.incertas, quantidades: exV3.quantidades, academica: t(P.academico, n), codigoExplicito: /\b[A-Za-z]{3}\d{3}\b/.test(String(raw)), ctx: M.contexto.topicoPara(n) || M.contexto.soRisco(), ctxIncompativel: M.contexto.incompativel(n) });
      // ampliar as listas antigas só quando a mensagem não é de risco crítico (nesse caso o fluxo antigo fica exatamente como era até a etapa de segurança)
      if (v3.nivelSeguranca !== 'critico') {
        exV3.itens.forEach(function (e) {
          if (e.ambigua || e.tipo === 'area') return;   // áreas (bioquímica, fisiologia…) coincidem com nomes de disciplinas: seguem só na camada v3, o fluxo antigo de disciplinas não muda
          var k = norm(e.nome);
          if (e.tipo === 'med' || e.tipo === 'subst') { if (farm.indexOf(k) < 0 && !farm.some(function (f) { var r = M.entidades.resolver(f); return r && r.id === e.id; })) farm.push(k); }
          else if (!conc.some(function (c) { return sg(c.termo) === sg(k) || c.rotulo === e.nome; })) conc.push({ termo: k, rotulo: e.nome, categoria: e.categoria });
        });
      }
    } catch (errV3) { v3 = null; }
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
    var MAPA_V3 = { explicar_conceito: 'explicar', explicar_mecanismo_acao: 'explicar', explicar_interacao: 'explicar', consultar_medicamento: 'definir', consultar_classe_farmacologica: 'definir', explicar_exame: 'definir', comparar_conceitos: 'comparar', comparar_substancias: 'comparar', criar_exercicios: 'exercicio', resumir_conteudo: 'resumo' };
    var usaV3 = !!(v3 && v3.confianca >= 0.5 && v3.nivelSeguranca !== 'critico');
    if (usaV3 && !intencao && MAPA_V3[v3.id] && (conc.length || farm.length)) intencao = MAPA_V3[v3.id];
    var seguimento = !conc.length && !farm.length && (anafora || ['reformular', 'exemplo', 'resumo', 'aprofundar', 'fatores', 'onde', 'exercicio', 'erro'].indexOf(intencao) >= 0 || /^e (se |como |por que |quando |o que |qual |quais |onde )/.test(n) || /^(mais|continua|continue|e ai|e depois)$/.test(n));
    if (usaV3 && v3.id === 'continuar_assunto' && !conc.length && !farm.length) seguimento = true;
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
      academica: t(P.academico, n), anafora: anafora, seguimento: seguimento, ambiguidade: ambiguidade, v3: v3
    };
  }

  M.interpretador = { interpretar: interpretar, conceitosEm: conceitosEm, farmacosEm: farmacosEm, CONCEITOS: CONCEITOS };
})();

// =====================================================================
// Seção: contexto
// =====================================================================
/* FarmacIA — contexto conversacional (camada v2), só em memória da página (some ao recarregar ou em "Nova conversa").
 * Imediato: última pergunta/resposta, assunto, referências ("isso", "ele").
 * Da conversa: assunto principal, conceitos já explicados, perguntas anteriores.
 * Acadêmico: apenas dados públicos da disciplina citada (nunca o histórico/progresso do aluno). */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};
  function novo() { return { turnos: [], topico: null, conceitos: [], explicados: {}, modo: null, n: 0, risco: null, ini: false }; }
  // Validade do contexto (só em memória): o assunto vale por poucas trocas e por pouco tempo; um risco já sinalizado (dose, excesso,
  // urgência) vale por menos ainda, mas é herdado por perguntas de continuação ("e agora?", "e pra criança?", "e com o ibuprofeno?").
  var TTL_TURNOS = 4, TTL_RISCO = 3, TTL_MS = 30 * 60 * 1000;
  function agora() { return Date.now(); }
  function idade(x) { return S.n - x - (S.ini ? 1 : 0); }   // trocas desde o registro (a mensagem atual não conta)
  function vivoTopico() { return S.topico && idade(S.topico.n) <= TTL_TURNOS && (agora() - S.topico.ts) <= TTL_MS ? S.topico : null; }
  function vivoRisco() { return S.risco && idade(S.risco.n) <= TTL_RISCO && (agora() - S.risco.ts) <= TTL_MS ? S.risco.classe : null; }
  var S = novo();
  // Só turnos de CONTEÚDO (conceito, medicamento, mecanismo, exame…) definem o assunto da conversa. Perguntas do planejador (pré-requisito, créditos), conversa social,
  // cálculo e pedidos de esclarecimento não trocam o assunto: "Quais os pré-requisitos de Farmacologia?" não faz de "Farmacologia" o assunto do "mecanismo dele".
  var CONTEUDO = { explicar_conceito: 1, explicar_mecanismo_acao: 1, consultar_medicamento: 1, consultar_classe_farmacologica: 1, explicar_exame: 1, comparar_conceitos: 1, comparar_substancias: 1, resumir_conteudo: 1, criar_exercicios: 1, continuar_assunto: 1, explicar_interacao: 1, seguranca_farmaceutica: 1 };
  var ATR_CTX = ['efeito adverso', 'reacao adversa', 'posologia', 'interacao medicamentosa', 'toxicidade', 'dose letal'];
  // Compatibilidade entre o assunto guardado e o que a pergunta pede dele: mecanismo, efeito adverso, dose, indicação ou classe só fazem sentido para um
  // agente (medicamento, substância, classe ou conceito específico); um CAMPO inteiro (Farmacologia, Farmacocinética, Bioquímica…) não responde "como ele age?".
  var EXIGE_AGENTE = /\b(mecanismo|age|agem|atua|atuam|efeitos?|reacoes?|dose|doses|posologia|indicac\w*|contraindicac\w*|para que serve|classe|interage|interacao)\b/;
  function nz(x) { return M.busca.norm(String(x || '')); }
  function compativel(t, n) { return !!t && !(t.campo && EXIGE_AGENTE.test(n)); }
  function vista(t) { return { rotulo: t.rotulo, termos: t.termos, categoria: t.categoria, tipo: t.tipo, campo: !!t.campo, risco: vivoRisco() }; }

  function plano(html) { return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
  function cortar(t, max) { t = String(t || ''); return t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, '') + '…'; }

  // Se a pergunta depende do que veio antes, devolve o texto com o assunto explícito.
  function resolver(interp, texto) {
    var original = String(texto || '');
    var tv = vivoTopico();
    if (tv && !compativel(tv, nz(original))) return { texto: original, topico: '', usou: false, incompativel: true };
    if (!tv || !interp || !interp.seguimento) return { texto: original, topico: tv ? tv.rotulo : '', usou: false };
    var rot = tv.rotulo;
    var t = original.replace(/\b(isso|disso|nisso|aquilo|esse processo|esse conceito|este conceito)\b/gi, rot);
    if (t === original) t = original.replace(/[?!.\s]+$/, '') + ' (assunto: ' + rot + ')';
    return { texto: t, topico: rot, usou: true };
  }

  function registrar(t) {   // t: { pergunta, html, interp, modo }
    var interp = t.interp || {};
    if (S.ini) S.ini = false; else S.n += 1;
    var rc = interp.v3 && interp.v3.risco;
    if (rc === 'pessoal' || rc === 'intoxicacao' || rc === 'urgencia') S.risco = { classe: rc, n: S.n, ts: agora() };
    else if (S.risco && interp.v3 && interp.v3.trocaAssunto) S.risco = null;
    var v3 = interp.v3, atualiza = !v3 || !!CONTEUDO[v3.id];
    var conc = (interp.conceitos || []).filter(function (c) { return ATR_CTX.indexOf(nz(c.rotulo)) < 0; });
    if (atualiza && conc.length) {
      S.topico = { rotulo: conc.map(function (c) { return c.rotulo; }).slice(0, 2).join(' e '), termos: conc.map(function (c) { return c.termo; }), n: S.n, ts: agora(), categoria: conc[0].categoria, tipo: 'conc', campo: conc.every(function (c) { return nz(c.termo) === nz(c.categoria); }) };
      conc.forEach(function (c) { if (S.conceitos.indexOf(c.termo) < 0) S.conceitos.push(c.termo); S.explicados[c.termo] = true; });
    } else if (atualiza && interp.farmacos && interp.farmacos.length) {
      S.topico = { rotulo: interp.farmacos[0], termos: interp.farmacos.slice(0, 1), n: S.n, ts: agora(), categoria: 'farmacologia', tipo: 'med', campo: false };
    } else if (S.topico && v3 && v3.relacaoCtx === 'continua') {
      S.topico.n = S.n; S.topico.ts = agora();   // conversa que segue no mesmo assunto não expira no meio
    }
    S.turnos.push({ q: cortar(t.pergunta, 300), a: cortar(plano(t.html), 600), intencao: interp.intencao || '', modo: t.modo || 'conceitual' });
    if (S.turnos.length > 20) S.turnos.shift();
    S.modo = t.modo || 'conceitual';
  }
  function marcarLocal() { S.modo = 'local'; }

  // mensagens recentes (curtas) para enviar ao modelo: no máximo maxHistorico mensagens
  function historico() {
    var c = M.config.ia, out = [];
    S.turnos.filter(function (x) { return x.modo === 'conceitual'; }).slice(-Math.ceil(c.maxHistorico / 2)).forEach(function (x) {
      out.push({ r: 'u', t: cortar(x.q, c.maxCharsHistorico) });
      out.push({ r: 'a', t: cortar(x.a, c.maxCharsHistorico) });
    });
    return out.slice(-c.maxHistorico);
  }
  // dados públicos da grade (disciplinas.js) — não é progresso do aluno
  function academico(codigo) {
    if (!codigo || typeof getDisciplinaByCode !== 'function') return null;
    var d = getDisciplinaByCode(codigo);
    if (!d) return null;
    return { codigo: d.codigo, nome: d.nome, periodo: String(d.periodo), creditos: d.cred, horas: d.ch, pre: d.pre || '', co: d.co || '' };
  }
  // perfil: só período e turno (não identificam ninguém); nome e pronome ficam no aparelho
  function perfil() {
    try { var p = window.FarmacIA && window.FarmacIA._perfil ? window.FarmacIA._perfil() : {}; return { periodo: p.periodo || 0, turno: p.turno || '' }; } catch (e) { return { periodo: 0, turno: '' }; }
  }

  M.contexto = {
    resolver: resolver, registrar: registrar, marcarLocal: marcarLocal, historico: historico, academico: academico, perfil: perfil,
    modo: function () { return S.modo; },
    topico: function () { var t = vivoTopico(); return t ? vista(t) : null; },
    topicoPara: function (n) { var t = vivoTopico(); return t && compativel(t, n) ? vista(t) : null; },
    incompativel: function (n) { var t = vivoTopico(); return !!t && !compativel(t, n); },
    risco: function () { return vivoRisco(); },
    soRisco: function () { var r = vivoRisco(); return r ? { rotulo: '', termos: [], categoria: '', risco: r } : null; }, explicados: function () { return S.conceitos.slice(); },
    ultimo: function () { return S.turnos[S.turnos.length - 1] || null; }, turnos: function () { return S.turnos.slice(); },
    iniciar: function () { S.n += 1; S.ini = true; },   // chamado uma vez por mensagem do aluno: todas as trocas contam para a validade, respondidas aqui ou pelo farmacia.js
    reset: function () { S = novo(); }
  };
})();

// =====================================================================
// Seção: rag
// =====================================================================
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
      v: 1, cid: cid(), pergunta: (interp.v3 && interp.v3.risco === 'geral' ? 'Pergunta acadêmica de Farmácia: explique só o mecanismo e o conceito; não dê dose, conduta nem recomendação para uma pessoa específica. ' : '') + String(resolvido.texto).slice(0, c.maxPergunta), historico: M.contexto.historico(), trechos: trechos,
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
    var f = fontesCitadas(limpo, busca), html = window.FarmaciaMarkdown ? '<div class="farma-md">' + window.FarmaciaMarkdown.render(limpo) + '</div>' : mdSeguro(limpo);
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
    var VZ = window.FarmaVisual, html = usados.map(function (x) {
      if (!VZ || x.tipo !== 'glossario-projeto' || !window.FarmaciaMarkdown) return '<p><strong>' + esc(x.titulo) + '</strong></p><p>' + esc(x.trecho) + '</p>';
      var ex = (VZ.extras || {})[x.itemId || x.id], mdTxt = '### ' + String(x.titulo).replace(/[#`*_]/g, '') + '\n\n';
      if (!ex || !ex.so) mdTxt += '```definicao\n' + String(x.trecho).replace(/`/g, "'") + '\n```\n\n';
      if (ex) mdTxt += ex.md;
      return '<div class="farma-md">' + window.FarmaciaMarkdown.render(mdTxt) + '</div>';
    }).join('');
    html += '<p class="farma-source">Fonte: ' + usados.map(function (x) { return linhaFonte(x); }).join('<br>') + '</p>';
    var naoRev = usados.some(function (x) { return !x.revisado && !x.oficial; });
    html += '<p class="farma-note">Resposta do material local da FarmacIA (sem IA online, texto pronto)' + (naoRev ? '; o glossário ainda não foi revisado por docente' : '') + '.</p>';
    return html;
  }

  M.rag = { preparar: preparar, payload: payload, formatarIA: formatarIA, formatarLocal: formatarLocal, mdSeguro: mdSeguro, cid: cid };
})();

// =====================================================================
// Seção: provedor-ia
// =====================================================================
/* FarmacIA — camada de provedores de IA (independente de fornecedor).
 * Interface de um provedor: { id, disponivel() -> bool, enviar(payload, { signal, timeoutMs }) -> Promise<{ texto, modelo, cache }> }.
 * Erros sempre viram { codigo, mensagem, retryMs }. O provedor padrão ('edge') fala com a Edge Function do Supabase,
 * que guarda as chaves e escolhe o modelo: nenhuma chave privada existe no navegador. */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};
  var registro = {}, atual = 'edge';
  var est = { chamadas: 0, ultima: 0, falhas: 0, pausadoAte: 0, ctl: null };

  function erro(codigo, mensagem, retryMs) { var e = new Error(mensagem || codigo); e.codigo = codigo; e.retryMs = retryMs || 0; return e; }

  var edge = {
    id: 'edge',
    disponivel: function () { return !!M.endpointIA() && !!M.chavePublica(); },
    enviar: function (payload, o) {
      var timer, ctl = new AbortController(), fim = false;
      if (o.signal) o.signal.addEventListener('abort', function () { ctl.abort(); });
      var limite = new Promise(function (_, rej) { timer = setTimeout(function () { fim = true; ctl.abort(); rej(erro('timeout', 'tempo esgotado')); }, o.timeoutMs); });
      var req = fetch(M.endpointIA(), {
        method: 'POST', cache: 'no-store', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', apikey: M.chavePublica() }, body: JSON.stringify(payload)
      }).then(function (res) {
        var retry = Number(res.headers.get('Retry-After')) * 1000 || 0;
        return res.text().then(function (txt) {
          var j = null; try { j = JSON.parse(txt); } catch (e) { j = null; }
          if (res.status === 429 && j && j.erro === 'cota_diaria') throw erro('cota_diaria', 'cota diária esgotada', (j && j.retryMs) || retry || 0);
          if (res.status === 429) throw erro('limite', 'limite de uso', retry || (j && j.retryMs) || 30000);
          if (res.status === 401 || res.status === 403) throw erro('auth', 'autenticação recusada');
          if (res.status >= 500 || res.status === 404) throw erro('indisponivel', 'serviço indisponível (' + res.status + ')');
          if (!res.ok) throw erro(j && j.erro === 'fora_do_escopo' ? 'fora_do_escopo' : 'indisponivel', (j && j.erro) || 'erro ' + res.status);
          if (!j || typeof j.texto !== 'string' || j.texto.trim().length < 2 || j.texto.length > 8000) throw erro('resposta_invalida', 'resposta inválida');
          return { texto: j.texto, modelo: j.modelo || '', cache: !!j.cache };
        });
      }).catch(function (e) {
        if (e && e.codigo) throw e;
        if (e && e.name === 'AbortError') throw fim ? erro('timeout', 'tempo esgotado') : erro('cancelado', 'cancelado');
        throw erro('offline', 'sem conexão');
      });
      return Promise.race([req, limite]).then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
    }
  };
  registro.edge = edge;

  function registrar(id, impl) { registro[id] = impl; }
  function usar(id) { if (registro[id]) atual = id; }
  function provedor() { return registro[atual]; }

  // Cota diária: quando o servidor avisa que acabou, a IA online descansa neste aparelho até o dia seguinte (fuso de São Paulo).
  function diaSP() {
    try { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); }
    catch (e) { var d = new Date(Date.now() - 3 * 3600000); return d.toISOString().slice(0, 10); }
  }
  function cotaEsgotada() { return M.armazenar.ler(M.config.storage.cota) === diaSP(); }
  function marcarCota() { M.armazenar.gravar(M.config.storage.cota, diaSP()); }
  function ativada() { return M.armazenar.ler(M.config.storage.consentimento) === '1' && M.armazenar.ler(M.config.storage.modo) !== 'offline'; }
  function ativar() { M.armazenar.gravar(M.config.storage.consentimento, '1'); M.armazenar.apagar(M.config.storage.modo); }
  function desativar() { M.armazenar.gravar(M.config.storage.modo, 'offline'); M.armazenar.apagar(M.config.storage.consentimento); cancelar(); }

  // Pode chamar agora? Considera chave geral, consentimento, modo, rede, disjuntor, intervalo e teto da sessão.
  function pode() {
    var c = M.config.ia, now = Date.now(), p = provedor();
    if (!c.habilitada || !p || !p.disponivel()) return { ok: false, motivo: 'desabilitado' };
    if (M.armazenar.ler(M.config.storage.modo) === 'offline') return { ok: false, motivo: 'modo_offline' };
    if (M.armazenar.ler(M.config.storage.consentimento) !== '1') return { ok: false, motivo: 'sem_consentimento' };
    if (cotaEsgotada()) return { ok: false, motivo: 'cota_diaria' };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, motivo: 'offline' };
    if (est.pausadoAte > now) return { ok: false, motivo: 'pausado', aguardarMs: est.pausadoAte - now };
    if (est.chamadas >= c.maxPorSessao) return { ok: false, motivo: 'teto_sessao' };
    if (now - est.ultima < c.intervaloMinMs) return { ok: false, motivo: 'intervalo', aguardarMs: c.intervaloMinMs - (now - est.ultima) };
    return { ok: true };
  }

  function enviar(payload) {
    var c = M.config.ia, chk = pode();
    if (!chk.ok) return Promise.reject(Object.assign(erro(chk.motivo, chk.motivo, chk.aguardarMs), { bloqueio: true }));
    est.chamadas += 1; est.ultima = Date.now();
    est.ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var ctl = est.ctl;
    return provedor().enviar(payload, { signal: ctl && ctl.signal, timeoutMs: c.timeoutMs }).then(function (r) { est.falhas = 0; return r; }, function (e) {
      if (e.codigo === 'cota_diaria') marcarCota();
      if (e.codigo !== 'cancelado' && e.codigo !== 'fora_do_escopo' && e.codigo !== 'limite' && e.codigo !== 'cota_diaria') {
        est.falhas += 1;
        if (est.falhas >= c.falhasParaPausar) { est.pausadoAte = Date.now() + c.pausaMs; est.falhas = 0; }
      }
      throw e;
    });
  }
  function cancelar() { if (est.ctl) { try { est.ctl.abort(); } catch (e) { /* já encerrada */ } } }

  M.ia = { enviar: enviar, cancelar: cancelar, pode: pode, ativada: ativada, ativar: ativar, desativar: desativar, esgotada: cotaEsgotada, _marcarCota: marcarCota, _diaSP: diaSP, registrar: registrar, usar: usar, estado: function () { return { chamadas: est.chamadas, pausadoAte: est.pausadoAte, falhas: est.falhas }; }, resetar: function () { est.chamadas = 0; est.ultima = 0; est.falhas = 0; est.pausadoAte = 0; } };
})();

// =====================================================================
// Seção: orquestrador
// =====================================================================
/* FarmacIA — orquestrador híbrido (offline + online).
 * O farmacia.js responde primeiro (grade, regras da UFRJ, conversa) e entrega o resultado a interceptar().
 * Aqui se decide se a pergunta é de CONTEÚDO (conceito, explicação, comparação, exemplo, revisão) e, se for:
 *   interpreta -> resolve referências ("isso") -> recupera trechos (RAG) -> IA online, se permitida e disponível;
 *   senão, material local; se nada serve, admite que não sabe. Falha online nunca trava a tela nem apaga a pergunta.
 * Respostas de IA e respostas prontas do material local são rotuladas de forma diferente. */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};
  var F = function () { return window.FarmacIA || {}; };
  function esc(v) { return F()._esc ? F()._esc(v) : String(v); }
  function p(h) { return '<p>' + h + '</p>'; }
  function R(html, chips) { return { html: html, chips: chips || [], id: 'conceito' }; }
  function perfil() { try { return F()._perfil ? F()._perfil() : {}; } catch (e) { return {}; } }
  function nomeHTML() { var n = perfil().nome; return n ? '<strong>' + esc(n) + '</strong>' : ''; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var CONTEUDO_V3 = { explicar_conceito: 1, explicar_mecanismo_acao: 1, consultar_medicamento: 1, consultar_classe_farmacologica: 1, explicar_exame: 1, comparar_conceitos: 1, comparar_substancias: 1, criar_exercicios: 1, resumir_conteudo: 1 };
  var OVERR = { info: 1, topic: 1, unknown: 1, followup: 1, reexplain: 1, more: 1, why: 1 };
  var SOCIAL = { ack: 1, thanks: 1, greet: 1, bye: 1, praise: 1, howare: 1, invite: 1, who: 1, about: 1, myname: 1, setname: 1, setpron: 1, setperiod: 1, setshift: 1, frustrated: 1, empty: 1 };
  var ESC_SOC = { bye: 1, greet: 1, invite: 1 };   // o motor antigo confundiu "aquilo", "fala" etc. com conversa social
  var pendente = null, primeiro = true, cache = [], consentMostrado = false;

  // ---------- comandos de privacidade e de modo ----------
  function consentimento() { return M.armazenar.ler(M.config.storage.consentimento) === '1'; }
  function privacidadeHTML() {
    var on = consentimento() && M.armazenar.ler(M.config.storage.modo) !== 'offline';
    return p('<strong>O que fica no seu aparelho</strong>') +
      p('• Nome, pronome, período, turno e foto do perfil (só aqui, nas Configurações).<br>• Se você permitiu ou não a IA online, e um código aleatório sem ligação com você, usado só para limitar abusos.<br>• O histórico desta conversa fica apenas na memória da página: some ao recarregar ou em “Nova conversa”.') +
      p('<strong>O que sai do aparelho (só quando uso a IA online, e só se você permitir)</strong>') +
      p('• A sua pergunta (até ' + M.config.ia.maxPergunta + ' caracteres) e as últimas mensagens da conversa, resumidas.<br>• Trechos do material local usados como base.<br>• Dados públicos da disciplina citada e o seu período e turno, se estiverem no perfil.<br>• O servidor vê o seu endereço de rede (IP) para limitar abusos; ele não guarda o texto das perguntas nos registros.') +
      p('<strong>O que nunca é enviado:</strong> nome, pronome, foto, notas, disciplinas que você marcou como cursadas e e-mail.') +
      p('Perguntas sobre a sua grade e sobre as regras da UFRJ são respondidas no próprio aparelho, sem enviar nada. A IA online está <strong>' + (on ? 'ativada' : 'desativada') + '</strong>.');
  }
  function comando(n, raw) {
    if (/\b(o que (e|eh|foi|sao) (enviado|mandado|armazenado|guardado|salvo|enviados)|o que (voce )?(envia|manda|guarda|armazena|coleta)|privacidade|meus dados|dados (enviados|armazenados)|para onde (vai|vao) (a )?(minha|as)|ia online (e )?segura)\b/.test(n)) {
      var on = consentimento() && M.armazenar.ler(M.config.storage.modo) !== 'offline';
      return R(privacidadeHTML(), on ? [{ label: 'Usar só offline', q: 'Usar só offline' }] : [{ label: 'Permitir IA online', q: 'Permitir IA online' }]);
    }
    if (/\b(permitir|ativar|ativa|autorizo|autorizar|liberar|habilitar|ligar)\b.*\bia\b|\busar ia( online)?\b/.test(n) && !/\b(nao|desativ\w*|desligar)\b/.test(n)) {
      M.armazenar.gravar(M.config.storage.consentimento, '1'); M.armazenar.apagar(M.config.storage.modo);
      if (pendente) { var pd = pendente; pendente = null; return tratar(pd.raw, pd.interp, pd.local, p('Combinado' + (nomeHTML() ? ', ' + nomeHTML() : '') + ': IA online ativada. Respondendo a sua pergunta…')); }
      return R(p('Pronto' + (nomeHTML() ? ', ' + nomeHTML() : '') + ': a <strong>IA online</strong> está ativada para perguntas de conteúdo. Ela nunca é usada para a sua grade ou para as regras da UFRJ. Para desligar, diga “usar só offline”.'), [{ label: 'O que é enviado?', q: 'O que é enviado?' }]);
    }
    if (/\b(so offline|somente offline|apenas offline|usar offline|desativar ia|desativa ia|desligar ia|nao usar ia|sem ia|parar de usar ia|revogar)\b/.test(n)) {
      M.armazenar.gravar(M.config.storage.modo, 'offline'); M.armazenar.apagar(M.config.storage.consentimento); pendente = null; M.ia.cancelar();
      return R(p('Certo: a <strong>IA online está desligada</strong>. Continuo respondendo a grade, as regras e o material local, sem enviar nada para fora. Para religar, diga “permitir IA online”.'), [{ label: 'Permitir IA online', q: 'Permitir IA online' }]);
    }
    if (/\b(esquecer (a )?conversa|limpar (o )?contexto|apagar (o )?historico (da conversa)?)\b/.test(n)) {
      M.contexto.reset();
      return R(p('Pronto, esqueci o contexto desta conversa. O próximo assunto começa do zero.'));
    }
    return null;
  }

  // ---------- mensagens ----------
  function chipsPos(interp) {
    var todos = [['exemplo', 'Me dá um exemplo', 'Me dá um exemplo'], ['reformular', 'Explicar de outro jeito', 'Pode explicar de outro jeito?'], ['aprofundar', 'Aprofundar', 'Quero uma explicação mais aprofundada'], ['exercicio', 'Me faça perguntas', 'Me faça perguntas de revisão sobre isso']];
    return todos.filter(function (c) { return c[0] !== interp.intencao; }).slice(0, 4).map(function (c) { return { label: c[1], q: c[2] }; });
  }
  function consentHTML() {
    return p('<strong>Quer que eu use IA online para explicar melhor' + (nomeHTML() ? ', ' + nomeHTML() : '') + '?</strong>') +
      p('Só para perguntas de conteúdo de Farmácia. Ao permitir, enviamos ao serviço de IA a sua pergunta, as últimas mensagens (resumidas), trechos do material usado e o seu período e turno, se estiverem no perfil. <strong>Não enviamos</strong> nome, pronome, foto, notas nem as matérias que você marcou. Dá para desligar quando quiser.');
  }
  var CHIPS_CONSENT = [{ label: 'Permitir IA online', q: 'Permitir IA online' }, { label: 'Só offline', q: 'Usar só offline' }, { label: 'O que é enviado?', q: 'O que é enviado?' }];
  function avisoFalha(e) {
    var nm = nomeHTML() ? ', ' + nomeHTML() : '';
    switch (e.codigo) {
      case 'offline': return p('Estou sem conexão agora' + nm + ', então não consegui usar a IA online.');
      case 'timeout': return p('A IA online demorou demais para responder e eu parei de esperar.');
      case 'limite': return p('Muita gente usando a IA online ou muitas perguntas em pouco tempo (limite de uso). Tente de novo em ' + Math.max(5, Math.round((e.retryMs || 30000) / 1000)) + ' segundos.');
      case 'auth': return p('A IA online recusou a conexão (falha de autenticação do serviço). Isso é problema do app, não seu: avise a equipe do Planejador.');
      case 'resposta_invalida': return p('A IA online devolveu uma resposta que eu não consegui usar.');
      case 'cota_diaria': return p('A cota gratuita da IA online acabou por hoje' + nm + '. Respondo com o material local e ela volta amanhã.');
      case 'pausado': return p('A IA online está pausada por alguns instantes depois de falhas seguidas.');
      case 'teto_sessao': return p('Você já usou bastante a IA online nesta sessão; para poupar o serviço gratuito, ela descansa até você recarregar a página.');
      case 'intervalo': return p('Calma, uma pergunta de cada vez: espere alguns segundos para a próxima.');
      case 'fora_do_escopo': return p('Esse assunto está fora do que eu posso ajudar: conteúdo de Farmácia e vida acadêmica na UFRJ.');
      default: return p('O serviço de IA online está indisponível agora.');
    }
  }
  function chave(res, interp, busca) {
    var u = M.contexto.ultimo();
    return [M.busca.norm(res.texto), interp.intencao, interp.nivel, (busca.resultados || []).map(function (r) { return r.id; }).join(','), u ? M.busca.norm(u.q) : ''].join('|');
  }

  // até 3 títulos de tópicos do material local parecidos com a pergunta (mesmo quando a busca não bastou para responder)
  function proximosLocais(busca) {
    var vistos = {}, out = [];
    (busca.resultados || []).forEach(function (r) { var t = String(r.titulo || '').trim(); if (t && !vistos[t] && out.length < 3 && r.tipo !== 'ementa-ppc') { vistos[t] = 1; out.push(t); } });
    return out;
  }
  function semIA(raw, interp, local, busca, aviso, retry) {
    var loc = M.rag.formatarLocal(busca, interp), html = aviso || '', chips = [];
    if (loc) { html += loc; M.contexto.registrar({ pergunta: raw, html: loc, interp: interp, modo: 'conceitual' }); chips = chipsPos(interp).slice(0, 2); }
    else if (local && local.id === 'topic') { html += local.html; chips = local.chips || []; }
    else if (interp.intencao === 'exercicio') html += p('Para criar perguntas de revisão eu preciso da IA online. Sem ela, só consigo mostrar o material local.');
    else {
      var tema = temaDe(interp).map(function (x) { return '<strong>' + esc(x) + '</strong>'; }).join(' e ');
      html += p('Não encontrei ' + (tema ? 'material local sobre ' + tema : 'isso no material local') + ' e, sem a IA online, prefiro não arriscar uma explicação.');
      var prox = (busca.proximos || []);
      if (prox.length) { html += p('No material local há algo próximo: ' + prox.map(function (x) { return '<strong>' + esc(x) + '</strong>'; }).join(', ') + '.'); chips = prox.map(function (x) { return { label: x.slice(0, 34), q: 'Me explica ' + x }; }); }
      else html += p('Você pode tentar com outras palavras ou procurar o professor da disciplina.');
    }
    if (retry) chips = [{ label: 'Tentar novamente', q: raw }].concat(chips);
    return R(html, chips.length ? chips : (F()._chips ? F()._chips() : []));
  }

  // Portão de segurança farmacêutica: roda ANTES de qualquer provedor (online ou futuro) e não depende de rede.
  // Quatro respostas fixas e locais, sem conteúdo clínico, e NADA é enviado para fora:
  //  · urgência (sintoma grave depois de remédio) -> SAMU 192 (e Disque-Intoxicação se foi medicamento);
  //  · intoxicação (tomou além do indicado)      -> Disque-Intoxicação 0800 722 6001; SAMU só se houver sinais graves;
  //  · pessoal (dose, combinação, gravidez, criança, alergia, exame, "faz mal pra mim") -> farmacêutico/médico e bula, sem telefone de emergência.
  // O SAMU não é recomendado para qualquer dúvida de medicamento.
  function bloqueioRisco(interp) {
    var v = interp && interp.v3;
    if (!v || !v.seguranca || v.id === 'academico') return null;
    var r = v.riscos || [], c = v.risco, html;
    if (c === 'urgencia') {
      html = p('<strong>Isso pode ser uma emergência.</strong>') + p('Ligue agora para o <strong>SAMU: 192</strong>.');
      html += p('Se um medicamento pode ter causado isso, diga ao atendimento qual foi, a quantidade e o horário. O Disque-Intoxicação (0800 722 6001) também pode orientar.');
      html += p('Eu não consigo avaliar o quadro por aqui e nada desta conversa é enviado para fora.');
    } else if (c === 'intoxicacao') {
      html = p('<strong>Tomar mais do que o indicado precisa de orientação agora, mesmo sem sintomas.</strong>');
      html += p('Ligue para o <strong>Disque-Intoxicação: 0800 722 6001</strong> e deixe à mão o nome do medicamento, a quantidade e o horário.');
      html += p('Se a pessoa desmaiar, tiver convulsão, dificuldade para respirar ou não responder, ligue para o <strong>SAMU: 192</strong>.');
      html += p('Eu não oriento o que fazer nesse caso e nada desta conversa é enviado para fora.');
    } else {
      html = p('<strong>Essa pergunta envolve segurança no uso de medicamentos.</strong>');
      html += p('Dose, combinação de remédios, gravidez e amamentação, crianças, alergias, sintomas depois de um remédio e resultado de exame dependem de cada pessoa. Por isso eu não respondo isso, nem pela IA online: converse com um farmacêutico ou médico e confira a bula do produto.');
      if (r.indexOf('exame_pessoal') >= 0) html += p('Também não interpreto o resultado de exame de uma pessoa: quem pediu o exame pode explicar o que ele significa no seu caso.');
      html += p('Posso explicar o assunto em termos gerais, sem orientar o seu caso, se você perguntar de outro jeito.');
    }
    return R(html, F()._chips ? F()._chips() : []);
  }

  // Perguntas que não dá para responder sem adivinhar: em vez de chutar (ou mandar para a IA), pergunta de volta com opções.
  function temaDe(interp) {
    var t = (interp.conceitos || []).map(function (c) { return c.rotulo; }).concat(interp.farmacos || []);
    return t.filter(function (x, i) { return x && t.indexOf(x) === i; }).slice(0, 3);
  }
  function esclarecimento(interp) {
    var v = interp && interp.v3;
    if (!v || v.acao !== 'esclarecer' || v.id === 'academico') return null;
    var chipsBase = F()._chips ? F()._chips() : [], top = M.contexto.topico(), rot = top && top.rotulo;
    if (v.motivo === 'ambiguo' && v.incertas && v.incertas.length) {
      var a = v.incertas[0], cand = (a.candidatos || []).slice(0, 4);
      return R(p('O termo <strong>' + esc(a.texto) + '</strong> pode ter mais de um sentido: ' + cand.map(esc).join(' ou ') + '. Qual deles você quer?'), cand.map(function (x) { return { label: x, q: 'O que é ' + x + '?' }; }));
    }
    if (v.motivo === 'faz_mal' && rot) {
      return R(p('“Faz mal” pode ser duas perguntas diferentes sobre <strong>' + esc(rot) + '</strong>:') + p('• os efeitos adversos e riscos em termos gerais (conteúdo de estudo);<br>• se é seguro para uma pessoa em particular (um caso real).') + p('Qual das duas você quer?'),
        [{ label: 'Efeitos adversos em geral', q: 'Quais os efeitos adversos de ' + rot + '?' }, { label: 'É sobre um caso real', q: 'Posso tomar ' + rot + '? É sobre um caso real' }]);
    }
    if (v.motivo === 'antecedente' && rot) return R(p('Você vinha falando de <strong>' + esc(rot) + '</strong>, que é uma área ou um tema amplo, e não um medicamento ou conceito específico. De qual <strong>medicamento ou conceito</strong> você quer saber isso (mecanismo, efeitos, dose, classe)?'), chipsBase);
    if (v.motivo === 'sem_assunto_seg') return R(p('Para responder isso com segurança eu preciso saber <strong>de qual medicamento ou assunto</strong> você está falando. Me diga o nome (por exemplo: dipirona, metformina, TGO).'), chipsBase);
    if (v.motivo === 'sem_assunto') return R(p('Sobre qual <strong>assunto</strong> você quer saber? Me diga o termo (por exemplo: farmacocinética, metformina, TGO) e o que quer dele.'), chipsBase);
    return R(p('Não consegui identificar com clareza o que você quer saber. Pode dizer o <strong>assunto</strong> (um medicamento, um conceito, um exame) e o que você quer dele: explicação, comparação, exemplos?'), chipsBase);
  }

  // Risco "geral" (efeitos adversos, contraindicações, riscos em termos acadêmicos): só material local, nunca provedor online.
  function soLocalRisco(raw, interp) {
    var res = M.contexto.resolver(interp, raw), busca = M.rag.preparar(interp, res.texto), loc = '';
    // só vale texto local que fale do próprio medicamento/assunto perguntado (um item vizinho, como "Farmacodinâmica", não responde "efeitos adversos da losartana")
    var ATR = ['efeito adverso', 'reacao adversa', 'toxicidade', 'interacao medicamentosa', 'contraindicacao'];
    var termos = (interp.farmacos || []).concat(res.usou && res.topico ? [res.topico] : []).concat((interp.conceitos || []).map(function (c) { return c.rotulo; })).map(function (x) { return M.busca.norm(x); }).filter(function (x) { return x && ATR.indexOf(x) < 0; });
    if (!termos.length) { var tc = M.contexto.topico(); if (tc && tc.rotulo) termos = [M.busca.norm(tc.rotulo)]; }
    if (busca.suficiente) {
      var rel = termos.length ? (busca.resultados || []).filter(function (r) { var tx = M.busca.norm(r.titulo + ' ' + r.trecho); return termos.some(function (t) { return tx.indexOf(t) >= 0; }); }) : [];
      if (rel && rel.length) loc = M.rag.formatarLocal({ resultados: rel }, interp);
    }
    if (loc) { M.contexto.registrar({ pergunta: raw, html: loc, interp: interp, modo: 'local' }); return R(loc, chipsPos(interp).slice(0, 2)); }
    var tema = temaDe(interp).concat(res.usou && res.topico ? [res.topico] : []).slice(0, 2).map(function (x) { return '<strong>' + esc(x) + '</strong>'; }).join(' e ');
    var assunto = interp.v3 && interp.v3.id === 'explicar_interacao' ? 'a interação' : 'efeitos adversos e riscos';
    return R(p('Não encontrei no material local da FarmacIA um texto sobre ' + assunto + (tema ? ' de ' + tema : '') + '.') + p('Como esse é um assunto de segurança, eu não envio a pergunta para a IA online. Consulte a bula, o farmacêutico ou o professor da disciplina.'), F()._chips ? F()._chips() : []);
  }

  function tratar(raw, interp, local, prefixo) {
    var bloq = bloqueioRisco(interp); if (bloq) return Promise.resolve(bloq);   // segunda barreira: nada de risco chega ao provedor
    if (interp.v3 && interp.v3.risco === 'geral' && !M.config.ia.academicoRiscoOnline) return Promise.resolve(soLocalRisco(raw, interp));   // risco geral: só material local (a menos que a configuração permita a IA online com instrução acadêmica)
    var res = M.contexto.resolver(interp, raw), busca = M.rag.preparar(interp, res.texto), chk = M.ia.pode();
    var proximos = proximosLocais(busca);
    if (!busca.suficiente) busca = { resultados: [], cobertura: busca.cobertura, suficiente: false, vazio: busca.vazio, proximos: proximos };   // material fraco não vira "fonte" nem contexto
    prefixo = prefixo || '';
    if (res.usou && res.topico && !prefixo) prefixo = p('Continuando sobre <strong>' + esc(res.topico) + '</strong>.');
    if (!chk.ok) {
      if (chk.motivo === 'sem_consentimento') {
        pendente = { raw: raw, interp: interp, local: local };
        var base = semIA(raw, interp, local, busca, '', false);
        var pedido = consentMostrado ? '' : consentHTML(); consentMostrado = true;
        return Promise.resolve(R(base.html + pedido, CHIPS_CONSENT));
      }
      if (chk.motivo === 'intervalo' && chk.aguardarMs <= 3000) return sleep(chk.aguardarMs + 50).then(function () { return tratar(raw, interp, local, prefixo); });
      var aviso = chk.motivo === 'offline' ? p('Você está sem internet: respondo com o material local.') : (['pausado', 'teto_sessao', 'intervalo', 'cota_diaria'].indexOf(chk.motivo) >= 0 ? avisoFalha({ codigo: chk.motivo }) : '');
      return Promise.resolve(semIA(raw, interp, local, busca, aviso, false));
    }
    var k = chave(res, interp, busca), hit = cache.filter(function (c) { return c.k === k; })[0];
    if (hit) { M.contexto.registrar({ pergunta: raw, html: hit.texto, interp: interp, modo: 'conceitual' }); return Promise.resolve(R(prefixo + M.rag.formatarIA(hit.texto, busca), chipsPos(interp))); }
    return M.ia.enviar(M.rag.payload(interp, res, busca)).then(function (r) {
      cache.push({ k: k, texto: r.texto }); if (cache.length > 30) cache.shift();
      var abertura = primeiro && nomeHTML() ? p('Vamos lá, ' + nomeHTML() + '.') : ''; primeiro = false;
      M.contexto.registrar({ pergunta: raw, html: r.texto, interp: interp, modo: 'conceitual' });
      return R(prefixo + abertura + M.rag.formatarIA(r.texto, busca), chipsPos(interp));
    }, function (e) {
      if (e.codigo === 'cancelado') return R(p('Cancelado.'));
      var retentavel = ['offline', 'timeout', 'indisponivel', 'resposta_invalida', 'limite', 'pausado'].indexOf(e.codigo) >= 0;
      return semIA(raw, interp, local, busca, prefixo + avisoFalha(e), retentavel);
    });
  }

  // Frase com cara de pergunta de verdade (não "kkk", "ok?" nem só números): só estas vão à IA quando o local não entende.
  function perguntaAberta(raw) {
    var t = String(raw || '').trim();
    if (t.length < 8 || t.length > M.config.ia.maxPergunta) return false;
    var pal = M.busca.norm(t).split(/\s+/).filter(function (w) { return /[a-z]{2,}/.test(w); });
    return pal.length >= 3;
  }

  function interceptar(raw, local) {
    M.contexto.iniciar();
    var n = M.busca.norm(raw), cmd = comando(n, raw);
    if (cmd) return cmd.then ? cmd : Promise.resolve(cmd);
    var st = F()._state ? F()._state() : {};
    if (st.awaiting) return null;
    var lid = local && local.id, interp = M.interpretador.interpretar(raw);
    var conceitual = M.contexto.modo() === 'conceitual' && !!M.contexto.topico();
    var temEnt = interp.conceitos.length > 0 || interp.farmacos.length > 0, decide = false;
    var forced = !!(local && local.forcarIA);   // pedido de conteúdo vindo do catálogo da FarmacIA (ou o tema que o aluno deu em seguida): vai à IA se ela puder responder
    var regraPlain = lid === 'rule' && window.FarmaRegras && window.FarmaRegras.match(n);   // regra pedida com as próprias palavras (não por correção ortográfica)
    var bloqueio = bloqueioRisco(interp);
    if (bloqueio) { M.contexto.registrar({ pergunta: raw, html: '', interp: interp, modo: 'seguranca' }); return Promise.resolve(bloqueio); }   // risco classificado antes de qualquer roteamento; o turno fica só na memória (não vai ao provedor)
    var escl = (OVERR[lid] || lid === 'unknown' || ESC_SOC[lid]) && !forced ? esclarecimento(interp) : null;
    if (escl) return Promise.resolve(escl);
    var v3 = interp.v3, conteudoV3 = !!(v3 && !v3.seguranca && CONTEUDO_V3[v3.id] && v3.confianca >= 0.55 && v3.entidades.some(function (e) { return e.tipo !== 'quantidade' && e.tipo !== 'area'; }));   // pergunta de conteúdo com termo reconhecido e sem risco sinalizado
    var manter = (SOCIAL[lid] && !conteudoV3) || lid === 'glossary' || lid === 'contacts' || lid === 'offscope' || lid === 'ementa' || lid === 'fluxograma' || !!regraPlain;
    var academico = interp.academica || interp.codigoExplicito || (!!interp.disciplina && !temEnt && (!interp.pedagogica || interp.numeral));
    if (forced) { var pf = M.ia.pode(); decide = pf.ok || ['sem_consentimento', 'intervalo', 'pausado', 'teto_sessao'].indexOf(pf.motivo) >= 0; }
    else if (lid === 'topic') decide = true;
    else if (interp.seguimento && !conceitual) decide = false;   // "explica de novo" sem assunto anterior: o farmacia.js responde
    else if (!manter && !academico) {
      if (conteudoV3 && (lid === 'unknown' || SOCIAL[lid])) decide = true;   // o motor antigo não entendeu (ou respondeu como conversa): vai para material local / IA opcional
      else if (conceitual && interp.seguimento) decide = true;
      else if (temEnt && (interp.pedagogica || OVERR[lid]) && !(lid === 'info' && interp.numeral)) decide = true;
      else if (!temEnt && OVERR[lid] && interp.pedagogica) decide = true;
      else if (lid === 'unknown' && perguntaAberta(raw)) {
        // o motor local não entendeu: tenta a IA online, mas só se ela estiver disponível (senão o local responde do jeito dele)
        var pd0 = M.ia.pode();
        if (pd0.ok || pd0.motivo === 'sem_consentimento' || pd0.motivo === 'intervalo' || pd0.motivo === 'pausado' || pd0.motivo === 'teto_sessao') decide = true;
      }
    }
    if (!decide) { if (!SOCIAL[lid]) M.contexto.marcarLocal(); return null; }
    if (interp.ambiguidade && !interp.seguimento && !forced) {
      var a = interp.ambiguidade;
      return Promise.resolve(R(p(esc(a.pergunta)), a.opcoes.map(function (o) { return { label: o[0], q: o[1] }; })));
    }
    return tratar(raw, interp, local);
  }

  function reset() { M.contexto.reset(); M.ia.cancelar(); pendente = null; primeiro = true; consentMostrado = false; }
  M.orquestrador = { interceptar: interceptar, reset: reset, cancelar: function () { M.ia.cancelar(); }, _cache: function () { return cache; }, _limparCache: function () { cache = []; } };
})();

// =====================================================================
// Seção: renderizador
// =====================================================================
/* Renderização Markdown da FarmacIA: markdown-it -> DOMPurify -> HTML seguro.
   Depende de window.markdownit, window.DOMPurify e window.hljs (carregados antes). */
(function (root) {
  'use strict';

  var md = null;

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function highlight(code, lang) {
    try {
      if (root.hljs && lang && root.hljs.getLanguage(lang)) {
        return '<pre class="farma-md-pre"><code class="hljs language-' + escapeHtml(lang) + '">' +
          root.hljs.highlight(code, { language: lang, ignoreIllegals: true }).value + '</code></pre>';
      }
    } catch (_) { /* cai no texto simples */ }
    // idioma desconhecido (ex.: definicao, comparar, grafico, fluxo, formula) só vira classe; a camada visual troca pelo componente
    var cls = /^[a-z0-9_-]{1,20}$/i.test(lang || '') ? ' language-' + String(lang).toLowerCase() : '';
    return '<pre class="farma-md-pre"><code class="hljs' + cls + '">' + escapeHtml(code) + '</code></pre>';
  }

  function criarMd() {
    var inst = root.markdownit({
      html: false,        // HTML cru da IA nunca é interpretado
      linkify: true,
      breaks: true,
      typographer: false,
      highlight: highlight
    });
    inst.disable('image');   // imagens vindas da IA não são carregadas (evita requisição externa)
    // Tabelas rolam na horizontal sem estourar a tela
    inst.renderer.rules.table_open = function () { return '<div class="farma-md-table-wrap"><table>'; };
    inst.renderer.rules.table_close = function () { return '</table></div>'; };
    // Links externos seguros
    var padrao = inst.renderer.rules.link_open || function (t, i, o, e, s) { return s.renderToken(t, i, o); };
    inst.renderer.rules.link_open = function (tokens, idx, options, env, self) {
      tokens[idx].attrSet('target', '_blank');
      tokens[idx].attrSet('rel', 'noopener noreferrer');
      return padrao(tokens, idx, options, env, self);
    };
    return inst;
  }

  var CONFIG_PURIFY = {
    ALLOWED_TAGS: ['p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 's', 'del',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'span', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div'],
    ALLOWED_ATTR: ['href', 'title', 'class', 'target', 'rel', 'start', 'align'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false
  };

  function textoSimples(texto) {
    return '<p>' + escapeHtml(texto).replace(/\n/g, '<br>') + '</p>';
  }

  /** Retorna HTML já sanitizado, pronto para innerHTML. */
  function render(texto) {
    texto = texto == null ? '' : String(texto);
    if (!root.markdownit || !root.DOMPurify) return textoSimples(texto); // falha segura
    if (!md) md = criarMd();
    var html;
    texto = texto.replace(/^\$\$[ \t]*\n?([\s\S]*?)\n?[ \t]*\$\$[ \t]*$/gm, function (_, f) { return '\n```formula\n' + f.trim() + '\n```\n'; });
    try { html = md.render(texto); } catch (_) { return textoSimples(texto); }
    return root.DOMPurify.sanitize(html, CONFIG_PURIFY);
  }

  root.FarmaciaMarkdown = { render: render };
})(window);

// =====================================================================
// Seção: visual
// =====================================================================
/* FarmacIA — camada visual (window.FarmaVisual): preferências (tamanho e tema), menu de três pontinhos,
 * histórico de conversas e componentes de resposta (destaques, comparações, tabelas, gráficos, fórmulas,
 * fluxogramas, mapas e código). Sem bibliotecas novas: tudo é DOM nativo + SVG, montado com textContent
 * (o conteúdo recebido nunca vira HTML). Markdown continua passando por markdown-it + DOMPurify.
 *
 * Como uma resposta pede um componente: blocos de código com um destes "idiomas" são trocados por componentes
 *   ```definicao | conceito | atencao | alerta | observacao | dica | exemplo | resumo   (texto em Markdown)
 *   ```comparar   (JSON: { titulo, itens:[a,b], linhas:[{ campo, valores:[x,y], destaque }], obs })
 *   ```grafico    (JSON: { tipo:'barras'|'linhas'|'setores', titulo, unidade, eixoX, eixoY, rotulos:[], series:[{ nome, valores:[] }] })
 *   ```fluxo      (linhas "A -> B -> C"; "Rótulo :: detalhe" opcional)
 *   ```mapa       (primeira linha = tema central; "- item" com recuo de 2 espaços por nível)
 *   ```formula    (subconjunto de LaTeX: \frac, \sqrt, _, ^, \text, letras gregas) — ou linhas entre $$ ... $$
 * Sem dados suficientes ou com dados inválidos, o componente NÃO é desenhado: aparece um aviso em texto. */
(function (root) {
  'use strict';
  var doc = root.document;
  var M = root.FarmaMod = root.FarmaMod || {};
  var V = root.FarmaVisual = {};
  var PREFS_KEY = 'planejador_farma_prefs_v1', HIST_KEY = 'planejador_farma_hist_v1';

  function ler(k) { return M.armazenar ? M.armazenar.ler(k) : null; }
  function gravar(k, v) { return M.armazenar ? M.armazenar.gravar(k, v) : false; }

  // ---------- utilidades de DOM ----------
  var NS = 'http://www.w3.org/2000/svg';
  function h(tag, cls, txt) { var e = doc.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function sv(tag, attrs, parent) { var e = doc.createElementNS(NS, tag); for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function limitar(v, n) { v = v == null ? '' : String(v); return v.length > n ? v.slice(0, n - 1) + '…' : v; }
  function semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function lerJSON(t) { if (String(t).length > 24000) return null; try { var o = JSON.parse(t); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } }
  function numero(n) { return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 }); }

  // Ícones (traços fixos, escritos aqui; nenhum vem de conteúdo externo).
  var ICO = {
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
    check: '<path d="M20 6 9 17l-5-5"></path>',
    more: '<circle cx="5" cy="12" r="1.3"></circle><circle cx="12" cy="12" r="1.3"></circle><circle cx="19" cy="12" r="1.3"></circle>',
    size: '<path d="M4 7V4h16v3"></path><path d="M9 20h6"></path><path d="M12 4v16"></path>',
    theme: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.7 1.6-1.5 0-.4-.2-.8-.5-1.1a1.5 1.5 0 0 1 1.1-2.4H16a5 5 0 0 0 5-5c0-4.3-4-8-9-8z"></path><circle cx="7.5" cy="11" r="1"></circle><circle cx="11" cy="7" r="1"></circle><circle cx="16" cy="8" r="1"></circle>',
    hist: '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path><path d="M12 7v5l3 2"></path>',
    chev: '<path d="m9 18 6-6-6-6"></path>',
    back: '<path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>',
    star: '<path d="M12 3.6l2.55 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.2-4.1 5.8-.8z"></path>',
    trash: '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path>',
    search: '<circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path>',
    list: '<path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path>',
    chart: '<path d="M4 20V10"></path><path d="M10 20V4"></path><path d="M16 20v-7"></path><path d="M22 20H2"></path>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>',
    diamond: '<path d="M12 2l10 10-10 10L2 12z"></path>',
    warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
    stop: '<path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path>',
    info: '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>',
    bulb: '<path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"></path>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path><path d="M19 16v4"></path><path d="M17 18h4"></path>',
    flask: '<path d="M9 2h6"></path><path d="M10 2v6L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 8V2"></path>'
  };
  function ico(nome) {
    var s = h('span', 'fm-ico');
    s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICO[nome] || '') + '</svg>';
    return s;
  }

  // ---------- copiar (Clipboard API com alternativa) ----------
  function copiarTexto(txt) {
    return new Promise(function (ok, falha) {
      function alternativa() {
        try {
          var ta = h('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-200px;opacity:0';
          doc.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length);
          var r = doc.execCommand('copy'); ta.remove(); r ? ok() : falha();
        } catch (e) { falha(e); }
      }
      if (root.navigator && root.navigator.clipboard && root.isSecureContext) root.navigator.clipboard.writeText(txt).then(ok, alternativa);
      else alternativa();
    });
  }
  function avisoCopia(btn, deu) {
    var rot = btn.querySelector('.fm-btn-txt'), antes = btn.getAttribute('data-rot') || (rot ? rot.textContent : '');
    if (!btn.getAttribute('data-rot')) btn.setAttribute('data-rot', antes);
    btn.classList.toggle('is-done', !!deu); btn.classList.toggle('is-fail', !deu);
    if (rot) rot.textContent = deu ? 'Copiado' : 'Não copiou';
    var ic = btn.querySelector('.fm-ico'); if (ic && deu) { ic.replaceWith(ico('check')); }
    clearTimeout(btn._t);
    btn._t = setTimeout(function () {
      btn.classList.remove('is-done', 'is-fail'); if (rot) rot.textContent = antes;
      var c = btn.querySelector('.fm-ico'); if (c && deu) c.replaceWith(ico('copy'));
    }, 1600);
  }
  function botaoCopiar(obter, rotulo, aria) {
    var b = h('button', 'fm-btn fm-copy'); b.type = 'button'; b.setAttribute('data-fm-ui', '');
    b.setAttribute('aria-label', aria || rotulo); b.appendChild(ico('copy')); b.appendChild(h('span', 'fm-btn-txt', rotulo));
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var t = ''; try { t = obter(); } catch (x) { t = ''; }
      copiarTexto(t).then(function () { avisoCopia(b, true); }, function () { avisoCopia(b, false); });
    });
    return b;
  }
  V.copiarTexto = copiarTexto; V.avisoCopia = avisoCopia;

  // ---------- Markdown seguro (reaproveita markdown-it + DOMPurify já carregados) ----------
  function md(texto) {
    var r = root.FarmaciaMarkdown;
    return r ? r.render(texto) : '<p>' + String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</p>';
  }
  V.md = md;

  // ---------- destaques ----------
  var DESTAQUES = {
    definicao: { nome: 'Definição', ico: 'book' }, conceito: { nome: 'Conceito importante', ico: 'diamond' },
    atencao: { nome: 'Atenção', ico: 'warn' }, alerta: { nome: 'Alerta', ico: 'stop' }, observacao: { nome: 'Observação', ico: 'info' },
    dica: { nome: 'Dica', ico: 'bulb' }, exemplo: { nome: 'Exemplo', ico: 'flask' }, resumo: { nome: 'Resumo', ico: 'list' }
  };
  var APELIDOS = { definicao: 'definicao', conceito: 'conceito', 'conceito importante': 'conceito', atencao: 'atencao', alerta: 'alerta', cuidado: 'alerta',
    observacao: 'observacao', obs: 'observacao', nota: 'observacao', dica: 'dica', exemplo: 'exemplo', resumo: 'resumo' };
  function criarDestaque(tipo, corpoHTML) {
    var d = DESTAQUES[tipo]; if (!d) return null;
    var a = h('aside', 'fm-callout fm-c-' + tipo); a.setAttribute('role', 'note'); a.setAttribute('aria-label', d.nome);
    var cab = h('div', 'fm-callout-head'), g = h('span', 'fm-glyph'); g.appendChild(ico(d.ico));
    cab.appendChild(g); cab.appendChild(h('span', 'fm-callout-label', d.nome));
    var corpo = h('div', 'fm-callout-body farma-md'); corpo.innerHTML = corpoHTML;
    a.appendChild(cab); a.appendChild(corpo); return a;
  }

  // ---------- aviso quando o componente não pode ser montado ----------
  function aviso(txt, original) {
    var d = h('div', 'fm-nodata'); d.setAttribute('role', 'note');
    d.appendChild(h('strong', null, 'Não foi possível montar este elemento. ')); d.appendChild(doc.createTextNode(txt));
    if (original) { var pre = h('pre', 'fm-nodata-src', limitar(original, 600)); d.appendChild(pre); }
    return d;
  }

  // ---------- comparação farmacológica (estilo A: lado a lado; estilo C: completa) ----------
  function textoCelula(v) { return v == null ? '' : limitar(String(v).trim(), 500); }
  function normalizarComparacao(d) {
    if (!d || !Array.isArray(d.itens) || !Array.isArray(d.linhas)) return null;
    var itens = d.itens.map(function (x) { return limitar(String(x == null ? '' : x).trim(), 60); }).filter(Boolean).slice(0, 4);
    if (itens.length < 2) return null;
    var linhas = d.linhas.slice(0, 16).map(function (l) {
      if (!l || typeof l !== 'object' || !String(l.campo || '').trim() || !Array.isArray(l.valores)) return null;
      var v = []; for (var i = 0; i < itens.length; i++) v.push(textoCelula(l.valores[i]));
      return { campo: limitar(String(l.campo).trim(), 60), valores: v, destaque: l.destaque === true };
    }).filter(Boolean);
    if (!linhas.length) return null;
    return { titulo: limitar(d.titulo || '', 100), itens: itens, linhas: linhas, obs: limitar(d.obs || '', 600), estilo: d.estilo === 'A' || d.estilo === 'C' ? d.estilo : '' };
  }
  // A comparação simples e direta usa o estilo A; muita informação, textos longos ou mais de dois itens pedem o C.
  function escolherEstilo(c) {
    if (c.estilo) return c.estilo === 'A' && c.itens.length > 2 ? 'C' : c.estilo;
    var longo = c.linhas.some(function (l) { return l.valores.some(function (v) { return v.length > 110; }); });
    return c.itens.length > 2 || c.linhas.length > 6 || longo || c.obs ? 'C' : 'A';
  }
  function celula(txt) { var c = h('div', 'fm-cmp-cell'); if (txt) c.textContent = txt; else c.appendChild(h('span', 'fm-ausente', 'Não encontrado na base')); return c; }
  function comparacaoParaTexto(c) {
    var l = [['']. concat(c.itens).join('\t')]; c.linhas.forEach(function (x) { l.push([x.campo].concat(x.valores.map(function (v) { return v || 'Não encontrado'; })).join('\t')); });
    return (c.titulo ? c.titulo + '\n' : '') + l.join('\n') + (c.obs ? '\n' + c.obs : '');
  }
  function montarComparacao(dados) {
    var c = normalizarComparacao(dados); if (!c) return aviso('A comparação precisa de pelo menos dois itens e uma linha com valores.');
    var estilo = escolherEstilo(c), n = c.itens.length;
    var fig = h('figure', 'fm-cmp fm-cmp-' + estilo.toLowerCase()); fig.style.setProperty('--n', n);
    if (c.titulo) fig.appendChild(h('figcaption', 'fm-cmp-title', c.titulo));
    var cab = h('div', 'fm-cmp-head');
    c.itens.forEach(function (it, i) { cab.appendChild(h('div', 'fm-cmp-name fm-i' + i, it)); });
    if (estilo === 'A') {
      fig.appendChild(cab); if (n === 2) cab.appendChild(h('span', 'fm-cmp-vs', 'vs'));
      c.linhas.forEach(function (l) {
        var r = h('div', 'fm-cmp-row' + (l.destaque ? ' is-key' : ''));
        r.appendChild(h('div', 'fm-cmp-field', l.campo));
        var cs = h('div', 'fm-cmp-cells'); l.valores.forEach(function (v) { cs.appendChild(celula(v)); }); r.appendChild(cs); fig.appendChild(r);
      });
    } else {
      var leg = h('div', 'fm-cmp-legend'); c.itens.forEach(function (it, i) { leg.appendChild(h('span', 'fm-cmp-chip fm-i' + i, it)); }); fig.appendChild(leg);
      c.linhas.forEach(function (l) {
        var s = h('section', 'fm-cmp-block' + (l.destaque ? ' is-key' : ''));
        var t = h('h4', 'fm-cmp-field', l.campo); if (l.destaque) t.appendChild(h('span', 'fm-tag', 'diferença-chave')); s.appendChild(t);
        var g = h('div', 'fm-cmp-entries');
        l.valores.forEach(function (v, i) { var e = h('div', 'fm-cmp-entry'); e.appendChild(h('span', 'fm-cmp-chip fm-i' + i, c.itens[i])); e.appendChild(celula(v)); g.appendChild(e); });
        s.appendChild(g); fig.appendChild(s);
      });
    }
    if (c.obs) { var o = criarDestaque('observacao', md(c.obs)); if (o) fig.appendChild(o); }
    var ferr = h('div', 'fm-tools'); ferr.setAttribute('data-fm-ui', '');
    ferr.appendChild(botaoCopiar(function () { return comparacaoParaTexto(c); }, 'Copiar comparação', 'Copiar comparação como tabela')); fig.appendChild(ferr);
    return fig;
  }

  // ---------- tabelas: Markdown vira tabela com cópia; tabelas grandes ganham busca, ordenação e "mostrar mais" ----------
  function tabelaParaTexto(tb) {
    return Array.prototype.map.call(tb.querySelectorAll('tr'), function (tr) {
      return Array.prototype.map.call(tr.children, function (c) { return c.textContent.replace(/\s+/g, ' ').trim(); }).join('\t');
    }).join('\n');
  }
  function valorOrdem(t) { var s = t.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'); return /^-?\d+(\.\d+)?%?$/.test(s) ? parseFloat(s) : null; }
  var PAG = 20;
  function melhorarTabela(wrap) {
    var tb = wrap.querySelector('table'); if (!tb || wrap.parentNode.classList.contains('fm-table')) return;
    var cx = h('div', 'fm-table'); wrap.parentNode.insertBefore(cx, wrap); cx.appendChild(wrap);
    var tbody = tb.tBodies[0], linhas = tbody ? Array.prototype.slice.call(tbody.rows) : [];
    var ferr = h('div', 'fm-tools'); ferr.setAttribute('data-fm-ui', '');
    var grande = linhas.length > 8, estado = { col: -1, dir: 1, q: '', mostrar: PAG };
    var live = h('span', 'fm-sr'); live.setAttribute('aria-live', 'polite');
    var mais = h('button', 'fm-btn fm-more'); mais.type = 'button'; mais.setAttribute('data-fm-ui', ''); mais.hidden = true;
    function desenhar() {
      var vis = linhas.filter(function (r) { return !estado.q || semAcento(r.textContent).indexOf(estado.q) >= 0; });
      if (estado.col >= 0) {
        vis.sort(function (a, b) {
          var x = a.cells[estado.col] ? a.cells[estado.col].textContent.trim() : '', y = b.cells[estado.col] ? b.cells[estado.col].textContent.trim() : '';
          var nx = valorOrdem(x), ny = valorOrdem(y);
          return (nx != null && ny != null ? nx - ny : x.localeCompare(y, 'pt-BR', { numeric: true })) * estado.dir;
        });
      }
      while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
      vis.slice(0, estado.mostrar).forEach(function (r) { tbody.appendChild(r); });
      var resto = vis.length - estado.mostrar; mais.hidden = resto <= 0;
      if (resto > 0) mais.textContent = 'Mostrar mais (' + resto + ')';
      live.textContent = vis.length + (vis.length === 1 ? ' linha' : ' linhas');
    }
    if (grande) {
      cx.classList.add('is-big');
      var caixa = h('label', 'fm-search'); caixa.appendChild(ico('search'));
      var inp = h('input'); inp.type = 'search'; inp.placeholder = 'Filtrar'; inp.setAttribute('aria-label', 'Filtrar linhas da tabela'); inp.setAttribute('data-fm-ui', '');
      inp.addEventListener('input', function () { estado.q = semAcento(inp.value.trim()); estado.mostrar = PAG; desenhar(); });
      caixa.appendChild(inp); ferr.appendChild(caixa);
      Array.prototype.forEach.call(tb.tHead ? tb.tHead.rows[0].cells : [], function (th, i) {
        var b = h('button', 'fm-sort'); b.type = 'button'; b.setAttribute('data-fm-ui', '');
        while (th.firstChild) b.appendChild(th.firstChild); th.appendChild(b); th.setAttribute('aria-sort', 'none');
        b.addEventListener('click', function () {
          estado.dir = estado.col === i ? -estado.dir : 1; estado.col = i;
          Array.prototype.forEach.call(th.parentNode.cells, function (x) { x.setAttribute('aria-sort', 'none'); });
          th.setAttribute('aria-sort', estado.dir === 1 ? 'ascending' : 'descending'); desenhar();
        });
      });
      mais.addEventListener('click', function () { estado.mostrar += PAG; desenhar(); });
      cx.appendChild(mais); desenhar();
    }
    ferr.appendChild(botaoCopiar(function () {
      var cab = tb.tHead ? Array.prototype.map.call(tb.tHead.rows[0].cells, function (c) { return c.textContent.replace(/\s+/g, ' ').trim(); }).join('\t') + '\n' : '';
      return cab + linhas.map(function (r) { return Array.prototype.map.call(r.cells, function (c) { return c.textContent.replace(/\s+/g, ' ').trim(); }).join('\t'); }).join('\n'); /* todas as linhas, não só as visíveis */
    }, 'Copiar tabela', 'Copiar tabela (colunas separadas por tabulação)'));
    cx.appendChild(ferr); cx.appendChild(live);
  }

  // ---------- gráficos (SVG próprio; só desenha com dados reais e consistentes) ----------
  function validarGrafico(d) {
    if (!d || ['barras', 'linhas', 'setores'].indexOf(d.tipo) < 0) return { erro: 'o tipo do gráfico deve ser barras, linhas ou setores.' };
    if (!Array.isArray(d.rotulos) || !Array.isArray(d.series) || !d.series.length) return { erro: 'faltam rótulos ou séries de dados.' };
    var rot = d.rotulos.map(function (r) { return limitar(String(r), 40); });
    if (rot.length < (d.tipo === 'setores' ? 2 : 2) || rot.length > 200) return { erro: 'a quantidade de pontos está fora do limite (2 a 200).' };
    var series = d.series.slice(0, 6).map(function (s, i) {
      if (!s || !Array.isArray(s.valores) || s.valores.length !== rot.length) return null;
      var v = s.valores.map(function (x) { return typeof x === 'number' && isFinite(x) ? x : NaN; });
      if (v.some(function (x) { return isNaN(x); })) return null;
      return { nome: limitar(s.nome || ('Série ' + (i + 1)), 40), valores: v };
    });
    if (series.some(function (s) { return !s; })) return { erro: 'os valores devem ser números e ter o mesmo tamanho dos rótulos.' };
    if (d.tipo === 'setores') {
      if (rot.length > 10 || series.length !== 1 || series[0].valores.some(function (x) { return x < 0; }) || !series[0].valores.some(function (x) { return x > 0; })) return { erro: 'o gráfico de setores precisa de uma série com até 10 valores positivos.' };
    }
    if (d.tipo === 'barras' && rot.length > 40) return { erro: 'barras aceitam até 40 categorias; use linhas para séries longas.' };
    return { ok: { tipo: d.tipo, titulo: limitar(d.titulo || '', 100), unidade: limitar(d.unidade || '', 16), eixoX: limitar(d.eixoX || '', 40), eixoY: limitar(d.eixoY || '', 40), rotulos: rot, series: series } };
  }
  function passoBonito(bruto) { var e = Math.pow(10, Math.floor(Math.log10(bruto))), f = bruto / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
  function leituraTexto(g, i) {
    return g.rotulos[i] + ' — ' + g.series.map(function (s) { return (g.series.length > 1 ? s.nome + ': ' : '') + numero(s.valores[i]) + (g.unidade ? ' ' + g.unidade : ''); }).join(' · ');
  }
  function tabelaDoGrafico(g) {
    var t = h('table'), cab = t.createTHead().insertRow();
    cab.appendChild(h('th', null, g.eixoX || 'Item'));
    g.series.forEach(function (s) { cab.appendChild(h('th', null, s.nome + (g.unidade ? ' (' + g.unidade + ')' : ''))); });
    var b = t.createTBody();
    g.rotulos.forEach(function (r, i) { var tr = b.insertRow(); tr.appendChild(h('td', null, r)); g.series.forEach(function (s) { tr.appendChild(h('td', null, numero(s.valores[i]))); }); });
    var w = h('div', 'farma-md-table-wrap'); w.appendChild(t); return w;
  }
  function desenharEixos(g, svg, L, R, T, B, W, H) {
    var todos = []; g.series.forEach(function (s) { todos = todos.concat(s.valores); });
    var mn = Math.min.apply(null, todos.concat([0])), mx = Math.max.apply(null, todos.concat([0]));
    if (mx === mn) mx = mn + 1;
    var passo = passoBonito((mx - mn) / 4), y0 = Math.floor(mn / passo) * passo, y1 = Math.ceil(mx / passo) * passo;
    function Y(v) { return T + (H - T - B) * (1 - (v - y0) / (y1 - y0)); }
    for (var v = y0; v <= y1 + passo / 2; v += passo) {
      var y = Y(v);
      sv('line', { x1: L, x2: W - R, y1: y, y2: y, class: Math.abs(v) < 1e-9 ? 'fm-ax0' : 'fm-grid' }, svg);
      sv('text', { x: L - 6, y: y + 3.5, class: 'fm-tick', 'text-anchor': 'end' }, svg).textContent = numero(Math.round(v * 1000) / 1000);
    }
    if (g.eixoY || g.unidade) { var ty = sv('text', { class: 'fm-axt', transform: 'translate(11 ' + ((T + H - B) / 2) + ') rotate(-90)', 'text-anchor': 'middle' }, svg); ty.textContent = limitar((g.eixoY || 'Valor') + (g.unidade ? ' (' + g.unidade + ')' : ''), 34); }
    if (g.eixoX) sv('text', { class: 'fm-axt', x: (L + W - R) / 2, y: H - 4, 'text-anchor': 'middle' }, svg).textContent = limitar(g.eixoX, 44);
    return { Y: Y, y0: y0 };
  }
  function montarGraficoXY(g, svg, leitura, destacar) {
    var W = 360, H = 232, L = 46, R = 12, T = 12, B = g.eixoX ? 50 : 38, n = g.rotulos.length, ns = g.series.length;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var eixo = desenharEixos(g, svg, L, R, T, B, W, H), Y = eixo.Y, banda = (W - L - R) / n, passoRot = Math.ceil(n / Math.max(2, Math.floor((W - L - R) / 46)));
    function X(i) { return L + banda * (i + 0.5); }
    for (var i = 0; i < n; i += passoRot) {
      var t = sv('text', { x: X(i), y: H - B + 15, class: 'fm-tick', 'text-anchor': 'middle' }, svg); t.textContent = limitar(g.rotulos[i], banda * passoRot > 60 ? 12 : 7);
    }
    var guia = sv('line', { class: 'fm-guide', y1: T, y2: H - B, x1: -9, x2: -9 }, svg);
    var rotulosValor = n * ns <= 10;
    if (g.tipo === 'barras') {
      var larg = Math.min(26, (banda * 0.74) / ns);
      g.series.forEach(function (s, k) {
        s.valores.forEach(function (v, i) {
          var x = X(i) - (larg * ns) / 2 + larg * k, y = Y(v), y0 = Y(0), top = Math.min(y, y0), alt = Math.max(1, Math.abs(y0 - y));
          sv('rect', { x: x + 0.5, y: top, width: Math.max(1, larg - 1.5), height: alt, rx: 2, class: 'fm-bar fm-s' + k }, svg);
          if (rotulosValor) sv('text', { x: x + larg / 2, y: v >= 0 ? top - 4 : top + alt + 11, class: 'fm-val', 'text-anchor': 'middle' }, svg).textContent = numero(v);
        });
      });
    } else {
      g.series.forEach(function (s, k) {
        var pts = s.valores.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ');
        sv('polyline', { points: pts, class: 'fm-line fm-s' + k }, svg);
        if (n <= 30) s.valores.forEach(function (v, i) { sv('circle', { cx: X(i), cy: Y(v), r: 3, class: 'fm-dot fm-s' + k }, svg); });
        if (rotulosValor && ns === 1) s.valores.forEach(function (v, i) { sv('text', { x: X(i), y: Y(v) - 8, class: 'fm-val', 'text-anchor': 'middle' }, svg).textContent = numero(v); });
      });
    }
    var atual = -1;
    function ir(i) {
      i = Math.max(0, Math.min(n - 1, i)); atual = i; guia.setAttribute('x1', X(i)); guia.setAttribute('x2', X(i)); leitura(leituraTexto(g, i)); destacar && destacar(i);
    }
    function pos(e) { var r = svg.getBoundingClientRect(); return Math.floor(((e.clientX - r.left) / r.width * W - L) / banda); }
    svg.addEventListener('pointerdown', function (e) { ir(pos(e)); });
    svg.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') ir(pos(e)); });
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); ir(atual + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); ir(atual < 0 ? 0 : atual - 1); }
      else if (e.key === 'Home') { e.preventDefault(); ir(0); } else if (e.key === 'End') { e.preventDefault(); ir(n - 1); }
    });
  }
  function arco(cx, cy, r0, r1, a0, a1) {
    var c = Math.cos, s = Math.sin, g = a1 - a0 > Math.PI ? 1 : 0;
    return 'M' + (cx + r1 * c(a0)) + ' ' + (cy + r1 * s(a0)) + 'A' + r1 + ' ' + r1 + ' 0 ' + g + ' 1 ' + (cx + r1 * c(a1)) + ' ' + (cy + r1 * s(a1)) +
      'L' + (cx + r0 * c(a1)) + ' ' + (cy + r0 * s(a1)) + 'A' + r0 + ' ' + r0 + ' 0 ' + g + ' 0 ' + (cx + r0 * c(a0)) + ' ' + (cy + r0 * s(a0)) + 'Z';
  }
  function montarSetores(g, svg, leitura) {
    var W = 360, H = 190, cx = 180, cy = 95, r1 = 82, r0 = 50, vals = g.series[0].valores, tot = vals.reduce(function (a, b) { return a + b; }, 0), a = -Math.PI / 2, fatias = [];
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    vals.forEach(function (v, i) {
      if (v <= 0) return;
      var fim = a + (v / tot) * Math.PI * 2, pct = v / tot * 100;
      var p = sv('path', { d: v === tot ? arco(cx, cy, r0, r1, a, a + Math.PI * 2 - 0.0001) : arco(cx, cy, r0, r1, a, fim), class: 'fm-slice fm-s' + (i % 6), tabindex: '0', role: 'img', 'aria-label': g.rotulos[i] + ': ' + numero(v) + (g.unidade ? ' ' + g.unidade : '') + ' (' + numero(pct) + '%)' }, svg);
      var txt = g.rotulos[i] + ' — ' + numero(v) + (g.unidade ? ' ' + g.unidade : '') + ' (' + numero(pct) + '%)';
      function marcar() { fatias.forEach(function (f) { f.classList.remove('is-on'); }); p.classList.add('is-on'); leitura(txt); }
      p.addEventListener('click', marcar); p.addEventListener('focus', marcar); p.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') marcar(); });
      fatias.push(p); a = fim;
    });
    sv('text', { x: cx, y: cy - 2, class: 'fm-val', 'text-anchor': 'middle' }, svg).textContent = numero(tot) + (g.unidade ? ' ' + g.unidade : '');
    sv('text', { x: cx, y: cy + 13, class: 'fm-tick', 'text-anchor': 'middle' }, svg).textContent = 'total';
  }
  function montarGrafico(dados) {
    var v = validarGrafico(dados); if (!v.ok) return aviso('Sem dados suficientes para o gráfico: ' + v.erro + ' Para não inventar números, ele não foi desenhado.');
    var g = v.ok, fig = h('figure', 'fm-chart');
    if (g.titulo) fig.appendChild(h('figcaption', 'fm-chart-title', g.titulo));
    var area = h('div', 'fm-chart-area'), svg = sv('svg', { class: 'fm-svg', role: 'img', 'aria-label': (g.titulo || 'Gráfico') + '. Use as setas do teclado para ler cada valor.', focusable: 'true' }), alt = h('div', 'fm-chart-alt'), leit = h('p', 'fm-readout', 'Toque no gráfico para ver os valores.');
    leit.setAttribute('aria-live', 'polite');
    function ler(t) { leit.textContent = t; }
    if (g.tipo === 'setores') montarSetores(g, svg, ler); else montarGraficoXY(g, svg, ler);
    area.appendChild(svg); fig.appendChild(area);
    if (g.series.length > 1 || g.tipo === 'setores') {
      var lg = h('ul', 'fm-legend');
      (g.tipo === 'setores' ? g.rotulos : g.series.map(function (s) { return s.nome; })).forEach(function (n, i) { var li = h('li'); li.appendChild(h('i', 'fm-sw fm-s' + (i % 6))); li.appendChild(doc.createTextNode(n)); lg.appendChild(li); });
      fig.appendChild(lg);
    }
    fig.appendChild(leit);
    alt.hidden = true; alt.appendChild(tabelaDoGrafico(g)); fig.appendChild(alt);
    var ferr = h('div', 'fm-tools'); ferr.setAttribute('data-fm-ui', '');
    var tg = h('button', 'fm-btn'); tg.type = 'button'; tg.setAttribute('aria-pressed', 'false'); tg.appendChild(ico('list')); tg.appendChild(h('span', 'fm-btn-txt', 'Ver como tabela'));
    tg.addEventListener('click', function () {
      var tabela = alt.hidden; alt.hidden = !tabela; area.hidden = tabela; leit.hidden = tabela; tg.setAttribute('aria-pressed', String(tabela));
      tg.querySelector('.fm-btn-txt').textContent = tabela ? 'Ver gráfico' : 'Ver como tabela'; tg.querySelector('.fm-ico').replaceWith(ico(tabela ? 'chart' : 'list'));
    });
    ferr.appendChild(tg); ferr.appendChild(botaoCopiar(function () { return tabelaParaTexto(alt.querySelector('table')); }, 'Copiar dados', 'Copiar os dados do gráfico')); fig.appendChild(ferr);
    return fig;
  }

  // ---------- fluxogramas e mapas conceituais (HTML/CSS nativos, responsivos) ----------
  function parteNo(t) { var p = String(t).split('::'); return { nome: limitar(p[0].trim(), 70), detalhe: limitar((p[1] || '').trim(), 140) }; }
  function montarFluxo(texto) {
    var nos = {}, ordem = [], arestas = [];
    function no(t) { var x = parteNo(t); if (!x.nome) return null; var k = semAcento(x.nome); if (!nos[k]) { nos[k] = { k: k, nome: x.nome, detalhe: x.detalhe, sai: [], entra: 0 }; ordem.push(nos[k]); } else if (x.detalhe && !nos[k].detalhe) nos[k].detalhe = x.detalhe; return nos[k]; }
    String(texto).split('\n').slice(0, 60).forEach(function (linha) {
      var ps = linha.split(/\s*(?:->|→)\s*/).filter(function (p) { return p.trim(); });
      for (var i = 0; i < ps.length; i++) { var a = no(ps[i]); if (i && a) { var b = no(ps[i - 1]); if (b && a !== b && b.sai.indexOf(a) < 0) { b.sai.push(a); a.entra++; arestas.push([b, a]); } } }
    });
    if (ordem.length < 3 || arestas.length < 2 || ordem.length > 24 || arestas.length > 40) return aviso('um fluxograma precisa de pelo menos 3 etapas ligadas (até 24). Sem essa estrutura, ele não foi desenhado.');
    var linear = ordem.every(function (n) { return n.sai.length <= 1 && n.entra <= 1; }) && ordem.filter(function (n) { return n.entra === 0; }).length === 1;
    var fig = h('figure', 'fm-flowwrap'), lista = h('ol', 'fm-flow');
    if (linear) {
      var n0 = ordem.filter(function (n) { return n.entra === 0; })[0], seq = [], vis = {};
      while (n0 && !vis[n0.k]) { vis[n0.k] = 1; seq.push(n0); n0 = n0.sai[0]; }
      seq.forEach(function (n, i) { var li = h('li', 'fm-step'); li.appendChild(h('span', 'fm-step-n', String(i + 1))); var c = h('div', 'fm-step-c'); c.appendChild(h('strong', null, n.nome)); if (n.detalhe) c.appendChild(h('small', null, n.detalhe)); li.appendChild(c); lista.appendChild(li); });
      fig.appendChild(lista);
    } else {
      var nivel = {}, fila = ordem.filter(function (n) { return n.entra === 0; }); if (!fila.length) fila = [ordem[0]];
      fila.forEach(function (n) { nivel[n.k] = 0; });
      for (var q = 0; q < fila.length; q++) { fila[q].sai.forEach(function (m) { if (nivel[m.k] == null) { nivel[m.k] = nivel[fila[q].k] + 1; fila.push(m); } }); }
      var niveis = []; ordem.forEach(function (n) { var l = nivel[n.k] == null ? 0 : nivel[n.k]; (niveis[l] = niveis[l] || []).push(n); });
      niveis.forEach(function (ns, l) {
        if (!ns) return; var li = h('li', 'fm-lv'); if (l) li.appendChild(h('span', 'fm-arrow', '↓'));
        var linha = h('div', 'fm-lv-row'); ns.forEach(function (n) { var c = h('div', 'fm-node'); c.appendChild(h('strong', null, n.nome)); if (n.detalhe) c.appendChild(h('small', null, n.detalhe)); linha.appendChild(c); }); li.appendChild(linha); lista.appendChild(li);
      });
      fig.appendChild(lista);
      var alt = h('ul', 'fm-sr'); arestas.forEach(function (a) { alt.appendChild(h('li', null, a[0].nome + ' leva a ' + a[1].nome)); }); fig.appendChild(alt);
    }
    return fig;
  }
  function montarMapa(texto) {
    var linhas = String(texto).replace(/\t/g, '  ').split('\n').filter(function (l) { return l.trim(); }).slice(0, 60);
    if (linhas.length < 3) return aviso('um mapa conceitual precisa de um tema central e pelo menos dois itens.');
    var raiz = parteNo(linhas[0].replace(/^[-*•]\s*/, '')), pilha = [{ nivel: -1, ul: null }], tree = h('ul', 'fm-tree'), cnt = 0, prof = 0;
    pilha[0].ul = tree;
    linhas.slice(1).forEach(function (l) {
      var m = /^(\s*)(?:[-*•]\s+)?(.*)$/.exec(l), nivel = Math.min(3, Math.floor(m[1].length / 2)), x = parteNo(m[2]); if (!x.nome) return;
      while (pilha.length > 1 && pilha[pilha.length - 1].nivel >= nivel) pilha.pop();
      var topo = pilha[pilha.length - 1], ul = topo.ul;
      if (topo.li && !topo.ul) { topo.ul = h('ul'); topo.li.appendChild(topo.ul); ul = topo.ul; }
      var li = h('li'), c = h('div', 'fm-mnode'); c.appendChild(h('strong', null, x.nome)); if (x.detalhe) c.appendChild(h('small', null, x.detalhe)); li.appendChild(c); ul.appendChild(li);
      pilha.push({ nivel: nivel, li: li, ul: null }); cnt++; prof = Math.max(prof, nivel);
    });
    if (cnt < 2) return aviso('um mapa conceitual precisa de pelo menos dois itens ligados ao tema.');
    var fig = h('figure', 'fm-map'), r = h('div', 'fm-mroot'); r.appendChild(h('strong', null, raiz.nome)); if (raiz.detalhe) r.appendChild(h('small', null, raiz.detalhe));
    fig.appendChild(r); fig.appendChild(tree); return fig;
  }

  // ---------- fórmulas (subconjunto de LaTeX, convertido em DOM; nada é executado) ----------
  var SIMB = { cdot: '·', times: '×', div: '÷', pm: '±', approx: '≈', neq: '≠', leq: '≤', geq: '≥', le: '≤', ge: '≥', to: '→', rightarrow: '→', leftarrow: '←', infty: '∞', Delta: 'Δ', delta: 'δ', alpha: 'α', beta: 'β', gamma: 'γ', lambda: 'λ', mu: 'μ', tau: 'τ', pi: 'π', sigma: 'σ', theta: 'θ', epsilon: 'ε', kappa: 'κ', rho: 'ρ', phi: 'φ', omega: 'ω', Omega: 'Ω', Sigma: 'Σ', partial: '∂', cdots: '⋯', ldots: '…' };
  var FUNC = { ln: 1, log: 1, exp: 1, min: 1, max: 1, lim: 1, sin: 1, cos: 1, tan: 1 };
  function tex(src) {
    var i = 0, prof = 0;
    function esp() { while (src[i] === ' ' || src[i] === '\n') i++; }
    function seq(fim) { var f = doc.createDocumentFragment(); while (i < src.length && src[i] !== fim) { var a = atomo(); if (a) f.appendChild(a); } return f; }
    function grupo() { if (++prof > 12) { i = src.length; prof--; return doc.createDocumentFragment(); } var f = seq('}'); if (src[i] === '}') i++; prof--; return f; }
    function arg() { esp(); if (src[i] === '{') { i++; return grupo(); } var f = doc.createDocumentFragment(), a = base(); if (a) f.appendChild(a); return f; }
    function atomo() {
      var b = base(); if (!b) return null; esp();
      var sub = null, sup = null;
      while (src[i] === '_' || src[i] === '^') { var c = src[i++], g = arg(); if (c === '_') sub = g; else sup = g; esp(); }
      if (!sub && !sup) return b;
      var w = h('span', 'fm-sc'); w.appendChild(b);
      if (sub && sup) { var ss = h('span', 'fm-ss'), u = h('sup'), d = h('sub'); u.appendChild(sup); d.appendChild(sub); ss.appendChild(u); ss.appendChild(d); w.appendChild(ss); }
      else if (sup) { var u2 = h('sup'); u2.appendChild(sup); w.appendChild(u2); } else { var d2 = h('sub'); d2.appendChild(sub); w.appendChild(d2); }
      return w;
    }
    function base() {
      var c = src[i]; if (c === undefined) return null;
      if (c === ' ' || c === '\n') { i++; return null; }
      if (c === '{') { i++; var s = h('span', 'fm-g'); s.appendChild(grupo()); return s; }
      if (c === '}') { i++; return null; }
      if (c === '\\') {
        i++; var m = /^[A-Za-z]+/.exec(src.slice(i)), cmd;
        if (m) { cmd = m[0]; i += cmd.length; } else { cmd = src[i] || ''; i++; }
        if (cmd === 'frac' || cmd === 'dfrac') { var n = arg(), d = arg(), f = h('span', 'fm-frac'), nu = h('span', 'fm-num'), de = h('span', 'fm-den'); nu.appendChild(n); de.appendChild(d); f.appendChild(nu); f.appendChild(de); return f; }
        if (cmd === 'sqrt') { var r = h('span', 'fm-sqrt'), rr = h('span', 'fm-rad', '√'), ri = h('span', 'fm-radi'); ri.appendChild(arg()); r.appendChild(rr); r.appendChild(ri); return r; }
        if (cmd === 'text' || cmd === 'mathrm' || cmd === 'textbf') { esp(); var t = ''; if (src[i] === '{') { i++; while (i < src.length && src[i] !== '}') t += src[i++]; i++; } return h('span', 'fm-tx', t); }
        if (cmd === 'left' || cmd === 'right') return null;
        if (cmd === ',' || cmd === ';' || cmd === ':' || cmd === ' ') return h('span', 'fm-thin');
        if (cmd === '%') return h('span', null, '%');
        if (cmd === 'quad' || cmd === 'qquad') return h('span', 'fm-quad');
        if (FUNC[cmd]) return h('span', 'fm-fn', cmd);
        if (SIMB[cmd]) return h('span', 'fm-sy', SIMB[cmd]);
        return h('span', 'fm-tx', cmd);
      }
      var mn = /^[0-9]+(?:[.,][0-9]+)?/.exec(src.slice(i)); if (mn) { i += mn[0].length; return h('span', 'fm-n', mn[0]); }
      i++;
      if (/[A-Za-zÀ-ÿ½]/.test(c)) return h('span', 'fm-var', c);
      if (c === '=' || c === '+' || c === '<' || c === '>') return h('span', 'fm-op', c);
      if (c === '-') return h('span', 'fm-op', '−');
      if (c === '*') return h('span', 'fm-op', '×');
      return h('span', 'fm-p', c);
    }
    var raiz = h('span', 'fm-math'); raiz.appendChild(seq()); return raiz;
  }
  function montarFormula(src) {
    src = String(src).trim();
    if (!src) return aviso('a fórmula está vazia.');
    if (src.length > 500) return aviso('a fórmula é longa demais para ser exibida com segurança.');
    var fig = h('figure', 'fm-formula'), corpo = h('div', 'fm-formula-body');
    corpo.setAttribute('role', 'math'); corpo.setAttribute('aria-label', src.replace(/\\(?:frac|dfrac)/g, ' fração ').replace(/[\\{}]/g, ' ').replace(/\s+/g, ' ').trim());
    corpo.tabIndex = 0; corpo.appendChild(tex(src)); fig.appendChild(corpo);
    var ferr = h('div', 'fm-tools'); ferr.setAttribute('data-fm-ui', ''); ferr.appendChild(botaoCopiar(function () { return src; }, 'Copiar fórmula', 'Copiar fórmula em LaTeX')); fig.appendChild(ferr);
    return fig;
  }

  // ---------- código ----------
  function montarCodigo(pre, lang) {
    if (pre.parentNode.classList.contains('fm-code')) return;
    var cx = h('div', 'fm-code'); pre.parentNode.insertBefore(cx, pre);
    var barra = h('div', 'fm-code-bar'); barra.appendChild(h('span', 'fm-code-lang', lang && lang !== 'hljs' ? lang : 'código'));
    var ferr = h('span', 'fm-tools'); ferr.setAttribute('data-fm-ui', ''); ferr.appendChild(botaoCopiar(function () { return pre.textContent.replace(/\n$/, ''); }, 'Copiar', 'Copiar código')); barra.appendChild(ferr);
    cx.appendChild(barra); cx.appendChild(pre);
  }

  // ---------- escolhe o componente certo para cada trecho já sanitizado ----------
  var PREFIXO = /^(defini[cç][aã]o|conceito importante|conceito|aten[cç][aã]o|alerta|cuidado|observa[cç][aã]o|obs\.?|nota|dica|exemplo|resumo)\s*:?\s*$/i;
  function destaquePorPrefixo(el) {
    if (el.closest('.fm-callout')) return;
    var primeiro = el.tagName === 'BLOCKQUOTE' ? el.querySelector('p') : el, forte = primeiro && primeiro.firstElementChild;
    if (!forte || forte.tagName !== 'STRONG' || primeiro.firstChild !== forte) return;
    var rot = forte.textContent.trim(), tipo = APELIDOS[semAcento(rot.replace(/[:.]+$/, '')).trim()];
    if (!tipo || !PREFIXO.test(rot)) return;
    forte.remove(); while (primeiro.firstChild && primeiro.firstChild.nodeType === 3 && !primeiro.firstChild.textContent.trim()) primeiro.removeChild(primeiro.firstChild);
    if (primeiro.firstChild && primeiro.firstChild.nodeType === 3) primeiro.firstChild.textContent = primeiro.firstChild.textContent.replace(/^\s*[:.\-–—]\s*/, '');
    var cx = criarDestaque(tipo, ''); if (!cx) return;
    var corpo = cx.querySelector('.fm-callout-body'); while (el.firstChild) corpo.appendChild(el.firstChild);
    if (el.tagName === 'BLOCKQUOTE') { var p0 = corpo.querySelector('p'); if (p0 && !p0.textContent.trim()) p0.remove(); }
    el.replaceWith(cx);
  }
  function aprimorar(raizEl) {
    if (!raizEl || raizEl.getAttribute('data-fm-ok')) return; raizEl.setAttribute('data-fm-ok', '1');
    Array.prototype.slice.call(raizEl.querySelectorAll('pre > code')).forEach(function (code) {
      var pre = code.parentNode, m = /language-([a-z0-9_-]+)/.exec(code.className), lang = m ? m[1] : '', txt = code.textContent.replace(/\n$/, ''), novo = null;
      if (DESTAQUES[lang]) novo = criarDestaque(lang, md(txt));
      else if (APELIDOS[lang] && DESTAQUES[APELIDOS[lang]]) novo = criarDestaque(APELIDOS[lang], md(txt));
      else if (lang === 'comparar') { var d = lerJSON(txt); novo = d ? montarComparacao(d) : aviso('os dados da comparação não estão em um formato válido.'); }
      else if (lang === 'grafico') { var g = lerJSON(txt); novo = g ? montarGrafico(g) : aviso('os dados do gráfico não estão em um formato válido.'); }
      else if (lang === 'fluxo' || lang === 'fluxograma') novo = montarFluxo(txt);
      else if (lang === 'mapa') novo = montarMapa(txt);
      else if (lang === 'formula') novo = montarFormula(txt);
      if (novo) pre.replaceWith(novo); else montarCodigo(pre, lang);
    });
    Array.prototype.slice.call(raizEl.querySelectorAll('.farma-md > p, .farma-md > blockquote')).forEach(destaquePorPrefixo);
    Array.prototype.slice.call(raizEl.querySelectorAll('.farma-md-table-wrap')).filter(function (w) { return !w.closest('.fm-chart'); }).forEach(melhorarTabela);
  }
  V.aprimorar = aprimorar;
  V.montar = { comparacao: montarComparacao, grafico: montarGrafico, fluxo: montarFluxo, mapa: montarMapa, formula: montarFormula };

  // Texto de uma resposta para copiar (sem botões nem textos só para leitor de tela).
  V.textoDaResposta = function (el) {
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('[data-fm-ui], .fm-sr, .fm-chart-alt, .fm-readout, .fm-ico'), function (x) { x.remove(); });
    c.style.cssText = 'position:fixed;left:-9999px;top:0;width:600px'; doc.body.appendChild(c);
    var t = c.innerText.replace(/\n{3,}/g, '\n\n').trim(); c.remove(); return t;
  };

  // ---------- preferências: tamanho do conteúdo e tema ----------
  var TAMANHOS = [
    // Os ids ficam como estão (já gravados no aparelho de quem usa e usados no CSS); só os nomes mudam.
    { id: 'compacto', nome: 'Pequeno' },
    { id: 'padrao', nome: 'Padrão' },
    { id: 'ampliado', nome: 'Grande' }
  ];
  // Temas disponíveis. Só entram aqui os que já estão prontos no CSS ([data-farma-theme="..."]).
  // Para criar o azul ou o vermelho: definir as variáveis --fm-* no CSS e acrescentar uma linha aqui;
  // o menu passa a mostrar a escolha sozinho.
  var TEMAS = [{ id: 'verde', nome: 'Verde', cor: '#2e7d4f' }];
  var prefs = { tamanho: 'padrao', tema: 'verde' };
  (function () {
    var j = lerJSON(ler(PREFS_KEY) || ''); if (!j) return;
    if (TAMANHOS.some(function (t) { return t.id === j.tamanho; })) prefs.tamanho = j.tamanho;
    if (TEMAS.some(function (t) { return t.id === j.tema; })) prefs.tema = j.tema;
  })();
  function pagina() { return doc.getElementById('modal-farmacia'); }
  function aplicarPrefs() {
    var p = pagina(); if (!p) return;
    p.setAttribute('data-farma-size', prefs.tamanho); p.setAttribute('data-farma-theme', prefs.tema);
  }
  function salvarPrefs() { gravar(PREFS_KEY, JSON.stringify(prefs)); }
  function nomeDe(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i].nome; return ''; }

  // ---------- histórico de conversas (localStorage, funciona offline) ----------
  var MAX_CONV = 40, MAX_MSG = 80, MAX_HTML = 24000, MAX_FAV = 30;
  var conversas = (function () { var t = ler(HIST_KEY); try { var a = JSON.parse(t || '[]'); return Array.isArray(a) ? a.filter(function (c) { return c && typeof c.id === 'string' && Array.isArray(c.msgs); }) : []; } catch (e) { return []; } })();
  var atual = null;
  function salvarHist() {
    var tentativa = conversas.slice(), ok = false;
    while (!ok) { ok = gravar(HIST_KEY, JSON.stringify(tentativa)); if (!ok) { if (tentativa.length <= 1) break; tentativa.pop(); } }
    if (tentativa.length !== conversas.length) conversas = tentativa;
  }
  function ordenadas() { return conversas.slice().sort(function (a, b) { return b.atualizado - a.atualizado; }); }
  // no histórico: favoritas primeiro (cada grupo da mais recente para a mais antiga)
  function ordenadasHist() { return conversas.slice().sort(function (a, b) { return (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || b.atualizado - a.atualizado; }); }
  function garantirConversa(primeiroTexto) {
    if (atual) return atual;
    var agora = Date.now();
    atual = { id: 'c' + agora.toString(36) + Math.random().toString(36).slice(2, 6), criado: agora, atualizado: agora, titulo: limitar(String(primeiroTexto).replace(/\s+/g, ' ').trim(), 56), msgs: [], chips: [] };
    conversas.push(atual);
    // ao passar do limite, saem as mais antigas; as favoritas (estrela) e a conversa em andamento ficam
    if (conversas.length > MAX_CONV) {
      var fixas = conversas.filter(function (c) { return c.fav || c === atual; });
      var resto = ordenadas().filter(function (c) { return !c.fav && c !== atual; }).slice(0, Math.max(0, MAX_CONV - fixas.length));
      conversas = fixas.concat(resto);
    }
    return atual;
  }
  V.novaConversa = function () { atual = null; };
  V.registrarUsuario = function (texto, extra) {
    var c = garantirConversa(texto), m = { r: 'u', t: limitar(extra && extra.semTexto ? '' : texto, 2000) };
    if (extra && extra.imgs && extra.imgs.length) m.i = extra.imgs.slice(0, 10);   // ids das imagens na Biblioteca
    if (extra && extra.midia) m.md = 1;
    c.msgs.push(m); c.chips = [];
    // respostas de apresentação ("Prefiro não dizer", "Ele"...) não servem de título: usa a primeira pergunta de verdade
    var banal = /^(prefiro n[aã]o dizer|pular|ele|ela|neutro|sim|n[aã]o)$/i;
    if (banal.test(c.titulo) && !banal.test(String(texto).trim()) && c.msgs.length > 1) c.titulo = limitar(String(texto).replace(/\s+/g, ' ').trim(), 56);
    if (c.msgs.length > MAX_MSG) c.msgs.splice(0, c.msgs.length - MAX_MSG);
    c.atualizado = Date.now(); salvarHist();
  };
  V.conversaAtualId = function () { return atual ? atual.id : ''; };
  // quantas mensagens da conversa atual trouxeram imagem (a que acabou de ser registrada inclusive)
  V.contarMidias = function () { return atual ? atual.msgs.filter(function (m) { return m.r === 'u' && m.md; }).length : 0; };
  V.fecharMenu = function () { fecharMenu(false); };
  V.registrarResposta = function (html, chips) {
    if (!atual) return;
    var m = { r: 'b' }, h0 = String(html || '');
    if (h0.length <= MAX_HTML) m.h = h0; else { var t = doc.createElement('div'); t.innerHTML = root.DOMPurify ? root.DOMPurify.sanitize(h0) : ''; m.t = limitar(t.textContent, 4000); }
    atual.msgs.push(m); atual.chips = (chips || []).slice(0, 7).map(function (x) { return { label: String(x.label || ''), q: x.q ? String(x.q) : undefined, go: x.go ? String(x.go) : undefined }; });
    atual.atualizado = Date.now(); salvarHist();
  };
  var PURIFY_RESTAURAR = {
    ALLOWED_TAGS: ['p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'small', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'span', 'a', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'button', 'img', 'svg', 'path', 'rect', 'circle', 'line', 'polyline', 'g', 'text', 'figure', 'figcaption', 'aside', 'section'],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel', 'title', 'type', 'aria-label', 'role', 'start', 'src', 'alt', 'viewbox', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'x', 'y', 'width', 'height', 'rx', 'cx', 'cy', 'r', 'x1', 'x2', 'y1', 'y2', 'points', 'aria-hidden', 'focusable'],
    ALLOW_DATA_ATTR: true, ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  };
  // HTML guardado volta ao DOM só depois de passar pelo DOMPurify; sem ele, vira texto simples.
  V.htmlSeguro = function (html) {
    if (root.DOMPurify) return root.DOMPurify.sanitize(String(html), PURIFY_RESTAURAR);
    var t = doc.createElement('div'); t.textContent = String(html).replace(/<[^>]*>/g, ' '); return '<p>' + t.innerHTML + '</p>';
  };
  V.historico = {
    listar: ordenadas,
    obter: function (id) { for (var i = 0; i < conversas.length; i++) if (conversas[i].id === id) return conversas[i]; return null; },
    excluir: function (id) { conversas = conversas.filter(function (c) { return c.id !== id; }); if (atual && atual.id === id) atual = null; salvarHist(); },
    continuar: function (id) { var c = V.historico.obter(id); if (c) atual = c; return c; },
    // estrela: marca/desmarca; devolve o novo estado, ou null se bateu no limite de favoritas
    favoritar: function (id) {
      var c = V.historico.obter(id); if (!c) return false;
      if (!c.fav && conversas.filter(function (x) { return x.fav; }).length >= MAX_FAV) return null;
      c.fav = !c.fav; salvarHist(); return !!c.fav;
    },
    totalFavoritas: function () { return conversas.filter(function (x) { return x.fav; }).length; },
    // apaga tudo (favoritas incluídas) e também a conversa que estava em andamento
    limpar: function () {
      conversas = []; atual = null; M.armazenar.apagar(HIST_KEY);
      // Sem histórico não há biblioteca: as imagens guardadas neste aparelho são apagadas junto.
      try { if (root.FarmaMenu && root.FarmaMenu.Midia && root.FarmaMenu.Midia.limparTudo) root.FarmaMenu.Midia.limparTudo(); } catch (e) { /* a biblioteca fica como estava */ }
    }
  };
  function rotuloData(ts) {
    var d = new Date(ts), hoje = new Date(), ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    var hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === hoje.toDateString()) return 'Hoje, ' + hm;
    if (d.toDateString() === ontem.toDateString()) return 'Ontem, ' + hm;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: d.getFullYear() === hoje.getFullYear() ? undefined : 'numeric' }).replace('.', '');
  }
  function previaDe(c) {
    for (var i = c.msgs.length - 1; i >= 0; i--) {
      var m = c.msgs[i]; if (m.r !== 'b') continue;
      var t = m.t || (function () { var d = doc.createElement('div'); d.innerHTML = root.DOMPurify ? root.DOMPurify.sanitize(m.h || '') : ''; Array.prototype.forEach.call(d.querySelectorAll('h1,h2,h3,h4,.farma-source,.farma-note,.fm-callout-head'), function (x) { x.remove(); }); return d.textContent; })();
      t = String(t).replace(/\s+/g, ' ').trim(); if (t) return limitar(t, 110);
    }
    return '';
  }

  // ---------- menu de três pontinhos, tamanho com prévia e histórico ----------
  // Textos da interface nesta parte passam por I18N (inglês/espanhol); as respostas da FarmacIA continuam em português.
  function tx(s, p) { return window.I18N ? window.I18N.t(s, p) : String(s).replace(/\{(\w+)\}/g, function (m, k) { return p && k in p ? p[k] : m; }); }
  function previaMd() {
    return [
      '## ' + tx('Meia-vida'), '',
      tx('A **meia-vida** indica quanto tempo o organismo leva para reduzir a concentração do fármaco à metade.'), '',
      '- ' + tx('Quanto maior, mais lenta a eliminação'), '- ' + tx('Ajuda a definir o intervalo entre doses'), '',
      '```definicao', tx('Tempo para a concentração plasmática cair pela metade.'), '```', '',
      '| ' + tx('Parâmetro') + ' | ' + tx('Símbolo') + ' |', '|---|---|', '| ' + tx('Meia-vida') + ' | t½ |', '| ' + tx('Depuração') + ' | CL |', '',
      '```', 't½ = 0,693 × Vd / CL', '```'
    ].join('\n');
  }
  // O menu mora num painel lateral (esquerda): o botão ☰ do cabeçalho abre; o X, o fundo, Esc ou um deslize para a esquerda fecham.
  var menu = null, btnMenu = null, vista = 'raiz', drawer = null, drawerPanel = null, drawerTimer = 0;
  function mostrarPainel(abrir) {
    if (!drawer) return;
    var raiz = doc.documentElement;
    window.clearTimeout(drawerTimer);
    if (abrir) {
      drawer.hidden = false; void drawer.offsetWidth;   // força o layout para a transição de entrada rodar
      drawer.classList.add('is-open'); raiz.classList.add('farma-drawer-open');
    } else {
      drawer.classList.remove('is-open'); raiz.classList.remove('farma-drawer-open');
      drawerTimer = window.setTimeout(function () { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, 300);
    }
  }
  function fecharMenu(devolverFoco) {
    if (!menu || menu.hidden) return; menu.hidden = true; btnMenu.setAttribute('aria-expanded', 'false'); vista = 'raiz';
    mostrarPainel(false);
    if (devolverFoco) btnMenu.focus();
  }
  function linhaMenu(icone, nome, desc, valor, aoClicar) {
    var el = h(aoClicar ? 'button' : 'div', 'fm-row' + (aoClicar ? '' : ' is-static'));
    if (aoClicar) { el.type = 'button'; el.setAttribute('role', 'menuitem'); el.addEventListener('click', aoClicar); }
    var ic = h('span', 'fm-row-ico'); ic.appendChild(ico(icone)); el.appendChild(ic);
    var tx = h('span', 'fm-row-txt'); tx.appendChild(h('strong', null, nome)); if (desc) tx.appendChild(h('small', null, desc)); el.appendChild(tx);
    var vl = h('span', 'fm-row-val'); if (typeof valor === 'object' && valor) vl.appendChild(valor); else vl.textContent = valor; if (aoClicar) vl.appendChild(ico('chev')); el.appendChild(vl);
    return el;
  }
  function focarPrimeiro() { var f = menu.querySelector('button:not([disabled])'); if (f) f.focus({ preventScroll: true }); }
  function desenharMenu(foco) {
    while (menu.firstChild) menu.removeChild(menu.firstChild);
    menu.classList.toggle('is-home', vista === 'home');
    if (vista === 'home') {
      menu.setAttribute('aria-label', tx('Menu da FarmacIA'));
      window.FarmaMenu.home(menu, { fechar: function () { fecharMenu(false); }, abrirConversa: function (id) { var conv = V.historico.continuar(id); fecharMenu(false); if (conv && V.aoContinuar) V.aoContinuar(conv); }, nova: function () { fecharMenu(false); var r = doc.getElementById('farma-reset'); if (r) r.click(); } });
    } else if (vista === 'raiz') {
      menu.setAttribute('aria-label', tx('Configurações da FarmacIA'));
      if (window.FarmaMenu) {
        var capTopo = h('div', 'fm-sub-head'), capVolta = h('button', 'fm-back'); capVolta.type = 'button'; capVolta.setAttribute('aria-label', tx('Voltar ao menu')); capVolta.appendChild(ico('back'));
        capVolta.addEventListener('click', function () { vista = 'home'; desenharMenu(true); }); capTopo.appendChild(capVolta); capTopo.appendChild(h('strong', null, tx('Configurações'))); menu.appendChild(capTopo);
      } else { var cap = h('div', 'fm-menu-cap', 'Opções da FarmacIA'); cap.setAttribute('role', 'presentation'); menu.appendChild(cap); }
      var tema = TEMAS.filter(function (t) { return t.id === prefs.tema; })[0] || TEMAS[0], sw = h('span', 'fm-row-sw'); sw.appendChild(h('i', 'fm-swatch')); sw.firstChild.style.background = tema.cor; sw.appendChild(doc.createTextNode(tema.nome));
      menu.appendChild(linhaMenu('size', 'Tamanho da fonte', null, nomeDe(TAMANHOS, prefs.tamanho), function () { vista = 'tamanho'; desenharMenu(true); }));
      menu.appendChild(linhaMenu('theme', 'Tema', null, sw, TEMAS.length > 1 ? function () { vista = 'tema'; desenharMenu(true); } : null));
      var ia = window.FarmaMod && FarmaMod.ia, iaPode = ia && ia.pode();
      var iaValor = !ia || (iaPode && iaPode.motivo === 'desabilitado') ? 'Indisponível' : ia.esgotada() ? 'Esgotada hoje' : ia.ativada() ? 'Ativada' : 'Desativada';
      menu.appendChild(linhaMenu('spark', 'IA online', null, iaValor, iaValor === 'Indisponível' ? null : function () { vista = 'ia'; desenharMenu(true); }));
      var sep = h('div', 'fm-sep'); sep.setAttribute('role', 'separator'); menu.appendChild(sep);
      menu.appendChild(linhaMenu('hist', 'Histórico', null, conversas.length ? String(conversas.length) : '', function () { fecharMenu(false); abrirHistorico(); }));
    } else if (vista === 'ia') {
      desenharIA();
    } else {
      var lista = vista === 'tamanho' ? TAMANHOS : TEMAS, atualId = vista === 'tamanho' ? prefs.tamanho : prefs.tema;
      menu.setAttribute('aria-label', tx(vista === 'tamanho' ? 'Tamanho da fonte' : 'Tema'));
      var topo = h('div', 'fm-sub-head'), voltar = h('button', 'fm-back'); voltar.type = 'button'; voltar.setAttribute('aria-label', tx('Voltar ao menu')); voltar.appendChild(ico('back'));
      voltar.addEventListener('click', function () { vista = 'raiz'; desenharMenu(true); }); topo.appendChild(voltar); topo.appendChild(h('strong', null, tx(vista === 'tamanho' ? 'Tamanho da fonte' : 'Tema'))); menu.appendChild(topo);
      var grupo = h('div', 'fm-opts'); grupo.setAttribute('role', 'radiogroup'); grupo.setAttribute('aria-label', tx(vista === 'tamanho' ? 'Tamanho da fonte' : 'Tema')); if (vista === 'tamanho') grupo.className += ' fm-opts-size';
      var previa = null;
      lista.forEach(function (o) {
        var b = h('button', 'fm-opt' + (o.id === atualId ? ' is-on' : '')); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(o.id === atualId)); b.tabIndex = o.id === atualId ? 0 : -1; b.setAttribute('data-id', o.id);
        if (vista === 'tamanho') { var aa = h('span', 'fm-opt-aa', 'Aa'); aa.setAttribute('aria-hidden', 'true'); aa.setAttribute('data-sz', o.id); b.appendChild(aa); }
        b.appendChild(h('span', 'fm-opt-n', o.nome)); if (o.desc) b.appendChild(h('small', null, o.desc));
        b.addEventListener('click', function () {
          if (vista === 'tamanho') prefs.tamanho = o.id; else prefs.tema = o.id;
          salvarPrefs(); aplicarPrefs();
          Array.prototype.forEach.call(grupo.children, function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; });
          if (previa) previa.setAttribute('data-farma-size', prefs.tamanho);
          var v = drawer && drawer.querySelector('.fm-live'); if (v) v.textContent = tx(vista === 'tamanho' ? 'Tamanho {o}' : 'Tema {o}', { o: o.nome.toLowerCase() });
        });
        b.addEventListener('keydown', function (e) {
          var ix = Array.prototype.indexOf.call(grupo.children, b), d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
          if (d) { e.preventDefault(); var n = grupo.children[(ix + d + grupo.children.length) % grupo.children.length]; n.focus(); n.click(); }
        });
        grupo.appendChild(b);
      });
      menu.appendChild(grupo);
      if (vista === 'tamanho') {
        var rot = h('div', 'fm-preview-label', 'Prévia'); menu.appendChild(rot);
        previa = h('div', 'fm-preview farma-bubble'); previa.setAttribute('data-farma-size', prefs.tamanho); previa.setAttribute('data-farma-theme', prefs.tema); previa.setAttribute('aria-hidden', 'true'); if ('inert' in previa) previa.inert = true;
        var corpo = h('div', 'farma-md'); corpo.innerHTML = md(previaMd()); previa.appendChild(corpo); menu.appendChild(previa); aprimorar(previa);
      }
    }
    if (foco) focarPrimeiro();
  }
  function desenharIA() {
    var ia = FarmaMod.ia, on = ia.ativada(), fim = ia.esgotada();
    menu.setAttribute('aria-label', tx('IA online'));
    var topo = h('div', 'fm-sub-head'), voltar = h('button', 'fm-back'); voltar.type = 'button'; voltar.setAttribute('aria-label', tx('Voltar ao menu')); voltar.appendChild(ico('back'));
    voltar.addEventListener('click', function () { vista = 'raiz'; desenharMenu(true); }); topo.appendChild(voltar); topo.appendChild(h('strong', null, 'IA online')); menu.appendChild(topo);
    var box = h('div', 'fm-ia');
    box.appendChild(h('p', 'fm-ia-lead', 'A FarmacIA responde primeiro com o material local, sem enviar nada. Só quando não entende a pergunta, e se você permitir, ela consulta uma IA online.'));
    var estado = h('p', 'fm-ia-state' + (fim ? ' is-out' : on ? ' is-on' : ''));
    estado.appendChild(h('i', 'fm-ia-dot')); estado.appendChild(doc.createTextNode(fim ? 'A cota gratuita de hoje acabou. Volta amanhã; até lá, tudo é respondido no aparelho.' : on ? 'Ativada neste aparelho.' : 'Desativada: nada sai do seu aparelho.'));
    box.appendChild(estado);
    var lista = h('ul', 'fm-ia-list');
    ['Enviado: a sua pergunta, as últimas mensagens (resumidas), trechos do material usado e o seu período e turno, se estiverem no perfil.',
     'Nunca enviado: nome, pronome, foto, notas, matérias marcadas e e-mail.',
     'Grade e regras da UFRJ são sempre respondidas no aparelho.'].forEach(function (t) { lista.appendChild(h('li', null, t)); });
    box.appendChild(lista);
    var btn = h('button', 'fm-ia-btn' + (on ? ' is-off' : '')); btn.type = 'button'; btn.textContent = on ? 'Desativar IA online' : 'Ativar IA online';
    btn.addEventListener('click', function () { if (on) ia.desativar(); else ia.ativar(); desenharIA(); var v = drawer && drawer.querySelector('.fm-live'); if (v) v.textContent = ia.ativada() ? 'IA online ativada' : 'IA online desativada'; var f = menu.querySelector('.fm-ia-btn'); if (f) f.focus(); });
    box.appendChild(btn);
    while (menu.children.length > 1) menu.removeChild(menu.lastChild);   // mantém o cabeçalho, refaz o corpo
    menu.appendChild(box);
  }
  function abrirMenu() {
    if (!menu) return; vista = window.FarmaMenu ? 'home' : 'raiz'; desenharMenu(false); menu.hidden = false; btnMenu.setAttribute('aria-expanded', 'true'); mostrarPainel(true); focarPrimeiro();
  }

  var hist = null, histLista = null, histBusca = null, histLive = null, histSoFav = false, histFavBtn = null, histLimparBtn = null, histLimparTimer = 0;
  function renderHistorico() {
    var q = semAcento(histBusca.value.trim()), todas = ordenadasHist(), itens = todas.filter(function (c) {
      if (histSoFav && !c.fav) return false;
      if (!q) return true;
      return semAcento(c.titulo + ' ' + c.msgs.filter(function (m) { return m.r === 'u'; }).map(function (m) { return m.t; }).join(' ')).indexOf(q) >= 0;
    });
    while (histLista.firstChild) histLista.removeChild(histLista.firstChild);
    if (!itens.length) {
      var v = h('li', 'fm-h-empty'), soFavVazio = histSoFav && !q && todas.length;
      v.appendChild(h('strong', null, soFavVazio ? 'Nenhuma favorita ainda' : todas.length ? 'Nada encontrado' : 'Nenhuma conversa ainda'));
      v.appendChild(h('span', null, soFavVazio ? 'Toque na estrela de uma conversa para fixá-la aqui.' : todas.length ? 'Tente outras palavras do título ou das suas perguntas.' : 'Depois da sua primeira pergunta, a conversa fica guardada aqui, só neste aparelho.')); histLista.appendChild(v); atualizarFerramentasHist(); return;
    }
    itens.forEach(function (c) {
      var li = h('li', 'fm-h-li'), abrir = h('button', 'fm-h-item'); abrir.type = 'button'; li.setAttribute('data-id', c.id);
      abrir.appendChild(h('span', 'fm-h-title', c.titulo || 'Conversa'));
      abrir.appendChild(h('span', 'fm-h-date', rotuloData(c.atualizado)));
      var pv = previaDe(c); if (pv) abrir.appendChild(h('span', 'fm-h-prev', pv));
      abrir.addEventListener('click', function () { var conv = V.historico.continuar(c.id); fecharHistorico(false); if (conv && V.aoContinuar) V.aoContinuar(conv); });
      var fav = h('button', 'fm-h-fav' + (c.fav ? ' is-fav' : '')); fav.type = 'button'; fav.setAttribute('aria-pressed', c.fav ? 'true' : 'false');
      fav.setAttribute('aria-label', tx(c.fav ? 'Tirar dos favoritos: {t}' : 'Favoritar: {t}', { t: c.titulo || tx('sem título') })); fav.appendChild(ico('star'));
      fav.addEventListener('click', function () {
        var r = V.historico.favoritar(c.id);
        if (r === null) { histLive.textContent = tx('Limite de {n} favoritas. Tire a estrela de alguma para marcar outra.', { n: MAX_FAV }); return; }
        histLive.textContent = r ? 'Conversa favoritada.' : 'Conversa removida dos favoritos.'; renderHistorico();
      });
      var del = h('button', 'fm-h-del'); del.type = 'button'; del.setAttribute('aria-label', tx('Excluir conversa: {t}', { t: c.titulo || tx('sem título') })); del.appendChild(ico('trash'));
      del.addEventListener('click', function () {
        if (del.getAttribute('data-sure')) { V.historico.excluir(c.id); histLive.textContent = 'Conversa excluída.'; renderHistorico(); return; }
        del.setAttribute('data-sure', '1'); del.classList.add('is-sure'); del.setAttribute('aria-label', tx('Confirmar exclusão')); del.textContent = 'Excluir?';
        setTimeout(function () { if (del.isConnected) { del.removeAttribute('data-sure'); del.classList.remove('is-sure'); del.textContent = ''; del.appendChild(ico('trash')); del.setAttribute('aria-label', tx('Excluir conversa: {t}', { t: c.titulo || tx('sem título') })); } }, 3200);
      });
      li.appendChild(abrir); li.appendChild(fav); li.appendChild(del); histLista.appendChild(li);
    });
    // toque longo seleciona conversas (várias de uma vez); o próprio módulo reaplica as bolinhas a cada novo desenho da lista
    if (root.Selecao && !histLista._selecao) root.Selecao.anexar({
      container: histLista, item: '.fm-h-li', id: function (el) { return el.getAttribute('data-id'); }, padding: '.fm-h-item',
      aoExcluir: function (ids) { ids.forEach(function (i) { V.historico.excluir(i); }); histLive.textContent = ids.length === 1 ? 'Conversa excluída.' : 'Conversas excluídas.'; renderHistorico(); }
    });
    atualizarFerramentasHist();
  }
  function atualizarFerramentasHist() {
    if (!histFavBtn) return;
    var total = conversas.length, nf = V.historico.totalFavoritas();
    histFavBtn.setAttribute('aria-pressed', histSoFav ? 'true' : 'false'); histFavBtn.classList.toggle('is-on', histSoFav);
    histFavBtn.disabled = !nf && !histSoFav;
    histLimparBtn.disabled = !total;
    if (!histLimparBtn.getAttribute('data-sure')) histLimparBtn.querySelector('.fm-h-clear-txt').textContent = 'Apagar tudo';
  }
  function desarmarLimpar() {
    clearTimeout(histLimparTimer);
    if (histLimparBtn) { histLimparBtn.removeAttribute('data-sure'); histLimparBtn.classList.remove('is-sure'); histLimparBtn.setAttribute('aria-label', tx('Apagar todo o histórico')); }
  }
  function abrirHistorico() {
    var tela = doc.querySelector('#modal-farmacia .farma-screen'); if (!tela) return;
    if (!hist) {
      hist = h('section', 'fm-hist'); hist.setAttribute('role', 'dialog'); hist.setAttribute('aria-modal', 'true'); hist.setAttribute('aria-label', tx('Histórico de conversas')); hist.hidden = true;
      var topo = h('div', 'fm-hist-head'), vb = h('button', 'fm-back'); vb.type = 'button'; vb.setAttribute('aria-label', tx('Fechar histórico')); vb.appendChild(ico('back')); vb.addEventListener('click', function () { fecharHistorico(true); });
      topo.appendChild(vb); topo.appendChild(h('h3', null, 'Histórico')); hist.appendChild(topo);
      var cx = h('label', 'fm-search fm-hist-search'); cx.appendChild(ico('search')); histBusca = h('input'); histBusca.type = 'search'; histBusca.placeholder = tx('Buscar nas conversas'); histBusca.setAttribute('aria-label', tx('Buscar nas conversas'));
      histBusca.addEventListener('input', renderHistorico); cx.appendChild(histBusca); hist.appendChild(cx);
      var tools = h('div', 'fm-h-tools');
      histFavBtn = h('button', 'fm-h-filter'); histFavBtn.type = 'button'; histFavBtn.appendChild(ico('star')); histFavBtn.appendChild(h('span', null, 'Favoritas'));
      histFavBtn.addEventListener('click', function () { histSoFav = !histSoFav; renderHistorico(); });
      histLimparBtn = h('button', 'fm-h-clear'); histLimparBtn.type = 'button'; histLimparBtn.setAttribute('aria-label', tx('Apagar todo o histórico')); histLimparBtn.appendChild(ico('trash')); histLimparBtn.appendChild(h('span', 'fm-h-clear-txt', 'Apagar tudo'));
      histLimparBtn.addEventListener('click', function () {
        if (histLimparBtn.getAttribute('data-sure')) { desarmarLimpar(); V.historico.limpar(); histSoFav = false; histLive.textContent = 'Todo o histórico foi apagado.'; renderHistorico(); return; }
        histLimparBtn.setAttribute('data-sure', '1'); histLimparBtn.classList.add('is-sure'); histLimparBtn.setAttribute('aria-label', tx('Confirmar: apagar todas as conversas, inclusive as favoritas'));
        histLimparBtn.querySelector('.fm-h-clear-txt').textContent = tx(conversas.length === 1 ? 'Apagar {n} conversa?' : 'Apagar {n} conversas?', { n: conversas.length });
        histLive.textContent = 'Toque de novo para apagar todas as conversas, inclusive as favoritas.';
        histLimparTimer = setTimeout(function () { desarmarLimpar(); atualizarFerramentasHist(); }, 4000);
      });
      tools.appendChild(histFavBtn); tools.appendChild(histLimparBtn); hist.appendChild(tools);
      histLista = h('ul', 'fm-h-list'); hist.appendChild(histLista); histLive = h('span', 'fm-sr'); histLive.setAttribute('aria-live', 'polite'); hist.appendChild(histLive);
      tela.appendChild(hist);
    }
    histBusca.value = ''; histSoFav = false; desarmarLimpar(); renderHistorico(); hist.hidden = false; histBusca.focus();
  }
  function fecharHistorico(foco) { if (hist && !hist.hidden) { hist.hidden = true; if (foco && btnMenu) btnMenu.focus(); } }
  V.abrirHistorico = abrirHistorico;

  function iniciar() {
    aplicarPrefs();
    btnMenu = doc.getElementById('farma-menu-btn');
    drawer = doc.getElementById('farma-drawer'); drawerPanel = doc.getElementById('farma-drawer-panel'); var corpo = doc.getElementById('farma-drawer-body');
    if (!btnMenu || !drawer || !drawerPanel || !corpo) return;
    menu = h('div', 'fm-menu'); menu.id = 'farma-menu'; menu.setAttribute('role', 'menu'); menu.hidden = true; corpo.appendChild(menu);
    var live = h('span', 'fm-sr fm-live'); live.setAttribute('aria-live', 'polite'); drawer.appendChild(live);
    btnMenu.addEventListener('click', function (e) { e.stopPropagation(); if (menu.hidden) abrirMenu(); else fecharMenu(true); });
    var fechar = doc.getElementById('farma-drawer-x'); if (fechar) fechar.addEventListener('click', function () { fecharMenu(true); });
    var cfg = doc.getElementById('farma-drawer-cfg'); if (cfg) cfg.addEventListener('click', function () { vista = 'raiz'; desenharMenu(true); });
    // composedPath() é calculado no disparo do clique: continua valendo mesmo quando o item tocado já foi redesenhado (troca de subtela).
    doc.addEventListener('click', function (e) {
      if (menu.hidden) return;
      var rota = e.composedPath ? e.composedPath() : [];
      if (rota.indexOf(drawerPanel) < 0 && rota.indexOf(btnMenu) < 0 && !rota.some(function (n) { return n.classList && (n.classList.contains('fmn-tela') || n.classList.contains('fmn-vis')); })) fecharMenu(false);
    });
    // Deslizar o painel para a esquerda fecha (abrir é pelo botão ☰).
    var gx = null, gy = null;
    drawerPanel.addEventListener('touchstart', function (e) { var t = e.touches[0]; gx = t.clientX; gy = t.clientY; }, { passive: true });
    drawerPanel.addEventListener('touchend', function (e) {
      if (gx === null) return; var t = e.changedTouches[0], dx = t.clientX - gx, dy = t.clientY - gy; gx = null;
      if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) fecharMenu(false);
    }, { passive: true });
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (hist && !hist.hidden) { e.preventDefault(); fecharHistorico(true); } else if (!menu.hidden) { e.preventDefault(); fecharMenu(true); }
    });
    // Sair da aba fecha o que estiver aberto.
    doc.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#bottom-nav')) { fecharMenu(false); fecharHistorico(false); } }, true);
  }

  // Conteúdo estruturado de itens do glossário. Só reorganiza o que o próprio texto do glossário já diz
  // (nenhum dado novo): comparação, etapas e as fórmulas citadas no texto. "so" = substitui o parágrafo.
  function bloco(tipo, corpo) { return '```' + tipo + '\n' + corpo + '\n```\n\n'; }
  var ADME = 'Absorção :: Do local de administração (por exemplo, o trato gastrointestinal) ao sangue -> Distribuição :: O sangue leva o fármaco aos tecidos; parte se liga a proteínas do plasma -> Metabolismo :: Transformação, principalmente no fígado, em metabólitos ativos ou inativos -> Excreção :: Saída do fármaco e dos metabólitos, principalmente pelos rins (urina), pela bile e pelas fezes';
  V.extras = {
    'glossario:pk-vs-pd': { so: true, md:
      bloco('comparar', JSON.stringify({ itens: ['Farmacocinética', 'Farmacodinâmica'], linhas: [
        { campo: 'O que descreve', valores: ['O que o corpo faz com o fármaco', 'O que o fármaco faz com o corpo'] },
        { campo: 'Em foco', valores: ['Absorção, distribuição, metabolismo e excreção', 'Mecanismo de ação e efeitos'] },
        { campo: 'O que determina', valores: ['Quanto fármaco chega ao local de ação e por quanto tempo', 'O que acontece quando ele chega lá'], destaque: true }] })) +
      '**Resumo:** Na prática, as duas se combinam para explicar a resposta ao medicamento.' },
    'glossario:processamento-corpo': { so: true, md: 'Depois de administrado, o medicamento passa por quatro etapas:\n\n' + bloco('fluxo', ADME) },
    'glossario:farmacocinetica': { md: bloco('fluxo', 'Absorção :: Entrada na circulação -> Distribuição :: Chegada aos tecidos -> Metabolismo :: Modificação química do fármaco -> Excreção :: Eliminação do organismo') },
    'glossario:meia-vida': { md: bloco('formula', 't_{1/2} = \\frac{0{,}693 \\times V_d}{CL}') +
      'Onde **t½** é a meia-vida de eliminação, **Vd** é o volume de distribuição e **CL** é a depuração.\n\n' +
      bloco('conceito', 'Em cinética de primeira ordem, após cerca de 5 meias-vidas o fármaco está quase todo eliminado.') },
    'glossario:volume-distribuicao': { md: bloco('formula', 'V_d = \\frac{\\text{quantidade no corpo}}{\\text{concentração plasmática}}') +
      'Valores altos indicam distribuição ampla para os tecidos; valores baixos indicam que o fármaco fica mais restrito ao plasma.' }
  };
  V.prefs = prefs; V.aplicarPrefs = aplicarPrefs; V.tamanhos = TAMANHOS; V.temas = TEMAS;
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(window);
