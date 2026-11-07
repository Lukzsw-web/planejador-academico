/* janelas.js — Janelas flutuantes: gerenciador (até 2, arrastar, pinça, balão Fechar), cards de informação e anotação de disciplina.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Seção: janelas-gerenciador
// =====================================================================
/* Janelas flutuantes: cards de informação das disciplinas e anotações das disciplinas.
 * Até 2 ao mesmo tempo (qualquer mistura), sem escurecer nem desfocar a tela, arrastam com um dedo
 * pela barra de cima, aumentam/diminuem com a pinça, ficam abertas ao trocar de aba e só saem no X
 * ou arrastadas até o balão "Fechar" que aparece embaixo, no centro. Nada aqui é salvo. */
(function () {
  'use strict';
  const MAX = 2, SMIN = 0.6, SMAX = 1.6;
  const wins = [];            // mais antiga (menos usada) primeiro; a última é a da frente
  let layer = null, dismiss = null, seq = 0;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const tr = (s, p) => (typeof T === 'function' ? T(s, p) : s);
  const X_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';

  function ensureLayer() {
    if (layer) return;
    layer = document.createElement('div'); layer.id = 'float-layer'; layer.className = 'jw-layer';
    dismiss = document.createElement('div'); dismiss.id = 'jw-dismiss'; dismiss.className = 'jw-dismiss'; dismiss.setAttribute('aria-hidden', 'true');
    dismiss.innerHTML = '<span class="jw-dismiss-x">' + X_SVG + '</span><span class="jw-dismiss-label"></span>';
    dismiss.querySelector('.jw-dismiss-label').textContent = tr('Fechar');
    document.body.append(layer, dismiss);
    window.addEventListener('resize', () => wins.forEach(w => keepOn(w)));
  }

  function paint(w) { w.el.style.transform = `translate(${w.x}px, ${w.y}px) scale(${w.s})`; }
  // a barra de cima nunca sai do alcance do dedo
  function keepOn(w) {
    paint(w);
    const r = w.el.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    let dx = 0, dy = 0;
    if (r.right < 80) dx = 80 - r.right; else if (r.left > vw - 80) dx = (vw - 80) - r.left;
    if (r.top < 0) dy = -r.top; else if (r.top > vh - 56) dy = (vh - 56) - r.top;
    // o X nunca sai da tela, mesmo com a janela esticada além da largura do celular
    const xb = w.el.querySelector('.jw-x');
    if (xb) { const xr = xb.getBoundingClientRect(); const nx = xr.right + dx; if (nx > vw - 6) dx -= nx - (vw - 6); else if (xr.left + dx < 6) dx += 6 - (xr.left + dx); }
    if (dx || dy) { w.x += dx; w.y += dy; paint(w); }
  }
  function front(w) {
    const i = wins.indexOf(w); if (i < 0) return;
    wins.splice(i, 1); wins.push(w);
    wins.forEach((x, k) => { x.el.style.zIndex = String(1 + k); x.el.classList.toggle('is-front', x === w); });
  }

  function showDismiss(show, hot) {
    if (!dismiss) return;
    if (show) dismiss.querySelector('.jw-dismiss-label').textContent = tr('Fechar');
    dismiss.classList.toggle('is-on', !!show);
    dismiss.classList.toggle('is-hot', !!hot);
  }
  function overDismiss(px, py) {
    const r = dismiss.getBoundingClientRect(), pad = 28;
    return px >= r.left - pad && px <= r.right + pad && py >= r.top - pad && py <= r.bottom + pad;
  }

  function close(w, instant) {
    const i = wins.indexOf(w); if (i < 0) return;
    wins.splice(i, 1);
    try { if (typeof w.onClose === 'function') w.onClose(); } catch (_) {}
    if (instant) w.el.remove();
    else { w.el.classList.add('is-closing'); setTimeout(() => w.el.remove(), 180); }
    showDismiss(false);
    wins.forEach((x, k) => { x.el.style.zIndex = String(1 + k); });
    if (wins.length) wins[wins.length - 1].el.classList.add('is-front');
  }

  function bindGestures(w) {
    const el = w.el, head = w.head;
    let drag = null, pinch = null;
    head.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      front(w);
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: w.x, oy: w.y, moved: false };
      try { head.setPointerCapture(e.pointerId); } catch (_) {}
      el.classList.add('is-moving');
    });
    head.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id || pinch) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
      drag.moved = true;
      w.x = drag.ox + (e.clientX - drag.sx); w.y = drag.oy + (e.clientY - drag.sy); keepOn(w);
      // o balão só aparece quando o dedo desce para perto da parte de baixo
      const low = e.clientY > window.innerHeight * 0.55;
      showDismiss(low, low && overDismiss(e.clientX, e.clientY));
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const hot = drag.moved && dismiss.classList.contains('is-on') && overDismiss(e.clientX, e.clientY);
      drag = null; el.classList.remove('is-moving'); showDismiss(false);
      if (hot && e.type === 'pointerup') close(w);
    };
    head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
    el.addEventListener('pointerdown', () => { if (wins[wins.length - 1] !== w) front(w); }, true);

    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = t => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
    el.addEventListener('touchstart', e => {
      if (e.touches.length !== 2) return;
      drag = null; const m = mid(e.touches);
      pinch = { d: dist(e.touches) || 1, s: w.s, mx: m.x, my: m.y };
      el.classList.add('is-moving'); front(w); e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchmove', e => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const m = mid(e.touches);
      w.s = clamp(pinch.s * dist(e.touches) / pinch.d, SMIN, SMAX);
      w.x += m.x - pinch.mx; w.y += m.y - pinch.my; pinch.mx = m.x; pinch.my = m.y;
      keepOn(w);
    }, { passive: false });
    const endPinch = e => { if (pinch && e.touches.length < 2) { pinch = null; el.classList.remove('is-moving'); } };
    el.addEventListener('touchend', endPinch); el.addEventListener('touchcancel', endPinch);
    // computador: Ctrl + roda do mouse faz o mesmo que a pinça
    el.addEventListener('wheel', e => {
      if (!e.ctrlKey) return;
      e.preventDefault(); w.s = clamp(w.s * Math.exp(-e.deltaY * 0.01), SMIN, SMAX); keepOn(w);
    }, { passive: false });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(w); } });
  }

  /* open({ key, label, sub, kind, build(body, win), onClose }) */
  function open(opts) {
    ensureLayer();
    const key = String(opts.key || ('w' + (++seq)));
    const same = wins.find(x => x.key === key);
    if (same) { front(same); return same.api; }
    let replaced = false;
    while (wins.length >= MAX) { close(wins[0], true); replaced = true; }
    if (replaced && typeof showToast === 'function') showToast({ text: tr('Limite de 2 janelas: fechei a mais antiga.'), icon: 'x' });

    const el = document.createElement('section');
    el.className = 'jw jwk-' + (opts.kind || 'info'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', opts.label || tr('Janela'));
    el.dataset.key = key; el.tabIndex = -1;
    const head = document.createElement('header'); head.className = 'jw-head';
    const grip = document.createElement('span'); grip.className = 'jw-grip'; grip.setAttribute('aria-hidden', 'true');
    const titles = document.createElement('div'); titles.className = 'jw-titles';
    const lab = document.createElement('span'); lab.className = 'jw-label'; lab.textContent = opts.label || '';
    titles.appendChild(lab);
    if (opts.sub) { const sub = document.createElement('span'); sub.className = 'jw-sub'; sub.textContent = opts.sub; titles.appendChild(sub); }
    const x = document.createElement('button'); x.type = 'button'; x.className = 'jw-x'; x.setAttribute('aria-label', tr('Fechar')); x.innerHTML = X_SVG;
    head.append(grip, titles, x);
    const body = document.createElement('div'); body.className = 'jw-body';
    el.append(head, body); layer.appendChild(el);

    const w = { key, el, head, body, x: 0, y: 0, s: 1, onClose: opts.onClose };
    w.api = { el, body, close: () => close(w), focus: () => front(w), key };
    try { if (typeof opts.build === 'function') opts.build(body, w.api); } catch (_) {}
    x.addEventListener('click', () => close(w));

    // posição inicial: centralizada na tela; a segunda janela fica um pouco deslocada para as duas aparecerem
    const vw = window.innerWidth, vh = window.innerHeight, r = el.getBoundingClientRect(), k = wins.length;
    w.x = Math.round((vw - r.width) / 2);
    w.y = Math.round(Math.max(56, (vh - r.height) / 2 - 40) + k * 44);
    wins.push(w); front(w); keepOn(w);
    bindGestures(w);
    requestAnimationFrame(() => el.classList.add('is-in'));
    return w.api;
  }

  window.Janelas = {
    open, MAX,
    count: () => wins.length,
    has: key => wins.some(w => w.key === key),
    closeAll: () => { wins.slice().forEach(w => close(w, true)); },
    closeKey: key => { const w = wins.find(x => x.key === key); if (w) close(w); },
    _wins: wins
  };
})();

