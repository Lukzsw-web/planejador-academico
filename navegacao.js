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
let bottomSwipeDrawer = false;        // o gesto em andamento abre o menu lateral (primeira aba)
let bottomSwipeStartTarget = null;
let bottomSwipeStartedAtEdge = false;
let bottomSwipeFrame = 0, bottomSwipePendingDx = 0, bottomSwipeNavShown = null;
const NAV_EDGE_GUARD = 20;            // px: borda reservada ao gesto de voltar do sistema
const NAV_GESTURE_RATIO = 1.4;        // |dx| precisa superar |dy| por esta razão para abrir o menu

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

let lastPersistedTabId = null;
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
  // Escrita síncrona no localStorage só quando a aba mudou (antes ocorria a cada resize).
  if (lastPersistedTabId !== activeId) {
    lastPersistedTabId = activeId;
    try { localStorage.setItem('planejador_active_tab_v1', activeId); } catch (_) {}
  }
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
  const navId = progress >= 0.5
    ? bottomTabNavIds[bottomTabIds[targetIndex]]
    : bottomTabNavIds[bottomTabIds[bottomSwipeStartIndex]];
  // O destaque do dock só muda ao cruzar a metade: evita varrer o DOM a cada movimento do dedo.
  if (navId !== bottomSwipeNavShown) { bottomSwipeNavShown = navId; setBottomNavActive(navId); }
}

// No máximo uma atualização de posição por quadro (o ponteiro pode disparar bem mais que isso).
function scheduleBottomSwipeUpdate(dx) {
  bottomSwipePendingDx = dx;
  if (bottomSwipeFrame) return;
  bottomSwipeFrame = requestAnimationFrame(() => {
    bottomSwipeFrame = 0;
    if (bottomSwipeDirection) updateBottomSwipe(bottomSwipePendingDx);
  });
}
function cancelBottomSwipeFrame() {
  if (bottomSwipeFrame) { cancelAnimationFrame(bottomSwipeFrame); bottomSwipeFrame = 0; }
}

function clearBottomSwipeState() {
  cancelBottomSwipeFrame();
  bottomSwipeNavShown = null;
  bottomSwipeDrawer = false;
  bottomSwipePointerId = null;
  bottomSwipeDirection = 0;
  bottomSwipeWidth = 0;
  bottomSwipeTracking = false;
  bottomSwipeLocked = false;
  document.documentElement.classList.remove('tab-dragging');
}

