/* configuracoes.js — Configurações: preferências, atualização, Barra Dock, perfil, páginas por tópico e acessibilidade.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Configurações: tema, tamanho do texto, duração do aviso, idioma, verificação de atualização e rótulos do painel.
// =====================================================================
function syncAccordionTheme(dark) {
  const container = document.getElementById('accordions-container');
  if (!container) return;
  container.dataset.themeState = dark ? 'dark' : 'light';
}

function setTheme(isDark, persist = true) {
  const dark = Boolean(isDark);

  // A troca do tema deve ser instantânea. Em navegadores móveis,
  // transições + backdrop-filter podem causar artefatos de composição.
  html.classList.add('theme-switching');
  html.classList.toggle('dark', dark);
  html.classList.toggle('light', !dark);
  html.style.colorScheme = dark ? 'dark' : 'only light';
  const csMeta = document.getElementById('color-scheme-meta');
  if (csMeta) csMeta.content = dark ? 'dark' : 'only light';
  syncAccordionTheme(dark);

  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEYS.theme, dark ? 'dark' : 'light');
    } catch (error) {
      console.warn('Não foi possível salvar o tema.', error);
    }
  }

  const themeMeta = document.getElementById('theme-color-meta');
  if (themeMeta) themeMeta.content = dark ? '#0f1115' : '#24564b';
  updateThemeUI();

  // Consolida o novo estado antes de reativar animações/transições.
  void html.offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => html.classList.remove('theme-switching'));
  });
}

// ---- Preferências do painel de configurações ----
const SETTINGS_KEYS = { textSize: 'planejador_textsize_v1', toastMs: 'planejador_toast_ms_v1' };
const TEXT_SIZES = ['sm', 'md', 'lg', 'xl'];
const TOAST_OPTIONS = [2000, 4000, 6000, 8000, 10000];
const SUPPORT_EMAIL = 'planejadoracademico@gmail.com';

function readSetting(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}
function writeSetting(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
}

function getThemePref() {
  const saved = readSetting(STORAGE_KEYS.theme);
  return saved === 'dark' || saved === 'light' ? saved : 'auto';
}
function setThemePref(pref) {
  if (pref === 'auto') {
    try { localStorage.removeItem(STORAGE_KEYS.theme); } catch (_) {}
    setTheme(Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches), false);
  } else if (pref === 'light' || pref === 'dark') {
    setTheme(pref === 'dark', true);
  }
  updateSettingsUI();
}

function getTextSize() {
  const saved = readSetting(SETTINGS_KEYS.textSize);
  return TEXT_SIZES.includes(saved) ? saved : 'md';
}
function applyTextSize(size) {
  html.dataset.textSize = TEXT_SIZES.includes(size) ? size : 'md';
}
function setTextSize(size) {
  if (!TEXT_SIZES.includes(size)) return;
  writeSetting(SETTINGS_KEYS.textSize, size);
  applyTextSize(size);
  updateSettingsUI();
}

function getToastMs() {
  const saved = Number(readSetting(SETTINGS_KEYS.toastMs));
  return TOAST_OPTIONS.includes(saved) ? saved : 6000;
}
function setToastMs(ms) {
  if (!TOAST_OPTIONS.includes(ms)) return;
  writeSetting(SETTINGS_KEYS.toastMs, String(ms));
  updateSettingsUI();
  showToast({ text: T('Os avisos agora ficam {n} s na tela.', { n: ms / 1000 }) });
}

function getLang() { return window.I18N ? window.I18N.lang : 'pt'; }
function setLanguage(code) {
  if (!window.I18N || !window.I18N.supported.includes(code) || code === window.I18N.lang) return;
  window.I18N.save(code);
  // Recarrega para que todo o conteúdo (inclusive o gerado por script) nasça no novo idioma.
  window.location.reload();
}

async function hardRefreshAssets() {
  try { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); } catch (_) {}
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    await Promise.all(regs.map(r => r.unregister()));
  } catch (_) {}
  // Os arquivos do site são os que o próprio index.html carrega (scripts e estilos), mais a área da equipe.
  const files = ['./', 'index.html', 'js/comunicados-equipe.js']
    .concat(Array.from(document.querySelectorAll('script[src], link[rel="stylesheet"]')).map(el => el.getAttribute('src') || el.getAttribute('href')));
  await Promise.all(files.map(u => fetch(u, { cache: 'reload' }).catch(() => null)));
}

async function checkForUpdate() {
  const btn = document.getElementById('check-update-button');
  const status = document.getElementById('update-status');
  if (!btn || !status || btn.disabled) return;
  const say = (text, state) => { status.textContent = text; status.dataset.state = state || ''; };
  btn.disabled = true;
  say(T('Verificando…'), 'busy');
  try {
    if (navigator.onLine === false) throw new Error('offline');
    const res = await fetch(`app.js?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('http ' + res.status);
    const match = (await res.text()).match(/const APP_VERSION = '([^']+)'/);
    const remote = match ? match[1] : null;
    if (remote && remote !== APP_VERSION) {
      say(T('Nova versão {v} encontrada. Atualizando…', { v: remote }), 'busy');
      await hardRefreshAssets();
      window.location.reload();
      return;
    }
    say(T('Você já usa a versão mais recente ({v}).', { v: APP_VERSION }) + (userProfile.name ? ' ' + userProfile.name + ', tudo certo por aqui.' : ''), 'ok');
    navigator.serviceWorker?.getRegistration?.().then(r => r?.update()).catch(() => {});
  } catch (_) {
    say(T('Não foi possível verificar agora. Confira sua conexão e tente de novo.'), 'error');
  } finally {
    btn.disabled = false;
  }
}

function updateSettingsUI() {
  const current = {
    'set-theme': getThemePref(),
    'set-text-size': getTextSize(),
    'set-toast-ms': String(getToastMs()),
    'set-lang': getLang()
  };
  document.querySelectorAll('#modal-settings [data-pa-action^="set-"]').forEach(btn => {
    const on = btn.dataset.value === current[btn.dataset.paAction];
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.classList.toggle('is-selected', on);
  });
  const hint = document.getElementById('settings-theme-hint');
  if (hint) {
    const pref = getThemePref();
    hint.textContent = pref === 'auto'
      ? T('Segue o tema do seu aparelho ({mode}).', { mode: html.classList.contains('dark') ? T('escuro') : T('claro') })
      : pref === 'dark' ? T('Sempre escuro.') : T('Sempre claro.');
  }
  const version = document.getElementById('app-version');
  if (version) version.textContent = APP_VERSION;
}

function updateThemeUI() { updateSettingsUI(); }

// =====================================================================
// Configurações: inicialização dos controles do painel.
// =====================================================================
// ----------------------------------------------------
// SETTINGS MODAL SUPPORT
// ----------------------------------------------------
function initSettings() {
  applyTextSize(getTextSize());
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  // O <head> já definiu o tema inicial antes da primeira pintura.
  // Aqui não reaplicamos o tema, evitando uma segunda troca visual no carregamento.
  updateThemeUI();

  // Sem preferência manual, continua acompanhando alterações posteriores do tema do SO.
  media?.addEventListener?.('change', event => {
    try {
      if (!localStorage.getItem(STORAGE_KEYS.theme)) setTheme(event.matches, false);
    } catch (_) {
      setTheme(event.matches, false);
    }
  });
}

// =====================================================================
// Configurações: Barra Dock (arredondamento, tamanho, altura e ordem das abas).
// =====================================================================
// ----------------------------------------------------
// Configuração "Barra Dock": arredondamento, tamanho, altura e ordem dos apps.
// A ordem da barra é a mesma ordem das telas no trilho horizontal (bottomTabIds).
// ----------------------------------------------------
const DOCK_KEY = 'planejador_dock_v1';
const DOCK_DEFAULT_ORDER = ['home-page', 'modal-planner', 'modal-farmacia', 'modal-comunicados', 'modal-settings'];
const DOCK_LIMITS = { radius: [8, 36], size: [85, 120], lift: [0, 40] };
const DOCK_RADIUS_DEFAULT = 28;
const DOCK_GRIP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
const DOCK_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
const DOCK_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
let dockPrefs = {};

function dockDefaultLift() {
  const mobile = window.matchMedia ? window.matchMedia('(max-width: 640px)').matches : true;
  return mobile ? 20 : 0;
}
function dockClamp(key, value) {
  const [min, max] = DOCK_LIMITS[key];
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
}
function dockValidOrder(order) {
  return Array.isArray(order) && order.length === DOCK_DEFAULT_ORDER.length &&
    DOCK_DEFAULT_ORDER.every(id => order.includes(id)) && new Set(order).size === order.length;
}
function loadDockPrefs() {
  let raw = {};
  try { raw = JSON.parse(readSetting(DOCK_KEY) || '{}') || {}; } catch (_) { raw = {}; }
  const out = {};
  ['radius', 'size', 'lift'].forEach(k => {
    if (raw[k] === undefined || raw[k] === null) return;
    const v = dockClamp(k, raw[k]);
    if (v !== null) out[k] = v;
  });
  if (dockValidOrder(raw.order)) out.order = raw.order.slice();
  return out;
}
function saveDockPrefs() {
  if (Object.keys(dockPrefs).length) writeSetting(DOCK_KEY, JSON.stringify(dockPrefs));
  else { try { localStorage.removeItem(DOCK_KEY); } catch (_) {} }
}
function dockEffective() {
  return {
    radius: dockPrefs.radius ?? DOCK_RADIUS_DEFAULT,
    size: dockPrefs.size ?? 100,
    lift: dockPrefs.lift ?? dockDefaultLift(),
    order: dockPrefs.order || DOCK_DEFAULT_ORDER
  };
}

// Reordena a barra e o trilho de telas ao mesmo tempo.
function applyDockOrder(order) {
  const next = dockValidOrder(order) ? order : DOCK_DEFAULT_ORDER;
  bottomTabIds.splice(0, bottomTabIds.length, ...next);
  const inner = document.querySelector('.bottom-liquid-nav-inner');
  if (inner) next.forEach(id => { const btn = document.getElementById(bottomTabNavIds[id]); if (btn) inner.appendChild(btn); });
}

function applyDockPrefs() {
  const root = document.documentElement;
  const set = (attr, prop, value) => {
    if (value === undefined) { root.removeAttribute(attr); root.style.removeProperty(prop); }
    else { root.setAttribute(attr, ''); root.style.setProperty(prop, value); }
  };
  set('data-dock-radius', '--dock-radius', dockPrefs.radius === undefined ? undefined : dockPrefs.radius + 'px');
  set('data-dock-size', '--dock-scale', dockPrefs.size === undefined ? undefined : String(dockPrefs.size / 100));
  if (dockPrefs.lift === undefined) root.style.removeProperty('--dock-lift');
  else root.style.setProperty('--dock-lift', dockPrefs.lift + 'mm');
  // O preview usa os mesmos valores mesmo sem personalização.
  if (dockPrefs.radius === undefined) root.style.setProperty('--dock-radius', DOCK_RADIUS_DEFAULT + 'px');
  if (dockPrefs.size === undefined) root.style.setProperty('--dock-scale', '1');
  applyDockOrder(dockPrefs.order || DOCK_DEFAULT_ORDER);
}

function dockNavParts(id) {
  const btn = document.getElementById(bottomTabNavIds[id]);
  return {
    icon: btn?.querySelector('.bottom-nav-icon svg')?.outerHTML || '',
    label: btn?.querySelector('.bottom-nav-label')?.textContent.trim() || id
  };
}

function renderDockPreview() {
  const box = document.getElementById('dockpref-preview');
  if (!box) return;
  box.innerHTML = bottomTabIds.map(id => {
    const { icon, label } = dockNavParts(id);
    const beta = id === 'modal-farmacia' ? '<em class="dockpref-beta">(beta)</em>' : '';
    return `<div class="dockpref-dock-item${id === 'modal-settings' ? ' is-active' : ''}">${icon}<span>${escapeHTML(label)}</span>${beta}</div>`;
  }).join('');
}

function renderDockOrderList(focusSel) {
  const list = document.getElementById('dockpref-order');
  if (!list) return;
  const last = bottomTabIds.length - 1;
  list.innerHTML = bottomTabIds.map((id, i) => {
    const { icon, label } = dockNavParts(id);
    const lab = escapeHTML(label);
    return `<li class="dockpref-item" data-dock-id="${id}">
      <button type="button" class="dockpref-grip" aria-label="${escapeHTML(T('Arrastar para reordenar'))}: ${lab}" title="${escapeHTML(T('Arrastar para reordenar'))}">${DOCK_GRIP}</button>
      <span class="dockpref-item-icon">${icon}</span><span class="dockpref-item-label">${lab}</span>
      <span class="dockpref-move">
        <button type="button" data-dock-move="-1" aria-label="${escapeHTML(T('Mover para cima'))}: ${lab}"${i === 0 ? ' disabled' : ''}>${DOCK_UP}</button>
        <button type="button" data-dock-move="1" aria-label="${escapeHTML(T('Mover para baixo'))}: ${lab}"${i === last ? ' disabled' : ''}>${DOCK_DOWN}</button>
      </span></li>`;
  }).join('');
  if (focusSel) list.querySelector(focusSel)?.focus();
}

function updateDockControls() {
  const eff = dockEffective();
  const set = (id, value, text) => {
    const input = document.getElementById('dockpref-' + id);
    const out = document.getElementById('dockpref-' + id + '-val');
    if (input) input.value = String(value);
    if (out) out.textContent = text;
  };
  set('radius', eff.radius, eff.radius + ' px');
  set('size', eff.size, eff.size + '%');
  set('lift', eff.lift, (eff.lift / 10).toFixed(1).replace('.', ',') + ' cm');
  const reset = document.getElementById('dockpref-reset');
  if (reset) reset.disabled = !Object.keys(dockPrefs).length;
}

function commitDockOrder(order, focusSel) {
  const same = order.every((id, i) => id === DOCK_DEFAULT_ORDER[i]);
  if (same) delete dockPrefs.order; else dockPrefs.order = order.slice();
  saveDockPrefs();
  applyDockOrder(order);
  // O trilho de telas muda de ordem: reposiciona a tela atual sem animação.
  normalizeBottomTabs(activeBottomTabId, true);
  renderDockPreview();
  renderDockOrderList(focusSel);
  updateDockControls();
}

function resetDockPrefs() {
  dockPrefs = {};
  saveDockPrefs();
  applyDockPrefs();
  normalizeBottomTabs(activeBottomTabId, true);
  renderDockPreview();
  renderDockOrderList();
  updateDockControls();
}

function initDockSettings() {
  renderDockPreview();
  renderDockOrderList();
  updateDockControls();

  ['radius', 'size', 'lift'].forEach(key => {
    const input = document.getElementById('dockpref-' + key);
    if (!input) return;
    input.addEventListener('input', () => {
      const v = dockClamp(key, input.value);
      if (v === null) return;
      const isDefault = (key === 'radius' && v === DOCK_RADIUS_DEFAULT) || (key === 'size' && v === 100) || (key === 'lift' && v === dockDefaultLift());
      if (isDefault) delete dockPrefs[key]; else dockPrefs[key] = v;
      saveDockPrefs();
      applyDockPrefs();
      renderDockPreview();
      updateDockControls();
    });
  });

  const list = document.getElementById('dockpref-order');
  if (!list) return;
  list.addEventListener('click', event => {
    const btn = event.target.closest('[data-dock-move]');
    if (!btn || btn.disabled) return;
    const id = btn.closest('[data-dock-id]').dataset.dockId;
    const dir = Number(btn.dataset.dockMove);
    const order = bottomTabIds.slice();
    const from = order.indexOf(id), to = from + dir;
    if (to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    commitDockOrder(order, `[data-dock-id="${id}"] [data-dock-move="${dir}"]:not(:disabled)`);
  });

  // Arrastar pela alça (mouse e toque).
  let drag = null;
  const domOrder = () => Array.from(list.children).map(li => li.dataset.dockId);
  list.addEventListener('pointerdown', event => {
    const grip = event.target.closest('.dockpref-grip');
    if (!grip) return;
    event.preventDefault();
    const row = grip.closest('.dockpref-item');
    drag = { row, grip, pointerId: event.pointerId };
    row.classList.add('is-dragging');
    try { grip.setPointerCapture(event.pointerId); } catch (_) {}
  });
  list.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const others = Array.from(list.children).filter(li => li !== drag.row);
    const next = others.find(li => { const r = li.getBoundingClientRect(); return event.clientY < r.top + r.height / 2; });
    if (next) { if (drag.row.nextElementSibling !== next) list.insertBefore(drag.row, next); }
    else if (list.lastElementChild !== drag.row) list.appendChild(drag.row);
  });
  const finish = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { row, grip } = drag;
    drag = null;
    row.classList.remove('is-dragging');
    try { grip.releasePointerCapture(event.pointerId); } catch (_) {}
    const order = domOrder();
    if (order.join() !== bottomTabIds.join()) commitDockOrder(order);
  };
  list.addEventListener('pointerup', finish);
  list.addEventListener('pointercancel', finish);
}

// =====================================================================
// Configurações: perfil (nome, pronomes, período, turno e foto, guardados só no aparelho).
// =====================================================================
// ----------------------------------------------------
// Perfil do usuário: nome, pronome, período e turno.
// Usado para o site e a FarmacIA falarem com a pessoa pelo nome e com a concordância certa.
// ----------------------------------------------------
const PROFILE_KEY = 'planejador_profile_v1';
const PROFILE_SHIFTS = ['integral', 'noturno'];
let userProfile = { name: '', pronoun: '', pronounText: '', period: '', shift: '' };
const PRONOUN_DEFAULT_TEXT = { m: 'ele/dele', f: 'ela/dela', n: 'elu/delu' };
function pronounFromText(text) {
  const n = normalizeKeepSpaces(text);
  if (!n) return '';
  const iF = n.search(/\b(ela|dela|feminin\w*)\b/), iM = n.search(/\b(ele|dele|masculin\w*)\b/);
  if (iF >= 0 && (iM < 0 || iF < iM)) return 'f';
  if (iM >= 0) return 'm';
  return 'n';
}

function cleanProfileName(value) {
  return String(value || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
}
function loadUserProfile() {
  let raw = {};
  try { raw = JSON.parse(readSetting(PROFILE_KEY) || '{}') || {}; } catch (_) { raw = {}; }
  const period = Number(raw.period);
  userProfile = {
    name: cleanProfileName(raw.name),
    pronoun: ['m', 'f', 'n'].includes(raw.pronoun) ? raw.pronoun : '',
    pronounText: cleanProfileName(raw.pronounText) || (['m', 'f', 'n'].includes(raw.pronoun) ? PRONOUN_DEFAULT_TEXT[raw.pronoun] : ''),
    period: Number.isInteger(period) && period >= 1 && period <= 11 ? String(period) : '',
    shift: PROFILE_SHIFTS.includes(raw.shift) ? raw.shift : ''
  };
}
function saveUserProfile() {
  const empty = !userProfile.name && !userProfile.pronoun && !userProfile.pronounText && !userProfile.period && !userProfile.shift;
  if (empty) { try { localStorage.removeItem(PROFILE_KEY); } catch (_) {} }
  else writeSetting(PROFILE_KEY, JSON.stringify(userProfile));
  window.dispatchEvent(new CustomEvent('planejador:profile'));
}
// Concordância: gen('o', 'a', 'e') -> conforme o pronome; sem pronome usa a forma neutra do texto (4º argumento).
function gen(m, f, n, unset) {
  const p = userProfile.pronoun;
  if (p === 'm') return m;
  if (p === 'f') return f;
  if (p === 'n') return n;
  return unset !== undefined ? unset : n;
}
function welcomeWord() { return gen('Bem-vindo', 'Bem-vinda', 'Bem-vinde', 'Olá'); }
function userGreeting() {
  const name = userProfile.name;
  return name ? `${welcomeWord()}, ${name}` : '';
}
window.UserProfile = {
  get: () => ({ ...userProfile }),
  name: () => userProfile.name,
  pronoun: () => userProfile.pronoun,
  pronounText: () => userProfile.pronounText,
  period: () => userProfile.period,
  shift: () => userProfile.shift,
  gen,
  set(patch) {
    if (patch && 'name' in patch) userProfile.name = cleanProfileName(patch.name);
    if (patch && 'pronounText' in patch) { userProfile.pronounText = cleanProfileName(patch.pronounText); userProfile.pronoun = pronounFromText(userProfile.pronounText); }
    if (patch && 'pronoun' in patch) {
      userProfile.pronoun = ['m', 'f', 'n'].includes(patch.pronoun) ? patch.pronoun : '';
      if (!('pronounText' in patch)) userProfile.pronounText = userProfile.pronoun ? PRONOUN_DEFAULT_TEXT[userProfile.pronoun] : '';
    }
    if (patch && 'period' in patch) { const n = Number(patch.period); userProfile.period = Number.isInteger(n) && n >= 1 && n <= 11 ? String(n) : ''; }
    if (patch && 'shift' in patch) userProfile.shift = PROFILE_SHIFTS.includes(patch.shift) ? patch.shift : '';
    saveUserProfile();
    updateProfileUI();
  }
};

function updateProfileUI() {
  const nameInput = document.getElementById('profile-name');
  if (nameInput && document.activeElement !== nameInput) nameInput.value = userProfile.name;
  const period = document.getElementById('profile-period');
  if (period) period.value = userProfile.period;
  const pron = document.getElementById('profile-pronouns');
  if (pron && document.activeElement !== pron) pron.value = userProfile.pronounText;
  document.querySelectorAll('#settings-view-profile [data-pa-action="set-shift"]').forEach(btn => {
    const on = btn.dataset.value === userProfile.shift;
    btn.setAttribute('aria-checked', on ? 'true' : 'false'); btn.classList.toggle('is-selected', on);
  });
  const clear = document.getElementById('profile-clear');
  if (clear) clear.disabled = !userProfile.name && !userProfile.pronounText && !userProfile.period && !userProfile.shift;
  const heroName = userProfile.name || T('Sem nome');
  ['profile-hero-label', 'profile-mini-name'].forEach(id => { const el = document.getElementById(id); if (el) { el.textContent = heroName; el.classList.toggle('is-empty', !userProfile.name); } });
  const cap = document.getElementById('profile-caption');
  if (cap) {
    const parts = [];
    if (userProfile.period) parts.push(T('{n}º período', { n: userProfile.period }));
    if (userProfile.shift) parts.push(T(userProfile.shift === 'noturno' ? 'Noturno' : 'Integral'));
    cap.textContent = parts.length ? parts.join(' · ') : T('Estudante da UFRJ');
  }
  const home = document.getElementById('home-greeting');
  if (home) { home.textContent = userGreeting(); home.hidden = !userProfile.name; }
}

// Foto do perfil: fica só neste aparelho (localStorage), reduzida e recortada em quadrado; nunca vai para a nuvem.
const PHOTO_KEY = 'planejador_foto_v1';
function getProfilePhoto() {
  try { const v = localStorage.getItem(PHOTO_KEY); return v && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v) ? v : ''; } catch (_) { return ''; }
}
function applyProfilePhoto() {
  const url = getProfilePhoto();
  document.querySelectorAll('.profile-avatar').forEach(el => { el.classList.toggle('has-photo', !!url); el.style.backgroundImage = url ? `url("${url}")` : ''; });
  const rm = document.getElementById('profile-photo-remove'); if (rm) rm.hidden = !url;
}
function setProfilePhotoFromFile(file) {
  if (!file || !/^image\//.test(file.type)) { showToast({ text: T('Escolha um arquivo de imagem.'), mode: 'error' }); return; }
  const img = new Image(), src = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(src);
    try {
      const S = 320, c = document.createElement('canvas'); c.width = c.height = S;
      const side = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, S, S); ctx.drawImage(img, sx, sy, side, side, 0, 0, S, S);
      localStorage.setItem(PHOTO_KEY, c.toDataURL('image/jpeg', 0.85));
      applyProfilePhoto();
    } catch (_) { showToast({ text: T('Não foi possível salvar a foto.'), mode: 'error' }); }
  };
  img.onerror = () => { URL.revokeObjectURL(src); showToast({ text: T('Não foi possível abrir essa imagem.'), mode: 'error' }); };
  img.src = src;
}

function initProfileSettings() {
  updateProfileUI();
  applyProfilePhoto();
  const photoInput = document.getElementById('profile-photo-input');
  document.getElementById('profile-photo-btn')?.addEventListener('click', () => photoInput?.click());
  photoInput?.addEventListener('change', () => { setProfilePhotoFromFile(photoInput.files && photoInput.files[0]); photoInput.value = ''; });
  document.getElementById('profile-photo-remove')?.addEventListener('click', () => { try { localStorage.removeItem(PHOTO_KEY); } catch (_) {} applyProfilePhoto(); });
  const nameInput = document.getElementById('profile-name');
  nameInput?.addEventListener('input', () => {
    userProfile.name = cleanProfileName(nameInput.value);
    saveUserProfile();
    updateProfileUI();
  });
  const pronInput = document.getElementById('profile-pronouns');
  pronInput?.addEventListener('input', () => {
    userProfile.pronounText = cleanProfileName(pronInput.value);
    userProfile.pronoun = pronounFromText(userProfile.pronounText);
    saveUserProfile();
    updateProfileUI();
  });
  document.getElementById('profile-period')?.addEventListener('change', event => {
    window.UserProfile.set({ period: event.target.value });
  });
}

// =====================================================================
// Configurações: páginas por tópico (hub e telas internas).
// =====================================================================
// ----------------------------------------------------
// Configurações em páginas por tópico (hub + páginas dedicadas)
// ----------------------------------------------------
const SETTINGS_VIEWS = ['profile', 'appearance', 'access', 'language', 'contacts', 'updates', 'support'];
let settingsView = 'hub';

function showSettingsView(name) {
  const target = name === 'hub' || SETTINGS_VIEWS.includes(name) ? name : 'hub';
  document.querySelectorAll('#modal-settings .settings-view').forEach(view => {
    const on = view.id === 'settings-view-' + target;
    view.hidden = !on;
    view.classList.toggle('is-entering', on && !animationsOff());
  });
  settingsView = target;
  const page = document.getElementById('modal-settings');
  if (page) page.scrollTop = 0;
  if (target === 'dock' || target === 'appearance') { renderDockPreview(); renderDockOrderList(); updateDockControls(); }
  if (target === 'contacts') renderContatos();
  if (target === 'hub') document.querySelector('#modal-settings .settings-hub-item')?.focus?.({ preventScroll: true });
}
function openSettingsView(name) { showSettingsView(name); }
function closeSettingsView() { showSettingsView('hub'); }

// =====================================================================
// Configurações: acessibilidade (animações, busca fixa e botão flutuante da agenda).
// =====================================================================
// ----------------------------------------------------
// Acessibilidade: animações, cores (prévia) e busca fixa
// ----------------------------------------------------
const A11Y_KEYS = { noAnim: 'planejador_noanim_v1', fixedSearch: 'planejador_fsearch_v1', fixedScope: 'planejador_fsearch_scope_v1' };
const FSEARCH_SCOPES = ['all', 'available', 'contacts'];
function animationsOff() { return document.documentElement.classList.contains('no-anim'); }
function getFixedSearchOn() { return readSetting(A11Y_KEYS.fixedSearch) === '1'; }
function getFixedSearchScope() { const v = readSetting(A11Y_KEYS.fixedScope); return FSEARCH_SCOPES.includes(v) ? v : 'all'; }

function applyNoAnim(on) { document.documentElement.classList.toggle('no-anim', !!on); }
function setNoAnim(on) {
  writeSetting(A11Y_KEYS.noAnim, on ? '1' : '0');
  applyNoAnim(on);
  updateA11yUI();
}
function setFixedSearch(on) {
  writeSetting(A11Y_KEYS.fixedSearch, on ? '1' : '0');
  applyFixedSearch();
  updateA11yUI();
}
function setFixedSearchScope(scope) {
  if (!FSEARCH_SCOPES.includes(scope)) return;
  writeSetting(A11Y_KEYS.fixedScope, scope);
  updateA11yUI();
  renderFixedSearchResults();
}
function updateA11yUI() {
  const setSwitch = (id, on) => { const el = document.getElementById(id); if (el) el.setAttribute('aria-checked', on ? 'true' : 'false'); };
  setSwitch('switch-no-anim', animationsOff());
  setSwitch('switch-fixed-search', getFixedSearchOn());
  setSwitch('switch-agenda-float', !!(window.Notas && window.Notas.floatOn()));
  const row = document.getElementById('fsearch-scope-row');
  if (row) row.hidden = !getFixedSearchOn();
  const scope = getFixedSearchScope();
  document.querySelectorAll('#modal-settings [data-pa-action="set-fsearch-scope"]').forEach(btn => {
    const on = btn.dataset.value === scope;
    btn.setAttribute('aria-checked', on ? 'true' : 'false'); btn.classList.toggle('is-selected', on);
  });
}

function pickThemeColor(color) {
  if (color === 'green') return;
  // Recurso de prévia: o painel existe, mas ainda não muda o visual.
  showToast({ text: T('O recurso ainda está em fase de testes, mas jajá eu libero pra vocês testarem também ;)'), icon: 'check' });
}