// =====================================================================
// Janelas de cards: informações da disciplina (toque longo ou botão "i") abertas como janela flutuante.
// =====================================================================
let longPressPointer = null;
let longPressStartX = 0;
let longPressStartY = 0;

function openSubjectDetails(cod) {
  const m = getDisciplinaByCode(cod);
  if (!m) return;
  const concluidas = getConcludedCodes();
  document.getElementById('det-nome').innerText = formatName(m);
  document.getElementById('det-cod').innerText = m.codigo;
  document.getElementById('det-per').innerText = displayPeriod(m);
  document.getElementById('det-cred').innerText = creditsOf(m);
  document.getElementById('det-ch').innerText = `${hoursOf(m)} Horas`;
  document.getElementById('det-pre').innerHTML = resolveReqsColor(m.pre, concluidas);
  document.getElementById('det-co').innerHTML = resolveReqsColor(m.co, concluidas);
  const trancaEl = document.getElementById('det-tranca');
  if (trancaEl) {
    const locked = getPrereqLockedSubjects(m.codigo);
    trancaEl.innerHTML = locked.length
      ? locked.map(t => `<span class="font-bold block mb-1 det-locked det-locked-${getSubjectStatus(t)}">${escapeHTML(formatName(t))}${periodIsCond(t.periodo) ? '' : ` (${escapeHTML(displayPeriod(t))})`}</span>`).join('')
      : `<span class='text-gray-500 font-normal'>${T('Nenhuma')}</span>`;
  }
  const copyBtn = document.getElementById('det-copy-btn');
  if (copyBtn) copyBtn.onclick = (e) => copyCodeToClipboard(m.codigo, e);
  const opened = openInfoWindow('modal-details', 'info:' + m.codigo, m.codigo, T('Informações da disciplina'), wrap => {
    const cp = wrap.querySelector('.subject-code ~ button');
    if (cp) cp.addEventListener('click', e => copyCodeToClipboard(m.codigo, e));
  });
  if (!opened) openModal('modal-details');
}

