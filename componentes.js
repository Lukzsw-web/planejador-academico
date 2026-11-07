/* componentes.js — Componentes: avisos (toast), cards das disciplinas e tutorial de primeiro acesso.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Seção: avisos
// =====================================================================
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

// =====================================================================
// Seção: cards
// =====================================================================
/* cards.js — Cards das disciplinas: HTML, sanfonas por período e visualização de selecionadas.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Cards das disciplinas: HTML, sanfonas por período e visualização de selecionadas.
// =====================================================================
// Quantas matérias têm esta como PRÉ-requisito (co-requisitos não entram na conta).
function getPrereqDependentsCount(codigo) {
  let count = 0;
  (dependentesPorCodigo.get(codigo) || new Set()).forEach(dep => {
    if ((preRequisitosPorCodigo.get(dep) || []).includes(codigo)) count++;
  });
  return count;
}

function unlockChipHTML(codigo) {
  const n = getPrereqDependentsCount(codigo);
  if (!n) return '';
  const label = n === 1 ? T('Pré-requisito de 1 matéria') : T('Pré-requisito de {n} matérias', { n });
  return `<span class="subject-meta-text unlock-chip" title="${escapeHTML(label)}">${T('Pré-req. de {n}', { n })}</span>`;
}

// Alternativa acessível ao toque longo: abre os mesmos detalhes por clique/teclado.
function infoButtonHTML(action, safeCode, safeName) {
  return `<button type="button" class="card-info-button p-1 text-gray-400 hover:text-yellowTheme-600" data-pa-action="${action}" data-codigo="${safeCode}" title="${T('Ver detalhes')}" aria-label="${T('Ver detalhes de {name}', { name: safeName })}">
    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>
  </button>`;
}

function createSubjectCardHTML(mat) {
  const checked = appState.concludedCodes.has(mat.codigo) ? 'checked' : '';
  const status = getSubjectStatus(mat);
  const safeCode = escapeHTML(mat.codigo);
  const safeName = escapeHTML(formatName(mat));
  const safePeriodo = escapeHTML(mat.periodo);
  const coreqBtn = mat.co
    ? `<button class="coreq-button" type="button" data-pa-action="coreq-info" data-codigo="${safeCode}" title="${T('Ver co-requisito')}" aria-label="${T('Ver co-requisito de {name}', { name: safeName })}">C</button>`
    : '';

  return `
  <div class="subject-card block p-3 rounded-xl relative mb-2 select-none"
       data-codigo="${safeCode}" data-periodo="${safePeriodo}">
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap gap-1.5">
          ${subjectStatusIconHTML(status)}
          <span class="subject-name text-sm md:text-base font-bold leading-tight text-gray-800 dark:text-gray-100">${safeName}</span>
          ${coreqBtn}
        </div>
        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
          <div class="flex items-center gap-1">
            <span class="subject-code text-[0.80rem] md:text-sm font-semibold">${safeCode}</span>
            <button type="button" class="copy-code-button p-1 text-gray-400 hover:text-yellowTheme-600" data-pa-action="copy-code" data-codigo="${safeCode}" title="${T('Copiar código')}" aria-label="${T('Copiar código {code}', { code: safeCode })}">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            ${infoButtonHTML('details', safeCode, safeName)}
          </div>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="subject-meta-text text-[0.65rem] md:text-xs font-medium text-gray-500 dark:text-gray-400">${escapeHTML(creditsOf(mat))} ${T('Créd.')}</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="subject-meta-text text-[0.65rem] md:text-xs font-medium text-gray-500 dark:text-gray-400">${escapeHTML(hoursOf(mat))}h</span>
          ${unlockChipHTML(mat.codigo)}
        </div>
      </div>
      <div class="flex items-center h-full pt-1">
        <input type="checkbox" value="${safeCode}" data-periodo="${safePeriodo}" ${checked} class="w-5 h-5 rounded border-gray-300 text-yellowTheme-500 focus:ring-yellowTheme-500 dark:border-gray-600 dark:bg-gray-700" aria-label="${T('Marcar {name}', { name: safeName })}">
      </div>
    </div>
  </div>`;
}

function showCondInfo(event) {
  event.stopPropagation();
  event.preventDefault();
  const title = document.getElementById('period-info-title');
  const desc = document.getElementById('period-info-desc');
  if (title) title.textContent = T('Escolha Condicionada');
  if (desc) desc.textContent = T('Disciplinas de Escolha Condicionada são as eletivas do currículo novo. Basicamente você precisa ter 12 créditos e 180 horas dessas matérias para se formar.');
  openModal('modal-period-info');
}

function renderAccordions() {
  const container = document.getElementById('accordions-container');
  if (!container || typeof disciplinas === 'undefined') return;

  const periods = {};
  disciplinas.forEach(d => {
    if (!periods[d.periodo]) periods[d.periodo] = [];
    periods[d.periodo].push(d);
  });

  let htmlContent = '';
  const sortedPeriods = Object.keys(periods).sort((a, b) => {
    if (a === PERIODO_COND) return 1;
    if (b === PERIODO_COND) return -1;
    return parseInt(a) - parseInt(b);
  });

  sortedPeriods.forEach(p => {
    const list = periods[p];
    const displayP = p === PERIODO_COND ? T('Escolha Condicionada') : T('{n}º Período', { n: p });
    const count = list.length;
    const isCond = p === PERIODO_COND;
    const safeDisplayP = escapeHTML(displayP);
    const safePeriodoAttr = escapeHTML(String(p));

    const infoBtn = isCond ? `
      <button type="button" class="cond-info-button ml-2 flex-shrink-0" data-pa-action="cond-info" title="${T('Informações')}" aria-label="${T('Informações sobre Escolha Condicionada')}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      </button>` : '';

    htmlContent += `
    <details class="group bg-gray-50 dark:bg-[#15171b] rounded-2xl border border-gray-200/60 dark:border-darkBorder/60 overflow-hidden">
      <summary class="flex items-center justify-between p-4 md:p-5 cursor-pointer font-bold text-gray-800 dark:text-gray-100 list-none select-none hover:bg-gray-100 dark:hover:bg-[#1a1c22] transition-colors rounded-t-2xl">
        <div class="flex items-center text-base md:text-lg">
          ${safeDisplayP} ${infoBtn}
        </div>
        <div class="flex items-center gap-2 md:gap-3">
          <span class="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[0.65rem] md:text-xs font-bold px-2 py-1 md:px-2.5 md:py-1 rounded-lg shadow-sm">
            ${count > 1 ? T('{n} Matérias', { n: count }) : T('{n} Matéria', { n: count })}
          </span>
          <svg class="accordion-chevron w-5 h-5 text-gray-400 transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </summary>
      <div class="p-4 pt-2 space-y-2 accordion-content border-t border-gray-100 dark:border-darkBorder/50">
        ${isCond ? '' : `<div class="flex gap-2 mb-3">
          <button type="button" class="flex-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold py-1.5 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors" data-pa-action="mark-all" data-periodo="${safePeriodoAttr}">${T('Marcar')}</button>
          <button type="button" class="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" data-pa-action="clear-period" data-periodo="${safePeriodoAttr}">${T('Limpar')}</button>
        </div>`}
        ${list.map(createSubjectCardHTML).join('')}
      </div>
    </details>`;
  });

  container.innerHTML = htmlContent;

  // Índice direto código -> checkbox. A seleção automática de co-requisitos usa este
  // mapa. Os eventos de mudança são tratados por delegação (initDelegatedEvents).
  checkboxesPorCodigo.clear();
  document.querySelectorAll('.subject-card input[type="checkbox"]').forEach(cb => {
    checkboxesPorCodigo.set(cb.value, cb);
  });
}

function getLockedSubjects(codigo) {
  return Array.from(dependentesPorCodigo.get(codigo) || [])
    .map(getDisciplinaByCode)
    .filter(Boolean)
    .sort((a, b) => {
      const pa = parseInt(a.periodo, 10) || 99;
      const pb = parseInt(b.periodo, 10) || 99;
      return pa - pb;
    });
}

function checkReqs(reqsString, concluidas) {
  if (!reqsString) return true;
  const groups = reqsString
    .replace(/;/g, ' E ')
    .split(/\s+OU\s+/i)
    .map(group => group.trim())
    .filter(Boolean);
  if (!groups.length) return true;
  return groups.some(group => {
    const requiredCodes = extractCodes(group);
    if (!requiredCodes.length) return false;
    return requiredCodes.every(code => concluidas instanceof Set ? concluidas.has(code) : concluidas.includes(code));
  });
}

function applySelectedVisualization(concluidas = appState.concludedCodes) {
  const concludedSet = concluidas instanceof Set ? concluidas : new Set(concluidas);
  document.querySelectorAll('.subject-card').forEach(card => {
    const cod = card.dataset.codigo;
    const m = getDisciplinaByCode(cod);
    if (!m) return;
    const status = concludedSet.has(cod) ? 'passed' : (checkReqs(m.pre, concludedSet) ? 'eligible' : 'blocked');
    applyCardStatus(card, status);
    updateSubjectStatusIcon(card, status);
  });
}

// =====================================================================
// Seção: tutorial
// =====================================================================
/* tutorial.js — Tutorial de primeiro acesso.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Tutorial de primeiro acesso.
// =====================================================================
// ---- Tutorial de primeiro acesso ----
const ONBOARDING_STEPS = [
  {
    title: T('Marque o que você já cursou'),
    text: T('Toque na caixinha à direita de cada matéria. As cores mostram a situação: azul é já cursada, verde está disponível para puxar e vermelho está bloqueada por algum pré-requisito.')
  },
  {
    title: T('Veja detalhes e co-requisitos'),
    text: T('Segure o dedo sobre um card (ou toque no ícone de informação) para ver pré-requisitos e co-requisitos. O botão C indica uma matéria que precisa ser cursada junto com outra.')
  },
  {
    title: T('Planeje o próximo período'),
    text: T('Na aba "O que puxar?" você escolhe entre as disciplinas disponíveis e acompanha os créditos (o SIGA aceita de {min} a {max}).', { min: SIGA_MIN_CRED, max: SIGA_MAX_CRED })
  }
];
let onboardingStep = 0;

function ensureOnboardingModal() {
  let modal = document.getElementById('modal-onboarding');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'modal-onboarding';
  modal.className = 'modal-overlay pa-onboarding';
  modal.innerHTML = `
    <div class="onboarding-card" tabindex="-1">
      <p class="onboarding-kicker" id="onboarding-kicker"></p>
      <h2 class="onboarding-title" id="onboarding-title"></h2>
      <p class="onboarding-text" id="onboarding-text"></p>
      <div class="onboarding-dots" id="onboarding-dots" aria-hidden="true"></div>
      <div class="onboarding-actions">
        <button type="button" class="pa-btn" id="onboarding-back" data-pa-action="onboarding-back"></button>
        <button type="button" class="pa-btn pa-btn-primary" id="onboarding-next" data-pa-action="onboarding-next"></button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  prepareModalA11y(modal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); });
  return modal;
}

function renderOnboardingStep() {
  const step = ONBOARDING_STEPS[onboardingStep];
  const last = onboardingStep === ONBOARDING_STEPS.length - 1;
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  setText('onboarding-kicker', T('Passo {n} de {total}', { n: onboardingStep + 1, total: ONBOARDING_STEPS.length }));
  setText('onboarding-title', step.title);
  setText('onboarding-text', step.text);
  setText('onboarding-back', onboardingStep === 0 ? T('Pular') : T('Voltar'));
  setText('onboarding-next', last ? T('Começar') : T('Próximo'));
  const dots = document.getElementById('onboarding-dots');
  if (dots) {
    dots.innerHTML = ONBOARDING_STEPS
      .map((_, index) => `<span class="onboarding-dot${index === onboardingStep ? ' is-active' : ''}"></span>`)
      .join('');
  }
}

function openOnboarding() {
  ensureOnboardingModal();
  onboardingStep = 0;
  renderOnboardingStep();
  openModal('modal-onboarding');
}

function handleOnboardingNav(direction) {
  if (direction < 0 && onboardingStep === 0) { closeModal('modal-onboarding'); return; }
  if (direction > 0 && onboardingStep === ONBOARDING_STEPS.length - 1) { closeModal('modal-onboarding'); return; }
  onboardingStep += direction;
  renderOnboardingStep();
}

function maybeShowOnboarding() {
  try {
    if (localStorage.getItem(STORAGE_KEYS.onboarded)) return;
    localStorage.setItem(STORAGE_KEYS.onboarded, '1');
  } catch (_) {
    return;
  }
  // Quem já tem progresso salvo não é novato: não mostra o tutorial.
  if (appState.concludedCodes.size > 0) return;
  setTimeout(openOnboarding, 700);
}
