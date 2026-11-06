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
