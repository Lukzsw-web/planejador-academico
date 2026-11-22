/* FarmácIA — consulta do cardápio do Restaurante Universitário (BandejApp).
 * Consulta o último registro público do Supabase e mantém uma cópia local para uso offline.
 * Não envia perguntas, perfil ou histórico de conversa ao servidor. */
(function (root) {
  'use strict';
  var URL = 'https://tbmjgnaaehyqbridlqil.supabase.co';
  var KEY = 'sb_publishable_IyDFk6pjE3jEmgc2tVBTZQ_GUD1nDmP';
  var CACHE = 'planejador_farma_cardapio_v1';
  var MAX_AGE = 15 * 60 * 1000;
  var DAYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  var DAY_LABEL = { segunda: 'segunda-feira', terca: 'terça-feira', quarta: 'quarta-feira', quinta: 'quinta-feira', sexta: 'sexta-feira', sabado: 'sábado', domingo: 'domingo' };
  var REST = {
    ct: 'Restaurante Central (CT e Letras)',
    pv: 'Restaurante da Praia Vermelha (IFCS e PV)',
    dc: 'Restaurante de Duque de Caxias',
    mc: 'Restaurante de Macaé'
  };
  var FIELDS = [
    ['entrada', 'Entrada'],
    ['pratoPrincipal', 'Prato principal'],
    ['pratoVeg', 'Opção vegetariana'],
    ['guarnicao', 'Guarnição'],
    ['acompanhamento', 'Acompanhamento'],
    ['sobremesa', 'Sobremesa']
  ];

  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function readCache() {
    try {
      var x = JSON.parse(root.localStorage.getItem(CACHE) || 'null');
      return x && x.row && x.row.payload ? x : null;
    } catch (_) { return null; }
  }
  function writeCache(row) {
    try { root.localStorage.setItem(CACHE, JSON.stringify({ savedAt: Date.now(), row: row })); } catch (_) {}
  }
  function validRow(row) {
    return !!(row && row.payload && typeof row.payload === 'object' &&
      ['ct', 'pv', 'dc', 'mc'].some(function (k) { return row.payload[k] && typeof row.payload[k] === 'object'; }));
  }
  function sync(force) {
    var cached = readCache();
    if (!force && cached && Date.now() - cached.savedAt < MAX_AGE) return Promise.resolve(cached.row);
    var endpoint = URL + '/rest/v1/cardapio_ru_coletas?select=id,coletado_em,semana,payload&order=id.desc&limit=1';
    return root.fetch(endpoint, {
      method: 'GET',
      headers: { apikey: KEY, accept: 'application/json' },
      cache: 'no-store'
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (rows) {
      var row = Array.isArray(rows) && rows.length ? rows[0] : null;
      if (!validRow(row)) throw new Error('Cardápio indisponível');
      writeCache(row);
      return row;
    }).catch(function () {
      if (cached && validRow(cached.row)) return cached.row;
      throw new Error('sem_dados');
    });
  }
  function dateForDay(row, key) {
    var raw = row.semana && row.semana[key];
    if (typeof raw === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
    return '';
  }
  function detect(raw) {
    var n = norm(raw);
    if (!/(cardapio|bandejao|bandejapp|restaurante universitario|\bru\b|refeicao|o que tem no|vai ter no)/.test(n)) return null;
    var campus = 'ct';
    if (/praia vermelha|ifcs/.test(n)) campus = 'pv';
    else if (/duque de caxias|\bcaxias\b/.test(n)) campus = 'dc';
    else if (/\bmacae\b/.test(n)) campus = 'mc';

    var meal = /janta|jantar/.test(n) ? 'janta' : /almoco/.test(n) ? 'almoco' : 'ambos';
    var day = null;
    var aliases = {
      segunda: /\bsegunda(?: feira)?\b/,
      terca: /\bterca(?: feira)?\b/,
      quarta: /\bquarta(?: feira)?\b/,
      quinta: /\bquinta(?: feira)?\b/,
      sexta: /\bsexta(?: feira)?\b/,
      sabado: /\bsabado\b/,
      domingo: /\bdomingo\b/
    };
    Object.keys(aliases).some(function (k) {
      if (aliases[k].test(n)) { day = k; return true; }
      return false;
    });
    var now = new Date();
    if (!day && /\bamanha\b/.test(n)) {
      day = DAYS[new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getDay()];
    }
    if (!day) day = DAYS[now.getDay()];
    return { campus: campus, meal: meal, day: day };
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function buildResponse(row, query) {
    var p = row.payload || {};
    var campus = p[query.campus];
    var day = campus && campus[query.day];
    if (!day) {
      return {
        id: 'cardapio',
        html: '<p>Não encontrei o cardápio desse dia na última coleta disponível. Tente outro dia ou consulte o BandejApp.</p>',
        chips: []
      };
    }

    var date = dateForDay(row, query.day);
    var meals = query.meal === 'ambos' ? ['almoco', 'janta'] : [query.meal];
    var out = '<p><strong>' + esc(DAY_LABEL[query.day]) + (date ? ', ' + esc(date) : '') +
      '</strong><br>' + esc(REST[query.campus]) + '</p>';

    meals.forEach(function (meal) {
      var data = day[meal];
      out += '<p><strong>' + (meal === 'almoco' ? 'Almoço' : 'Jantar') + '</strong></p>';
      if (!data || typeof data !== 'object') {
        out += '<p>Sem informação disponível para esta refeição.</p>';
        return;
      }
      var any = false;
      out += '<ul>';
      FIELDS.forEach(function (field) {
        var value = data[field[0]];
        if (value == null || String(value).trim() === '') return;
        any = true;
        out += '<li><strong>' + field[1] + ':</strong> ' + esc(value) + '</li>';
      });
      out += '</ul>';
      if (!any) out += '<p>O cardápio desta refeição ainda não foi publicado.</p>';
    });

    if (row.coletado_em) {
      var collected = new Date(row.coletado_em);
      if (!isNaN(collected.getTime())) {
        out += '<p><small>Última coleta: ' + esc(collected.toLocaleString('pt-BR')) + '.</small></p>';
      }
    }
    out += '<p>Fonte: BandejApp UFRJ.</p>';
    return {
      id: 'cardapio',
      html: out,
      chips: [
        { label: 'Almoço', q: 'Cardápio de hoje no ' + (query.campus === 'ct' ? 'CT' : query.campus.toUpperCase()) + ' - almoço' },
        { label: 'Jantar', q: 'Cardápio de hoje no ' + (query.campus === 'ct' ? 'CT' : query.campus.toUpperCase()) + ' - jantar' }
      ]
    };
  }
  function intercept(raw) {
    var query = detect(raw);
    if (!query) return null;
    return sync(false).then(function (row) {
      return buildResponse(row, query);
    }).catch(function () {
      return {
        id: 'cardapio',
        html: '<p>Para consultar o cardápio pela primeira vez, conecte-se à internet. Depois da primeira sincronização neste aparelho, a última coleta ficará disponível também offline.</p>',
        chips: []
      };
    });
  }
  function install() {
    var mod = root.FarmaMod && root.FarmaMod.orquestrador;
    if (!mod || typeof mod.interceptar !== 'function' || mod.__cardapioInstalled) return;
    var original = mod.interceptar;
    mod.interceptar = function (raw, local) {
      var result = intercept(raw);
      return result || original.call(this, raw, local);
    };
    mod.__cardapioInstalled = true;
    sync(false).catch(function () {});
    root.addEventListener('online', function () { sync(true).catch(function () {}); });
  }

  install();
  root.FarmaCardapio = {
    sincronizar: function () { return sync(true); },
    _detect: detect
  };
})(window);