// Card de informação como janela flutuante (até 2, sem fundo desfocado, arrasta e dá zoom com a pinça).
// O conteúdo é copiado do card já preenchido, então fica igual ao que existia como modal.
function openInfoWindow(modalId, key, label, sub, after) {
  const card = document.querySelector(`#${modalId} .modal-content`);
  if (!card || !window.Janelas) return false;
  window.Janelas.open({
    key, label, sub, kind: 'info',
    build(body) {
      const wrap = document.createElement('div');
      wrap.className = 'jw-info';
      Array.from(card.children).forEach(ch => {
        if (ch.tagName === 'BUTTON' && ch.getAttribute('aria-label') === 'Fechar') return;
        const c = ch.cloneNode(true);
        c.removeAttribute('id');
        c.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
        wrap.appendChild(c);
      });
      body.appendChild(wrap);
      if (after) after(wrap);
    }
  });
  return true;
}

function startLongPress(cod, event) {
  if (event && event.button !== undefined && event.button !== 0) return;
  if (event && event.target?.closest && (event.target.closest('button') || event.target.closest('input'))) return;
  cancelLongPress();
  longPressPointer = event?.pointerId ?? null;
  longPressStartX = event?.clientX ?? 0;
  longPressStartY = event?.clientY ?? 0;

  timerLongPress = setTimeout(() => {
    timerLongPress = null;
    openSubjectDetails(cod);
  }, 600);
}

