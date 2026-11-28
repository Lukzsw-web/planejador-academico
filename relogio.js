/* Relógio do Planejador Acadêmico: Cronômetro e Temporizador, 100% local.
 * Menu flutuante com três abas: Agenda · Cronômetro · Temporizador (tocar ou deslizar de lado).
 * Cronômetro: mostrador com ponteiro que dá uma volta por minuto; "Marcar" registra Número, Tempo marcado (mm:ss,mmm) e Nome (opcional).
 * Temporizador: três roletas (horas, minutos, segundos) que giram deslizando para cima/baixo, atalhos que SOMAM tempo,
 *   e uma tela de contagem em que o disco vai se abrindo até acabar. No fim toca um aviso (Web Audio) e vibra.
 * O estado continua correndo se a tela for fechada (usa o relógio do sistema, não contagem de quadros). */
(function () {
  'use strict';
  var doc = document, win = window, NS = 'http://www.w3.org/2000/svg';
  function T(x) { return typeof win.T === 'function' ? win.T(x) : x; }
  function mk(tag, cls, attrs) {
    var el = doc.createElement(tag); if (cls) el.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
  function sv(tag, attrs) { var el = doc.createElementNS(NS, tag); if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); }); return el; }
  function pad(n, l) { var s = String(n); while (s.length < (l || 2)) s = '0' + s; return s; }
  function agora() { return win.performance && performance.now ? performance.now() : Date.now(); }
  function txt(el, v) { if (el.textContent !== v) el.textContent = v; }

  /* ---------- formatação (pura; testável) ---------- */
  function fmtCrono(ms) {
    ms = Math.max(0, Math.floor(ms)); var cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000) % 60, h = Math.floor(ms / 3600000);
    return { corpo: (h ? pad(h) + ':' : '') + pad(m) + ':' + pad(s), cs: pad(cs) };
  }
  function fmtMarca(ms) {   // mm:ss,mmm (com horas quando passa de 1 h)
    ms = Math.max(0, Math.floor(ms)); var mi = ms % 1000, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000) % 60, h = Math.floor(ms / 3600000);
    return (h ? h + ':' : '') + pad(m) + ':' + pad(s) + ',' + pad(mi, 3);
  }
  function fmtTemp(ms) {
    var tot = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(tot / 3600), m = Math.floor(tot / 60) % 60, s = tot % 60;
    return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s);
  }
  function rotuloTotal(ms) {   // "15 min", "1 h 30 min", "45 s"
    var tot = Math.round(ms / 1000), h = Math.floor(tot / 3600), m = Math.floor(tot / 60) % 60, s = tot % 60, p = [];
    if (h) p.push(h + ' h'); if (m) p.push(m + ' min'); if (s) p.push(s + ' s');
    return p.join(' ') || '0 s';
  }
  function hhmm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  /* ---------- estado (vive enquanto a página estiver aberta) ---------- */
  var cr = { rodando: false, base: 0, inicio: 0, voltas: [] };
  function crMs() { return cr.base + (cr.rodando ? agora() - cr.inicio : 0); }
  var tp = { rodando: false, total: 0, restante: 0, fimEm: 0, fimData: 0, h: 0, m: 0, s: 0, tocando: false };
  function tpRestante() { return tp.rodando ? Math.max(0, tp.fimEm - agora()) : tp.restante; }
  function tpAjuste() { return (tp.h * 3600 + tp.m * 60 + tp.s) * 1000; }

  /* ---------- aviso sonoro ---------- */
  var ctx = null, bipeTimer = 0, bipeFim = 0;
  function audio() { try { var A = win.AudioContext || win.webkitAudioContext; if (!ctx && A) ctx = new A(); if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (_) {} return ctx; }
  function bipe() {
    var c = audio(); if (!c) return;
    try {
      [0, .22, .44].forEach(function (d) {
        var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, c.currentTime + d); g.gain.exponentialRampToValueAtTime(0.35, c.currentTime + d + .02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d + .18);
        o.connect(g); g.connect(c.destination); o.start(c.currentTime + d); o.stop(c.currentTime + d + .2);
      });
    } catch (_) {}
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (_) {}
  }
  function tocar() { pararAviso(); tp.tocando = true; bipeFim = Date.now() + 30000; bipe(); bipeTimer = win.setInterval(function () { if (Date.now() > bipeFim) pararAviso(); else bipe(); }, 1500); }
  function pararAviso() { clearInterval(bipeTimer); bipeTimer = 0; tp.tocando = false; }

  var vista = null, raf = 0, verificador = 0;
  function terminou() {
    tp.rodando = false; tp.restante = 0; tocar();
    if (typeof win.showToast === 'function') win.showToast({ text: T('Tempo esgotado.') });
    desenhar();
  }
  function verificar() { if (tp.rodando && tpRestante() <= 0) terminou(); }

  /* ---------- ícones ---------- */
  var IC = {
    agenda: '<rect x="5.2" y="3.4" width="14" height="17.2" rx="2"></rect><path d="M3 7.6h2.2M3 12h2.2M3 16.4h2.2"></path><path d="M9.6 8.2h6M9.6 12h6M9.6 15.8h3.4"></path>',
    crono: '<circle cx="12" cy="13.5" r="7.3"></circle><path d="M12 13.5V9.6M9.6 3.4h4.8M18.2 6.6l1.3-1.3"></path>',
    ampulheta: '<path d="M7 3.5h10M7 20.5h10"></path><path d="M8 3.5c0 4.2 3 5.4 4 8.5-1 3.100-4 4.300-4 8.500M16 3.500c0 4.200-3 5.400-4 8.500 1 3.100 4 4.300 4 8.500"></path>',
    relogio: '<circle cx="12" cy="12" r="8.200"></circle><path d="M12 7.500V12l3 2"></path>'
  };
  function icone(k) { var s = sv('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }); s.innerHTML = IC[k]; return s; }

  /* ---------- tela ---------- */
  function abrir(qual) {
    if (vista) { if (qual) ir(qual === 'temporizador' ? 2 : qual === 'agenda' ? 0 : 1, true); return; }
    var voltarFoco = doc.activeElement;
    var root = mk('section', 'rel-root', { role: 'dialog', 'aria-modal': 'true', 'aria-label': T('Relógio') });
    root.setAttribute('data-no-tab-swipe', 'true');
    var trilho = mk('div', 'rel-trilho'), pAg = mk('div', 'rel-pane rel-p-ag', { role: 'tabpanel', 'aria-label': T('Agenda do relógio') }), pCr = mk('div', 'rel-pane', { role: 'tabpanel', 'aria-label': T('Cronômetro') }), pTp = mk('div', 'rel-pane', { role: 'tabpanel', 'aria-label': T('Temporizador') });
    trilho.appendChild(pAg); trilho.appendChild(pCr); trilho.appendChild(pTp);
    var nav = mk('nav', 'rel-nav', { role: 'tablist', 'aria-label': T('Relógio') }), ind = mk('span', 'rel-nav-ind', { 'aria-hidden': 'true' });
    nav.appendChild(ind);
    var abas = [['agenda', 'Agenda'], ['crono', 'Cronômetro'], ['ampulheta', 'Temporizador']].map(function (a, i) {
      var b = mk('button', 'rel-nav-b', { type: 'button', role: 'tab', 'aria-label': T(a[1]), title: T(a[1]) });
      b.appendChild(icone(a[0])); nav.appendChild(b);
      b.addEventListener('click', function () { ir(i, true); });
      return b;
    });
    var voltar = mk('button', 'rel-voltar', { type: 'button', 'aria-label': T('Voltar') });
    voltar.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"></path></svg><span></span>';
    voltar.lastChild.textContent = T('Voltar');
    voltar.addEventListener('click', function () { fechar(); });
    root.appendChild(trilho); root.appendChild(voltar); root.appendChild(nav);
    doc.body.appendChild(root); doc.documentElement.classList.add('rel-aberto');
    vista = { atual: 1, root: root, trilho: trilho, voltarFoco: voltarFoco, abas: abas, ind: ind, pane: [pAg, pCr, pTp] };
    montarAgenda(pAg); montarCrono(pCr); montarTemp(pTp);
    trilho.addEventListener('scroll', sincronizar, { passive: true });
    doc.addEventListener('keydown', tecla, true);
    ir(qual === 'temporizador' ? 2 : qual === 'agenda' ? 0 : 1, false);
    root.setAttribute('tabindex', '-1'); root.focus({ preventScroll: true });
    desenhar(true); laco();
  }
  function ir(i, suave) { if (!vista) return; var t = vista.trilho; t.scrollTo({ left: i * t.clientWidth, behavior: suave ? 'smooth' : 'auto' }); if (!suave) sincronizar(); }
  function sincronizar() {
    if (!vista) return;
    var t = vista.trilho, w = t.clientWidth || 1, p = Math.max(0, Math.min(2, t.scrollLeft / w)), a = Math.round(p);
    vista.ind.style.transform = 'translateX(' + (p * 100) + '%)';
    vista.abas.forEach(function (b, i) { b.classList.toggle('is-on', i === a); b.setAttribute('aria-selected', String(i === a)); });
    if (a === 0 && vista.atual !== 0 && vista.ag && !vista.ag.editando) vista.ag.atualizar();
    vista.atual = a;
  }
  function tecla(e) { if (e.key === 'Escape' && vista) { e.preventDefault(); e.stopPropagation(); if (vista.ag && vista.ag.editando) { vista.ag.fecharEditor(); return; } fechar(); } }
  function fechar(semFoco) {
    if (!vista) return;
    if (vista.ag) vista.ag.descarregar();
    cancelAnimationFrame(raf); clearTimeout(vista.fT); raf = 0; doc.removeEventListener('keydown', tecla, true);
    var vf = vista.voltarFoco; vista.root.remove(); vista = null; doc.documentElement.classList.remove('rel-aberto');
    if (!semFoco && vf && vf.focus && vf.isConnected) { try { vf.focus({ preventScroll: true }); } catch (_) {} }
  }
  // quadro a quadro enquanto algo anda; devagar quando está parado (poupa bateria)
  function laco() {
    if (!vista) return;
    desenhar();
    if (cr.rodando || tp.rodando) raf = requestAnimationFrame(laco);
    else vista.fT = win.setTimeout(function () { laco(); }, 250);
  }
  function acordar() { if (vista) { cancelAnimationFrame(raf); clearTimeout(vista.fT); laco(); } }

  function botao(txt, cls, aria) { var b = mk('button', 'rel-bt ' + (cls || ''), { type: 'button' }); b.textContent = txt; if (aria) b.setAttribute('aria-label', aria); return b; }

  /* mostrador com 60 marcas; majors a cada 5 */
  function mostrador(comPonteiro) {
    var cx = mk('div', 'rel-dial'), s = sv('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' });
    for (var i = 0; i < 60; i++) {
      var maj = i % 5 === 0, a = i * 6 * Math.PI / 180, r1 = maj ? 43.9 : 45.6, r2 = 49.6;
      var l = sv('line', { x1: (50 + r1 * Math.sin(a)).toFixed(2), y1: (50 - r1 * Math.cos(a)).toFixed(2), x2: (50 + r2 * Math.sin(a)).toFixed(2), y2: (50 - r2 * Math.cos(a)).toFixed(2) });
      l.setAttribute('class', 'rel-marca' + (maj ? ' maj' : '')); s.appendChild(l);
    }
    cx.appendChild(s); return { cx: cx, svg: s };
  }


  /* ---------- agenda do relógio: anotações guardadas no mesmo caderno da Agenda central (rótulo "Relógio"), com o mesmo editor ---------- */
  var ROT_AG = 'Relógio';
  var IC_NOVO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V12"></path><path d="M18.4 2.7a2.1 2.1 0 0 1 2.9 2.9L11.6 15.3 7.7 16.3l1-3.9z"></path></svg>';
  function nucleoNotas() { var N = win.Notas; return N && N._core && N._core.st ? N._core : null; }
  function montarAgenda(p) {
    var C = nucleoNotas(), ag = { editando: null, timer: 0, fecharEditor: fecharEd, descarregar: salvarJa };
    var tit = mk('h2', 'rel-ag-t'); tit.textContent = T('Agenda do Relógio');
    var corpo = mk('div', 'rel-ag-corpo');
    var lista = mk('ul', 'rel-ag-lista', { 'aria-label': T('Anotações do relógio') }), vazio = mk('p', 'rel-ag-vazio');
    vazio.textContent = T('Nenhuma anotação ainda.');
    var novo = mk('button', 'rel-ag-novo', { type: 'button', 'aria-label': T('Nova anotação'), title: T('Nova anotação') }); novo.innerHTML = IC_NOVO;
    var ed = mk('div', 'rel-ag-ed'), ti = mk('input', 'rel-ag-ti', { type: 'text', maxlength: String(C ? C.MAX_TITLE : 80), 'aria-label': T('Título da anotação'), placeholder: T('Título') }),
        ba = mk('div', 'rel-ag-acoes'), bOk = mk('button', 'rel-ag-b', { type: 'button' }), bDel = mk('button', 'rel-ag-b is-del', { type: 'button' }), st = mk('p', 'rel-ag-status', { role: 'status' });
    var rico = null;
    if (C && win.NotasRich) rico = win.NotasRich.create({
      placeholder: T('Escreva aqui. Fica salvo neste aparelho.'), label: T('Texto da anotação'), maxText: C.MAX_TEXT,
      onChange: function (html, text) { var n = ag.editando; if (!n) return; n.html = html; n.text = text; agendar(); },
      onStatus: function (m, warn) { st.textContent = m; st.classList.toggle('is-warn', !!warn); }
    });
    bOk.textContent = T('Concluir'); bDel.textContent = T('Excluir');
    ba.appendChild(bDel); ba.appendChild(bOk); ed.appendChild(ti); if (rico) ed.appendChild(rico.root); ed.appendChild(st); ed.appendChild(ba); ed.hidden = true;
    corpo.appendChild(lista); corpo.appendChild(vazio); corpo.appendChild(ed);
    p.appendChild(tit); p.appendChild(corpo); p.appendChild(novo);
    ag.p = p;
    function minhas() { return C ? C.st.notes.filter(function (n) { return n.label === ROT_AG && !n.code && C.filled(n); }).sort(function (a, b) { return b.updated - a.updated; }) : []; }
    function persistir() { if (!C) return; C.save(); try { C.refreshMarks(); if (C.agendaOpen()) C.renderAgenda(); } catch (_) {} try { if (win.NotasRich && win.NotasRich.gc) win.NotasRich.gc(C.st.notes); } catch (_) {} }
    function aplicar() { var n = ag.editando; if (!n) return; var t = ti.value.slice(0, C.MAX_TITLE); if (t !== n.title) n.title = t; n.updated = Date.now(); }
    function salvarJa() { if (ag.timer) { clearTimeout(ag.timer); ag.timer = 0; } if (ag.editando) aplicar(); persistir(); }
    function agendar() { aplicar(); st.textContent = T('Salvando…'); st.classList.remove('is-warn'); if (ag.timer) clearTimeout(ag.timer); ag.timer = win.setTimeout(function () { ag.timer = 0; persistir(); st.textContent = T('Salvo neste aparelho.'); }, 350); }
    function previa(n) {
      var t = String(n.text || '').replace(/\s+/g, ' ').trim();
      if (!t && win.NotasRich && win.NotasRich.hasImg(n.html)) return T('Imagem');
      return t.slice(0, 90);
    }
    function desenharLista() {
      lista.textContent = ''; var ns = minhas();
      if (!C) { vazio.hidden = false; vazio.textContent = T('Agenda indisponível neste momento.'); novo.disabled = true; return; }
      vazio.hidden = !!ns.length; lista.hidden = !ns.length; vazio.textContent = T('Nenhuma anotação ainda.');
      ns.forEach(function (n) {
        var li = mk('li'), b = mk('button', 'rel-ag-it', { type: 'button' }), a = mk('strong'), c = mk('span'), d = mk('small');
        a.textContent = n.title.trim() || previa(n) || T('Anotação');
        c.textContent = n.title.trim() ? previa(n) : '';
        try { d.textContent = new Date(n.updated).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (_) {}
        b.appendChild(a); if (c.textContent) b.appendChild(c); b.appendChild(d);
        b.addEventListener('click', function () { abrirEd(n); });
        li.appendChild(b); lista.appendChild(li);
      });
    }
    function abrirEd(n) {
      ag.editando = n; ti.value = n.title; if (rico) rico.load(n); st.textContent = '';
      ed.hidden = false; lista.hidden = true; vazio.hidden = true; novo.hidden = true; tit.hidden = true;
      p.classList.add('is-editando'); vista && vista.root.classList.add('rel-digitando', 'rel-ed');
      try { if (n.title || n.text) { if (rico) rico.focus(); } else ti.focus({ preventScroll: true }); } catch (_) {}
    }
    function fecharEd() {
      if (!ag.editando) return; if (ag.timer) { clearTimeout(ag.timer); ag.timer = 0; }
      aplicar(); var n = ag.editando; ag.editando = null;
      if (!C.filled(n)) { var i = C.st.notes.indexOf(n); if (i >= 0) C.st.notes.splice(i, 1); }
      persistir(); ed.hidden = true; novo.hidden = false; tit.hidden = false; p.classList.remove('is-editando');
      if (doc.activeElement && doc.activeElement.blur) doc.activeElement.blur();
      if (vista) { vista.root.classList.remove('rel-digitando', 'rel-ed'); win.setTimeout(function () { if (vista) { ir(0, false); corpo.scrollTop = 0; } try { win.scrollTo(0, 0); } catch (_) {} }, 60); }
      desenharLista();
    }
    novo.addEventListener('click', function () {
      if (!C) return;
      if (C.st.notes.length >= 60) { vazio.hidden = false; vazio.textContent = T('Limite de anotações atingido.'); return; }
      var n = { id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label: ROT_AG, code: null, title: '', text: '', html: '', fav: false, updated: Date.now() };
      C.st.notes.push(n); abrirEd(n);
    });
    ti.addEventListener('input', agendar);
    ti.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (rico) rico.focus(); } });
    bOk.addEventListener('click', fecharEd);
    bDel.addEventListener('click', function () {
      if (!bDel.dataset.sure) { bDel.dataset.sure = '1'; bDel.textContent = T('Excluir?'); win.setTimeout(function () { delete bDel.dataset.sure; bDel.textContent = T('Excluir'); }, 3200); return; }
      delete bDel.dataset.sure; bDel.textContent = T('Excluir');
      var n = ag.editando; if (!n) return; ag.editando = null; if (ag.timer) { clearTimeout(ag.timer); ag.timer = 0; }
      var i = C.st.notes.indexOf(n); if (i >= 0) C.st.notes.splice(i, 1);
      persistir(); ed.hidden = true; novo.hidden = false; tit.hidden = false; p.classList.remove('is-editando'); vista && vista.root.classList.remove('rel-digitando', 'rel-ed'); desenharLista();
    });
    ag.atualizar = desenharLista; desenharLista();
    vista.ag = ag;
  }

  /* ---------- cronômetro ---------- */
  var CORES = [152, 205, 28, 340, 265, 45];
  function montarCrono(p) {
    p.classList.add('rel-p-crono');
    var D = mostrador(), disco = mk('div', 'rel-disco'), visor = mk('div', 'rel-visor', { role: 'timer', 'aria-live': 'off' });
    var ponteiro = sv('g', { 'class': 'rel-pont' });
    ponteiro.appendChild(sv('line', { x1: 50, y1: 56.5, x2: 50, y2: 6.5, 'stroke-width': 1.3, 'stroke-linecap': 'round' }));
    ponteiro.appendChild(sv('circle', { cx: 50, cy: 50, r: 2.4 }));
    var mao = sv('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', 'class': 'rel-mao' });
    var pontV = sv('g', { 'class': 'rel-pont-v' }); pontV.appendChild(sv('line', { x1: 50, y1: 53, x2: 50, y2: 4.6, 'stroke-width': .55, 'stroke-linecap': 'round' })); pontV.style.display = 'none';
    mao.appendChild(pontV); mao.appendChild(ponteiro);
    disco.appendChild(visor); D.cx.appendChild(disco); D.cx.appendChild(mao);
    var painel = mk('div', 'rel-marcas'), cab = mk('div', 'rel-marcas-cab'), lista = mk('ol', 'rel-voltas', { 'aria-label': T('Tempos marcados') });
    ['Número', 'Tempo marcado', 'Nome'].forEach(function (t) { var s = mk('span'); s.textContent = T(t); cab.appendChild(s); });
    painel.appendChild(cab); painel.appendChild(lista);
    var linha = mk('div', 'rel-linha'), bMarca = botao(T('Marcar'), 'is-sec'), bGo = botao(T('Iniciar'), 'is-go');
    linha.appendChild(bMarca); linha.appendChild(bGo);
    p.appendChild(D.cx); p.appendChild(painel); p.appendChild(linha);
    vista.cr = { pane: p, visor: visor, ponteiro: ponteiro, pontV: pontV, bMarca: bMarca, bGo: bGo, lista: lista, n: -1, nome: '' };
    bGo.addEventListener('click', function () {
      if (cr.rodando) { cr.base = crMs(); cr.rodando = false; } else { cr.inicio = agora(); cr.rodando = true; }
      desenhar(); acordar();
    });
    bMarca.addEventListener('click', function () {
      if (cr.rodando) { cr.voltas.unshift({ n: cr.voltas.length + 1, ms: crMs(), nome: '', cor: CORES[cr.voltas.length % CORES.length] }); desenhar(true); }
      else if (cr.base > 0) { cr.base = 0; cr.voltas = []; desenhar(true); }   // parado: o botão vira "Zerar"
    });
  }
  function editarNome(cel, v) {
    cel.textContent = ''; var inp = mk('input', 'rel-nome-in', { type: 'text', maxlength: '24', 'aria-label': T('Nome da marcação'), placeholder: '' });
    inp.value = v.nome; cel.appendChild(inp);
    var tr0 = vista && vista.trilho, pos = vista ? vista.atual : 1;
    if (vista) vista.root.classList.add('rel-digitando');
    try { inp.focus({ preventScroll: true }); } catch (_) { inp.focus(); }
    var feito = false;
    function fim() {
      if (feito) return; feito = true; v.nome = inp.value.trim();
      if (vista) { vista.cr.n = -1; vista.root.classList.remove('rel-digitando', 'rel-ed'); }
      desenhar(true);
      win.setTimeout(function () { if (vista) { ir(pos, false); vista.pane.forEach(function (q) { q.scrollTop = 0; q.scrollLeft = 0; }); } try { win.scrollTo(0, 0); } catch (_) {} }, 60);
    }
    inp.addEventListener('blur', fim);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } else if (e.key === 'Escape') { e.stopPropagation(); inp.value = v.nome; inp.blur(); } });
  }

  /* ---------- temporizador ---------- */
  var ROT = [['h', 99, 'Horas'], ['m', 59, 'Minutos'], ['s', 59, 'Segundos']];
  function montarTemp(p) {
    p.classList.add('rel-p-temp');
    /* — ajuste — */
    var aj = mk('div', 'rel-ajuste');
    var rot = mk('div', 'rel-rot'), rol = mk('div', 'rel-rolos'), cols = [];
    ROT.forEach(function (r, i) {
      var l = mk('span'); l.textContent = T(r[2]); rot.appendChild(l);
      if (i) { var d = mk('span', 'rel-dois', { 'aria-hidden': 'true' }); d.textContent = ':'; rol.appendChild(d); }
      var c = mk('div', 'rel-rolo', { role: 'spinbutton', tabindex: '0', 'aria-label': T(r[2]), 'aria-valuemin': '0', 'aria-valuemax': String(r[1]) });
      var a = mk('span', 'rel-n rel-n-a'), b = mk('span', 'rel-n rel-n-b'), z = mk('span', 'rel-n rel-n-c');
      c.appendChild(a); c.appendChild(b); c.appendChild(z); rol.appendChild(c);
      cols.push({ el: c, a: a, b: b, z: z, k: r[0], max: r[1] });
      roleta(c, r[0], r[1]);
    });
    var pre = mk('div', 'rel-pre');
    [[10, '00:00:10'], [30, '00:00:30'], [60, '00:01:00']].forEach(function (x) {
      var b = mk('button', '', { type: 'button', 'aria-label': T('Somar') + ' ' + x[1] }); b.textContent = x[1];
      b.addEventListener('click', function () {
        var tot = Math.min(99 * 3600 + 59 * 60 + 59, tpAjuste() / 1000 + x[0]);
        tp.h = Math.floor(tot / 3600); tp.m = Math.floor(tot / 60) % 60; tp.s = tot % 60; desenhar();
      });
      pre.appendChild(b);
    });
    var l1 = mk('div', 'rel-linha rel-linha-um'), bIni = botao(T('Iniciar'), 'is-go');
    l1.appendChild(bIni);
    aj.appendChild(rot); aj.appendChild(rol); aj.appendChild(pre); aj.appendChild(l1);
    /* — contagem — */
    var ct = mk('div', 'rel-contagem'), D = mostrador(), pie = sv('path', { 'class': 'rel-fatia' });
    var disco = mk('div', 'rel-disco rel-disco-t');
    var sv2 = sv('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', 'class': 'rel-fatia-sv' }); sv2.appendChild(sv('circle', { cx: 50, cy: 50, r: 43, 'class': 'rel-trilha' })); sv2.appendChild(pie);
    D.cx.insertBefore(sv2, D.cx.firstChild);
    var tot = mk('span', 'rel-t-total'), vis = mk('div', 'rel-t-visor', { role: 'timer', 'aria-live': 'off' }), fim = mk('span', 'rel-t-fim');
    var ico = icone('relogio'), hora = mk('span'); fim.appendChild(ico); fim.appendChild(hora);
    disco.appendChild(tot); disco.appendChild(vis); disco.appendChild(fim); D.cx.appendChild(disco);
    var aviso = mk('p', 'rel-aviso', { role: 'status' }); aviso.textContent = T('Tempo esgotado.'); aviso.hidden = true;
    var l2 = mk('div', 'rel-linha'), bCan = botao(T('Cancelar'), 'is-sec'), bPa = botao(T('Pausar'), 'is-stop');
    l2.appendChild(bCan); l2.appendChild(bPa);
    ct.appendChild(D.cx); ct.appendChild(aviso); ct.appendChild(l2);
    p.appendChild(aj); p.appendChild(ct);
    vista.tp = { aj: aj, ct: ct, cols: cols, bIni: bIni, bCan: bCan, bPa: bPa, tot: tot, vis: vis, hora: hora, pie: pie, aviso: aviso, disco: disco };
    bIni.addEventListener('click', function () {
      audio(); var t = tpAjuste(); if (!t) return;
      tp.total = t; tp.restante = t; tp.fimEm = agora() + t; tp.fimData = Date.now() + t; tp.rodando = true; desenhar(); acordar();
    });
    bPa.addEventListener('click', function () {
      audio();
      if (tp.tocando) { pararAviso(); cancelarTemp(); desenhar(); return; }
      if (tp.rodando) { tp.restante = tpRestante(); tp.rodando = false; }
      else { tp.fimEm = agora() + tp.restante; tp.fimData = Date.now() + tp.restante; tp.rodando = true; }
      desenhar(); acordar();
    });
    bCan.addEventListener('click', function () { pararAviso(); cancelarTemp(); desenhar(); });
  }
  function cancelarTemp() { tp.rodando = false; tp.restante = 0; tp.total = 0; }

  /* roleta: deslizar para cima/baixo; também roda do mouse e setas */
  function roleta(el, chave, max) {
    var passo = 52, y0 = 0, acc = 0, ult = 0, vel = 0, tUlt = 0, ativo = false, inercia = 0;
    function mudar(d) { var n = max + 1; tp[chave] = ((tp[chave] + d) % n + n) % n; desenhar(); try { if (navigator.vibrate) navigator.vibrate(4); } catch (_) {} }
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ativo = true; y0 = ult = e.clientY; acc = 0; vel = 0; tUlt = e.timeStamp; clearInterval(inercia);
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    });
    el.addEventListener('pointermove', function (e) {
      if (!ativo) return;
      var dy = e.clientY - ult; ult = e.clientY; acc += dy;
      var dt = Math.max(1, e.timeStamp - tUlt); vel = .8 * vel + .2 * (dy / dt); tUlt = e.timeStamp;
      while (acc >= passo) { acc -= passo; mudar(-1); }     // dedo para baixo: valores menores
      while (acc <= -passo) { acc += passo; mudar(1); }
    });
    function soltar() {
      if (!ativo) return; ativo = false;
      var n = Math.round(Math.abs(vel) * 220 / passo), dir = vel < 0 ? 1 : -1;
      if (n >= 1) { var i = 0; inercia = win.setInterval(function () { mudar(dir); if (++i >= Math.min(n, 12)) clearInterval(inercia); }, 55); }
    }
    el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
    el.addEventListener('wheel', function (e) { e.preventDefault(); mudar(e.deltaY > 0 ? 1 : -1); }, { passive: false });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { e.preventDefault(); mudar(1); } else if (e.key === 'ArrowDown') { e.preventDefault(); mudar(-1); }
      else if (e.key === 'PageUp') { e.preventDefault(); mudar(5); } else if (e.key === 'PageDown') { e.preventDefault(); mudar(-5); }
    });
  }

  function fatia(frac) {   // frac = parte já gasta (0..1): a cunha some do 12h em sentido horário
    var R = 43, cx = 50, cy = 50;
    if (frac <= 0.0005) return 'M ' + (cx - R) + ' ' + cy + ' a ' + R + ' ' + R + ' 0 1 0 ' + (2 * R) + ' 0 a ' + R + ' ' + R + ' 0 1 0 ' + (-2 * R) + ' 0 Z';
    if (frac >= 0.9995) return '';
    var a = frac * 2 * Math.PI, x = cx + R * Math.sin(a), y = cy - R * Math.cos(a), grande = (1 - frac) > .5 ? 1 : 0;
    return 'M ' + cx + ' ' + cy + ' L ' + x.toFixed(3) + ' ' + y.toFixed(3) + ' A ' + R + ' ' + R + ' 0 ' + grande + ' 1 ' + cx + ' ' + (cy - R) + ' Z';
  }

  /* ---------- desenho ---------- */
  function desenhar(forcarVoltas) {
    verificar();
    if (!vista) return;
    var c = vista.cr, ms = crMs(), f = fmtCrono(ms);
    txt(c.visor, f.corpo + ',' + f.cs);
    c.ponteiro.setAttribute('transform', 'rotate(' + ((ms % 60000) / 60000 * 360).toFixed(2) + ' 50 50)');
    var temV = cr.voltas.length > 0; c.pontV.style.display = temV ? '' : 'none';
    if (temV) c.pontV.setAttribute('transform', 'rotate(' + (((ms - cr.voltas[0].ms) % 60000) / 60000 * 360).toFixed(2) + ' 50 50)');
    var run = cr.rodando, zero = !run && cr.base === 0, parado = !run && cr.base > 0;
    txt(c.bGo, run ? T('Parar') : (cr.base ? T('Continuar') : T('Iniciar')));
    c.bGo.classList.toggle('is-stop', run); c.bGo.classList.toggle('is-go', !run);
    txt(c.bMarca, parado ? T('Zerar') : T('Marcar')); c.bMarca.disabled = zero;
    c.bMarca.classList.toggle('is-off', zero);
    c.pane.classList.toggle('tem-marcas', cr.voltas.length > 0);
    if (forcarVoltas || c.n !== cr.voltas.length) {
      c.n = cr.voltas.length; c.lista.textContent = '';
      cr.voltas.forEach(function (v) {
        var li = mk('li', 'rel-volta'), a = mk('span'), b = mk('span'), d = mk('button', 'rel-nome', { type: 'button', 'aria-label': T('Nome da marcação') });
        a.textContent = String(v.n); b.textContent = fmtMarca(v.ms);
        if (v.nome) { var tg = mk('span', 'rel-tag'); tg.textContent = v.nome; tg.style.setProperty('--h', v.cor); d.appendChild(tg); }
        else { var vz = mk('span', 'rel-nome-vz'); vz.textContent = T('Nome'); d.appendChild(vz); }
        d.addEventListener('click', function () { editarNome(d, v); });
        li.appendChild(a); li.appendChild(b); li.appendChild(d); c.lista.appendChild(li);
      });
    }
    /* temporizador */
    var t = vista.tp, rest = tpRestante(), emUso = tp.rodando || tp.restante > 0 || tp.tocando;
    t.aj.hidden = emUso; t.ct.hidden = !emUso;
    if (!emUso) {
      var vals = { h: tp.h, m: tp.m, s: tp.s };
      t.cols.forEach(function (k) {
        var v = vals[k.k], n = k.max + 1;
        txt(k.a, pad((v + n - 1) % n)); txt(k.b, pad(v)); txt(k.z, pad((v + 1) % n)); k.el.setAttribute('aria-valuenow', String(v));
      });
      var vazio = tpAjuste() === 0; t.bIni.disabled = vazio; t.bIni.classList.toggle('is-off', vazio);
    } else {
      var frac = tp.total ? Math.max(0, Math.min(1, 1 - rest / tp.total)) : 0;
      t.pie.setAttribute('d', fatia(frac));
      txt(t.tot, rotuloTotal(tp.total)); txt(t.vis, fmtTemp(rest));
      txt(t.hora, hhmm(new Date(tp.rodando ? tp.fimData : Date.now() + tp.restante)));
      t.aviso.hidden = !tp.tocando;
      txt(t.bPa, tp.tocando ? T('Parar') : tp.rodando ? T('Pausar') : T('Continuar'));
      var vai = tp.tocando || tp.rodando; t.bPa.classList.toggle('is-stop', vai); t.bPa.classList.toggle('is-go', !vai);
      t.ct.classList.toggle('is-pausa', !tp.rodando && !tp.tocando);
    }
  }

  // checagem periódica mesmo com a tela fechada, para o aviso tocar na hora certa
  verificador = win.setInterval(verificar, 250);
  doc.addEventListener('visibilitychange', function () { verificar(); acordar(); });

  win.Relogio = {
    abrir: abrir, fechar: fechar, aberto: function () { return !!vista; },
    _fmtCrono: fmtCrono, _fmtMarca: fmtMarca, _fmtTemp: fmtTemp, _rotuloTotal: rotuloTotal, _fatia: fatia, _estado: function () { return { cr: cr, tp: tp }; }
  };
})();
