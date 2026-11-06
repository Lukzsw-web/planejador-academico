/* nucleo.js — Núcleo: eventos por delegação, inicialização, ajuste para iPhone, posição de rolagem e service worker.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Núcleo: sincronização entre abas do navegador e eventos por delegação (data-pa-action).
// =====================================================================
// ---- Várias abas abertas: mantém o estado sincronizado ----
function refreshFromStorage() {
  const checked = loadJSON(STORAGE_KEYS.checked, []);
  const planner = loadJSON(STORAGE_KEYS.plannerChecked, []);
  appState.concludedCodes.clear();
  (Array.isArray(checked) ? checked : []).forEach(code => { if (disciplinasPorCodigo.has(code)) appState.concludedCodes.add(code); });
  appState.plannerCheckedCodes.clear();
  (Array.isArray(planner) ? planner : []).forEach(code => { if (disciplinasPorCodigo.has(code)) appState.plannerCheckedCodes.add(code); });

  checkboxesPorCodigo.forEach((cb, code) => { cb.checked = appState.concludedCodes.has(code); });
  updateDashboard();
  applySelectedVisualization(appState.concludedCodes);
  if (document.getElementById('planner-obrig-container')) renderPlanner();
}

function initStorageSync() {
  window.addEventListener('storage', event => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key === null || event.key === STORAGE_KEYS.checked || event.key === STORAGE_KEYS.plannerChecked) {
      refreshFromStorage();
    } else if (event.key === STORAGE_KEYS.theme) {
      setTheme(event.newValue ? event.newValue === 'dark' : Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches), false);
    }
  });
}

// ---- Eventos por delegação (sem onclick/onpointerdown dentro do HTML dos cards) ----
function handleActionClick(event) {
  const el = event.target.closest?.('[data-pa-action]');
  if (!el) return;
  const { paAction: action, codigo, periodo } = el.dataset;
  switch (action) {
    case 'copy-code': copyCodeToClipboard(codigo, event); break;
    case 'coreq-info': showCoreqInfo(event, codigo); break;
    case 'details': event.stopPropagation(); openSubjectDetails(codigo); break;
    case 'planner-details': event.stopPropagation(); openPlannerDetails(codigo); break;
    case 'mark-all': marcarTudo(periodo); break;
    case 'clear-period': limparTudo(periodo); break;
    case 'cond-info': showCondInfo(event); break;
    case 'onboarding-next': handleOnboardingNav(1); break;
    case 'onboarding-back': handleOnboardingNav(-1); break;
    case 'set-theme': setThemePref(el.dataset.value); break;
    case 'set-text-size': setTextSize(el.dataset.value); break;
    case 'set-toast-ms': setToastMs(Number(el.dataset.value)); break;
    case 'set-lang': setLanguage(el.dataset.value); break;
    case 'dock-reset': resetDockPrefs(); break;
    case 'settings-open': openSettingsView(el.dataset.value); break;
    case 'settings-back': closeSettingsView(); break;
    case 'set-shift': window.UserProfile.set({ shift: el.dataset.value }); break;
    case 'profile-clear': openConfirmationModal({ title: T('Limpar perfil?'), message: T('Nome, pronomes, período e turno salvos neste aparelho serão apagados.'), confirmText: T('Limpar'), cancelText: T('Cancelar'), onConfirm: () => { userProfile = { name: '', pronoun: '', pronounText: '', period: '', shift: '' }; saveUserProfile(); updateProfileUI(); } }); break;
    case 'theme-color': pickThemeColor(el.dataset.value); break;
    case 'toggle-no-anim': setNoAnim(!animationsOff()); break;
    case 'toggle-fixed-search': setFixedSearch(!getFixedSearchOn()); break;
    case 'toggle-agenda-float': window.Notas?.setFloat(!window.Notas.floatOn()); updateA11yUI(); break;
    case 'set-fsearch-scope': setFixedSearchScope(el.dataset.value); break;
    case 'note-open': window.Notas?.openFor(el.dataset.codigo); break;
    case 'check-update': checkForUpdate(); break;
    case 'copy-email': copyTextToClipboard(SUPPORT_EMAIL, T('E-mail'), event); break;
    default: break;
  }
}

function initDelegatedEvents() {
  if (window.__paDelegatedBound) return;
  window.__paDelegatedBound = true;

  ['accordions-container', 'planner-obrig-container', 'planner-cond-container'].forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;
    const isPlanner = id !== 'accordions-container';
    const cardSelector = isPlanner ? '.planner-card' : '.subject-card';
    const start = isPlanner ? startPlannerLongPress : startLongPress;
    const move = isPlanner ? handlePlannerLongPressMove : handleLongPressMove;
    const cancel = isPlanner ? cancelPlannerLongPress : cancelLongPress;

    container.addEventListener('pointerdown', event => {
      const card = event.target.closest?.(cardSelector);
      if (card) start(card.dataset.codigo, event);
    });
    container.addEventListener('pointermove', move);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => container.addEventListener(type, () => cancel()));

    container.addEventListener('change', event => {
      const cb = event.target;
      if (!(cb instanceof HTMLInputElement) || cb.type !== 'checkbox' || !cb.closest(cardSelector)) return;
      if (isPlanner) togglePlannerCard(cb);
      else handleSubjectCheckboxChange(cb);
    });
  });

  // Fase de captura: o .planner-screen do index.html tem onclick="event.stopPropagation()",
  // o que impediria os cliques dentro de "O que puxar?" de chegar ao document.
  document.addEventListener('click', handleActionClick, true);
}

// =====================================================================
// Núcleo: ajudas de acessibilidade e a inicialização geral do site (DOMContentLoaded).
// =====================================================================
function initAccessibilityHelpers() {
  const toast = document.getElementById('toast-copy');
  if (toast) {
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
  }
  // O toque longo abre os detalhes; no celular ele também dispararia o menu do sistema.
  document.addEventListener('contextmenu', event => {
    const fromTouch = event.pointerType === 'touch' || event.sourceCapabilities?.firesTouchEvents;
    if (fromTouch && event.target.closest?.('.subject-card, .planner-card')) event.preventDefault();
  });
}

// ----------------------------------------------------
// CORE INIT
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderContatos();
  initContatosSearch();
  renderAccordions();
  syncAccordionTheme(html.classList.contains('dark'));
  restoreCheckedState();
  updateDashboard();
  applySelectedVisualization(appState.concludedCodes);
  initMainSearch();
  dockPrefs = loadDockPrefs();
  applyDockPrefs();
  loadUserProfile();
  initSettings();
  initDockSettings();
  initProfileSettings();
  initAccessibilitySettings();
  initDelegatedEvents();
  initAccordionAnimation();
  initAccessibilityHelpers();
  initStorageSync();
  initPlannerFilter();
  try {
    const savedTab = localStorage.getItem('planejador_active_tab_v1');
    if (savedTab && bottomTabIds.includes(savedTab)) {
      activeBottomTabId = savedTab;
      if (savedTab === 'modal-planner') renderPlanner();
      if (savedTab === 'modal-farmacia') window.FarmacIA?.show();
      if (savedTab === 'modal-comunicados') window.Comunicados?.show?.();
    }
  } catch (_) {}
  normalizeBottomTabs(activeBottomTabId, true);
  restoreScrollState();
  maybeShowOnboarding();
  window.setTimeout(() => html.classList.add('app-ready'), 700);
  initIOSStandaloneFix();
});

// =====================================================================
// Núcleo: correção de layout/rolagem para iPhone em modo aplicativo.
// =====================================================================
// ----------------------------------------------------
// iPhone: app instalado na tela de início
// Sintoma: ao abrir, a tela não rolava nem respondia até trocar de aba e voltar.
// Causa provável: as telas são camadas fixas com rolagem própria; o WebKit só "ativa" essa
// rolagem depois de uma nova composição (o que a troca de aba provoca) e, na primeira pintura,
// 100vw/100dvh podem vir defasados. A correção refaz layout e composição da aba atual ao abrir,
// ao voltar para o app e ao girar o aparelho.
// ----------------------------------------------------
function refreshActiveTabLayout() {
  if (bottomTabTransitionTimer !== null || bottomSwipeDirection) return;
  const page = getBottomTabElement(activeBottomTabId);
  if (!page) return;
  normalizeBottomTabs(activeBottomTabId, true);
  // Força um ciclo de layout no contêiner rolável...
  page.style.setProperty('overflow-y', 'hidden', 'important');
  void page.offsetHeight;
  page.style.removeProperty('overflow-y');
  // ...e uma nova composição (deslocamento de meio pixel por um quadro, imperceptível).
  const index = getBottomTabIndex(activeBottomTabId);
  page.style.setProperty('transform', 'translate3d(0.5px, 0, 0)', 'important');
  requestAnimationFrame(() => {
    if (bottomTabTransitionTimer === null && !bottomSwipeDirection) setBottomTrackPosition(index, 0, false);
  });
}

function initIOSStandaloneFix() {
  const kick = () => refreshActiveTabLayout();
  [0, 120, 450, 1200].forEach(ms => window.setTimeout(kick, ms));
  window.addEventListener('load', kick, { once: true });
  window.addEventListener('pageshow', kick);
  window.addEventListener('orientationchange', () => window.setTimeout(kick, 150));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') kick(); });
  window.visualViewport?.addEventListener('resize', () => {
    if (!document.documentElement.classList.contains('farma-typing')) kick();
  });
}

// =====================================================================
// Núcleo: salvar e restaurar a posição de rolagem ao atualizar a página.
// =====================================================================
// ----------------------------------------------------
// Posição de rolagem: ao atualizar a página, volta exatamente ao ponto onde o usuário estava.
// As telas são camadas com rolagem própria (não a janela), então salvamos cada uma, além de
// quais sanfonas estavam abertas (sem elas a página fica mais curta e a posição não existe mais).
// ----------------------------------------------------
const SCROLL_KEY = 'planejador_scroll_v1';
const SCROLL_PAGES = ['home-page', 'modal-planner'];
let scrollRestoreActive = false; // true enquanto a restauração ainda pode refazer a posição
let scrollSaveTimer = null;

function scrollSnapshot() {
  const snap = { pages: {}, home: [], planner: [], win: Math.round(window.scrollY || 0) };
  SCROLL_PAGES.forEach(id => { const el = document.getElementById(id); if (el) snap.pages[id] = Math.round(el.scrollTop); });
  const lists = document.querySelector('.planner-lists-scroll');
  if (lists) snap.lists = Math.round(lists.scrollTop);
  document.querySelectorAll('#accordions-container > details').forEach((d, i) => { if (d.open) snap.home.push(i); });
  document.querySelectorAll('.planner-group').forEach((d, i) => { if (d.open) snap.planner.push(i); });
  return snap;
}

function saveScrollState() {
  if (scrollRestoreActive) return; // não sobrescreve o valor salvo enquanto ainda restauramos
  writeSetting(SCROLL_KEY, JSON.stringify(scrollSnapshot()));
}
function queueScrollSave() {
  if (scrollRestoreActive) return;
  window.clearTimeout(scrollSaveTimer);
  scrollSaveTimer = window.setTimeout(saveScrollState, 120);
}

function restoreScrollState() {
  let snap = null;
  try { snap = JSON.parse(readSetting(SCROLL_KEY) || 'null'); } catch (_) { snap = null; }
  const bindSaving = () => {
    document.addEventListener('scroll', queueScrollSave, { capture: true, passive: true });
    document.addEventListener('toggle', queueScrollSave, { capture: true });
    window.addEventListener('pagehide', () => { scrollRestoreActive = false; saveScrollState(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { scrollRestoreActive = false; saveScrollState(); } });
  };
  if (!snap || typeof snap !== 'object') { bindSaving(); return; }

  // Sanfonas primeiro: a altura da página depende delas.
  const homeDetails = Array.from(document.querySelectorAll('#accordions-container > details'));
  (Array.isArray(snap.home) ? snap.home : []).forEach(i => { if (homeDetails[i]) homeDetails[i].open = true; });
  const plannerGroups = Array.from(document.querySelectorAll('.planner-group'));
  if (Array.isArray(snap.planner)) plannerGroups.forEach((d, i) => { d.open = snap.planner.includes(i); });

  const apply = () => {
    SCROLL_PAGES.forEach(id => {
      const el = document.getElementById(id);
      const y = snap.pages && snap.pages[id];
      if (el && Number.isFinite(y) && y > 0) el.scrollTop = y;
    });
    const lists = document.querySelector('.planner-lists-scroll');
    if (lists && Number.isFinite(snap.lists) && snap.lists > 0) lists.scrollTop = snap.lists;
    if (Number.isFinite(snap.win) && snap.win > 0) window.scrollTo(0, snap.win);
  };

  scrollRestoreActive = true;
  const stop = () => {
    if (!scrollRestoreActive) return;
    scrollRestoreActive = false;
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(t => window.removeEventListener(t, stop, true));
  };
  // Se o usuário tocar/rolar antes da restauração terminar, a vontade dele vale mais.
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(t => window.addEventListener(t, stop, { capture: true, passive: true }));

  apply();
  requestAnimationFrame(() => { apply(); requestAnimationFrame(apply); });
  window.addEventListener('load', () => { if (scrollRestoreActive) apply(); }, { once: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (scrollRestoreActive) apply(); }).catch(() => {});
  window.setTimeout(() => { if (scrollRestoreActive) apply(); }, 350);
  window.setTimeout(() => { if (scrollRestoreActive) apply(); stop(); }, 900);
  bindSaving();
}

// =====================================================================
// Seção: service-worker-registro
// =====================================================================
/* service-worker-registro.js — registra o service worker (uso offline). O app continua funcionando se isso falhar. */
    (() => {
  if (!('serviceWorker' in navigator)) return;
  const secureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!secureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // O aplicativo continua funcionando normalmente mesmo se o cache offline não puder ser ativado.
    });
  }, { once: true });
})();
  