function finishBottomSwipe(clientX, clientY, cancelled = false) {
  if (!bottomSwipeTracking && !bottomSwipeDirection) return;

  if (bottomSwipeDrawer) {                       // gesto da primeira aba que abre o menu lateral
    bottomSwipeJustDragged = Math.abs(clientX - bottomSwipeStartX) > 12;
    bottomSwipeTracking = false;
    bottomSwipeLocked = false;
    bottomSwipePointerId = null;
    bottomSwipeDrawer = false;
    navDragEnd(cancelled);
    return;
  }
  cancelBottomSwipeFrame();
  bottomSwipeNavShown = null;

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
    if (targetId === 'modal-settings' && activeBottomTabId !== targetId) showSettingsView('hub');   // deslizar até Configurações também começa na lista
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
let lastLayoutWidth = getViewportWidth();
let zoomSyncFrame = 0;
function syncZoomState() {
  // Um evento por quadro; a classe só muda ao cruzar o limiar (com histerese), pois cada troca
  // recalcula o estilo de todos os elementos (touch-action universal em .pa-zoomed).
  if (zoomSyncFrame) return;
  zoomSyncFrame = requestAnimationFrame(applyZoomState);
}
function applyZoomState() {
  zoomSyncFrame = 0;
  const root = document.documentElement;
  const scale = window.visualViewport ? window.visualViewport.scale : 1;
  const was = root.classList.contains('pa-zoomed');
  const zoomed = was ? scale > 1.005 : scale > 1.02;
  if (zoomed !== was) root.classList.toggle('pa-zoomed', zoomed);
  // Se a largura do layout mudou enquanto ampliada (ex.: girou o aparelho), refaz o trilho ao sair do zoom.
  if (!zoomed && getViewportWidth() !== lastLayoutWidth) scheduleTabsRelayout();
}
window.visualViewport?.addEventListener('resize', syncZoomState, { passive: true });

// 'resize' só reposiciona as telas quando a LARGURA do layout mudou e o usuário não está ampliando
// nem arrastando. Antes, cada evento refazia o estilo das 5 telas e gravava no localStorage.
let tabsRelayoutFrame = 0;
function scheduleTabsRelayout() {
  if (tabsRelayoutFrame) return;
  tabsRelayoutFrame = requestAnimationFrame(() => {
    tabsRelayoutFrame = 0;
    const width = getViewportWidth();
    if (width === lastLayoutWidth || isPageZoomed() || bottomSwipeDirection || bottomTabTransitionTimer !== null) return;
    lastLayoutWidth = width;
    normalizeBottomTabs(activeBottomTabId, true);
  });
}
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

  bottomSwipeStartTarget = event.target;
  bottomSwipeStartedAtEdge = event.clientX < NAV_EDGE_GUARD;
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

    if (dx > 0 && activeBottomTabId === 'home-page') {
      // Primeira aba: puxar para a direita abre o menu lateral (não há aba anterior).
      // Critério mais rígido que o do pager: só confirma com movimento claramente horizontal.
      if (dx < 14 || dx < Math.abs(dy) * NAV_GESTURE_RATIO) return;   // ainda indefinido: segue observando
      if (!canOpenDrawerByGesture() || !navDragBegin()) {
        bottomSwipeTracking = false;
        bottomSwipePointerId = null;
        return;
      }
      bottomSwipeDrawer = true;
      bottomSwipeLocked = true;
      try { getBottomTabElement(activeBottomTabId)?.setPointerCapture?.(event.pointerId); } catch (_) {}
    } else {
      const direction = dx < 0 ? 1 : -1;
      if (!beginBottomSwipe(direction)) {
        bottomSwipeTracking = false;
        bottomSwipePointerId = null;
        return;
      }
      bottomSwipeLocked = true;
      try { getBottomTabElement(activeBottomTabId)?.setPointerCapture?.(event.pointerId); } catch (_) {}
    }
  }

  event.preventDefault();
  bottomSwipeJustDragged = true;
  if (bottomSwipeDrawer) navDragMove(dx);
  else scheduleBottomSwipeUpdate(dx);
}