function handleLongPressMove(event) {
  if (timerLongPress === null) return;
  if (longPressPointer !== null && event.pointerId !== longPressPointer) return;
  const dx = Math.abs((event.clientX ?? 0) - longPressStartX);
  const dy = Math.abs((event.clientY ?? 0) - longPressStartY);
  if (dx > 10 || dy > 10) cancelLongPress();
}

function cancelLongPress() {
  clearTimeout(timerLongPress);
  timerLongPress = null;
  longPressPointer = null;
}

// =====================================================================
// Janelas de cards: informações de "tranca / co-requisito" do "O que puxar?" abertas como janela flutuante.
// =====================================================================
function openPlannerDetails(cod) {
  const m = getDisciplinaByCode(cod);
  if (!m) return;
  const locked = getPrereqLockedSubjects(cod);
  const related = getCoreqRelatedSubjects(cod);
  const titleEl = document.getElementById('planner-det-title');
  const subEl = document.getElementById('planner-det-sub');
  const listEl = document.getElementById('planner-det-list');
  const iconEl = document.getElementById('planner-det-icon');
  if (!titleEl || !listEl) return;
  titleEl.textContent = formatName(m);
  const lockedText = locked.length === 0 ? T('Não tranca nenhuma matéria')
    : locked.length === 1 ? T('Tranca 1 matéria por pré-requisito')
    : T('Tranca {n} matérias por pré-requisito', { n: locked.length });
  const coreqText = related.length === 0 ? T('Sem relação de correquisito')
    : related.length === 1 ? T('1 relação de correquisito')
    : T('{n} relações de correquisito', { n: related.length });
  if (subEl) subEl.textContent = `${lockedText} • ${coreqText}`;
  if (iconEl) iconEl.dataset.state = locked.length ? 'locked' : 'free';
  const section = (title, items) => items.length
    ? `<section class="pinfo-section"><h4 class="pinfo-section-title">${title}</h4><ul class="pinfo-list">${items.map(pinfoRowHTML).join('')}</ul></section>` : '';
  listEl.innerHTML = section(T('Tranca por pré-requisito'), locked) + section(T('Relação de correquisito'), related);
  if (!openInfoWindow('modal-planner-details', 'pinfo:' + cod, m.codigo, T('Pré e co-requisitos'))) openModal('modal-planner-details');
}

function startPlannerLongPress(cod, event) {
  if (event && event.button !== undefined && event.button !== 0) return;
  if (event && event.target?.closest && (event.target.closest('button') || event.target.closest('input'))) return;
  cancelPlannerLongPress();
  plannerLongPressPointer = event?.pointerId ?? null;
  plannerLongPressStartX = event?.clientX ?? 0;
  plannerLongPressStartY = event?.clientY ?? 0;

  timerPlannerLongPress = setTimeout(() => {
    timerPlannerLongPress = null;
    openPlannerDetails(cod);
  }, 600);
}

function handlePlannerLongPressMove(event) {
  if (timerPlannerLongPress === null) return;
  if (plannerLongPressPointer !== null && event.pointerId !== plannerLongPressPointer) return;
  const dx = Math.abs((event.clientX ?? 0) - plannerLongPressStartX);
  const dy = Math.abs((event.clientY ?? 0) - plannerLongPressStartY);
  if (dx > 10 || dy > 10) cancelPlannerLongPress();
}

