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
