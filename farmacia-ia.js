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
      cid: 'planejador_farma_cid_v1'         // identificador anônimo aleatório (só para limite de uso)
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
  function novo() { return { turnos: [], topico: null, conceitos: [], explicados: {}, modo: null }; }
  var S = novo();

  function plano(html) { return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
  function cortar(t, max) { t = String(t || ''); return t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, '') + '…'; }

  // Se a pergunta depende do que veio antes, devolve o texto com o assunto explícito.
  function resolver(interp, texto) {
    var original = String(texto || '');
    if (!S.topico || !interp || !interp.seguimento) return { texto: original, topico: S.topico ? S.topico.rotulo : '', usou: false };
    var rot = S.topico.rotulo;
    var t = original.replace(/\b(isso|disso|nisso|aquilo|esse processo|esse conceito|este conceito)\b/gi, rot);
    if (t === original) t = original.replace(/[?!.\s]+$/, '') + ' (assunto: ' + rot + ')';
    return { texto: t, topico: rot, usou: true };
  }

  function registrar(t) {   // t: { pergunta, html, interp, modo }
    var interp = t.interp || {};
    if (interp.conceitos && interp.conceitos.length) {
      S.topico = { rotulo: interp.conceitos.map(function (c) { return c.rotulo; }).slice(0, 2).join(' e '), termos: interp.conceitos.map(function (c) { return c.termo; }), categoria: interp.conceitos[0].categoria };
      interp.conceitos.forEach(function (c) { if (S.conceitos.indexOf(c.termo) < 0) S.conceitos.push(c.termo); S.explicados[c.termo] = true; });
    } else if (interp.farmacos && interp.farmacos.length) {
      S.topico = { rotulo: interp.farmacos[0], termos: interp.farmacos.slice(0, 1), categoria: 'farmacologia' };
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
    modo: function () { return S.modo; }, topico: function () { return S.topico; }, explicados: function () { return S.conceitos.slice(); },
    ultimo: function () { return S.turnos[S.turnos.length - 1] || null; }, turnos: function () { return S.turnos.slice(); },
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
    var html = usados.map(function (x) { return '<p><strong>' + esc(x.titulo) + '</strong></p><p>' + esc(x.trecho) + '</p>'; }).join('');
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

  // Pode chamar agora? Considera chave geral, consentimento, modo, rede, disjuntor, intervalo e teto da sessão.
  function pode() {
    var c = M.config.ia, now = Date.now(), p = provedor();
    if (!c.habilitada || !p || !p.disponivel()) return { ok: false, motivo: 'desabilitado' };
    if (M.armazenar.ler(M.config.storage.modo) === 'offline') return { ok: false, motivo: 'modo_offline' };
    if (M.armazenar.ler(M.config.storage.consentimento) !== '1') return { ok: false, motivo: 'sem_consentimento' };
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
      if (e.codigo !== 'cancelado' && e.codigo !== 'fora_do_escopo' && e.codigo !== 'limite') {
        est.falhas += 1;
        if (est.falhas >= c.falhasParaPausar) { est.pausadoAte = Date.now() + c.pausaMs; est.falhas = 0; }
      }
      throw e;
    });
  }
  function cancelar() { if (est.ctl) { try { est.ctl.abort(); } catch (e) { /* já encerrada */ } } }

  M.ia = { enviar: enviar, cancelar: cancelar, pode: pode, registrar: registrar, usar: usar, estado: function () { return { chamadas: est.chamadas, pausadoAte: est.pausadoAte, falhas: est.falhas }; }, resetar: function () { est.chamadas = 0; est.ultima = 0; est.falhas = 0; est.pausadoAte = 0; } };
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

  var OVERR = { info: 1, topic: 1, unknown: 1, followup: 1, reexplain: 1, more: 1, why: 1 };
  var SOCIAL = { ack: 1, thanks: 1, greet: 1, bye: 1, praise: 1, howare: 1, invite: 1, who: 1, about: 1, myname: 1, setname: 1, setpron: 1, setperiod: 1, setshift: 1, frustrated: 1, empty: 1 };
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

  function semIA(raw, interp, local, busca, aviso, retry) {
    var loc = M.rag.formatarLocal(busca, interp), html = aviso || '', chips = [];
    if (loc) { html += loc; M.contexto.registrar({ pergunta: raw, html: loc, interp: interp, modo: 'conceitual' }); chips = chipsPos(interp).slice(0, 2); }
    else if (local && local.id === 'topic') { html += local.html; chips = local.chips || []; }
    else if (interp.intencao === 'exercicio') html += p('Para criar perguntas de revisão eu preciso da IA online. Sem ela, só consigo mostrar o material local.');
    else html += p('Não encontrei isso no material local e, sem a IA online, prefiro não arriscar uma explicação. Você pode tentar com outras palavras ou procurar o professor da disciplina.');
    if (retry) chips = [{ label: 'Tentar novamente', q: raw }].concat(chips);
    return R(html, chips.length ? chips : (F()._chips ? F()._chips() : []));
  }

  function tratar(raw, interp, local, prefixo) {
    var res = M.contexto.resolver(interp, raw), busca = M.rag.preparar(interp, res.texto), chk = M.ia.pode();
    if (!busca.suficiente) busca = { resultados: [], cobertura: busca.cobertura, suficiente: false, vazio: busca.vazio };   // material fraco não vira "fonte" nem contexto
    prefixo = prefixo || '';
    if (!chk.ok) {
      if (chk.motivo === 'sem_consentimento') {
        pendente = { raw: raw, interp: interp, local: local };
        var base = semIA(raw, interp, local, busca, '', false);
        var pedido = consentMostrado ? '' : consentHTML(); consentMostrado = true;
        return Promise.resolve(R(base.html + pedido, CHIPS_CONSENT));
      }
      if (chk.motivo === 'intervalo' && chk.aguardarMs <= 3000) return sleep(chk.aguardarMs + 50).then(function () { return tratar(raw, interp, local, prefixo); });
      var aviso = chk.motivo === 'offline' ? p('Você está sem internet: respondo com o material local.') : (['pausado', 'teto_sessao', 'intervalo'].indexOf(chk.motivo) >= 0 ? avisoFalha({ codigo: chk.motivo }) : '');
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

  function interceptar(raw, local) {
    var n = M.busca.norm(raw), cmd = comando(n, raw);
    if (cmd) return cmd.then ? cmd : Promise.resolve(cmd);
    var st = F()._state ? F()._state() : {};
    if (st.awaiting) return null;
    var lid = local && local.id, interp = M.interpretador.interpretar(raw);
    var conceitual = M.contexto.modo() === 'conceitual' && !!M.contexto.topico();
    var temEnt = interp.conceitos.length > 0 || interp.farmacos.length > 0, decide = false;
    var regraPlain = lid === 'rule' && window.FarmaRegras && window.FarmaRegras.match(n);   // regra pedida com as próprias palavras (não por correção ortográfica)
    var manter = SOCIAL[lid] || lid === 'glossary' || lid === 'contacts' || lid === 'offscope' || lid === 'ementa' || lid === 'fluxograma' || !!regraPlain;
    var academico = interp.academica || interp.codigoExplicito || (!!interp.disciplina && !temEnt && (!interp.pedagogica || interp.numeral));
    if (lid === 'topic') decide = true;
    else if (interp.seguimento && !conceitual) decide = false;   // "explica de novo" sem assunto anterior: o farmacia.js responde
    else if (!manter && !academico) {
      if (conceitual && interp.seguimento) decide = true;
      else if (temEnt && (interp.pedagogica || OVERR[lid]) && !(lid === 'info' && interp.numeral)) decide = true;
      else if (!temEnt && OVERR[lid] && interp.pedagogica) decide = true;
    }
    if (!decide) { if (!SOCIAL[lid]) M.contexto.marcarLocal(); return null; }
    if (interp.ambiguidade && !interp.seguimento) {
      var a = interp.ambiguidade;
      return Promise.resolve(R(p(esc(a.pergunta)), a.opcoes.map(function (o) { return { label: o[0], q: o[1] }; })));
    }
    return tratar(raw, interp, local);
  }

  function reset() { M.contexto.reset(); M.ia.cancelar(); pendente = null; primeiro = true; consentMostrado = false; }
  M.orquestrador = { interceptar: interceptar, reset: reset, _cache: function () { return cache; }, _limparCache: function () { cache = []; } };
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
    return '<pre class="farma-md-pre"><code class="hljs">' + escapeHtml(code) + '</code></pre>';
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
    try { html = md.render(texto); } catch (_) { return textoSimples(texto); }
    return root.DOMPurify.sanitize(html, CONFIG_PURIFY);
  }

  root.FarmaciaMarkdown = { render: render };
})(window);
