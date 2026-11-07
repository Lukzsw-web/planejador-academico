/* interface.js — Interface: modais (confirmação, foco, abrir/fechar) e animações feitas por script.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Seção: modais
// =====================================================================
/* modais.js — Modais: confirmação, foco/teclado (acessibilidade) e abrir/fechar.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Modal de confirmação e aviso do sistema ("Tem certeza?").
// =====================================================================
let pendingConfirmationAction = null;

// Aviso do sistema (alertdialog próprio, independente dos painéis de informação).
let systemAlertReturnFocus = null;

function openConfirmationModal({ title, message, confirmText = T('Sim'), cancelText = T('Não'), onConfirm = null }) {
  const root = document.getElementById('system-alert');
  const titleEl = document.getElementById('confirm-title');
  const messageEl = document.getElementById('confirm-message');
  const okBtn = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');
  if (!root || !titleEl || !messageEl || !okBtn || !cancelBtn) return;

  titleEl.textContent = title || T('Confirmar ação');
  messageEl.textContent = message || '';
  okBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;

  pendingConfirmationAction = typeof onConfirm === 'function' ? onConfirm : null;
  okBtn.onclick = () => {
    const action = pendingConfirmationAction;
    closeConfirmationModal();
    if (action) action();
  };

  systemAlertReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add('is-open'));
  cancelBtn.focus({ preventScroll: true });
}

function closeConfirmationModal() {
  pendingConfirmationAction = null;
  const root = document.getElementById('system-alert');
  if (!root || root.hidden) return;
  root.classList.remove('is-open');
  root.hidden = true;
  systemAlertReturnFocus?.focus?.({ preventScroll: true });
  systemAlertReturnFocus = null;
}

document.addEventListener('keydown', event => {
  const root = document.getElementById('system-alert');
  if (!root || root.hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); closeConfirmationModal(); return; }
  if (event.key === 'Tab') {
    const buttons = [...root.querySelectorAll('button')];
    const i = buttons.indexOf(document.activeElement);
    event.preventDefault();
    buttons[(i + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
  }
}, true);

// =====================================================================
// Modais: pilha de modais, foco e navegação por teclado (acessibilidade).
// =====================================================================
const modalFocusReturn = new Map();
const modalStack = [];
const FOCUSABLE_SELECTOR = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'object',
  'embed', '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])'
].join(',');

function getModalDialogElement(modal) {
  return modal?.querySelector('.modal-content, .info-modal-content, .choice-info-modal') || modal?.firstElementChild || null;
}

function getModalFocusableElements(modal) {
  return Array.from(modal?.querySelectorAll(FOCUSABLE_SELECTOR) || []).filter(el => {
    const style = window.getComputedStyle(el);
    return !el.hidden && style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function prepareModalA11y(modal) {
  if (!modal) return;

  // As abas inferiores usam a mesma marcação histórica dos modais, mas não são
  // diálogos. Preservamos a semântica de tabpanel e não aplicamos aria-modal.
  if (typeof bottomTabIds !== 'undefined' && bottomTabIds.includes(modal.id)) {
    modal.setAttribute('role', 'tabpanel');
    modal.removeAttribute('aria-modal');
    modal.setAttribute('aria-hidden', modal.classList.contains('bottom-tab-current') ? 'false' : 'true');
    return;
  }

  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-hidden', modal.classList.contains('active') ? 'false' : 'true');
  const dialog = getModalDialogElement(modal);
  if (dialog) {
    dialog.setAttribute('tabindex', '-1');
    const heading = dialog.querySelector('h1, h2, h3, h4');
    if (heading && !heading.id) heading.id = `${modal.id}-title`;
    if (heading) modal.setAttribute('aria-labelledby', heading.id);
  }
}

function focusModalContents(modal) {
  if (!modal) return;
  const focusables = getModalFocusableElements(modal);
  const dialog = getModalDialogElement(modal);
  (focusables[0] || dialog)?.focus?.({ preventScroll: true });
}

function getTopActiveModal() {
  for (let i = modalStack.length - 1; i >= 0; i -= 1) {
    const modal = document.getElementById(modalStack[i]);
    if (modal?.classList.contains('active')) return modal;
  }
  return null;
}

// =====================================================================
// Modais: abrir e fechar (openModal / closeModal), fundo e tecla Esc.
// =====================================================================
function openModal(id) {
  if (bottomTabIds.includes(id)) {
    activateBottomTab(id);
    return;
  }
  const modal = document.getElementById(id);
  if (!modal) return;
  prepareModalA11y(modal);

  if (!modal.classList.contains('active')) {
    modalFocusReturn.set(id, document.activeElement instanceof HTMLElement ? document.activeElement : null);
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    modalStack.push(id);
    activeModalCount++;
  }
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => focusModalContents(modal));
}

function closeModal(id) {
  if (bottomTabIds.includes(id)) {
    if (activeBottomTabId === id) activateBottomTab('home-page');
    return;
  }
  const modal = document.getElementById(id);
  if (!modal) return;

  if (modal.classList.contains('active')) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    activeModalCount = Math.max(0, activeModalCount - 1);
    const stackIndex = modalStack.lastIndexOf(id);
    if (stackIndex >= 0) modalStack.splice(stackIndex, 1);
  }

  if (activeModalCount === 0) {
    document.body.style.overflow = '';
    const previous = modalFocusReturn.get(id);
    modalFocusReturn.delete(id);
    if (previous && document.contains(previous)) previous.focus?.({ preventScroll: true });
  } else {
    const top = getTopActiveModal();
    if (top) requestAnimationFrame(() => focusModalContents(top));
  }
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  prepareModalA11y(o);
  o.addEventListener('click', e => {
    if (e.target === o) closeModal(o.id);
  });
});

document.addEventListener('keydown', e => {
  const modal = getTopActiveModal();
  if (!modal) return;

  if (e.key === 'Escape' && !e.defaultPrevented) {
    e.preventDefault();
    closeModal(modal.id);
    return;
  }

  if (e.key !== 'Tab') return;
  const focusables = getModalFocusableElements(modal);
  if (!focusables.length) {
    e.preventDefault();
    getModalDialogElement(modal)?.focus?.({ preventScroll: true });
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

// =====================================================================
// Seção: animacoes
// =====================================================================
/* animacoes.js — Todas as animações feitas por script (os @keyframes ficam em fundamentos.css).
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Animação: onda de desbloqueio nos cards que acabaram de ficar disponíveis.
// =====================================================================
function animateUnlockedCards(unlockedCodes = []) {
  if (!unlockedCodes.length || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  unlockedCodes.forEach(({ codigo, distance }, index) => {
    const card = document.querySelector(`.subject-card[data-codigo="${CSS.escape(codigo)}"]`);
    if (!card) return;

    card.classList.remove('subject-unlocked-wave');
    card.style.setProperty('--unlock-delay', `${Math.min(index * 70 + (distance - 1) * 45, 520)}ms`);

    // Force a clean animation restart when the same card is unlocked again later.
    void card.offsetWidth;
    card.classList.add('subject-unlocked-wave');

    window.setTimeout(() => {
      card.classList.remove('subject-unlocked-wave');
      card.style.removeProperty('--unlock-delay');
    }, 900);
  });
}

// =====================================================================
// Animação: cadeado que vira V ao marcar uma disciplina como cursada.
// =====================================================================
function canAnimateIcons() {
  return document.documentElement.classList.contains('app-ready')
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Marcar como cursada: a argola desce para dentro do corpo, o corpo arredonda até
// virar uma esfera, a esfera encolhe e se abre no meio até ficar o "V".
// Feito com requestAnimationFrame sobre atributos SVG para funcionar em qualquer navegador.
const MORPH_MS = 900;
const morphClamp = v => Math.max(0, Math.min(1, v));
const morphEase = v => v < .5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
const morphLerp = (a, b, p) => a + (b - a) * p;

// Monta o cadeado "liberado" com a peça extra do V e devolve set(t), t de 0 a 1.
function createLockMorph(svg) {
  svg.innerHTML = `${LOCK_BODY}${LOCK_SHACKLE}<path class="morph-check" d="M5 13l4 4L19 7" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" opacity="0"></path>`;
  const body = svg.querySelector('.lock-body');
  const shackle = svg.querySelector('.lock-shackle');
  const check = svg.querySelector('.morph-check');
  shackle.style.animation = 'none';
  shackle.style.transition = 'none';
  return function set(t) {
    // 1) a argola (parada deslocada, como no cadeado liberado) desce e entra no corpo
    const p1 = morphEase(morphClamp(t / .3));
    shackle.style.transform = `translate(${morphLerp(-8, 0, p1)}px, 0px) translate(12px, 11px) scale(1, ${1 - p1}) translate(-12px, -11px)`;
    shackle.style.opacity = String(1 - morphClamp((p1 - .85) / .15));
    // 2) os cantos vão arredondando: retângulo -> esfera
    const p2 = morphEase(morphClamp((t - .15) / .4));
    body.setAttribute('x', morphLerp(4, 6.5, p2));
    body.setAttribute('y', morphLerp(11, 8.5, p2));
    body.setAttribute('width', morphLerp(16, 11, p2));
    body.setAttribute('height', morphLerp(10, 11, p2));
    body.setAttribute('rx', morphLerp(2, 5.5, p2));
    // 3) a esfera encolhe e 4) se abre no meio, afinando até o "V"
    const p3 = morphEase(morphClamp((t - .55) / .3));
    body.setAttribute('transform', `translate(12 14) scale(${morphLerp(1, .35, p3)}) translate(-12 -14)`);
    body.style.opacity = String(1 - morphClamp((p3 - .5) / .5));
    const p4 = morphEase(morphClamp((t - .62) / .38));
    check.setAttribute('opacity', p4 > 0 ? '1' : '0');
    check.setAttribute('stroke-dashoffset', String(1 - p4));
    check.setAttribute('transform', `translate(12 12) scale(${morphLerp(.7, 1, p4)}) translate(-12 -12)`);
  };
}

function playLockToCheck(icon, svg) {
  const token = icon._morphToken;
  const set = createLockMorph(svg);
  const t0 = performance.now();
  const frame = now => {
    if (icon._morphToken !== token || !svg.isConnected) return;
    const t = morphClamp((now - t0) / MORPH_MS);
    set(t);
    if (t < 1) requestAnimationFrame(frame);
    else svg.innerHTML = LOCK_CHECK;
  };
  requestAnimationFrame(frame);
}

// =====================================================================
// Animação: fechar as sanfonas com a mesma suavidade da abertura.
// =====================================================================
// Fecha as sanfonas com a mesma animação suave da abertura (o <details> nativo some na hora).
function initAccordionAnimation() {
  const container = document.getElementById('accordions-container');
  if (!container || container.dataset.accordionBound) return;
  container.dataset.accordionBound = '1';

  container.addEventListener('click', event => {
    const summary = event.target.closest?.('summary');
    if (!summary || event.target.closest('button, a, input')) return;
    const details = summary.parentElement;
    if (!details || details.tagName !== 'DETAILS' || !details.open) return;
    if (prefersReducedMotion() || details.classList.contains('is-closing')) return;

    event.preventDefault();
    details.classList.add('is-closing');
    window.setTimeout(() => {
      details.open = false;
      details.classList.remove('is-closing');
    }, 200);
  });
}
