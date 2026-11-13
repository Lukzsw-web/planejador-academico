/* nucleo.js — Núcleo e componentes: avisos (toast), cards das disciplinas, tutorial, eventos por delegação, inicialização, ajuste para iPhone, posição de rolagem e service worker.
 * Cada seção abaixo era um arquivo próprio (componentes.js e nucleo.js); a ordem das seções importa (scripts clássicos compartilham globais). */

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
    case 'drawer-open': openNavDrawer(); break;
    case 'drawer-close': closeNavDrawer(true); break;
    case 'drawer-go': navDrawerGo(el.dataset.value); break;
    case 'drawer-tag': toggleNavTagBubble(); break;
    case 'drawer-theme': navThemeCycle(); break;
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
  updateNavDrawerUser();   // initNavDrawer rodou antes de loadUserProfile: sem isto o nome ficava oculto até o próximo evento
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
  // A pinça dispara visualViewport.resize a cada quadro (muda a escala, não o layout). Antes, os primeiros
  // quadros (escala ≤ 1,02) passavam pelo filtro e cada um refazia o estilo das telas, forçava layout
  // (offsetHeight) e deslocava a composição: o engasgo no início do zoom. Agora eventos em que a escala
  // mudou são ignorados e os demais (teclado, barra de endereço) são agrupados em um quadro.
  const vv = window.visualViewport;
  if (vv) {
    let lastScale = vv.scale, frame = 0;
    vv.addEventListener('resize', () => {
      const scaleChanged = Math.abs(vv.scale - lastScale) > 0.001;
      lastScale = vv.scale;
      if (scaleChanged || vv.scale > 1.02) return;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (typeof isPageZoomed === 'function' && isPageZoomed()) return;
        if (!document.documentElement.classList.contains('farma-typing')) kick();
      });
    }, { passive: true });
  }
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
  
