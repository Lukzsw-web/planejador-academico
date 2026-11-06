/* notas.js — Notas: agenda central, editor e botão flutuante da agenda.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Seção: notas-agenda
// =====================================================================
/* Notas — agenda central: todas as anotações em balões agrupados por mês e o editor de uma anotação por vez.
 * A anotação de dentro de uma disciplina (janela) está em js/janelas/janelas-notas.js e o botão flutuante da
 * agenda (Acessibilidade) em js/notas/notas-botao-flutuante.js; os dois usam Notas._core daqui. Tudo fica no localStorage deste aparelho (planejador_notas_v1).
 * Texto digitado entra sempre por textContent/value, nunca como HTML. */
(function () {
  'use strict';
  const KEY = 'planejador_notas_v1';
  const MAX_NOTES = 60, MAX_TEXT = 20000, MAX_TITLE = 80;
  const st = { notes: [], active: null, delArmed: null, timer: null, dirty: false };
  const $ = id => document.getElementById(id);
  const tr = (s, p) => (typeof T === 'function' ? T(s, p) : s);
  const uid = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const isCode = c => typeof c === 'string' && /^[A-Za-z0-9]{4,8}$/.test(c);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } }
  };

  function discName(code) { try { const d = typeof getDisciplinaByCode === 'function' ? getDisciplinaByCode(code) : null; return d && d.nome ? d.nome : ''; } catch (_) { return ''; } }
  function valid(n) { return n && typeof n === 'object' && typeof n.id === 'string' && typeof n.text === 'string' && typeof n.title === 'string'; }
  const filled = n => !!(n.text.trim() || n.title.trim());

  function load() {
    try {
      const r = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (r && Array.isArray(r.notes)) {
        st.notes = r.notes.filter(valid).slice(0, MAX_NOTES).map(n => ({
          id: n.id.slice(0, 40), label: typeof n.label === 'string' ? n.label.slice(0, 8) : '', code: isCode(n.code) ? n.code : null,
          title: n.title.slice(0, MAX_TITLE), text: n.text.slice(0, MAX_TEXT), updated: Number(n.updated) || 0
        }));
        st.active = typeof r.active === 'string' ? r.active : null;
      }
    } catch (_) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ notes: st.notes.filter(filled), active: st.active })); setStatus(tr('Salvo neste aparelho.')); return true; }
    catch (_) { setStatus(tr('Não foi possível salvar: o armazenamento do navegador está bloqueado ou cheio.'), true); return false; }
  }
  function setStatus(msg, warn) { const s = $('notas-status'); if (!s) return; s.textContent = msg; s.classList.toggle('is-warn', !!warn); }

  function nextLabel() {
    const used = new Set(st.notes.filter(n => !n.code).map(n => n.label));
    for (let i = 0; i < 26; i++) { const L = String.fromCharCode(65 + i); if (!used.has(L)) return L; }
    let k = 27; while (used.has('N' + k)) k++; return 'N' + k;
  }
  function addFree() {
    if (st.notes.length >= MAX_NOTES) return null;
    const n = { id: uid(), label: nextLabel(), code: null, title: '', text: '', updated: Date.now() };
    st.notes.push(n); return n;
  }
  function forCode(code) {
    let n = st.notes.find(x => x.code === code);
    if (!n && st.notes.length < MAX_NOTES) { n = { id: uid(), label: '', code, title: '', text: '', updated: Date.now() }; st.notes.push(n); }
    return n || null;
  }
  const byId = id => st.notes.find(n => n.id === id) || null;
  const current = () => byId(st.active);

  // ----- marcas fora do editor (botão central e botão de cada disciplina) -----
  function refreshMarks() {
    const total = st.notes.filter(filled).length;
    const b = $('planner-notes-open');
    if (b) { b.classList.toggle('has-notes', total > 0); const c = b.querySelector('.notes-count'); if (c) { c.textContent = total > 99 ? '99+' : String(total); c.hidden = total === 0; } b.setAttribute('aria-label', total ? tr('Abrir anotações ({n})', { n: total }) : tr('Abrir anotações')); }
    document.querySelectorAll('.planner-card .note-button').forEach(btn => {
      const n = st.notes.find(x => x.code === btn.dataset.codigo);
      btn.classList.toggle('has-note', !!(n && filled(n)));
    });
  }
  function has(code) { const n = st.notes.find(x => x.code === code); return !!(n && filled(n)); }

  // ----- agenda central -----
  const lang = () => document.documentElement.lang || 'pt-BR';
  function fmtDate(ts, o) { try { return new Intl.DateTimeFormat(lang(), o).format(new Date(ts)); } catch (_) { return ''; } }
  const sameDay = (a, b) => { const x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate(); };
  const monthKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + d.getMonth(); };
  const groupKey = monthKey;
  function groupLabel(ts) {
    if (monthKey(ts) === monthKey(Date.now())) return tr('Este mês');
    const y = new Date(ts).getFullYear(), m = fmtDate(ts, { month: 'long' });
    return m.charAt(0).toUpperCase() + m.slice(1) + (y !== new Date().getFullYear() ? ' ' + y : '');
  }
  function whenLabel(n) {
    const hm = fmtDate(n.updated, { hour: '2-digit', minute: '2-digit' });
    const base = sameDay(n.updated, Date.now()) ? hm : fmtDate(n.updated, { day: 'numeric', month: 'short' }) + ' · ' + hm;
    return n.code ? base + ' · ' + n.code : base;
  }
  function bubble(n) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ag-bubble'; b.dataset.id = n.id;
    const title = document.createElement('span'); title.className = 'ag-title';
    title.textContent = n.title.trim() || (n.code ? (discName(n.code) || n.code) : tr('Sem título'));
    const when = document.createElement('span'); when.className = 'ag-when'; when.textContent = whenLabel(n);
    b.append(title, when);
    if (n.text.trim()) { const body = document.createElement('span'); body.className = 'ag-body'; body.textContent = n.text.slice(0, 600); b.appendChild(body); }
    return b;
  }
  function renderAgenda() {
    const box = $('agenda-list'); if (!box) return; box.textContent = '';
    const list = st.notes.filter(filled).sort((a, b) => b.updated - a.updated);
    const empty = $('agenda-empty'); if (empty) empty.hidden = list.length > 0;
    const cnt = $('agenda-count'); if (cnt) cnt.textContent = list.length === 1 ? tr('1 anotação') : tr('{n} anotações', { n: list.length });
    let last = null, sec = null;
    list.forEach(n => {
      const k = groupKey(n.updated);
      if (k !== last) {
        last = k; sec = document.createElement('section'); sec.className = 'ag-group';
        const h = document.createElement('h3'); h.className = 'ag-month'; h.textContent = groupLabel(n.updated);
        sec.appendChild(h); box.appendChild(sec);
      }
      sec.appendChild(bubble(n));
    });
  }
  const agendaOpen = () => !!$('modal-agenda')?.classList.contains('active');
  function openAgenda() {
    renderAgenda();
    if (typeof openModal === 'function') openModal('modal-agenda');
    const l = $('agenda-list'); if (l) l.scrollTop = 0;
  }
  function closeAgenda() { if (typeof closeModal === 'function') closeModal('modal-agenda'); }

  // ----- editor (uma anotação por vez) -----
  function renderPage() {
    const n = current(); const title = $('notas-title-input'), text = $('notas-text'), sub = $('notas-sub'), del = $('notas-del');
    if (!n) return;
    title.value = n.title; text.value = n.text;
    title.placeholder = n.code ? (discName(n.code) || n.code) : tr('Sem título');
    sub.textContent = n.code ? n.code + (discName(n.code) ? ' · ' + discName(n.code) : '') : tr('Anotação {l}', { l: n.label });
    del.textContent = tr('Excluir anotação'); del.classList.remove('is-danger'); st.delArmed = null;
  }
  function flush() { if (st.timer) { clearTimeout(st.timer); st.timer = null; } if (st.dirty) { st.dirty = false; save(); refreshMarks(); } }
  function onInput() {
    const n = current(); if (!n) return;
    n.title = $('notas-title-input').value.slice(0, MAX_TITLE); n.text = $('notas-text').value.slice(0, MAX_TEXT); n.updated = Date.now();
    st.dirty = true; setStatus(tr('Salvando…'));
    if (st.timer) clearTimeout(st.timer);
    st.timer = setTimeout(() => { st.timer = null; st.dirty = false; save(); refreshMarks(); }, 350);
  }
  function showEditor(id) {
    st.active = id;
    renderPage(); setStatus('');
    if (typeof openModal === 'function') openModal('modal-notas');
  }
  // da agenda: abre uma anotação existente
  function edit(id) {
    if (!byId(id)) return;
    if (window.Janelas && window.Janelas.has('note:' + id)) { window.Janelas.open({ key: 'note:' + id }); closeAgenda(); return; }
    showEditor(id);
  }
  // bolinha da agenda: nova anotação livre
  function create() {
    if (st.notes.length >= MAX_NOTES) { const l = $('agenda-limit'); if (l) { l.hidden = false; setTimeout(() => { l.hidden = true; }, 4000); } return; }
    const n = addFree(); if (n) showEditor(n.id);
  }
  function onEditorClosed() {
    flush();
    // anotações vazias que nunca foram usadas não ficam no caderno
    const keep = st.notes.filter(filled); if (keep.length !== st.notes.length) { st.notes = keep; if (!current()) st.active = null; }
    refreshMarks(); if (agendaOpen()) renderAgenda();
  }
  function remove() {
    const n = current(); if (!n) return; const del = $('notas-del');
    if (st.delArmed !== n.id) {
      st.delArmed = n.id; del.textContent = tr('Confirmar exclusão'); del.classList.add('is-danger');
      setTimeout(() => { if (st.delArmed === n.id && del.isConnected) { st.delArmed = null; del.textContent = tr('Excluir anotação'); del.classList.remove('is-danger'); } }, 4000); return;
    }
    const i = st.notes.indexOf(n); st.notes.splice(i, 1); st.delArmed = null; st.active = null;
    st.dirty = false; if (st.timer) { clearTimeout(st.timer); st.timer = null; }
    save(); refreshMarks();
    if (typeof closeModal === 'function') closeModal('modal-notas');
  }

  function init() {
    load(); refreshMarks();
    $('planner-notes-open')?.addEventListener('click', openAgenda);
    $('agenda-close')?.addEventListener('click', closeAgenda);
    $('agenda-new')?.addEventListener('click', create);
    $('agenda-list')?.addEventListener('click', e => { const b = e.target.closest('.ag-bubble'); if (b) edit(b.dataset.id); });
    $('notas-title-input')?.addEventListener('input', onInput);
    $('notas-text')?.addEventListener('input', onInput);
    $('notas-del')?.addEventListener('click', remove);
    $('notas-close')?.addEventListener('click', () => { if (typeof closeModal === 'function') closeModal('modal-notas'); });
    // fechar por qualquer caminho (X, fundo, Esc) passa por aqui
    const mo = $('modal-notas');
    if (mo && typeof MutationObserver === 'function') new MutationObserver(() => { if (!mo.classList.contains('active')) onEditorClosed(); }).observe(mo, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  }

  // API pública. openFor (anotação em janela) vem de janelas-notas.js e o botão flutuante de notas-botao-flutuante.js;
  // _core é o que esses dois arquivos usam daqui.
  window.Notas = {
    open: openAgenda, openAgenda, openFor: () => openAgenda(), edit, create, has, refreshMarks,
    count: () => st.notes.filter(filled).length, _state: st,
    _core: { st, store, clamp, tr, isCode, discName, forCode, filled, save, refreshMarks, agendaOpen, renderAgenda, showEditor, openAgenda, MAX_TITLE, MAX_TEXT }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

// =====================================================================
// Seção: notas-botao-flutuante
// =====================================================================
/* notas-botao-flutuante.js — botão flutuante da agenda (Acessibilidade): arrasta para qualquer lugar e abre a agenda. */
(function () {
  'use strict';
  const C = window.Notas && window.Notas._core;
  if (!C) return;
  const { store, clamp, tr, openAgenda } = C;
  const FAB_KEY = 'planejador_agenda_fab_v1', FAB_POS_KEY = 'planejador_agenda_fab_pos_v1';

  // ----- botão flutuante da agenda -----
  let fab = null;
  const floatOn = () => store.get(FAB_KEY) === '1';
  function fabPos() { try { const p = JSON.parse(store.get(FAB_POS_KEY) || 'null'); if (p && isFinite(p.fx) && isFinite(p.fy)) return { fx: clamp(p.fx, 0, 1), fy: clamp(p.fy, 0, 1) }; } catch (_) {} return { fx: 1, fy: 0.72 }; }
  function placeFab() {
    if (!fab) return;
    const w = fab.offsetWidth || 54, h = fab.offsetHeight || 54, m = 8, vw = window.innerWidth, vh = window.innerHeight, p = fabPos();
    fab.style.left = Math.round(m + p.fx * Math.max(0, vw - w - 2 * m)) + 'px';
    fab.style.top = Math.round(m + p.fy * Math.max(0, vh - h - 2 * m)) + 'px';
  }
  function buildFab() {
    if (fab) return fab;
    fab = document.createElement('button');
    fab.type = 'button'; fab.id = 'agenda-fab'; fab.className = 'agenda-fab';
    fab.setAttribute('aria-label', tr('Abrir agenda')); fab.title = tr('Abrir agenda');
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5.2" y="3.4" width="14" height="17.2" rx="2"></rect><path d="M3 7.6h4.4M3 12h4.4M3 16.4h4.4"></path><path d="M10.6 8.2h5M10.6 12h5M10.6 15.8h2.8"></path><path d="M15.4 3.4v4.2l1.5-1.1 1.5 1.1V3.4" class="notes-ribbon"></path></svg>';
    let g = null, moved = false;
    fab.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const r = fab.getBoundingClientRect();
      g = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, sx: e.clientX, sy: e.clientY }; moved = false;
      try { fab.setPointerCapture(e.pointerId); } catch (_) {}
    });
    fab.addEventListener('pointermove', e => {
      if (!g || e.pointerId !== g.id) return;
      if (!moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < 6) return;
      moved = true; fab.classList.add('is-moving');
      const w = fab.offsetWidth, h = fab.offsetHeight, m = 8, vw = window.innerWidth, vh = window.innerHeight;
      const x = clamp(e.clientX - g.ox, m, vw - w - m), y = clamp(e.clientY - g.oy, m, vh - h - m);
      fab.style.left = x + 'px'; fab.style.top = y + 'px';
      store.set(FAB_POS_KEY, JSON.stringify({ fx: (x - m) / Math.max(1, vw - w - 2 * m), fy: (y - m) / Math.max(1, vh - h - 2 * m) }));
    });
    const up = e => { if (g && e.pointerId === g.id) { g = null; fab.classList.remove('is-moving'); } };
    fab.addEventListener('pointerup', up); fab.addEventListener('pointercancel', up);
    fab.addEventListener('click', e => { if (moved) { moved = false; e.preventDefault(); return; } openAgenda(); });
    fab.addEventListener('keydown', e => {
      const step = e.shiftKey ? 64 : 24, d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return; e.preventDefault();
      const r = fab.getBoundingClientRect(), w = r.width, h = r.height, m = 8, vw = window.innerWidth, vh = window.innerHeight;
      const x = clamp(r.left + d[0], m, vw - w - m), y = clamp(r.top + d[1], m, vh - h - m);
      store.set(FAB_POS_KEY, JSON.stringify({ fx: (x - m) / Math.max(1, vw - w - 2 * m), fy: (y - m) / Math.max(1, vh - h - 2 * m) })); placeFab();
    });
    document.body.appendChild(fab);
    window.addEventListener('resize', placeFab);
    return fab;
  }
  function setFloat(on) {
    store.set(FAB_KEY, on ? '1' : '0');
    if (on) { buildFab(); fab.hidden = false; placeFab(); } else if (fab) fab.hidden = true;
  }

  function init() {
    if (floatOn()) setFloat(true);
    if (typeof updateA11yUI === 'function') updateA11yUI();
  }
  Object.assign(window.Notas, { setFloat, floatOn });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
