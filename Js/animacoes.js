/* animacoes.js — Todas as animações feitas por script (os @keyframes ficam em css/animacoes.css).
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