// O gesto global da primeira aba respeita seleção de texto, rolagem horizontal interna,
// janelas/botão flutuante da agenda, modais abertos e a borda reservada ao voltar do sistema.
function canOpenDrawerByGesture() {
  if (navDrawerOpen || bottomSwipeStartedAtEdge || activeBottomTabId !== 'home-page') return false;
  if (typeof modalStack !== 'undefined' && modalStack.length) return false;
  const sel = window.getSelection?.();
  if (sel && sel.type === 'Range' && !sel.isCollapsed) return false;
  for (let el = bottomSwipeStartTarget; el && el.nodeType === 1 && el !== document.body; el = el.parentElement) {
    if (el.matches?.('.agenda-fab, .jw')) return false;
    if (el.scrollWidth > el.clientWidth + 1) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === 'auto' || ox === 'scroll') return false;
    }
  }
  return true;
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
window.addEventListener('resize', scheduleTabsRelayout, { passive: true });
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
  if (id === 'modal-settings') showSettingsView('hub');   // entrar em Configurações começa sempre na lista (o menu lateral troca a subpágina logo depois)

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
function openContactsPage(instant) {
  activateBottomTab('modal-settings', instant === true);
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
// Pelo menu lateral a troca é imediata (sem o trilho "correndo" entre as abas): a tela nova já está
// no lugar quando o painel termina de sair.
const NAV_DRAWER_TARGETS = {
  home: () => activateBottomTab('home-page', true),
  planner: () => activateBottomTab('modal-planner', true),
  farmacia: () => activateBottomTab('modal-farmacia', true),
  comunicados: () => activateBottomTab('modal-comunicados', true),
  contacts: () => openContactsPage(true),        // mesma rota da página existente; nada duplicado
  settings: () => { activateBottomTab('modal-settings', true); showSettingsView('hub'); },
  agenda: () => { if (window.Notas && window.Notas.open) window.Notas.open(); },   // mesma agenda do botão de anotações
  access: () => { activateBottomTab('modal-settings', true); showSettingsView('access'); },
  appearance: () => { activateBottomTab('modal-settings', true); showSettingsView('appearance'); },
  support: () => { activateBottomTab('modal-settings', true); showSettingsView('support'); },
  profile: () => { activateBottomTab('modal-settings', true); showSettingsView('profile'); }
};
const NAV_DRAWER_CURRENT = { 'home-page': 'home', 'modal-planner': 'planner', 'modal-farmacia': 'farmacia', 'modal-comunicados': 'comunicados' };
let navDrawerOpen = false;
let navOpenedAt = 0;
let navDrawerCloseTimer = null;

function navDrawerEls() {
  return { drawer: document.getElementById('nav-drawer'), scrim: document.getElementById('nav-scrim'), opener: document.getElementById('nav-open'), handle: document.getElementById('nav-handle') };
}

// ---- Tag de período (só existe quando a pessoa informa o período no perfil) ----------------------
// Calouro 1º · Calouro plus 2º · Calouro premium 3º · Veterano mirim 4º · Veterano do 5º em diante.
// A concordância segue o pronome do perfil (mesma regra do restante do site: sem pronome, forma neutra).
const NAV_TAG_TIERS = [
  { label: ['Calouro', 'Caloura', 'Caloure'],
    msg: ['Calourinho desse ta se achando muito em', 'Calourinha dessa ta se achando muito em', 'Calourinhe desse ta se achando muito em'] },
  { label: ['Calouro plus', 'Caloura plus', 'Caloure plus'],
    msg: ['Ta quase! Mas ainda é calourinho viu', 'Ta quase! Mas ainda é calourinha viu', 'Ta quase! Mas ainda é calourinhe viu'] },
  { label: ['Calouro premium', 'Caloura premium', 'Caloure premium'],
    msg: ['Ta quase virando da casa', 'Ta quase virando da casa', 'Ta quase virando da casa'] },
  { label: ['Veterano mirim', 'Veterana mirim', 'Veterane mirim'],
    msg: ['FOFO JA EH DE CASA', 'FOFA JA EH DE CASA', 'FOFE JA EH DE CASA'] },
  { label: ['Veterano', 'Veterana', 'Veterane'],
    msg: ['burro véi desse ta fazendo ugue ainda?', 'burra véia dessa ta fazendo ugue ainda?', 'burre véi desse ta fazendo ugue ainda?'] }
];
function navTagInfo() {
  const p = window.UserProfile ? Number(window.UserProfile.period()) : 0;
  if (!Number.isInteger(p) || p < 1) return null;
  const tier = Math.min(p, 5);
  const g = window.UserProfile.pronoun() === 'm' ? 0 : window.UserProfile.pronoun() === 'f' ? 1 : 2;
  const t = NAV_TAG_TIERS[tier - 1];
  return { tier, label: t.label[g], msg: t.msg[g] };
}

let navTagTimer = null;
function hideNavTagBubble() {
  clearTimeout(navTagTimer);
  const bubble = document.getElementById('nav-tag-bubble');
  const tag = document.getElementById('nav-tag');
  if (bubble) { bubble.hidden = true; bubble.classList.remove('is-in'); }
  if (tag) tag.setAttribute('aria-expanded', 'false');
}
// Balãozinho de brincadeira em cima da tag: aparece ao tocar, some sozinho (ou ao tocar de novo / em outro lugar).
function toggleNavTagBubble() {
  const info = navTagInfo();
  const bubble = document.getElementById('nav-tag-bubble');
  const tag = document.getElementById('nav-tag');
  if (!info || !bubble || !tag) return;
  if (!bubble.hidden) { hideNavTagBubble(); return; }
  bubble.textContent = info.msg;
  bubble.classList.remove('is-below');
  bubble.hidden = false;
  // Sem espaço acima da tag (topo da tela), o balão desce para o lado de baixo.
  const room = tag.getBoundingClientRect().top - bubble.offsetHeight - 12;
  if (room < 4) bubble.classList.add('is-below');
  void bubble.offsetWidth;
  bubble.classList.add('is-in');
  tag.setAttribute('aria-expanded', 'true');
  clearTimeout(navTagTimer);
  navTagTimer = setTimeout(hideNavTagBubble, 3800);
}

// ---- Botão de tema (canto inferior esquerdo): escuro → claro → automático → escuro ---------------
const NAV_THEME_NEXT = { dark: 'light', light: 'auto', auto: 'dark' };
const NAV_THEME_TEXT = { dark: 'Escuro', light: 'Claro', auto: 'Automático' };
function navThemeMode() { return typeof getThemePref === 'function' ? getThemePref() : 'auto'; }
function paintNavTheme(mode, animate) {
  const btn = document.getElementById('nav-theme');
  if (!btn) return;
  btn.dataset.mode = mode;
  const lab = document.getElementById('nav-theme-label');
  if (lab) lab.textContent = T(NAV_THEME_TEXT[mode]);
  btn.setAttribute('aria-label', T('Tema do site: {modo}. Tocar para trocar', { modo: T(NAV_THEME_TEXT[mode]).toLowerCase() }));
  if (animate) { btn.classList.remove('is-flip'); void btn.offsetWidth; btn.classList.add('is-flip'); }
}
function navThemeCycle() {
  const next = NAV_THEME_NEXT[navThemeMode()] || 'dark';
  setThemePref(next);
  // setTheme() desliga transições por 2 quadros (html.theme-switching); a animação do ícone espera isso acabar.
  let tries = 0;
  const go = () => {
    if (document.documentElement.classList.contains('theme-switching') && tries++ < 12) { requestAnimationFrame(go); return; }
    paintNavTheme(next, true);
  };
  requestAnimationFrame(go);
}

function updateNavDrawerUser() {
  const name = window.UserProfile ? window.UserProfile.name() : '';
  // Identificação compacta do cabeçalho: sem nome, fica só avatar + seta.
  const headName = document.getElementById('nav-open-name');
  if (headName) { headName.textContent = name; headName.hidden = !name; }
  const tag = document.getElementById('nav-tag');
  if (tag) {
    const info = navTagInfo();
    tag.hidden = !info;
    if (info) { document.getElementById('nav-tag-text').textContent = info.label; tag.dataset.tier = String(info.tier); }
    else hideNavTagBubble();
  }
  const shiftEl = document.getElementById('nav-shift');
  if (shiftEl) {
    const shift = window.UserProfile ? window.UserProfile.shift() : '';
    shiftEl.textContent = '';
    shiftEl.hidden = !shift;
    if (shift) {
      const strong = document.createElement('strong');
      strong.textContent = shift === 'noturno' ? 'noturno' : 'Integral';
      shiftEl.append('Cria do ', strong);
    }
  }
  const nameEl = document.getElementById('nav-user-name');
  if (!nameEl) return;
  nameEl.textContent = name || T('Sem nome');
  nameEl.classList.toggle('is-empty', !name);
}

function updateNavDrawerCurrent() {
  const current = (document.getElementById('modal-agenda')?.classList.contains('active') ? 'agenda' : '')
    || NAV_DRAWER_CURRENT[activeBottomTabId]
    || (activeBottomTabId === 'modal-settings' && typeof settingsView !== 'undefined'
      ? ({ appearance: 'appearance', access: 'access', profile: 'profile', contacts: 'contacts' }[settingsView] || 'settings') : '');
  document.querySelectorAll('#nav-drawer .nav-item').forEach(btn => {
    const on = btn.dataset.value === current;
    btn.classList.toggle('is-current', on);
    if (on) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
  });
}

// fromDrag: o painel já está visível e posicionado pelo dedo (alça ou gesto da primeira aba);
// em vez de recomeçar do zero, a transição continua da posição atual até aberto.
function openNavDrawer(fromDrag = false) {
  const { drawer, scrim, opener, handle } = navDrawerEls();
  if (!drawer || !scrim || navDrawerOpen) return;
  clearTimeout(navDrawerCloseTimer);
  updateNavDrawerUser();
  updateNavDrawerCurrent();
  paintNavTheme(navThemeMode(), false);
  if (fromDrag) {
    drawer.classList.remove('is-dragging');
    drawer.style.transform = ''; scrim.style.opacity = '';
  } else {
    drawer.style.transform = ''; scrim.style.opacity = '';
    drawer.hidden = false; scrim.hidden = false;
    void drawer.offsetWidth;                     // força o ponto de partida antes da transição
  }
  drawer.classList.add('is-open'); scrim.classList.add('is-open');
  document.documentElement.classList.add('nav-open');
  if (opener) opener.setAttribute('aria-expanded', 'true');
  if (handle) handle.setAttribute('aria-expanded', 'true');
  navDrawerOpen = true;
  navOpenedAt = performance.now();
  (drawer.querySelector('.nav-item.is-current') || drawer.querySelector('.nav-close'))?.focus({ preventScroll: true });
}

function closeNavDrawer(returnFocus = true) {
  const { drawer, scrim, opener, handle } = navDrawerEls();
  if (!drawer || !navDrawerOpen) return;
  navDrawerOpen = false;
  hideNavTagBubble();
  drawer.classList.remove('is-open'); scrim.classList.remove('is-open');
  drawer.style.transform = ''; scrim.style.opacity = '';
  document.documentElement.classList.remove('nav-open');
  if (handle) handle.setAttribute('aria-expanded', 'false');
  // Devolve o foco a quem abriu: o botão do cabeçalho só existe visível na primeira aba.
  const focusTarget = activeBottomTabId === 'home-page' ? opener : handle;
  if (opener) opener.setAttribute('aria-expanded', 'false');
  if (focusTarget && returnFocus) focusTarget.focus({ preventScroll: true });
  const finish = () => { if (!navDrawerOpen) { drawer.hidden = true; scrim.hidden = true; } };
  const still = animationsOff() || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  clearTimeout(navDrawerCloseTimer);
  if (still) finish(); else navDrawerCloseTimer = setTimeout(finish, 300);
}

function navDrawerGo(target) {
  const go = NAV_DRAWER_TARGETS[target];
  if (!go) return;
  go();                                          // troca a tela por trás do painel...
  closeNavDrawer(false);                         // ...e só então o painel sai (nunca fica aberto depois de navegar)
}

// ---- Abertura por arrasto (alça lateral e gesto da primeira aba) ----------------------------
// Os dois caminhos usam estes três passos e terminam em openNavDrawer(true): mesmo painel, mesmo
// fechamento, mesma animação. O painel acompanha o dedo; ao soltar, abre ou volta.
const navDrag = { on: false, dx: 0, w: 0, t0: 0, frame: 0 };

function navDragApply() {
  navDrag.frame = 0;
  const { drawer, scrim } = navDrawerEls();
  if (!drawer || !scrim || !navDrag.on) return;
  drawer.style.transform = `translateX(${navDrag.dx - navDrag.w}px)`;
  scrim.style.opacity = String(Math.min(1, navDrag.dx / navDrag.w));
}

function navDragBegin() {
  const { drawer, scrim } = navDrawerEls();
  if (!drawer || !scrim || navDrawerOpen || navDrag.on) return false;
  clearTimeout(navDrawerCloseTimer);
  navDrag.on = true; navDrag.dx = 0; navDrag.t0 = performance.now();
  drawer.classList.add('is-dragging');
  drawer.style.transform = 'translateX(-100%)'; scrim.style.opacity = '0';
  drawer.hidden = false; scrim.hidden = false;
  navDrag.w = Math.max(1, drawer.offsetWidth);   // só dá para medir depois de exibido
  return true;
}

function navDragMove(dx) {
  if (!navDrag.on) return;
  navDrag.dx = Math.max(0, Math.min(navDrag.w, dx));
  if (!navDrag.frame) navDrag.frame = requestAnimationFrame(navDragApply);
}

function navDragEnd(cancelled) {
  if (!navDrag.on) return;
  if (navDrag.frame) { cancelAnimationFrame(navDrag.frame); navDrag.frame = 0; }
  navDragApply();                    // posição final exata antes de decidir
  const { drawer, scrim } = navDrawerEls();
  const dx = navDrag.dx, fast = dx / Math.max(1, performance.now() - navDrag.t0) > 0.5;
  navDrag.on = false;
  if (!cancelled && (dx > navDrag.w * 0.3 || (fast && dx > 24))) { openNavDrawer(true); return; }
  // Não passou do limiar: volta fechando com a mesma transição do fechamento normal.
  drawer.classList.remove('is-dragging');
  drawer.style.transform = ''; scrim.style.opacity = '';
  const still = animationsOff() || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const finish = () => { if (!navDrawerOpen && !navDrag.on) { drawer.hidden = true; scrim.hidden = true; } };
  clearTimeout(navDrawerCloseTimer);
  if (still) finish(); else navDrawerCloseTimer = setTimeout(finish, 300);
}

// Alça: área própria (data-no-tab-swipe), portanto o pager de abas nunca a vê. touch-action:none
// vale só para ela, então rolagem e zoom do resto da página ficam com o navegador.
let navHandleDragged = -1000;
function initNavHandle() {
  const { handle } = navDrawerEls();
  if (!handle || handle.dataset.navBound) return;
  handle.dataset.navBound = '1';
  let g = null;
  handle.addEventListener('pointerdown', event => {
    if (navDrawerOpen || g || (event.pointerType === 'mouse' && event.button !== 0)) return;
    g = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false };
    try { handle.setPointerCapture(event.pointerId); } catch (_) {}
  });
  handle.addEventListener('pointermove', event => {
    if (!g || event.pointerId !== g.id) return;
    const dx = event.clientX - g.x, dy = event.clientY - g.y;
    if (!g.active) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (dx <= 0 || Math.abs(dy) > dx) { g = null; return; }       // só puxar para a direita
      if (!navDragBegin()) { g = null; return; }
      g.active = true;
    }
    navDragMove(dx);
  });
  const end = cancelled => event => {
    if (!g || event.pointerId !== g.id) return;
    const was = g; g = null;
    if (was.active) { navHandleDragged = performance.now(); navDragEnd(cancelled); }
    // Toque simples: quem abre é o "click" logo abaixo. Abrir já no pointerup fazia o clique sintético do toque
    // cair no fundo escuro recém-aberto e fechar o menu na hora.
  };
  handle.addEventListener('pointerup', end(false));
  handle.addEventListener('pointercancel', end(true));
  // Toque, mouse, teclado e leitor de tela: um clique na alça abre o menu. Depois de arrastar, o clique é ignorado.
  handle.addEventListener('click', () => { if (performance.now() - navHandleDragged > 400) openNavDrawer(); });
}

function initNavDrawer() {
  const { drawer } = navDrawerEls();
  if (!drawer || drawer.dataset.navBound) return;
  drawer.dataset.navBound = '1';
  window.addEventListener('planejador:profile', updateNavDrawerUser);
  updateNavDrawerUser();
  // Tocar fora da tag fecha o balãozinho.
  drawer.addEventListener('pointerdown', event => { if (!event.target.closest('#nav-tag')) hideNavTagBubble(); });

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
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { initNavDrawer(); initNavHandle(); });
else { initNavDrawer(); initNavHandle(); }
