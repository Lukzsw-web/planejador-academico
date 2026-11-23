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
  // ---------- Cardápio interativo ----------
  // Dentro da resposta: restaurantes (botões), dias de domingo a sábado (cartões) e o cardápio do dia escolhido.
  // Os cliques trocam o conteúdo no próprio cartão, com a última coleta já guardada no aparelho (funciona offline).
  var PLACES = [['ct', 'Restaurante Central', 'CT (1 e 2) e Letras inclusos'], ['pv', 'Praia Vermelha', 'IFCS (Centro) incluso'], ['dc', 'Duque de Caxias', ''], ['mc', 'Macaé', '']];
  var WD = { domingo: 'Dom', segunda: 'Seg', terca: 'Ter', quarta: 'Qua', quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb' };
  var MON = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  function parseDate(str) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str || '');
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }
  function relLabel(d) {
    if (!d) return '';
    var t = new Date(); t = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    var n = Math.round((d - t) / 86400000);
    if (n === 0) return 'Hoje';
    if (n === 1) return 'Amanhã';
    if (n === -1) return 'Ontem';
    return n < 0 ? 'Há ' + (-n) + ' dias' : 'Em ' + n + ' dias';
  }
  var PIN = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.2a7.2 7.2 0 0 0-7.2 7.2c0 5 6.1 11.4 6.4 11.7a1.1 1.1 0 0 0 1.6 0c.3-.3 6.4-6.7 6.4-11.7A7.2 7.2 0 0 0 12 2.2zm0 9.7a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>';
  var CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function placeLabel(pl) { return '<span class="cd-pl-t">' + esc(pl[1]) + '</span>' + (pl[2] ? '<span class="cd-pl-s">' + esc(pl[2]) + '</span>' : ''); }
  // Sanfona: o botão mostra o restaurante escolhido; ao abrir, aparecem os demais.
  function placeButtons(campus) {
    var cur = PLACES.filter(function (pl) { return pl[0] === campus; })[0] || PLACES[0];
    var others = PLACES.filter(function (pl) { return pl !== cur; }).map(function (pl) {
      return '<button type="button" class="cd-opt" role="option" data-cd-place="' + pl[0] + '" aria-label="Restaurante ' + esc(pl[1] + (pl[2] ? ', ' + pl[2] : '')) + '">' + placeLabel(pl) + '</button>';
    }).join('');
    return '<div class="cd-select">' +
      '<button type="button" class="cd-pick" data-cd-toggle aria-expanded="false" aria-haspopup="listbox" aria-label="Restaurante: ' + esc(cur[1] + (cur[2] ? ', ' + cur[2] : '')) + '. Tocar para escolher outro">' +
        '<span class="cd-pin">' + PIN + '</span><span class="cd-pl">' + placeLabel(cur) + '</span><span class="cd-chev">' + CHEV + '</span></button>' +
      '<div class="cd-opts" role="listbox" aria-label="Outros restaurantes"><div class="cd-opts-in">' + others + '</div></div>' +
    '</div>';
  }
  function dayButtons(row, day) {
    return DAYS.map(function (k) {
      var raw = dateForDay(row, k), d = parseDate(raw), on = k === day, rel = relLabel(d);
      var dt = d ? d.getDate() + ' ' + MON[d.getMonth()] : '';
      return '<button type="button" class="cd-day' + (on ? ' is-on' : '') + (rel === 'Hoje' ? ' is-today' : '') + '" data-cd-day="' + k + '" aria-label="' + esc(DAY_LABEL[k] + (dt ? ', ' + dt : '') + (rel ? ', ' + rel : '') + (on ? ', selecionado' : '')) + '">' +
        '<span class="cd-wd">' + WD[k] + '</span>' + (dt ? '<span class="cd-dt">' + esc(dt) + '</span>' : '') + (rel ? '<span class="cd-rel">' + esc(rel) + '</span>' : '') + '</button>';
    }).join('');
  }
  function mealsHTML(row, campus, day) {
    var data = row.payload && row.payload[campus], dd = data && data[day], out = '';
    if (!dd) return '<p class="cd-empty">Não encontrei o cardápio desse dia na última coleta. Tente outro dia ou consulte o BandejApp.</p>';
    ['almoco', 'janta'].forEach(function (meal) {
      var m = dd[meal], items = '';
      if (m && typeof m === 'object') {
        FIELDS.forEach(function (f) {
          var v = m[f[0]];
          if (v != null && String(v).trim() !== '') items += '<li><strong>' + f[1] + ':</strong> ' + esc(v) + '</li>';
        });
      }
      out += '<section class="cd-meal"><h4>' + (meal === 'almoco' ? 'Almoço' : 'Jantar') + '</h4>' +
        (items ? '<ul>' + items + '</ul>' : '<p class="cd-empty">' + (m ? 'O cardápio desta refeição ainda não foi publicado.' : 'Sem informação disponível para esta refeição.') + '</p>') + '</section>';
    });
    return out;
  }
  function cardInner(row, campus, day) {
    var foot = '';
    if (row.coletado_em) {
      var c = new Date(row.coletado_em);
      if (!isNaN(c.getTime())) foot = 'Última coleta: ' + esc(c.toLocaleString('pt-BR')) + '. ';
    }
    return '<div class="cd-places">' + placeButtons(campus) + '</div>' +
      '<div class="cd-days-wrap"><div class="cd-days" data-no-tab-swipe="true" role="group" aria-label="Dia da semana">' + dayButtons(row, day) + '</div>' +
      '<div class="cd-rail" data-no-tab-swipe="true" aria-hidden="true"><span class="cd-thumb"></span></div></div>' +
      '<div class="cd-body">' + mealsHTML(row, campus, day) + '</div>' +
      '<p class="cd-foot">' + foot + 'Fonte: <a class="cd-src" href="https://devmobufrj.github.io/BandejApp/Cardapio" target="_blank" rel="noopener noreferrer">BandejApp</a> UFRJ.</p>';
  }
  function buildResponse(row, query) {
    return {
      id: 'cardapio',
      html: '<p>Aqui está o <strong>cardápio do bandejão</strong>. Escolha o restaurante e o dia:</p><div class="cd" data-cd-campus="' + query.campus + '" data-cd-day="' + query.day + '">' + cardInner(row, query.campus, query.day) + '</div>',
      chips: []
    };
  }
  // Sanfona de restaurantes
  function setOpen(sel, on) {
    sel.classList.toggle('is-open', on);
    var t = sel.querySelector('.cd-pick'); if (t) t.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  function closeSelects(except) {
    [].forEach.call(root.document.querySelectorAll('.cd-select.is-open'), function (sel) { if (sel !== except) setOpen(sel, false); });
  }
  // Trilho dos dias: mostra onde a faixa está e também pode ser arrastado.
  function updateRail(card) {
    var strip = card && card.querySelector('.cd-days'), rail = card && card.querySelector('.cd-rail'), th = rail && rail.querySelector('.cd-thumb');
    if (!strip || !th) return;
    var over = strip.scrollWidth - strip.clientWidth;
    if (over <= 2) { rail.hidden = true; return; }
    rail.hidden = false;
    var w = rail.clientWidth, tw = Math.max(28, w * strip.clientWidth / strip.scrollWidth);
    th.style.width = tw + 'px';
    th.style.transform = 'translateX(' + (strip.scrollLeft / over * (w - tw)) + 'px)';
  }
  var railDrag = null, stripDrag = null, draggedAt = 0;
  function railTo(drag, x) {
    var r = drag.rail.getBoundingClientRect(), th = drag.rail.querySelector('.cd-thumb'), tw = th ? th.offsetWidth : 28;
    var over = drag.strip.scrollWidth - drag.strip.clientWidth, room = Math.max(1, r.width - tw);
    drag.strip.scrollLeft = Math.min(over, Math.max(0, (x - r.left - tw / 2) / room * over));
  }
  function onDown(e) {
    var t = e.target; if (!t || !t.closest) return;
    var rail = t.closest('.cd-rail');
    if (rail) {
      var strip = rail.parentNode.querySelector('.cd-days'); if (!strip) return;
      railDrag = { rail: rail, strip: strip, id: e.pointerId };
      try { rail.setPointerCapture(e.pointerId); } catch (_) {}
      rail.classList.add('is-drag'); railTo(railDrag, e.clientX); e.preventDefault(); return;
    }
    // mouse: arrastar a própria faixa (no toque quem rola é o navegador)
    var days = e.pointerType === 'mouse' && e.button === 0 && t.closest('.cd-days');
    if (days) stripDrag = { strip: days, x: e.clientX, left: days.scrollLeft, moved: false };
  }
  function onMove(e) {
    if (railDrag && e.pointerId === railDrag.id) { railTo(railDrag, e.clientX); return; }
    if (stripDrag) {
      var dx = e.clientX - stripDrag.x;
      if (!stripDrag.moved && Math.abs(dx) > 5) { stripDrag.moved = true; stripDrag.strip.classList.add('is-drag'); }
      if (stripDrag.moved) stripDrag.strip.scrollLeft = stripDrag.left - dx;
    }
  }
  function onUp() {
    if (railDrag) { railDrag.rail.classList.remove('is-drag'); railDrag = null; }
    if (stripDrag) { if (stripDrag.moved) draggedAt = Date.now(); stripDrag.strip.classList.remove('is-drag'); stripDrag = null; }
  }
  // Cliques dentro do cartão: troca restaurante ou dia sem criar uma nova mensagem.
  function onClick(e) {
    var t = e.target; if (!t || !t.closest) return;
    var tog = t.closest('[data-cd-toggle]');
    if (tog) {
      var sel = tog.closest('.cd-select');
      e.preventDefault(); e.stopPropagation();
      var on = !sel.classList.contains('is-open'); closeSelects(sel); setOpen(sel, on); return;
    }
    if (!t.closest('.cd-select')) closeSelects(null);
    var btn = t.closest('button[data-cd-place], button[data-cd-day]');
    var card = btn && btn.closest('.cd');
    if (!card) return;
    if (Date.now() - draggedAt < 250) { e.preventDefault(); e.stopPropagation(); return; }
    var cached = readCache(); if (!cached) return;
    e.preventDefault(); e.stopPropagation();
    var campus = card.getAttribute('data-cd-campus'), day = card.getAttribute('data-cd-day');
    if (btn.hasAttribute('data-cd-place')) campus = btn.getAttribute('data-cd-place'); else day = btn.getAttribute('data-cd-day');
    var strip = card.querySelector('.cd-days'), left = strip ? strip.scrollLeft : 0, kind = btn.hasAttribute('data-cd-place') ? 'place' : 'day';
    card.setAttribute('data-cd-campus', campus); card.setAttribute('data-cd-day', day);
    card.innerHTML = cardInner(cached.row, campus, day);
    strip = card.querySelector('.cd-days'); if (strip) strip.scrollLeft = left;
    updateRail(card);
    var again = card.querySelector(kind === 'place' ? '.cd-pick' : '[data-cd-day="' + day + '"]');
    if (again) try { again.focus({ preventScroll: true }); } catch (_) {}
  }
  // ao aparecer, o dia escolhido fica visível dentro da faixa de dias
  function revealSelected(card) {
    var on = card.querySelector('.cd-day.is-on'), strip = card.querySelector('.cd-days');
    if (on && strip) strip.scrollLeft = Math.max(0, on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2);
    updateRail(card);
  }
  function intercept(raw) {
    var query = detect(raw);
    if (!query) return null;
    return sync(true).then(function (row) {
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
    root.document.addEventListener('click', onClick, true);
    root.document.addEventListener('pointerdown', onDown, true);
    root.document.addEventListener('pointermove', onMove, true);
    root.document.addEventListener('pointerup', onUp, true);
    root.document.addEventListener('pointercancel', onUp, true);
    root.document.addEventListener('scroll', function (e) {
      var el = e.target; if (el && el.classList && el.classList.contains('cd-days')) updateRail(el.closest('.cd'));
    }, true);
    root.addEventListener('resize', function () { [].forEach.call(root.document.querySelectorAll('.cd'), updateRail); });
    new root.MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) (n.matches('.cd') ? [n] : [].slice.call(n.querySelectorAll('.cd'))).forEach(revealSelected); }); });
    }).observe(root.document.body, { childList: true, subtree: true });
    sync(false).catch(function () {});
    root.addEventListener('online', function () { sync(true).catch(function () {}); });
  }

  install();
  root.FarmaCardapio = {
    sincronizar: function () { return sync(true); },
    _detect: detect
  };
})(window);
