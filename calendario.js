/* Calendário do Planejador Acadêmico.
 * - Meses em trilhos (deslizar para o lado troca de mês; de 1900 a 2100, páginas montadas só quando chegam perto).
 * - Datas comemorativas e feriados do Brasil calculados por ano (inclui Páscoa, Carnaval, Dia das Mães/Pais...), em tags coloridas.
 * - Botão redondo com o número de hoje (volta ao mês atual) e lupa (busca por data comemorativa ou evento).
 * - Tocar num dia abre "Resumo do dia" | "Agendar" (trocam por toque ou por deslize). Agendar usa o mesmo editor das anotações da Agenda.
 * - Eventos ficam só neste aparelho (localStorage: planejador_calendario_v1); imagens no mesmo armazenamento das anotações.
 * - Segurar um evento seleciona (selecao.js) para excluir vários de uma vez.
 * Texto digitado entra por textContent/value; a formatação só volta ao editor depois de NotasRich.sanitize. */
(function () {
  'use strict';
  var doc = document, win = window;
  var KEY = 'planejador_calendario_v1';
  var MIN_Y = 1900, MAX_Y = 2100, MAX_EV = 400, MAX_TITULO = 80, MAX_TEXTO = 20000;
  var NMESES = (MAX_Y - MIN_Y + 1) * 12;

  function T(x) { return typeof win.T === 'function' ? win.T(x) : x; }
  function mk(tag, cls, attrs) {
    var el = doc.createElement(tag); if (cls) el.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
  function svg(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>'; }
  var ICO = {
    voltar: '<path d="M15 5l-7 7 7 7"></path>',
    lupa: '<circle cx="10.5" cy="10.5" r="6.3"></circle><path d="M15.4 15.4L20 20"></path>',
    x: '<path d="M6 6l12 12M18 6L6 18"></path>'
  };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function isoDe(dt) { return iso(dt.getFullYear(), dt.getMonth(), dt.getDate()); }
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function fold(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function fmt(dt, o) { try { return new Intl.DateTimeFormat('pt-BR', o).format(dt); } catch (_) { return ''; } }
  function toast(msg) { if (typeof win.showToast === 'function') win.showToast({ text: msg }); }
  function idx(y, m) { return (y - MIN_Y) * 12 + m; }
  function deIdx(i) { return { y: MIN_Y + Math.floor(i / 12), m: i % 12 }; }

  /* ===================== datas comemorativas do Brasil ===================== */
  var COR = { f: '#1b7a43', p: '#0f766e', e: '#1f5fa8' };
  var PALETA = ['#9a5b0a', '#a3245f', '#6240b5', '#1f5fa8', '#b4470f', '#0f6f8f', '#7a5a00'];
  function corDe(nome, tipo) {
    if (COR[tipo]) return COR[tipo];
    var h = 0; for (var i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
    return PALETA[h % PALETA.length];
  }
  var TIPO_NOME = { f: 'Feriado nacional', p: 'Ponto facultativo', c: 'Data comemorativa' };
  var FIXAS = [
    [1, 1, 'Confraternização Universal', 'f'], [1, 20, 'Dia do Farmacêutico', 'c'], [3, 8, 'Dia da Mulher', 'c'], [4, 7, 'Dia Mundial da Saúde', 'c'],
    [4, 19, 'Dia dos Povos Indígenas', 'c'], [4, 21, 'Tiradentes', 'f'], [4, 22, 'Descobrimento do Brasil', 'c'], [5, 1, 'Dia do Trabalho', 'f'],
    [6, 5, 'Dia do Meio Ambiente', 'c'], [6, 12, 'Dia dos Namorados', 'c'], [6, 24, 'São João', 'c'], [8, 11, 'Dia do Estudante', 'c'], [8, 22, 'Dia do Folclore', 'c'],
    [9, 7, 'Independência do Brasil', 'f'], [9, 21, 'Dia da Árvore', 'c'], [10, 12, 'Nossa Sra. Aparecida', 'f'], [10, 12, 'Dia das Crianças', 'c'],
    [10, 15, 'Dia do Professor', 'c'], [10, 18, 'Dia do Médico', 'c'], [10, 31, 'Halloween', 'c'], [11, 2, 'Finados', 'f'], [11, 15, 'Proclamação da República', 'f'],
    [11, 19, 'Dia da Bandeira', 'c'], [11, 20, 'Consciência Negra', 'f'], [12, 24, 'Véspera de Natal', 'c'], [12, 25, 'Natal', 'f'], [12, 31, 'Réveillon', 'c']
  ];
  function pascoa(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mes - 1, dia);
  }
  function enesimoDia(y, mes0, diaSemana, n) { // n-ésimo (1..) dia da semana do mês
    var primeiro = new Date(y, mes0, 1).getDay(); return 1 + ((diaSemana - primeiro + 7) % 7) + (n - 1) * 7;
  }
  var cacheFer = {};
  function feriadosDoAno(y) {
    if (cacheFer[y]) return cacheFer[y];
    var mapa = {};
    function add(dt, nome, tipo) { var k = isoDe(dt); (mapa[k] = mapa[k] || []).push({ nome: nome, tipo: tipo, cor: corDe(nome, tipo), feriado: true }); }
    FIXAS.forEach(function (f) { add(new Date(y, f[0] - 1, f[1]), f[2], f[3]); });
    var p = pascoa(y), dd = function (n) { return new Date(p.getFullYear(), p.getMonth(), p.getDate() + n); };
    add(dd(-48), 'Carnaval', 'p'); add(dd(-47), 'Carnaval', 'p'); add(dd(-46), 'Quarta de Cinzas', 'p');
    add(dd(-2), 'Sexta-feira Santa', 'f'); add(dd(0), 'Páscoa', 'c'); add(dd(60), 'Corpus Christi', 'p');
    add(new Date(y, 4, enesimoDia(y, 4, 0, 2)), 'Dia das Mães', 'c'); add(new Date(y, 7, enesimoDia(y, 7, 0, 2)), 'Dia dos Pais', 'c');
    Object.keys(mapa).forEach(function (k) { mapa[k].sort(function (a, b) { return (a.tipo === 'f' ? 0 : 1) - (b.tipo === 'f' ? 0 : 1); }); });
    return (cacheFer[y] = mapa);
  }
  function feriadosEm(k) { var y = +k.slice(0, 4); return feriadosDoAno(y)[k] || []; }

  /* ===================== eventos do usuário ===================== */
  var eventos = [], porDia = {};
  function valido(e) { return e && typeof e === 'object' && typeof e.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.data) && typeof e.titulo === 'string' && typeof e.texto === 'string'; }
  function carregar() {
    try { var j = JSON.parse(win.localStorage.getItem(KEY) || '[]'); eventos = Array.isArray(j) ? j.filter(valido).slice(0, MAX_EV) : []; } catch (_) { eventos = []; }
    reindexar();
  }
  function gravar() { try { win.localStorage.setItem(KEY, JSON.stringify(eventos)); return true; } catch (_) { return false; } }
  function reindexar() {
    porDia = {};
    eventos.forEach(function (e) { (porDia[e.data] = porDia[e.data] || []).push(e); });
    Object.keys(porDia).forEach(function (k) { porDia[k].sort(function (a, b) { return (a.hora || '99:99').localeCompare(b.hora || '99:99') || (a.upd || 0) - (b.upd || 0); }); });
  }
  function novoId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function tagsDoDia(k) {
    var t = feriadosEm(k).map(function (f) { return { nome: f.nome, cor: f.cor }; });
    (porDia[k] || []).forEach(function (e) { t.push({ nome: e.titulo.trim() || fold(e.texto).slice(0, 24) || T('Evento'), cor: COR.e, evento: true }); });
    return t;
  }

  /* ===================== calendário (tela cheia) ===================== */
  var cal = null; // estado da tela aberta
  var NOMES_DIA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  function hojeIso() { return isoDe(new Date()); }
  function montarPagina(pg, i) {
    var p = deIdx(i), y = p.y, m = p.m, hoje = hojeIso();
    var primeiro = new Date(y, m, 1).getDay(), dias = new Date(y, m + 1, 0).getDate(), linhas = Math.ceil((primeiro + dias) / 7);
    var grade = mk('div', 'cal-grade', { role: 'grid', 'aria-label': fmt(new Date(y, m, 1), { month: 'long', year: 'numeric' }) });
    grade.style.gridTemplateRows = 'repeat(' + linhas + ', minmax(0, 1fr))';
    for (var c = 0; c < linhas * 7; c++) {
      var dt = new Date(y, m, 1 - primeiro + c), fora = dt.getMonth() !== m, k = isoDe(dt);
      var b = mk('button', 'cal-dia-cel' + (fora ? ' is-fora' : '') + (dt.getDay() === 0 ? ' is-dom' : '') + (k === hoje ? ' is-hoje' : ''), { type: 'button', 'data-d': k, role: 'gridcell' });
      var num = mk('span', 'cal-num'); num.textContent = String(dt.getDate()); b.appendChild(num);
      if (!fora) {
        var tags = tagsDoDia(k);
        if (tags.length) {
          b.style.setProperty('--tint', tags[0].cor); b.classList.add('has-tag');
          var lista = mk('span', 'cal-tags');
          tags.slice(0, 3).forEach(function (t) { var s = mk('span', 'cal-tag'); s.style.background = t.cor; s.textContent = t.nome; lista.appendChild(s); });
          if (tags.length > 3) { var mais = mk('span', 'cal-mais'); mais.textContent = '+' + (tags.length - 3); lista.appendChild(mais); }
          b.appendChild(lista);
        }
        b.setAttribute('aria-label', fmt(dt, { day: 'numeric', month: 'long', year: 'numeric' }) + (tags.length ? '. ' + tags.map(function (t) { return t.nome; }).join(', ') : ''));
      } else b.setAttribute('aria-label', fmt(dt, { day: 'numeric', month: 'long', year: 'numeric' }));
      grade.appendChild(b);
    }
    pg.textContent = ''; pg.appendChild(grade); pg.setAttribute('data-ok', '1');
  }
  function garantir(i) {
    if (!cal || i < 0 || i >= NMESES) return;
    var pg = cal.pgs[i]; if (pg && !pg.getAttribute('data-ok')) montarPagina(pg, i);
  }
  function limparLonge(centro) {
    cal.pgs.forEach(function (pg, i) { if (pg.getAttribute('data-ok') && Math.abs(i - centro) > 5) { pg.textContent = ''; pg.removeAttribute('data-ok'); } });
  }
  function indiceVisivel() { var w = cal.trilho.clientWidth || 1; return Math.max(0, Math.min(NMESES - 1, Math.round(cal.trilho.scrollLeft / w))); }
  function atualizarTitulo(i) {
    var p = deIdx(i), agora = new Date();
    cal.tit.textContent = fmt(new Date(p.y, p.m, 1), { month: 'long' });
    cal.ano.textContent = p.y !== agora.getFullYear() ? String(p.y) : '';
    cal.ano.hidden = !cal.ano.textContent;
  }
  function irPara(i, suave) {
    var w = cal.trilho.clientWidth; i = Math.max(0, Math.min(NMESES - 1, i));
    [i - 1, i, i + 1].forEach(garantir);
    var perto = Math.abs(i - cal.atual) <= 12;
    cal.trilho.scrollTo({ left: i * w, behavior: suave && perto && !doc.documentElement.classList.contains('no-anim') ? 'smooth' : 'auto' });
    cal.atual = i; atualizarTitulo(i);
  }
  function refazerPaginaAtual() { if (!cal) return; [cal.atual - 1, cal.atual, cal.atual + 1].forEach(function (i) { var pg = cal.pgs[i]; if (pg && i >= 0 && i < NMESES) montarPagina(pg, i); }); }

  function abrir(dataIso) {
    if (cal) return;
    carregar();
    var voltarFoco = doc.activeElement, agora = new Date();
    var root = mk('section', 'cal-root', { role: 'dialog', 'aria-modal': 'true', 'aria-label': T('Calendário') });
    root.setAttribute('data-no-tab-swipe', 'true');
    var topo = mk('header', 'cal-topo');
    var bV = mk('button', 'cal-btn cal-voltar', { type: 'button', 'aria-label': T('Voltar'), title: T('Voltar') }); bV.innerHTML = svg(ICO.voltar);
    var titBox = mk('div', 'cal-titbox'), tit = mk('h2', 'cal-titulo'), ano = mk('span', 'cal-ano'); ano.hidden = true;
    titBox.appendChild(tit); titBox.appendChild(ano);
    var busca = mk('div', 'cal-busca'); busca.hidden = true;
    var inp = mk('input', 'cal-busca-in', { type: 'search', placeholder: T('Buscar data comemorativa ou evento'), 'aria-label': T('Buscar'), autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search' });
    busca.appendChild(inp);
    var bL = mk('button', 'cal-btn cal-lupa', { type: 'button', 'aria-label': T('Buscar'), title: T('Buscar'), 'aria-expanded': 'false' }); bL.innerHTML = svg(ICO.lupa);
    var bH = mk('button', 'cal-hoje', { type: 'button', 'aria-label': T('Ir para hoje'), title: T('Ir para hoje') });
    var nH = mk('span'); nH.textContent = String(agora.getDate()); bH.appendChild(nH);
    topo.appendChild(bV); topo.appendChild(titBox); topo.appendChild(busca); topo.appendChild(bL); topo.appendChild(bH);
    var semana = mk('div', 'cal-semana', { 'aria-hidden': 'true' });
    NOMES_DIA.forEach(function (n, i) { var s = mk('span', i === 0 ? 'is-dom' : ''); s.textContent = n; semana.appendChild(s); });
    var trilho = mk('div', 'cal-trilho', { tabindex: '-1' });
    var pgs = []; for (var i = 0; i < NMESES; i++) { var pg = mk('div', 'cal-pagina'); pgs.push(pg); trilho.appendChild(pg); }
    var res = mk('div', 'cal-resultados'); res.hidden = true;
    root.appendChild(topo); root.appendChild(semana); root.appendChild(trilho); root.appendChild(res);
    doc.body.appendChild(root); doc.documentElement.classList.add('cal-aberto');
    cal = { root: root, trilho: trilho, pgs: pgs, tit: tit, ano: ano, atual: idx(agora.getFullYear(), agora.getMonth()), busca: busca, inp: inp, res: res, titBox: titBox, bL: bL, nH: nH, voltarFoco: voltarFoco, tmr: 0 };

    var alvo = parse(dataIso) || agora; irPara(idx(alvo.getFullYear(), alvo.getMonth()), false);
    trilho.addEventListener('scroll', function () {
      clearTimeout(cal.tmr);
      cal.tmr = win.setTimeout(function () { var i = indiceVisivel(); cal.atual = i; [i - 1, i, i + 1].forEach(garantir); atualizarTitulo(i); limparLonge(i); }, 70);
      var i2 = indiceVisivel(); if (i2 !== cal.atual) { cal.atual = i2; atualizarTitulo(i2); }
    }, { passive: true });
    trilho.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.cal-dia-cel'); if (!b) return;
      abrirDia(b.getAttribute('data-d'));
    });
    bV.addEventListener('click', fechar);
    bH.addEventListener('click', function () { var h = new Date(); nH.textContent = String(h.getDate()); irPara(idx(h.getFullYear(), h.getMonth()), true); });
    bL.addEventListener('click', function () { alternarBusca(); });
    inp.addEventListener('input', function () { renderBusca(inp.value); });
    win.addEventListener('resize', aoRedimensionar);
    doc.addEventListener('keydown', teclas, true);
    root.setAttribute('tabindex', '-1'); root.focus({ preventScroll: true });
  }
  function aoRedimensionar() { if (cal) cal.trilho.scrollTo({ left: cal.atual * cal.trilho.clientWidth, behavior: 'auto' }); }
  function teclas(e) {
    if (!cal || e.key !== 'Escape' || dia) return;
    if (!cal.busca.hidden) { e.preventDefault(); e.stopPropagation(); alternarBusca(false); return; }
    if (win.Selecao && win.Selecao.ativa()) return;
    e.preventDefault(); e.stopPropagation(); fechar();
  }
  function fechar() {
    if (!cal) return;
    fecharDia(true);
    win.removeEventListener('resize', aoRedimensionar); doc.removeEventListener('keydown', teclas, true);
    var vf = cal.voltarFoco; cal.root.remove(); cal = null; doc.documentElement.classList.remove('cal-aberto');
    if (vf && vf.focus && vf.isConnected) { try { vf.focus({ preventScroll: true }); } catch (_) {} }
  }

  /* ---- busca ---- */
  function alternarBusca(forcar) {
    var abrirB = typeof forcar === 'boolean' ? forcar : cal.busca.hidden;
    cal.busca.hidden = !abrirB; cal.titBox.hidden = abrirB; cal.res.hidden = !abrirB; cal.bL.setAttribute('aria-expanded', String(abrirB));
    cal.root.classList.toggle('is-buscando', abrirB);
    if (abrirB) { cal.inp.value = ''; renderBusca(''); cal.inp.focus(); } else cal.inp.blur();
  }
  function renderBusca(q) {
    var box = cal.res; box.textContent = ''; var t = fold(q).trim();
    if (!t) { var d = mk('p', 'cal-res-dica'); d.textContent = T('Digite o nome de uma data comemorativa ou de um evento que você marcou.'); box.appendChild(d); return; }
    var achados = [], vistos = {}, ano = (parse(cal ? hojeIso() : null) || new Date()).getFullYear();
    var anoVisivel = deIdx(cal.atual).y, anos = {}; [ano - 1, ano, ano + 1, ano + 2, anoVisivel].forEach(function (a) { if (a >= MIN_Y && a <= MAX_Y) anos[a] = 1; });
    Object.keys(anos).forEach(function (a) {
      var m = feriadosDoAno(+a);
      Object.keys(m).forEach(function (k) { m[k].forEach(function (f) { if (fold(f.nome).indexOf(t) >= 0 || fold(fmt(parse(k), { day: 'numeric', month: 'long' })).indexOf(t) >= 0) { var c = k + f.nome; if (!vistos[c]) { vistos[c] = 1; achados.push({ k: k, nome: f.nome, cor: f.cor, sub: T(TIPO_NOME[f.tipo]) }); } } }); });
    });
    eventos.forEach(function (e) { if (fold(e.titulo + ' ' + e.texto).indexOf(t) >= 0) achados.push({ k: e.data, nome: e.titulo.trim() || T('Evento'), cor: COR.e, sub: T('Seu evento') + (e.hora ? ' · ' + e.hora : '') }); });
    achados.sort(function (a, b) { return a.k < b.k ? -1 : a.k > b.k ? 1 : 0; });
    if (!achados.length) { var n = mk('p', 'cal-res-dica'); n.textContent = T('Nada encontrado.'); box.appendChild(n); return; }
    achados.slice(0, 60).forEach(function (a) {
      var b = mk('button', 'cal-res-i', { type: 'button' });
      var ponto = mk('span', 'cal-res-ponto'); ponto.style.background = a.cor;
      var tx = mk('span', 'cal-res-tx'), s1 = mk('strong'), s2 = mk('span');
      s1.textContent = a.nome; s2.textContent = fmt(parse(a.k), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + a.sub;
      tx.appendChild(s1); tx.appendChild(s2); b.appendChild(ponto); b.appendChild(tx);
      b.addEventListener('click', function () { var d = parse(a.k); alternarBusca(false); irPara(idx(d.getFullYear(), d.getMonth()), false); abrirDia(a.k); });
      box.appendChild(b);
    });
  }

  /* ===================== dia: Resumo do dia | Agendar ===================== */
  var dia = null;
  function abrirDia(k, aba) {
    if (dia || !cal) return;
    var dt = parse(k); if (!dt) return;
    var root = mk('section', 'cal-dia', { role: 'dialog', 'aria-modal': 'true', 'aria-label': fmt(dt, { day: 'numeric', month: 'long', year: 'numeric' }) });
    root.setAttribute('data-no-tab-swipe', 'true');
    var topo = mk('header', 'cal-dia-topo');
    var bX = mk('button', 'cal-btn', { type: 'button', 'aria-label': T('Fechar'), title: T('Fechar') }); bX.innerHTML = svg(ICO.x);
    var seg = mk('div', 'cal-seg', { role: 'tablist', 'aria-label': T('Dia') });
    var ind = mk('span', 'cal-seg-ind', { 'aria-hidden': 'true' });
    var t0 = mk('button', 'cal-seg-b', { type: 'button', role: 'tab', id: 'cal-tab-resumo' }); t0.textContent = T('Resumo do dia');
    var t1 = mk('button', 'cal-seg-b', { type: 'button', role: 'tab', id: 'cal-tab-agendar' }); t1.textContent = T('Agendar');
    seg.appendChild(ind); seg.appendChild(t0); seg.appendChild(t1);
    topo.appendChild(bX); topo.appendChild(seg); topo.appendChild(mk('span', 'cal-topo-gap', { 'aria-hidden': 'true' }));
    var cab = mk('p', 'cal-dia-data'); cab.textContent = fmt(dt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var trilho = mk('div', 'cal-dia-trilho');
    var pResumo = mk('div', 'cal-dia-pane', { role: 'tabpanel', 'aria-labelledby': 'cal-tab-resumo' });
    var pAgendar = mk('div', 'cal-dia-pane', { role: 'tabpanel', 'aria-labelledby': 'cal-tab-agendar' });
    trilho.appendChild(pResumo); trilho.appendChild(pAgendar);
    root.appendChild(topo); root.appendChild(cab); root.appendChild(trilho);
    doc.body.appendChild(root);
    dia = { k: k, dt: dt, root: root, trilho: trilho, pResumo: pResumo, pAgendar: pAgendar, ind: ind, t0: t0, t1: t1, cur: null, timer: 0, sujo: false, aba: 0, lista: null };
    var lista = mk('div', 'cal-resumo');
    pResumo.appendChild(lista); dia.lista = lista;
    montarAgendar(); renderResumo();

    function vaiPara(i, suave) { trilho.scrollTo({ left: i * trilho.clientWidth, behavior: suave ? 'smooth' : 'auto' }); }
    function sincronizar() {
      var w = trilho.clientWidth || 1, p = Math.max(0, Math.min(1, trilho.scrollLeft / w));
      ind.style.transform = 'translateX(' + (p * 100) + '%)';
      var a = p > .5 ? 1 : 0; dia.aba = a;
      t0.setAttribute('aria-selected', String(a === 0)); t1.setAttribute('aria-selected', String(a === 1));
      t0.classList.toggle('is-on', a === 0); t1.classList.toggle('is-on', a === 1);
    }
    t0.addEventListener('click', function () { vaiPara(0, true); });
    t1.addEventListener('click', function () { vaiPara(1, true); });
    trilho.addEventListener('scroll', sincronizar, { passive: true });
    dia.vaiPara = vaiPara;
    bX.addEventListener('click', function () { fecharDia(true); });
    doc.addEventListener('keydown', teclaDia, true);
    vaiPara(aba === 1 ? 1 : 0, false); sincronizar();
    win.setTimeout(function () { vaiPara(aba === 1 ? 1 : 0, false); sincronizar(); }, 0);
    root.setAttribute('tabindex', '-1'); root.focus({ preventScroll: true });
  }
  function teclaDia(e) {
    if (e.key !== 'Escape' || !dia) return;
    if (win.Selecao && win.Selecao.ativa()) return;
    e.preventDefault(); e.stopPropagation(); fecharDia(true);
  }
  function fecharDia() {
    if (!dia) return;
    salvarAgora();
    if (win.Selecao) win.Selecao.sair();
    doc.removeEventListener('keydown', teclaDia, true);
    dia.root.remove(); dia = null;
    if (cal) { refazerPaginaAtual(); }
  }

  function cartao(e, h) { // mesmo balão dos comunicados: dia, mês e hora | divisória | título e descrição
    var art = mk('article', 'com-card' + (e ? ' cal-ev' : ' cal-fer'));
    var d = parse(h.k), time = mk('time', 'com-date');
    time.appendChild(mk('span', 'com-day')).textContent = String(d.getDate());
    time.appendChild(mk('span', 'com-mon')).textContent = fmt(d, { month: 'short' }).replace('.', '');
    if (d.getFullYear() !== new Date().getFullYear()) time.appendChild(mk('span', 'com-yr')).textContent = String(d.getFullYear());
    if (h.hora) time.appendChild(mk('span', 'com-time')).textContent = h.hora;
    var main = mk('div', 'com-main'), t = mk('h3', 'com-title'); t.textContent = h.titulo; main.appendChild(t);
    var corpo = mk('div', 'com-body');
    String(h.texto || '').split(/\n+/).forEach(function (l) { if (l.trim()) { var p = mk('p'); p.textContent = l; corpo.appendChild(p); } });
    if (h.imgs) { var im = mk('p', 'cal-imgs'); im.textContent = h.imgs === 1 ? T('1 imagem') : h.imgs + ' ' + T('imagens'); corpo.appendChild(im); }
    if (corpo.childNodes.length) main.appendChild(corpo);
    art.appendChild(time); art.appendChild(main);
    if (h.cor) art.style.setProperty('--cal-cor', h.cor);
    return art;
  }
  function renderResumo() {
    if (!dia) return;
    var lista = dia.lista; lista.textContent = '';
    var fers = feriadosEm(dia.k), evs = porDia[dia.k] || [];
    if (!fers.length && !evs.length) {
      var v = mk('div', 'cal-vazio'), s = mk('strong'), p = mk('span'), b = mk('button', 'cal-vazio-btn', { type: 'button' });
      s.textContent = T('Nada marcado neste dia'); p.textContent = T('Toque em Agendar para criar um evento.'); b.textContent = T('Agendar');
      b.addEventListener('click', function () { dia.vaiPara(1, true); });
      v.appendChild(s); v.appendChild(p); v.appendChild(b); lista.appendChild(v); return;
    }
    fers.forEach(function (f) { lista.appendChild(cartao(null, { k: dia.k, titulo: f.nome, texto: T(TIPO_NOME[f.tipo]), cor: f.cor })); });
    evs.forEach(function (e) {
      var a = cartao(e, { k: e.data, hora: e.hora, titulo: e.titulo.trim() || T('Sem título'), texto: e.texto.slice(0, 600), imgs: (String(e.html || '').match(/data-img=/g) || []).length, cor: COR.e });
      a.setAttribute('data-id', e.id); a.setAttribute('tabindex', '0'); a.setAttribute('role', 'button');
      a.addEventListener('click', function () { editar(e.id); });
      a.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); editar(e.id); } });
      lista.appendChild(a);
    });
    if (win.Selecao && !lista._selecao) win.Selecao.anexar({
      container: lista, item: '.cal-ev', id: function (el) { return el.getAttribute('data-id'); }, padding: '.cal-ev',
      aoExcluir: function (ids) {
        var set = {}; ids.forEach(function (i) { set[i] = 1; });
        if (dia && dia.cur && set[dia.cur]) novoEvento();
        eventos = eventos.filter(function (e) { return !set[e.id]; }); reindexar(); gravar(); renderResumo(); if (cal) refazerPaginaAtual();
        toast(ids.length === 1 ? T('Evento excluído.') : T('Eventos excluídos.'));
      }
    });
  }

  /* ---- Agendar: mesmo editor da Agenda (título, negrito/itálico/sublinhado, lista, imagem e texto), em tela inteira ---- */
  function montarAgendar() {
    var p = dia.pAgendar;
    var wrap = mk('div', 'cal-ag');
    var tit = mk('input', 'notas-title-input cal-ag-titulo', { type: 'text', maxlength: String(MAX_TITULO), placeholder: T('Título do evento'), 'aria-label': T('Título do evento'), autocomplete: 'off' });
    var hora = mk('label', 'cal-ag-hora'), hs = mk('span'), hi = mk('input', 'cal-ag-hora-in', { type: 'time', 'aria-label': T('Horário') });
    hs.textContent = T('Horário'); hora.appendChild(hs); hora.appendChild(hi);
    var status = mk('p', 'cal-ag-status', { 'aria-live': 'polite' });
    var rico = null;
    if (win.NotasRich) {
      rico = win.NotasRich.create({
        placeholder: T('Descrição do evento. Fica salvo neste aparelho.'), label: T('Descrição do evento'), maxText: MAX_TEXTO,
        onChange: function (html, texto) { dia.html = html; dia.texto = texto; aoEditar(); },
        onStatus: function (m) { status.textContent = m; }
      });
      rico.load({ html: '', text: '' });
    }
    var linhaBt = mk('div', 'cal-ag-acoes');
    var bNovo = mk('button', 'cal-ag-novo', { type: 'button' }); bNovo.textContent = T('Novo evento'); bNovo.hidden = true;
    var bDel = mk('button', 'cal-ag-del', { type: 'button' }); bDel.textContent = T('Excluir evento'); bDel.hidden = true;
    linhaBt.appendChild(bNovo); linhaBt.appendChild(bDel);
    wrap.appendChild(tit); wrap.appendChild(hora); if (rico) wrap.appendChild(rico.root); wrap.appendChild(status); wrap.appendChild(linhaBt);
    p.appendChild(wrap);
    Object.assign(dia, { tit: tit, hora: hi, rico: rico, status: status, bNovo: bNovo, bDel: bDel, html: '', texto: '' });
    tit.addEventListener('input', aoEditar); hi.addEventListener('input', aoEditar);
    bNovo.addEventListener('click', novoEvento);
    var armado = false;
    bDel.addEventListener('click', function () {
      if (!armado) { armado = true; bDel.textContent = T('Confirmar exclusão'); bDel.classList.add('is-danger'); win.setTimeout(function () { armado = false; bDel.textContent = T('Excluir evento'); bDel.classList.remove('is-danger'); }, 3500); return; }
      armado = false; bDel.classList.remove('is-danger'); bDel.textContent = T('Excluir evento');
      if (dia.cur) { var id = dia.cur; eventos = eventos.filter(function (e) { return e.id !== id; }); reindexar(); gravar(); }
      novoEvento(); renderResumo(); if (cal) refazerPaginaAtual(); dia.vaiPara(0, true); toast(T('Evento excluído.'));
    });
  }
  function vazio() { return !dia.tit.value.trim() && !String(dia.texto || '').trim() && !(win.NotasRich && win.NotasRich.hasImg && win.NotasRich.hasImg(dia.html)); }
  function aoEditar() {
    if (!dia) return;
    dia.sujo = true; dia.status.textContent = T('Salvando…');
    clearTimeout(dia.timer); dia.timer = win.setTimeout(salvarAgora, 350);
  }
  function salvarAgora() {
    if (!dia) return; clearTimeout(dia.timer); if (!dia.sujo) return; dia.sujo = false;
    if (vazio() && !dia.cur) { dia.status.textContent = ''; return; }
    var ev = dia.cur ? eventos.filter(function (e) { return e.id === dia.cur; })[0] : null;
    if (!ev) {
      if (eventos.length >= MAX_EV) { dia.status.textContent = T('Limite de eventos atingido.'); return; }
      ev = { id: novoId(), data: dia.k }; eventos.push(ev); dia.cur = ev.id;
    }
    ev.titulo = dia.tit.value.slice(0, MAX_TITULO); ev.hora = /^\d{2}:\d{2}$/.test(dia.hora.value) ? dia.hora.value : '';
    ev.html = dia.html || ''; ev.texto = String(dia.texto || '').slice(0, MAX_TEXTO); ev.upd = Date.now();
    reindexar();
    dia.status.textContent = gravar() ? T('Salvo') : T('Não foi possível salvar neste aparelho.');
    dia.bNovo.hidden = false; dia.bDel.hidden = false;
    renderResumo(); if (cal) refazerPaginaAtual();
  }
  function novoEvento() {
    if (!dia) return; salvarAgora();
    dia.cur = null; dia.sujo = false; dia.tit.value = ''; dia.hora.value = ''; dia.html = ''; dia.texto = '';
    if (dia.rico) dia.rico.load({ html: '', text: '' });
    dia.status.textContent = ''; dia.bNovo.hidden = true; dia.bDel.hidden = true;
  }
  function editar(id) {
    var e = eventos.filter(function (x) { return x.id === id; })[0]; if (!e || !dia) return;
    salvarAgora();
    dia.cur = e.id; dia.sujo = false; dia.tit.value = e.titulo; dia.hora.value = e.hora || ''; dia.html = e.html || ''; dia.texto = e.texto || '';
    if (dia.rico) dia.rico.load({ html: e.html || '', text: e.texto || '' });
    dia.status.textContent = ''; dia.bNovo.hidden = false; dia.bDel.hidden = false;
    dia.vaiPara(1, true);
  }

  win.addEventListener('pagehide', function () { try { salvarAgora(); } catch (_) {} });
  win.Calendario = { abrir: abrir, fechar: fechar, feriadosDoAno: feriadosDoAno, pascoa: pascoa, aberto: function () { return !!cal; }, _eventos: function () { return eventos.slice(); } };
})();
