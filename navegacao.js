/* navegacao.js — Navegação: abas inferiores (dock) e arrastar de lado entre abas.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Navegação: abas inferiores (dock), arrastar de lado entre abas e atalhos para abrir cada aba.
// =====================================================================
const bottomTabIds = ['home-page', 'modal-planner', 'modal-farmacia', 'modal-comunicados', 'modal-settings'];
const bottomTabNavIds = {
  'home-page': 'bottom-nav-home',
  'modal-planner': 'bottom-nav-planner',
  'modal-farmacia': 'bottom-nav-farmacia',
  'modal-comunicados': 'bottom-nav-comunicados',
  'modal-settings': 'bottom-nav-settings'
};

let activeBottomTabId = 'home-page';
let bottomSwipePointerId = null;
let bottomSwipeStartX = 0;
let bottomSwipeStartY = 0;
let bottomSwipeStartIndex = 0;
let bottomSwipeDirection = 0;
let bottomSwipeWidth = 0;
let bottomSwipeTracking = false;
let bottomSwipeLocked = false;
let bottomSwipeJustDragged = false;
let bottomTabTransitionTimer = null;

function setBottomNavActive(id) {
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    const active = item.id === id;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', active ? 'true' : 'false');
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

function getBottomTabElement(id) {
  return document.getElementById(id);
}

function getBottomTabIndex(id) {
  return bottomTabIds.indexOf(id);
}

function getViewportWidth() {
  // No iPhone (app instalado) innerWidth pode vir defasado na primeira pintura; clientWidth é estável.
  return Math.max(1, document.documentElement.clientWidth || window.innerWidth || 1);
}

function setBottomTrackPosition(activeIndex, dragX = 0, transition = false) {
  const width = getViewportWidth();
  bottomTabIds.forEach((id, index) => {
    const tab = getBottomTabElement(id);
    if (!tab) return;
    tab.style.setProperty(
      'transform',
      `translate3d(${((index - activeIndex) * width) + dragX}px, 0, 0)`,
      'important'
    );
    tab.style.setProperty(
      'transition',
      transition && !animationsOff() ? 'transform .28s cubic-bezier(.22,1,.36,1)' : 'none',
      'important'
    );
  });
}

function normalizeBottomTabs(activeId, instant = true) {
  const activeIndex = getBottomTabIndex(activeId);
  if (activeIndex < 0) return;

  bottomTabIds.forEach((id, index) => {
    const tab = getBottomTabElement(id);
    if (!tab) return;
    const active = index === activeIndex;
    tab.classList.toggle('bottom-tab-current', active);
    tab.classList.remove('bottom-tab-dragging', 'active');
    tab.setAttribute('aria-hidden', active ? 'false' : 'true');
    tab.style.setProperty('pointer-events', active ? 'auto' : 'none', 'important');
    tab.style.setProperty('visibility', 'visible', 'important');
    tab.style.setProperty('opacity', '1', 'important');
    tab.style.setProperty('z-index', '80', 'important');
  });

  setBottomTrackPosition(activeIndex, 0, !instant);
  setBottomNavActive(bottomTabNavIds[activeId]);
  document.body.style.overflow = activeId === 'home-page' ? '' : 'hidden';
  try { localStorage.setItem('planejador_active_tab_v1', activeId); } catch (_) {}
}

function prepareBottomTabForDrag(tab, pointerEvents = true) {
  if (!tab) return;
  tab.classList.add('bottom-tab-dragging');
  tab.style.setProperty('visibility', 'visible', 'important');
  tab.style.setProperty('opacity', '1', 'important');
  tab.style.setProperty('pointer-events', pointerEvents ? 'auto' : 'none', 'important');
  tab.style.setProperty('transition', 'none', 'important');
  tab.style.setProperty('z-index', '80', 'important');
}

function beginBottomSwipe(direction) {
  const currentIndex = getBottomTabIndex(activeBottomTabId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= bottomTabIds.length) return false;

  const current = getBottomTabElement(activeBottomTabId);
  const target = getBottomTabElement(bottomTabIds[nextIndex]);
  if (!current || !target) return false;

  if (target.id === 'modal-planner') renderPlanner();
  if (target.id === 'modal-farmacia') window.FarmacIA?.show();
  if (target.id === 'modal-comunicados') window.Comunicados?.show?.();

  bottomSwipeStartIndex = currentIndex;
  bottomSwipeDirection = direction;
  bottomSwipeWidth = Math.max(1, window.innerWidth);

  // Todas as quatro telas pertencem ao mesmo trilho horizontal.
  // Não existe tela "por cima" ou "por baixo": cada uma ocupa sua posição
  // consecutiva no eixo X, exatamente como um pager/WhatsApp.
  bottomTabIds.forEach(id => prepareBottomTabForDrag(getBottomTabElement(id), id === current.id || id === target.id));
  setBottomTrackPosition(currentIndex, 0, false);
  document.documentElement.classList.add('tab-dragging');
  return true;
}

function updateBottomSwipe(dx) {
  if (!bottomSwipeDirection) return;
  const width = bottomSwipeWidth || window.innerWidth;
  const progress = Math.max(0, Math.min(1, (-dx * bottomSwipeDirection) / width));
  setBottomTrackPosition(bottomSwipeStartIndex, dx, false);
  const targetIndex = bottomSwipeStartIndex + bottomSwipeDirection;
  setBottomNavActive(
    progress >= 0.5
      ? bottomTabNavIds[bottomTabIds[targetIndex]]
      : bottomTabNavIds[bottomTabIds[bottomSwipeStartIndex]]
  );
}

function clearBottomSwipeState() {
  bottomSwipePointerId = null;
  bottomSwipeDirection = 0;
  bottomSwipeWidth = 0;
  bottomSwipeTracking = false;
  bottomSwipeLocked = false;
  document.documentElement.classList.remove('tab-dragging');
}

function finishBottomSwipe(clientX, clientY, cancelled = false) {
  if (!bottomSwipeTracking && !bottomSwipeDirection) return;

  const dx = clientX - bottomSwipeStartX;
  const dy = clientY - bottomSwipeStartY;
  const direction = bottomSwipeDirection;
  const width = bottomSwipeWidth || window.innerWidth;
  const progress = Math.min(1, Math.abs(dx) / width);
  const validDirection = direction && Math.sign(dx) === -direction;
  const shouldComplete = !cancelled && bottomSwipeLocked && validDirection &&
    Math.abs(dx) > Math.abs(dy) * 1.15 && (progress >= 0.35 || Math.abs(dx) >= 110);

  bottomSwipeTracking = false;
  bottomSwipeLocked = false;
  bottomSwipeJustDragged = Math.abs(dx) > 12;

  if (!direction) {
    clearBottomSwipeState();
    return;
  }

  if (shouldComplete) {
    const targetIndex = bottomSwipeStartIndex + direction;
    const targetId = bottomTabIds[targetIndex];
    setBottomTrackPosition(
      bottomSwipeStartIndex,
      direction > 0 ? -width : width,
      true
    );
    setBottomNavActive(bottomTabNavIds[targetId]);
    activeBottomTabId = targetId;
    document.body.style.overflow = targetId === 'home-page' ? '' : 'hidden';

    bottomTabTransitionTimer = window.setTimeout(() => {
      bottomTabTransitionTimer = null;
      normalizeBottomTabs(activeBottomTabId, true);
      clearBottomSwipeState();
    }, 320);
  } else {
    // Solta antes do limiar: o trilho volta exatamente para a posição atual.
    setBottomTrackPosition(bottomSwipeStartIndex, 0, true);
    setBottomNavActive(bottomTabNavIds[activeBottomTabId]);
    bottomTabTransitionTimer = window.setTimeout(() => {
      bottomTabTransitionTimer = null;
      normalizeBottomTabs(activeBottomTabId, true);
      clearBottomSwipeState();
    }, 320);
  }
}

function isBottomNavInteractiveTarget(target) {
  return !!target?.closest?.(
    '#bottom-nav, input, textarea, select, [contenteditable="true"], [data-no-tab-swipe="true"]'
  );
}

const bottomSwipeActivePointers = new Set();

// Página ampliada (pinça): o arrasto de um dedo pertence ao zoom, nunca ao pager de abas.
// Sem isso o gesto virava "deslizar de aba", travava e voltava à posição original.
function isPageZoomed() { const vv = window.visualViewport; return !!vv && vv.scale > 1.02; }
function syncZoomState() { document.documentElement.classList.toggle('pa-zoomed', isPageZoomed()); }
window.visualViewport?.addEventListener('resize', syncZoomState, { passive: true });
function handleBottomSwipeStart(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (isPageZoomed()) return;
  if (isBottomNavInteractiveTarget(event.target) || event.target?.closest?.('#search-wrapper, #planner-search-wrapper, #search-suggestions')) return;
  if (bottomTabTransitionTimer !== null) {
    clearTimeout(bottomTabTransitionTimer);
    bottomTabTransitionTimer = null;
  }
  if (bottomSwipeDirection) clearBottomSwipeState();

  const activePage = getBottomTabElement(activeBottomTabId);
  if (!activePage) return;

  bottomSwipePointerId = event.pointerId;
  bottomSwipeStartX = event.clientX;
  bottomSwipeStartY = event.clientY;
  bottomSwipeTracking = true;
  bottomSwipeLocked = false;
  bottomSwipeJustDragged = false;
  // A captura do ponteiro só é feita quando o gesto horizontal é confirmado (handleBottomSwipeMove).
  // Capturar já no toque redirecionava o clique seguinte para a página e quebrava os botões.
}

function handleBottomSwipeMove(event) {
  if (!bottomSwipeTracking || event.pointerId !== bottomSwipePointerId) return;
  if (isPageZoomed()) {
    if (bottomSwipeLocked) finishBottomSwipe(bottomSwipeStartX, bottomSwipeStartY, true);
    bottomSwipeTracking = false;
    bottomSwipePointerId = null;
    return;
  }
  const dx = event.clientX - bottomSwipeStartX;
  const dy = event.clientY - bottomSwipeStartY;

  if (!bottomSwipeLocked) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dy) > Math.abs(dx) * 1.15) {
      bottomSwipeTracking = false;
      bottomSwipePointerId = null;
      return;
    }

    const direction = dx < 0 ? 1 : -1;
    if (!beginBottomSwipe(direction)) {
      bottomSwipeTracking = false;
      bottomSwipePointerId = null;
      return;
    }
    bottomSwipeLocked = true;
    try { getBottomTabElement(activeBottomTabId)?.setPointerCapture?.(event.pointerId); } catch (_) {}
  }

  event.preventDefault();
  bottomSwipeJustDragged = true;
  updateBottomSwipe(dx);
}

// Pinça (dois dedos) é zoom, nunca troca de aba: qualquer segundo toque cancela o gesto.
document.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch') return;
  bottomSwipeActivePointers.add(event.pointerId);
  if (bottomSwipeActivePointers.size > 1 && bottomSwipePointerId !== null) {
    if (bottomSwipeLocked) finishBottomSwipe(bottomSwipeStartX, bottomSwipeStartY, true);
    bottomSwipeTracking = false;
    bottomSwipePointerId = null;
  }
}, { passive: true, capture: true });
['pointerup', 'pointercancel'].forEach(type => {
  document.addEventListener(type, event => bottomSwipeActivePointers.delete(event.pointerId), { passive: true, capture: true });
});
document.addEventListener('pointerdown', event => {
  if (bottomSwipeActivePointers.size > 1) return;
  handleBottomSwipeStart(event);
}, { passive: true, capture: true });
window.addEventListener('resize', () => normalizeBottomTabs(activeBottomTabId, true), { passive: true });
document.addEventListener('pointermove', handleBottomSwipeMove, { passive: false, capture: true });
document.addEventListener('pointerup', event => {
  if (event.pointerId !== bottomSwipePointerId) return;
  finishBottomSwipe(event.clientX, event.clientY);
}, { passive: true, capture: true });
document.addEventListener('pointercancel', event => {
  if (event.pointerId !== bottomSwipePointerId) return;
  finishBottomSwipe(bottomSwipeStartX, bottomSwipeStartY, true);
}, { passive: true, capture: true });
document.addEventListener('click', event => {
  if (!bottomSwipeJustDragged || isBottomNavInteractiveTarget(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  bottomSwipeJustDragged = false;
}, true);

function dismissRegularModalsForBottomNavigation() {
  const activeIds = modalStack.filter(modalId => !bottomTabIds.includes(modalId));
  activeIds.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  });
  modalStack.length = 0;
  activeModalCount = 0;
  if (activeIds.length && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur?.();
  }
}

function activateBottomTab(id, instant = false) {
  // Contatos importantes agora vive em Configurações; links antigos continuam funcionando.
  if (id === 'modal-contatos') { openContactsPage(); return; }
  if (!bottomTabIds.includes(id)) return;
  if (animationsOff()) instant = true;

  if (bottomTabTransitionTimer !== null) {
    clearTimeout(bottomTabTransitionTimer);
    bottomTabTransitionTimer = null;
  }

  dismissRegularModalsForBottomNavigation();
  const currentId = activeBottomTabId;
  if (currentId === id) return;

  const currentIndex = getBottomTabIndex(currentId);
  const targetIndex = getBottomTabIndex(id);
  if (currentIndex < 0 || targetIndex < 0) return;

  if (id === 'modal-planner') renderPlanner();
  if (id === 'modal-farmacia') window.FarmacIA?.show();
  if (id === 'modal-comunicados') window.Comunicados?.show?.();

  // O clique também usa o mesmo trilho do swipe. As quatro telas ficam
  // sempre nas posições 0, 1, 2 e 3; só deslocamos o trilho inteiro.
  bottomTabIds.forEach(tabId => {
    const tab = getBottomTabElement(tabId);
    if (!tab) return;
    tab.classList.remove('bottom-tab-current', 'bottom-tab-dragging');
    tab.style.setProperty('visibility', 'visible', 'important');
    tab.style.setProperty('opacity', '1', 'important');
    tab.style.setProperty('pointer-events', 'none', 'important');
    tab.style.setProperty('z-index', '80', 'important');
  });

  setBottomTrackPosition(currentIndex, 0, false);

  if (instant) {
    activeBottomTabId = id;
    normalizeBottomTabs(activeBottomTabId, true);
    return;
  }

  bottomTabIds.forEach(tabId => {
    const tab = getBottomTabElement(tabId);
    if (tab) tab.classList.add('bottom-tab-dragging');
  });

  activeBottomTabId = id;
  const target = getBottomTabElement(id);
  if (target) target.setAttribute('aria-hidden', 'false');
  setBottomNavActive(bottomTabNavIds[id]);
  document.body.style.overflow = id === 'home-page' ? '' : 'hidden';

  requestAnimationFrame(() => {
    setBottomTrackPosition(targetIndex, 0, true);
  });

  bottomTabTransitionTimer = window.setTimeout(() => {
    bottomTabTransitionTimer = null;
    normalizeBottomTabs(activeBottomTabId, true);
  }, 300);
}

function goToHome() {
  activateBottomTab('home-page');
}
function openBottomPlanner() {
  activateBottomTab('modal-planner');
}
function openBottomFarmacia() {
  activateBottomTab('modal-farmacia');
}
function openBottomComunicados() {
  activateBottomTab('modal-comunicados');
}
// Contatos importantes: página dentro de Configurações (acima de Atualizações).
function openContactsPage() {
  activateBottomTab('modal-settings');
  showSettingsView('contacts');
}
function openBottomContacts() { openContactsPage(); }
function openBottomSettings() {
  if (activeBottomTabId === 'modal-settings' && settingsView !== 'hub') { closeSettingsView(); return; }
  activateBottomTab('modal-settings');
}

// =====================================================================
// Seção: menu-lateral
// =====================================================================
// Menu lateral aberto pela foto de perfil (aba Planejador). Só reaproveita o que já existe:
// as abas (activateBottomTab), as telas de Configurações (showSettingsView) e a foto/nome do perfil
// (applyProfilePhoto / UserProfile). Não guarda nada no aparelho.
const NAV_DRAWER_TARGETS = {
  home: () => activateBottomTab('home-page'),
  planner: () => activateBottomTab('modal-planner'),
  farmacia: () => activateBottomTab('modal-farmacia'),
  comunicados: () => activateBottomTab('modal-comunicados'),
  settings: () => { activateBottomTab('modal-settings'); showSettingsView('hub'); },
  appearance: () => { activateBottomTab('modal-settings'); showSettingsView('appearance'); },
  support: () => { activateBottomTab('modal-settings'); showSettingsView('support'); },
  profile: () => { activateBottomTab('modal-settings'); showSettingsView('profile'); }
};
const NAV_DRAWER_CURRENT = { 'home-page': 'home', 'modal-planner': 'planner', 'modal-farmacia': 'farmacia', 'modal-comunicados': 'comunicados' };
let navDrawerOpen = false;
let navDrawerCloseTimer = null;

function navDrawerEls() {
  return { drawer: document.getElementById('nav-drawer'), scrim: document.getElementById('nav-scrim'), opener: document.getElementById('nav-open') };
}

function updateNavDrawerUser() {
  const nameEl = document.getElementById('nav-user-name');
  if (!nameEl) return;
  const name = window.UserProfile ? window.UserProfile.name() : '';
  nameEl.textContent = name || T('Sem nome');
  nameEl.classList.toggle('is-empty', !name);
}

function updateNavDrawerCurrent() {
  const current = NAV_DRAWER_CURRENT[activeBottomTabId]
    || (activeBottomTabId === 'modal-settings' && typeof settingsView !== 'undefined'
      ? ({ appearance: 'appearance', support: 'support', profile: 'profile' }[settingsView] || 'settings') : '');
  document.querySelectorAll('#nav-drawer .nav-item').forEach(btn => {
    const on = btn.dataset.value === current;
    btn.classList.toggle('is-current', on);
    if (on) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
  });
}

function openNavDrawer() {
  const { drawer, scrim, opener } = navDrawerEls();
  if (!drawer || !scrim || navDrawerOpen) return;
  clearTimeout(navDrawerCloseTimer);
  updateNavDrawerUser();
  updateNavDrawerCurrent();
  drawer.style.transform = ''; scrim.style.opacity = '';
  drawer.hidden = false; scrim.hidden = false;
  void drawer.offsetWidth;                       // força o ponto de partida antes da transição
  drawer.classList.add('is-open'); scrim.classList.add('is-open');
  document.documentElement.classList.add('nav-open');
  if (opener) opener.setAttribute('aria-expanded', 'true');
  navDrawerOpen = true;
  (drawer.querySelector('.nav-item.is-current') || drawer.querySelector('.nav-close'))?.focus({ preventScroll: true });
}

function closeNavDrawer(returnFocus = true) {
  const { drawer, scrim, opener } = navDrawerEls();
  if (!drawer || !navDrawerOpen) return;
  navDrawerOpen = false;
  drawer.classList.remove('is-open'); scrim.classList.remove('is-open');
  drawer.style.transform = ''; scrim.style.opacity = '';
  document.documentElement.classList.remove('nav-open');
  if (opener) { opener.setAttribute('aria-expanded', 'false'); if (returnFocus) opener.focus({ preventScroll: true }); }
  const finish = () => { if (!navDrawerOpen) { drawer.hidden = true; scrim.hidden = true; } };
  const still = animationsOff() || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  clearTimeout(navDrawerCloseTimer);
  if (still) finish(); else navDrawerCloseTimer = setTimeout(finish, 300);
}

function navDrawerGo(target) {
  const go = NAV_DRAWER_TARGETS[target];
  if (!go) return;
  closeNavDrawer(false);                         // nunca fica aberto depois de navegar
  go();
}

function initNavDrawer() {
  const { drawer } = navDrawerEls();
  if (!drawer || drawer.dataset.navBound) return;
  drawer.dataset.navBound = '1';
  window.addEventListener('planejador:profile', updateNavDrawerUser);
  updateNavDrawerUser();

  document.addEventListener('keydown', event => {
    if (!navDrawerOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); closeNavDrawer(true); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(drawer.querySelectorAll('button:not([disabled])'));
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    else if (!drawer.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
  });

  // Deslizar para a esquerda fecha: o painel acompanha o dedo e, ao soltar, fecha ou volta.
  let drag = null;
  drawer.addEventListener('pointerdown', event => {
    if (!navDrawerOpen || (event.pointerType === 'mouse')) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now(), dx: 0, active: false };
  });
  drawer.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (dx < 0 && Math.abs(dx) > Math.abs(dy) * 1.2) { drag.active = true; try { drawer.setPointerCapture(event.pointerId); } catch (_) {} drawer.classList.add('is-dragging'); }
      else { drag = null; return; }
    }
    drag.dx = Math.min(0, dx);
    drawer.style.transform = `translateX(${drag.dx}px)`;
    const scrim = document.getElementById('nav-scrim');
    if (scrim) scrim.style.opacity = String(Math.max(0, 1 - Math.abs(drag.dx) / drawer.offsetWidth));
  });
  const endDrag = cancelled => event => {
    if (!drag || event.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.active) return;
    drawer.classList.remove('is-dragging');
    const fast = Math.abs(d.dx) / Math.max(1, performance.now() - d.t) > 0.5;
    if (!cancelled && (Math.abs(d.dx) > drawer.offsetWidth * 0.3 || fast)) closeNavDrawer(true);
    else { drawer.style.transform = ''; const s = document.getElementById('nav-scrim'); if (s) s.style.opacity = ''; }
    // com o ponteiro capturado pelo painel, o clique final cai no próprio painel e não aciona nenhum item
  };
  drawer.addEventListener('pointerup', endDrag(false));
  drawer.addEventListener('pointercancel', endDrag(true));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initNavDrawer); else initNavDrawer();