function cancelPlannerLongPress() {
  clearTimeout(timerPlannerLongPress);
  timerPlannerLongPress = null;
  plannerLongPressPointer = null;
}

// =====================================================================
// Seção: janelas-notas
// =====================================================================
/* janelas-notas.js — anotação de uma disciplina aberta como janela flutuante (até 2 janelas, ver janelas-gerenciador.js).
 * Usa o armazenamento e as regras de js/notas/notas-agenda.js (Notas._core). Texto digitado entra por value/textContent. */
(function () {
  'use strict';
  const C = window.Notas && window.Notas._core;
  if (!C) return;
  const { st, tr, isCode, discName, forCode, filled, save, refreshMarks, agendaOpen, renderAgenda, showEditor, openAgenda, MAX_TITLE, MAX_TEXT } = C;

  // a partir de uma disciplina: só a anotação dela, em janela flutuante (até 2 janelas no total)
  function openFor(code) {
    if (!isCode(code)) return openAgenda();
    const n = forCode(code); if (!n) return openAgenda();
    if (!window.Janelas) return showEditor(n.id);
    const nm = discName(code);
    let timer = null, dirty = false, armed = false, gone = false;
    const persist = () => { timer = null; dirty = false; save(); refreshMarks(); };
    window.Janelas.open({
      key: 'note:' + n.id, kind: 'note', label: code, sub: nm || tr('Anotação'),
      build(body) {
        const title = document.createElement('input'); title.type = 'text'; title.className = 'notas-title-input'; title.maxLength = MAX_TITLE;
        title.placeholder = nm || code; title.value = n.title; title.setAttribute('aria-label', tr('Título da anotação'));
        const text = document.createElement('textarea'); text.className = 'notas-text'; text.maxLength = MAX_TEXT;
        text.placeholder = tr('Escreva aqui. Fica salvo neste aparelho.'); text.value = n.text; text.setAttribute('aria-label', tr('Texto da anotação'));
        const status = document.createElement('p'); status.className = 'notas-status'; status.setAttribute('role', 'status');
        const del = document.createElement('button'); del.type = 'button'; del.className = 'notas-del'; del.textContent = tr('Excluir anotação');
        const foot = document.createElement('div'); foot.className = 'notas-foot'; foot.append(status, del);
        body.append(title, text, foot);
        const input = () => {
          n.title = title.value.slice(0, MAX_TITLE); n.text = text.value.slice(0, MAX_TEXT); n.updated = Date.now();
          dirty = true; status.textContent = tr('Salvando…'); status.classList.remove('is-warn');
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => { persist(); status.textContent = tr('Salvo neste aparelho.'); }, 350);
        };
        title.addEventListener('input', input); text.addEventListener('input', input);
        del.addEventListener('click', () => {
          if (!armed) {
            armed = true; del.textContent = tr('Confirmar exclusão'); del.classList.add('is-danger');
            setTimeout(() => { if (armed && del.isConnected) { armed = false; del.textContent = tr('Excluir anotação'); del.classList.remove('is-danger'); } }, 4000); return;
          }
          gone = true; if (timer) { clearTimeout(timer); timer = null; } dirty = false;
          const i = st.notes.indexOf(n); if (i >= 0) st.notes.splice(i, 1);
          save(); refreshMarks(); if (agendaOpen()) renderAgenda(); window.Janelas.closeKey('note:' + n.id);
        });
        if (n.text || n.title) status.textContent = ''; else setTimeout(() => { if (text.isConnected) try { text.focus({ preventScroll: true }); } catch (_) {} }, 60);
      },
      onClose() {
        if (gone) return;
        if (timer) { clearTimeout(timer); timer = null; }
        if (dirty) persist();
        if (!filled(n)) { const i = st.notes.indexOf(n); if (i >= 0) st.notes.splice(i, 1); }
        refreshMarks(); if (agendaOpen()) renderAgenda();
      }
    });
  }

  window.Notas.openFor = openFor;
})();
