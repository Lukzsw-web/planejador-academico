/* avisos.js — Avisos: balão (toast), arrastar para dispensar e copiar para a área de transferência.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Avisos: balão de aviso (toast), arrastar para dispensar, copiar para a área de transferência e avisos de co-requisito.
// =====================================================================
// Único ponto que mexe no balão (#toast-copy). Os três modos reproduzem os
// estilos que já existiam: padrão (copiar), co-requisito (nomes em destaque) e erro.
function hideToast() {
  const toast = document.getElementById('toast-copy');
  if (!toast) return;
  toast.style.transition = ''; toast.style.transform = ''; toast.style.opacity = '';
  toast.classList.remove('opacity-100', 'translate-y-0');
  toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.querySelectorAll('.toast-progress').forEach(el => el.remove());
}

function showToast({ text = '', html = null, mode = 'default', action = null, progress = false, icon = 'check' } = {}) {
  const toast = document.getElementById('toast-copy');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;

  if (mode === 'error') {
    toast.classList.remove('toast-coreq-mode', 'bg-gray-900', 'dark:bg-gray-100');
    toast.classList.add('bg-red-600', 'dark:bg-red-500', 'text-white');
  } else if (mode === 'coreq') {
    toast.classList.remove('bg-red-600', 'dark:bg-red-500');
    toast.classList.add('toast-coreq-mode', 'bg-gray-900', 'dark:bg-gray-100', 'text-white', 'dark:text-gray-900');
  } else {
    toast.classList.remove('toast-coreq-mode', 'bg-red-600', 'dark:bg-red-500');
    toast.classList.add('bg-gray-900', 'dark:bg-gray-100', 'text-white', 'dark:text-gray-900');
  }

  // Ícone do balão: "check" (V verde, padrão) ou "x" (X vermelho, p.ex. desmarcações).
  const iconKind = mode === 'error' ? 'check' : icon;
  toast.dataset.icon = iconKind;
  const iconPath = toast.querySelector('svg path');
  if (iconPath) iconPath.setAttribute('d', iconKind === 'x' ? 'M6 18L18 6M6 6l12 12' : 'M5 13l4 4L19 7');

  if (html !== null) msgEl.innerHTML = html;
  else msgEl.textContent = text;

  toast.querySelectorAll('.toast-action-btn').forEach(btn => btn.remove());
  if (action && typeof action.onClick === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action-btn';
    if (action.iconHTML) btn.innerHTML = `${action.iconHTML}<span>${escapeHTML(action.label || 'Desfazer')}</span>`;
    else btn.textContent = action.label || 'Desfazer';
    btn.addEventListener('click', event => {
      event.stopPropagation();
      clearTimeout(window.__toastTimer);
      hideToast();
      action.onClick();
    });
    toast.appendChild(btn);
  }

  toast.style.transition = ''; toast.style.transform = ''; toast.style.opacity = '';
  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(window.__toastTimer);
  toast.querySelectorAll('.toast-progress').forEach(el => el.remove());
  const total = getToastMs();
  if (progress) {
    const bar = document.createElement('div');
    bar.className = 'toast-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.style.animationDuration = `${total}ms`;
    toast.appendChild(bar);
  }
  window.__toastTimer = setTimeout(hideToast, total);
}

// Arrastar o balão de aviso para baixo: ele acompanha o dedo e, soltando depois de uns 36px
// (ou num arremesso rápido), desce até sair da tela e some.
function initToastSwipe() {
  const toast = document.getElementById('toast-copy');
  if (!toast || toast.dataset.swipe) return;
  toast.dataset.swipe = '1';
  let g = null, swallow = false;
  const rest = () => { toast.style.transition = ''; toast.style.transform = ''; toast.style.opacity = ''; };
  toast.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    g = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0, on: false, vy: 0, ly: e.clientY, lt: e.timeStamp };
  });
  toast.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dy = e.clientY - g.y;
    if (!g.on) {
      if (dy < 6) return;
      g.on = true; clearTimeout(window.__toastTimer); toast.style.transition = 'none';
      try { toast.setPointerCapture(e.pointerId); } catch (_) {}
    }
    const dt = Math.max(1, e.timeStamp - g.lt); g.vy = (e.clientY - g.ly) / dt; g.ly = e.clientY; g.lt = e.timeStamp;
    g.dy = Math.max(-12, dy);
    toast.style.transform = `translate(-50%, ${g.dy}px)`;
  });
  const end = e => {
    if (!g || e.pointerId !== g.id) return;
    const was = g; g = null;
    if (!was.on) return;
    swallow = true; setTimeout(() => { swallow = false; }, 0);
    if (was.dy > 36 || was.vy > 0.6) {
      toast.style.transition = 'transform .2s cubic-bezier(.5,0,1,.6), opacity .2s ease-in';
      toast.style.transform = `translate(-50%, ${window.innerHeight}px)`; toast.style.opacity = '0';
      toast.classList.add('pointer-events-none');
      setTimeout(hideToast, 210);
    } else {
      toast.style.transition = 'transform .18s ease-out'; toast.style.transform = 'translate(-50%, 0)';
      setTimeout(rest, 190);
      clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(hideToast, 2500);
    }
  };
  toast.addEventListener('pointerup', end); toast.addEventListener('pointercancel', end);
  toast.addEventListener('click', e => { if (swallow) { e.stopPropagation(); e.preventDefault(); } }, true);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initToastSwipe); else initToastSwipe();

function showStorageErrorToast(message) {
  showToast({ text: message, mode: 'error', duration: 3500 });
}

async function copyTextToClipboard(text, prefixLabel, event, plural = false) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToastCustom(T(plural ? '{label} copiados com sucesso!' : '{label} copiado com sucesso!', { label: prefixLabel }), text);
  } catch (error) {
    console.warn('Não foi possível copiar.', error);
    showToast({ text: T('Não foi possível copiar. Tente novamente.'), mode: 'error', duration: 3000 });
  }
}

async function copyCodeToClipboard(codigo, event) {
  await copyTextToClipboard(codigo, T('Código'), event);
}

function showCoreqInfo(event, codigo) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const m = getDisciplinaByCode(codigo);
  if (!m || !m.co) return;

  const coNames = extractCodes(m.co).map(c => {
    const mat = getDisciplinaByCode(c);
    const name = mat ? formatName(mat) : c;
    const period = mat ? displayPeriod(mat) : '';
    const suffix = period ? ` (${period})` : '';
    return `<span class="coreq-name-highlight">${escapeHTML(name)}</span><span class="coreq-period-highlight">${escapeHTML(suffix)}</span>`;
  }).join(', ');

  const titleEl = document.getElementById('coreq-title');
  const descEl = document.getElementById('coreq-desc');

  if (titleEl) titleEl.innerText = formatName(m);
  if (descEl) {
    descEl.innerHTML = T('Essa matéria possui {names} como co-requisito, ou seja, devem ser cursadas simultaneamente no mesmo período.', { names: coNames });
  }

  openModal('modal-coreq');
}

function showCoreqAutoToast(autoName, originName) {
  showToast({
    mode: 'coreq',
    duration: 3500,
    html: T('A matéria {auto} foi marcada automaticamente por ser co-requisito de {origin}', { auto: `<span class="toast-coreq-name">${escapeHTML(autoName)}</span>`, origin: `<span class="toast-coreq-name">${escapeHTML(originName)}</span>` })
  });
}

function showToastCustom(msg, highlight = '') {
  if (!highlight) {
    showToast({ text: msg });
    return;
  }
  const safeMsg = escapeHTML(msg);
  const safeHighlight = escapeHTML(highlight);
  const chip = `<span class="toast-code-chip">${safeHighlight}</span>`;
  // Antes o destaque só aparecia se o texto da mensagem já contivesse o valor
  // (o que nunca acontecia ao copiar um código). Agora ele é anexado quando falta.
  const html = safeMsg.includes(safeHighlight) ? safeMsg.replace(safeHighlight, chip) : `${safeMsg} ${chip}`;
  showToast({ html });
}
