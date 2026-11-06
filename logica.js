/* logica.js — Toda a lógica do site: seleção de cursadas, cards, progresso, "O que puxar?", contatos, busca e desfazer.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Lógica da seleção: estado das disciplinas cursadas, co-requisitos, avisos de pré-requisito e gravação no localStorage.
// =====================================================================
// Estado reativo: as seleções ficam em memória; o DOM só é consultado
// quando precisamos efetivamente atualizar ou renderizar a interface.
const storedCheckedState = loadJSON(STORAGE_KEYS.checked, []);
const storedPlannerState = loadJSON(STORAGE_KEYS.plannerChecked, []);
const appState = {
  concludedCodes: new Set(Array.isArray(storedCheckedState) ? storedCheckedState : []),
  plannerCheckedCodes: new Set(Array.isArray(storedPlannerState) ? storedPlannerState : [])
};

const checkboxesPorCodigo = new Map();

function getConcludedCodes() {
  return Array.from(appState.concludedCodes);
}

function getCoreqRelatedCodes(codigo) {
  const related = new Set();
  const queue = [codigo];

  while (queue.length) {
    const current = queue.shift();
    const direct = new Set(corequisitosPorCodigo.get(current) || []);

    // Também encontra a disciplina que declara o código atual como co-requisito.
    (dependentesPorCodigo.get(current) || []).forEach(dependente => {
      const coCodes = corequisitosPorCodigo.get(dependente) || [];
      if (coCodes.includes(current)) direct.add(dependente);
    });

    direct.forEach(code => {
      if (code !== codigo && !related.has(code)) {
        related.add(code);
        queue.push(code);
      }
    });
  }

  return Array.from(related);
}

function getCheckboxByCode(codigo) {
  return checkboxesPorCodigo.get(codigo) || null;
}

function setSubjectChecked(codigo, checked, originCodigo = codigo, showAutoToast = false) {
  const cb = getCheckboxByCode(codigo);
  if (!cb) return false;

  const changed = cb.checked !== checked;
  cb.checked = checked;
  if (checked) appState.concludedCodes.add(codigo);
  else appState.concludedCodes.delete(codigo);

  if (checked && changed && showAutoToast && codigo !== originCodigo) {
    const autoMat = getDisciplinaByCode(codigo);
    const originMat = getDisciplinaByCode(originCodigo);
    if (autoMat && originMat) {
      showCoreqAutoToast(formatName(autoMat), formatName(originMat));
    }
  }

  return changed;
}

function synchronizeCorequisites(originCodigo, checked, showAutoToast = false) {
  const related = getCoreqRelatedCodes(originCodigo);
  related.forEach(code => setSubjectChecked(code, checked, originCodigo, showAutoToast));
  return related;
}

// Matérias já marcadas como cursadas cujo pré-requisito deixou de estar cumprido
// depois de desmarcar `codigos`. Só informa; nunca desmarca nada por conta própria.
function getBrokenDependents(codigos, concludedSet) {
  const found = new Map();
  codigos.forEach(codigo => {
    (dependentesPorCodigo.get(codigo) || new Set()).forEach(dep => {
      if (found.has(dep) || !concludedSet.has(dep)) return;
      const mat = getDisciplinaByCode(dep);
      if (!mat || !(preRequisitosPorCodigo.get(dep) || []).includes(codigo)) return;
      if (!checkReqs(mat.pre, concludedSet)) found.set(dep, mat);
    });
  });
  return Array.from(found.values());
}

function showPrereqWarningToast(originMat, brokenMats) {
  if (!originMat || !brokenMats.length) return;
  const highlight = mat => `<span class="toast-coreq-name">${escapeHTML(formatName(mat))}</span>`;
  const names = brokenMats.slice(0, 3).map(highlight).join(', ');
  const extraTxt = brokenMats.length > 3 ? T(' e mais {n}', { n: brokenMats.length - 3 }) : '';
  showToast({
    mode: 'coreq',
    duration: 6500,
    html: T(brokenMats.length === 1
      ? 'Você desmarcou {a}, mas {b}{extra} continua marcada e depende dela como pré-requisito.'
      : 'Você desmarcou {a}, mas {b}{extra} continuam marcadas e dependem dela como pré-requisito.', { a: highlight(originMat), b: names, extra: extraTxt })
  });
}

function handleSubjectCheckboxChange(cb, options = {}) {
  const codigo = cb.value;
  const beforeSet = new Set(appState.concludedCodes);

  if (cb.checked) appState.concludedCodes.add(codigo);
  else appState.concludedCodes.delete(codigo);

  const related = synchronizeCorequisites(codigo, cb.checked, options.showAutoToast !== false);
  const afterSet = new Set(appState.concludedCodes);

  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(afterSet);

  if (cb.checked) {
    const unlocked = getUnlockCascadeCodes(codigo, beforeSet, afterSet);
    animateUnlockedCards(unlocked);
  } else {
    const quebradas = getBrokenDependents([codigo, ...related], afterSet);
    if (quebradas.length) showPrereqWarningToast(getDisciplinaByCode(codigo), quebradas);
  }

  return related;
}

let saveStatusTimer = null;

function persistCheckedState(showStatus = true) {
  const saved = saveJSON(STORAGE_KEYS.checked, getConcludedCodes());
  const el = document.getElementById('save-status');
  if (saved && showStatus && el) {
    el.classList.remove('opacity-0');
    clearTimeout(saveStatusTimer);
    saveStatusTimer = setTimeout(() => el.classList.add('opacity-0'), 1600);
  }
  return saved;
}

// =====================================================================
// Lógica dos cards: restauração do estado salvo, cores dos requisitos, status e cascata de desbloqueio.
// =====================================================================
function restoreCheckedState() {
  const storedRaw = loadJSON(STORAGE_KEYS.checked, []);
  const stored = new Set(Array.isArray(storedRaw) ? storedRaw : []);
  appState.concludedCodes.clear();
  stored.forEach(codigo => {
    if (disciplinasPorCodigo.has(codigo)) appState.concludedCodes.add(codigo);
  });

  document.querySelectorAll('.subject-card input[type="checkbox"]').forEach(cb => {
    cb.checked = appState.concludedCodes.has(cb.value);
  });

  // Mantém os co-requisitos sincronizados mesmo com uma seleção antiga salva.
  Array.from(appState.concludedCodes).forEach(codigo => synchronizeCorequisites(codigo, true, false));
  // Normaliza o que está salvo, mas sem acender o aviso "salvo" ao abrir o app.
  persistCheckedState(false);
}

function resolveReqsColor(reqStr, concluidas) {
  if (!reqStr) return `<span class='text-gray-500 font-normal'>${T('Nenhum')}</span>`;
  const incompleteColor = html.classList.contains('dark') ? '#f87171' : '#ef4444';
  const completedColor = html.classList.contains('dark') ? '#34d399' : '#10b981';

  return extractCodes(reqStr).map(c => {
    const m = getDisciplinaByCode(c);
    let label = m ? formatName(m) : c;
    if (m && !periodIsCond(m.periodo)) label += ` (${displayPeriod(m)})`;
    const color = concluidas instanceof Set ? (concluidas.has(c) ? completedColor : incompleteColor) : (concluidas.includes(c) ? completedColor : incompleteColor);
    return `<span style="color:${color}" class="font-bold block mb-1">${escapeHTML(label)}</span>`;
  }).join('');
}

function applyCardStatus(cardEl, status) {
  cardEl.classList.remove('status-default', 'status-passed', 'status-eligible', 'status-blocked');
  cardEl.classList.add(
    status === 'passed' ? 'status-passed'
      : status === 'eligible' ? 'status-eligible'
      : status === 'blocked' ? 'status-blocked'
      : 'status-default'
  );
}

function getSubjectStatusForSet(mat, concludedSet) {
  if (!mat) return 'blocked';
  return concludedSet.has(mat.codigo)
    ? 'passed'
    : (checkReqs(mat.pre, concludedSet) ? 'eligible' : 'blocked');
}

function getUnlockCascadeCodes(originCodigo, beforeSet, afterSet) {
  const queue = [{ codigo: originCodigo, distance: 0 }];
  const visited = new Set([originCodigo]);
  const unlocked = [];

  while (queue.length) {
    const { codigo, distance } = queue.shift();
    const dependents = Array.from(dependentesPorCodigo.get(codigo) || []);

    dependents.forEach(dependentCode => {
      if (visited.has(dependentCode)) return;
      visited.add(dependentCode);

      const mat = getDisciplinaByCode(dependentCode);
      if (!mat) return;

      const beforeStatus = getSubjectStatusForSet(mat, beforeSet);
      const afterStatus = getSubjectStatusForSet(mat, afterSet);

      if (beforeStatus === 'blocked' && afterStatus === 'eligible') {
        unlocked.push({ codigo: dependentCode, distance: distance + 1 });
      }

      // Continue through the dependency graph so a chain of already-satisfied
      // prerequisites can receive a staggered unlock animation.
      if (afterStatus === 'eligible' || beforeStatus === 'blocked') {
        queue.push({ codigo: dependentCode, distance: distance + 1 });
      }
    });
  }

  return unlocked.sort((a, b) => a.distance - b.distance);
}

// =====================================================================
// Lógica de marcar período inteiro, limpar tudo e desfazer.
// =====================================================================
function getPeriodCodes(periodo) {
  return disciplinas.filter(d => String(d.periodo) === String(periodo)).map(d => d.codigo);
}

// Matérias de OUTROS períodos que são marcadas/desmarcadas junto, por co-requisito.
function getCoreqSideEffects(periodCodes) {
  const inPeriod = new Set(periodCodes);
  const extra = new Set();
  periodCodes.forEach(code => {
    getCoreqRelatedCodes(code).forEach(rel => {
      if (!inPeriod.has(rel)) extra.add(rel);
    });
  });
  return Array.from(extra).map(getDisciplinaByCode).filter(Boolean);
}

function formatSubjectList(mats, limit = 3) {
  const names = mats.slice(0, limit).map(m => `${formatName(m)} (${displayPeriod(m)})`);
  const rest = mats.length - limit;
  return names.join(', ') + (rest > 0 ? ` e mais ${rest}` : '');
}

function marcarTudo(p) {
  const periodCodes = getPeriodCodes(p);
  const sideEffects = getCoreqSideEffects(periodCodes).filter(m => !appState.concludedCodes.has(m.codigo));

  const run = () => {
    const before = snapshotState();
    periodCodes.forEach(codigo => {
      if (!setSubjectChecked(codigo, true)) return;
      synchronizeCorequisites(codigo, true, false);
    });
    // setSubjectChecked só devolve true quando algo mudou; garante co-requisitos mesmo
    // para matérias que já estavam marcadas.
    periodCodes.forEach(codigo => synchronizeCorequisites(codigo, true, false));
    persistCheckedState();
    updateDashboard();
    applySelectedVisualization(appState.concludedCodes);

    if (sameSet(before.concluded, appState.concludedCodes)) return;
    showToast({
      mode: 'coreq',
      duration: 4000,
      text: T('Todas as matérias do período foram marcadas automaticamente.'),
      action: { label: T('Desfazer'), iconHTML: UNDO_ICON_HTML, onClick: () => applyStateSnapshot(before) }
    });
  };

  if (p === PERIODO_COND) {
    const extraMsg = sideEffects.length
      ? ' ' + T('Isso também marcará, por serem co-requisito: {list}.', { list: formatSubjectList(sideEffects) })
      : '';
    openConfirmationModal({
      title: T('Marcar todas as condicionadas?'),
      message: T('Todas as disciplinas de Escolha Condicionada serão marcadas como cursadas.') + extraMsg,
      confirmText: T('Marcar todas'),
      onConfirm: run
    });
    return;
  }
  run();
}

function limparTudo(p) {
  const before = snapshotState();
  getPeriodCodes(p).forEach(codigo => {
    setSubjectChecked(codigo, false);
    synchronizeCorequisites(codigo, false, false);
  });
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(appState.concludedCodes);

  const removidas = before.concluded.size - appState.concludedCodes.size;
  if (removidas > 0) {
    showToast({
      mode: 'coreq',
      duration: 4000,
      icon: 'x',
      text: T('Todas as matérias do período foram desmarcadas automaticamente.'),
      action: { label: T('Desfazer'), iconHTML: UNDO_ICON_HTML, onClick: () => applyStateSnapshot(before) }
    });
  }
}

const UNDO_ICON_HTML = '<svg class="toast-undo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 010 11H11"></path></svg>';

// Pede confirmação antes de limpar tudo; o botão "Não" é vermelho.
function clearAllConcluded() {
  if (!appState.concludedCodes.size) return;
  openConfirmationModal({
    title: T('Limpar tudo?'),
    message: T('Deseja realmente limpar todas as matérias marcadas como concluídas?'),
    confirmText: T('Sim'),
    onConfirm: performClearAllConcluded
  });
}

function performClearAllConcluded() {
  if (!appState.concludedCodes.size) return;

  const before = snapshotState();
  checkboxesPorCodigo.forEach(cb => { cb.checked = false; });

  appState.concludedCodes.clear();
  persistCheckedState();
  updateDashboard();
  applySelectedVisualization(appState.concludedCodes);
  showToast({
    icon: 'x',
    text: T('Todas as matérias marcadas como concluídas foram desmarcadas.'),
    duration: 4000,
    progress: true,
    action: { label: T('Desfazer'), iconHTML: UNDO_ICON_HTML, onClick: () => applyStateSnapshot(before) }
  });
}

// =====================================================================
// Lógica do progresso: painel de créditos/horas, barras e ícones de status (cadeado, V, livre).
// =====================================================================
function getSelectedCondStats() {
  let condCred = 0, condHoras = 0, condCount = 0;
  appState.concludedCodes.forEach(codigo => {
    const m = getDisciplinaByCode(codigo);
    if (m && periodIsCond(m.periodo)) {
      condCount++;
      condCred += creditsOf(m);
      condHoras += hoursOf(m);
    }
  });
  return { condCred, condHoras, condCount };
}

function updateProgressAccessibility(id, value, label) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute('role', 'progressbar');
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', '100');
  el.setAttribute('aria-valuenow', String(Math.round(value)));
  if (label) el.setAttribute('aria-label', label);
}

function updateDashboard() {
  let dObrig = 0, dCond = 0, tCred = 0, tHr = 0, obrigCredFeitos = 0;

  appState.concludedCodes.forEach(codigo => {
    const m = getDisciplinaByCode(codigo);
    if (!m) return;
    const baseCred = creditsOf(m);
    const baseHor = hoursOf(m);

    if (periodIsCond(m.periodo)) dCond++;
    else {
      dObrig++;
      obrigCredFeitos += baseCred;
      // Créditos e horas do painel central contam só as obrigatórias.
      tCred += baseCred;
      tHr += baseHor;
    }
  });

  const countObrigPainel = document.getElementById('count-obrig-feitas-painel');
  if(countObrigPainel) countObrigPainel.textContent = dObrig;
  const countObrigTotal = document.getElementById('count-obrig-total-painel');
  if(countObrigTotal) countObrigTotal.textContent = totalObrig;

  const countObrigFeitas = document.getElementById('count-obrig-feitas');
  if(countObrigFeitas) countObrigFeitas.textContent = dObrig;
  const countObrigFaltam = document.getElementById('count-obrig-faltam');
  if(countObrigFaltam) countObrigFaltam.textContent = Math.max(0, totalObrig - dObrig);

  const pObrig = totalObrig ? Math.round((dObrig / totalObrig) * 100) : 0;
  const percentObrig = document.getElementById('percent-obrig');
  if(percentObrig) percentObrig.textContent = pObrig + '%';
  const barObrig = document.getElementById('bar-obrig');
  if(barObrig) barObrig.style.width = Math.min(100, pObrig) + '%';
  updateProgressAccessibility('bar-obrig', pObrig, T('Progresso das disciplinas obrigatórias: {p}%', { p: pObrig }));

  const countCondFeitas = document.getElementById('count-cond-feitas');
  if(countCondFeitas) countCondFeitas.textContent = dCond;
  const countCondFaltam = document.getElementById('count-cond-faltam');
  if(countCondFaltam) countCondFaltam.textContent = Math.max(0, totalCond - dCond);

  const { condCred, condHoras } = getSelectedCondStats();
  const condProgressText = document.getElementById('text-cond-progress');
  if(condProgressText) condProgressText.textContent = T('{c} créd. • {h}h', { c: condCred, h: condHoras });

  const pCondCred = (condCred / META_COND_CRED) * 100;
  const pCondHoras = (condHoras / META_COND_HORAS) * 100;
  const pCond = Math.min(100, Math.min(pCondCred, pCondHoras));
  const barCond = document.getElementById('bar-cond');
  if(barCond) barCond.style.width = pCond + '%';
  updateProgressAccessibility('bar-cond', pCond, T('Progresso das disciplinas de Escolha Condicionada: {p}%', { p: Math.round(pCond) }));

  const condMeta = document.getElementById('text-cond-meta');
  const condIcon = document.getElementById('icon-cond-exclamation');
  if (condCred >= META_COND_CRED && condHoras >= META_COND_HORAS) {
    if(condMeta) condMeta.classList.add('hidden');
    if(condIcon) condIcon.classList.remove('hidden');
  } else {
    if(condMeta) condMeta.classList.remove('hidden');
    if(condIcon) condIcon.classList.add('hidden');
  }

  const condProgress = Math.min(1, condCred / META_COND_CRED, condHoras / META_COND_HORAS);
  const creditosEquivalentes = obrigCredFeitos + (META_COND_CRED * condProgress);
  const percent = Math.min(100, Math.round((creditosEquivalentes / TOTAL_GRAD_CRED_EQUIV) * 100));
  
  const percentTotal = document.getElementById('percent-total');
  if(percentTotal) percentTotal.textContent = `${percent}%`;
  
  const tCreditosNode = document.getElementById('total-creditos');
  if(tCreditosNode) tCreditosNode.textContent = tCred;
  
  const tHorasNode = document.getElementById('total-horas');
  if(tHorasNode) tHorasNode.textContent = tHr;

}

function getSubjectStatus(mat) {
  if (appState.concludedCodes.has(mat.codigo)) return 'passed';
  return checkReqs(mat.pre, appState.concludedCodes) ? 'eligible' : 'blocked';
}

const SUBJECT_STATUS_ICON_CONFIG = {
  passed: { label: T('Cursada'), classes: 'text-blue-600 dark:text-blue-300', type: 'check' },
  eligible: { label: T('Disponível'), classes: 'text-emerald-600 dark:text-emerald-300', type: 'unlocked' },
  blocked: { label: T('Bloqueada'), classes: 'text-red-600 dark:text-red-300', type: 'locked' }
};

const LOCK_BODY = '<rect class="lock-body" x="4" y="11" width="16" height="10" rx="2"></rect>';
const LOCK_SHACKLE = '<path class="lock-shackle" d="M8 11V8a4 4 0 018 0v3"></path>';
const LOCK_CHECK = '<path d="M5 13l4 4L19 7"></path>';

function subjectStatusIconHTML(status, extraClass = '') {
  const item = SUBJECT_STATUS_ICON_CONFIG[status] || SUBJECT_STATUS_ICON_CONFIG.blocked;
  const iconMarkup = item.type === 'check' ? LOCK_CHECK : `${LOCK_BODY}${LOCK_SHACKLE}`;
  return `<span class="subject-status-icon inline-flex items-center justify-center w-5 h-5 shrink-0 ${item.classes} ${extraClass}" data-status="${status}" data-icon-type="${item.type}" title="${item.label}" aria-label="${item.label}">
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${iconMarkup}</svg>
  </span>`;
}

// O cadeado é sempre o mesmo desenho (corpo + haste). O estado "liberado" só
// levanta a haste por CSS, então a troca bloqueado -> liberado anima de verdade.
function updateSubjectStatusIcon(card, status) {
  const icon = card.querySelector('.subject-status-icon');
  if (!icon) return;
  const item = SUBJECT_STATUS_ICON_CONFIG[status] || SUBJECT_STATUS_ICON_CONFIG.blocked;
  const prevStatus = icon.dataset.status;
  const prevType = icon.dataset.iconType || '';
  icon.className = `subject-status-icon inline-flex items-center justify-center w-5 h-5 shrink-0 ${item.classes}`;
  icon.dataset.status = status;
  icon.title = item.label;
  icon.setAttribute('aria-label', item.label);

  const svg = icon.querySelector('svg');
  if (!svg) return;
  const wasCheck = prevType === 'check';
  const isCheck = item.type === 'check';
  icon._morphToken = (icon._morphToken || 0) + 1; // cancela animação anterior pendente
  if (isCheck && !wasCheck && prevStatus === 'eligible' && canAnimateIcons()) {
    playLockToCheck(icon, svg);
  } else if (wasCheck !== isCheck || !svg.querySelector('.lock-shackle') && !isCheck) {
    svg.innerHTML = isCheck ? LOCK_CHECK : `${LOCK_BODY}${LOCK_SHACKLE}`;
  }
  icon.dataset.iconType = item.type;
  const swing = prevStatus === 'blocked' && status === 'eligible' ? 'lock-just-unlocked'
    : prevStatus === 'eligible' && status === 'blocked' ? 'lock-just-locked' : '';
  if (swing) {
    icon.classList.add(swing);
    setTimeout(() => icon.classList.remove(swing), 900);
  }
}

// =====================================================================
// Lógica do "O que puxar?": disciplinas disponíveis, filtro, resumo, seleção e co-requisitos sugeridos.
// =====================================================================
// ----------------------------------------------------
// PLANEJAR GRADE LOGIC
// ----------------------------------------------------
function getPlannerAvailableSubjects() {
  const concluidas = appState.concludedCodes;
  return disciplinas.filter(d => !concluidas.has(d.codigo) && checkReqs(d.pre, concluidas));
}

// ---- Filtro da aba "O que puxar?" ----
const PLANNER_FILTER_KEY = 'planejador_planner_filter_v1';
const plannerFilter = { types: { obrig: true, cond: true }, periods: new Set(), group: false };

function loadPlannerFilter() {
  const raw = loadJSON(PLANNER_FILTER_KEY, null);
  if (!raw || typeof raw !== 'object') return;
  const types = raw.types && typeof raw.types === 'object' ? raw.types : {};
  plannerFilter.types.obrig = types.obrig !== false;
  plannerFilter.types.cond = types.cond !== false;
  if (!plannerFilter.types.obrig && !plannerFilter.types.cond) plannerFilter.types.obrig = plannerFilter.types.cond = true;
  plannerFilter.periods = new Set((Array.isArray(raw.periods) ? raw.periods : []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 10));
  plannerFilter.group = raw.group === true;
}

function savePlannerFilter() {
  try {
    localStorage.setItem(PLANNER_FILTER_KEY, JSON.stringify({
      types: plannerFilter.types,
      periods: Array.from(plannerFilter.periods).sort((a, b) => a - b),
      group: plannerFilter.group
    }));
  } catch (_) {}
}

function plannerFilterIsActive() {
  return !plannerFilter.types.obrig || !plannerFilter.types.cond || plannerFilter.periods.size > 0;
}

function plannerFilterCount() {
  return (plannerFilter.types.obrig && plannerFilter.types.cond ? 0 : 1) + (plannerFilter.periods.size > 0 ? 1 : 0);
}

function passesPlannerFilter(mat) {
  if (periodIsCond(mat.periodo)) return plannerFilter.types.cond;
  if (!plannerFilter.types.obrig) return false;
  return plannerFilter.periods.size === 0 || plannerFilter.periods.has(parseInt(mat.periodo, 10));
}

function getNextPlanningPeriod() {
  const mandatoryPeriods = [...new Set(
    disciplinas
      .filter(d => !periodIsCond(d.periodo))
      .map(d => parseInt(d.periodo, 10))
      .filter(Number.isFinite)
  )].sort((a, b) => a - b);

  for (const periodo of mandatoryPeriods) {
    const materiasDoPeriodo = disciplinas.filter(d => !periodIsCond(d.periodo) && Number(d.periodo) === periodo);
    if (materiasDoPeriodo.some(d => !appState.concludedCodes.has(d.codigo))) return periodo;
  }

  return mandatoryPeriods.length ? mandatoryPeriods[mandatoryPeriods.length - 1] : 1;
}

function updatePlannerSummary(availableSubjects = null) {
  const disponiveis = availableSubjects || getPlannerAvailableSubjects();
  const availableCodes = new Set(disponiveis.map(d => d.codigo));
  const selected = disponiveis.filter(d => appState.plannerCheckedCodes.has(d.codigo));
  const obrig = disponiveis.filter(d => !periodIsCond(d.periodo));
  const cond = disponiveis.filter(d => periodIsCond(d.periodo));
  const selectedObrig = selected.filter(d => !periodIsCond(d.periodo));
  const selectedCond = selected.filter(d => periodIsCond(d.periodo));

  const selectedCredits = selected.reduce((sum, d) => sum + creditsOf(d), 0);
  const selectedHours = selected.reduce((sum, d) => sum + hoursOf(d), 0);
  const nextPeriod = getNextPlanningPeriod();

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };

  setText('planner-period-label', T('Próximo período'));
  setText('planner-period-number', `${nextPeriod}º`);
  setText('planner-selected-credits', selectedCredits);
  setText('planner-selected-hours', selectedHours);
  setText('planner-obrig-selected', selectedObrig.length);
  setText('planner-obrig-available', Math.max(0, obrig.length - selectedObrig.length));
  setText('planner-cond-selected', selectedCond.length);
  setText('planner-cond-available', Math.max(0, cond.length - selectedCond.length));

  const warnings = [];
  if (selectedCredits > SIGA_MAX_CRED) {
    warnings.push(`<div class="planner-limit-warning planner-limit-warning-danger">${T('<strong>Limite do SIGA:</strong> você selecionou {n} créditos. O SIGA não permite puxar mais de {max} créditos. Retire alguma disciplina.', { n: selectedCredits, max: SIGA_MAX_CRED })}</div>`);
  } else if (selectedCredits < SIGA_MIN_CRED) {
    warnings.push(`<div class="planner-limit-warning planner-limit-warning-attention">${T('<strong>Carga mínima:</strong> você selecionou {n} créditos. O SIGA não permite puxar menos de {min} créditos. Marque mais alguma disciplina.', { n: selectedCredits, min: SIGA_MIN_CRED })}</div>`);
  }

  const warningEl = document.getElementById('planner-limit-warnings');
  if (warningEl) warningEl.innerHTML = warnings.join('');

  // Remove da seleção persistida qualquer código que deixou de estar disponível.
  // Isso evita que uma seleção antiga apareça novamente sem estar visível na aba.
  let changed = false;
  appState.plannerCheckedCodes.forEach(code => {
    if (!availableCodes.has(code)) {
      appState.plannerCheckedCodes.delete(code);
      changed = true;
    }
  });
  if (changed) persistPlannerCheckedState();
}

function plannerGroupedCardsHTML(list) {
  let html = '';
  let current = null;
  list.forEach(m => {
    const per = parseInt(m.periodo, 10);
    if (per !== current) {
      current = per;
      html += `<div class="planner-period-head" role="heading" aria-level="4">${escapeHTML(T('{n}º Período', { n: per }))}</div>`;
    }
    html += createPlannerCard(m);
  });
  return html;
}

function updatePlannerFilterUI(disponiveis, visiveis) {
  const btn = document.getElementById('planner-filter-btn');
  const badge = document.getElementById('planner-filter-badge');
  const note = document.getElementById('planner-filter-note');
  const active = plannerFilterIsActive();
  const n = plannerFilterCount();
  if (btn) btn.classList.toggle('is-active', active);
  if (badge) { badge.textContent = String(n); badge.hidden = !active; }

  const obrigGroup = document.getElementById('planner-obrig-container')?.closest('details');
  const condGroup = document.getElementById('planner-cond-container')?.closest('details');
  if (obrigGroup) obrigGroup.hidden = !plannerFilter.types.obrig;
  if (condGroup) condGroup.hidden = !plannerFilter.types.cond;
  // Só um grupo à mostra: já abre, sem exigir um toque a mais.
  if (plannerFilter.types.obrig !== plannerFilter.types.cond) {
    (plannerFilter.types.obrig ? obrigGroup : condGroup)?.setAttribute('open', '');
  }

  if (!note) return;
  if (!active) { note.hidden = true; note.textContent = ''; return; }
  const parts = [];
  if (!plannerFilter.types.cond) parts.push(T('só obrigatórias'));
  else if (!plannerFilter.types.obrig) parts.push(T('só escolha condicionada'));
  if (plannerFilter.periods.size && plannerFilter.types.obrig) {
    parts.push(T('períodos: {lista}', { lista: Array.from(plannerFilter.periods).sort((a, b) => a - b).map(p => `${p}º`).join(', ') }));
  }
  const hidden = disponiveis.length - visiveis.length;
  const hiddenSelected = disponiveis.filter(d => !passesPlannerFilter(d) && appState.plannerCheckedCodes.has(d.codigo)).length;
  let text = T('Filtro ativo ({detalhes}) • {n} fora da lista', { detalhes: parts.join('; '), n: hidden });
  if (hiddenSelected) text += ' • ' + (hiddenSelected === 1 ? T('1 selecionada fora do filtro continua contando nos créditos') : T('{n} selecionadas fora do filtro continuam contando nos créditos', { n: hiddenSelected }));
  note.textContent = text;
  note.hidden = false;
}

function renderPlanner() {
  const containerObrig = document.getElementById('planner-obrig-container');
  const containerCond = document.getElementById('planner-cond-container');
  if (!containerObrig || !containerCond) return;

  const disponiveis = getPlannerAvailableSubjects();
  const visiveis = disponiveis.filter(passesPlannerFilter);
  const obrig = visiveis.filter(d => !periodIsCond(d.periodo)).sort((a, b) => parseInt(a.periodo, 10) - parseInt(b.periodo, 10));
  const cond = visiveis.filter(d => periodIsCond(d.periodo));
  const filtered = plannerFilterIsActive();

  if (obrig.length > 0) {
    containerObrig.innerHTML = plannerFilter.group ? plannerGroupedCardsHTML(obrig) : obrig.map(m => createPlannerCard(m)).join('');
  } else if (filtered && disponiveis.some(d => !periodIsCond(d.periodo))) {
    containerObrig.innerHTML = emptyStateHTML(T('Nenhuma obrigatória com esse filtro.'), T('Ajuste os períodos no ícone de filtro para ver mais.'), 'planner');
  } else {
    containerObrig.innerHTML = emptyStateHTML(T('Nenhuma obrigatória disponível para puxar.'), T('Quando você concluir os pré-requisitos de uma matéria, ela aparecerá aqui.'), 'planner');
  }

  if (cond.length > 0) {
    containerCond.innerHTML = cond.map(m => createPlannerCard(m)).join('');
  } else {
    containerCond.innerHTML = emptyStateHTML(T('Nenhuma condicionada disponível para puxar.'), T('As condicionadas aparecem aqui assim que seus pré-requisitos forem cumpridos.'), 'planner');
  }

  restorePlannerCheckedState();
  updatePlannerSummary(disponiveis);
  updatePlannerFilterUI(disponiveis, visiveis);
}

function emptyStateHTML(title, description, icon = 'search') {
  const icons = {
    search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>',
    planner: '<rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M8 9h8M8 13h5"></path>'
  };
  const iconPath = icons[icon] || icons.search;
  return `<div class="flex flex-col items-center justify-center text-center py-5 px-4 text-gray-500 dark:text-gray-400">
    <span class="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3 text-gray-400 dark:text-gray-500">
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
    </span>
    <p class="text-sm font-bold text-gray-600 dark:text-gray-300">${escapeHTML(title)}</p>
    <p class="text-xs mt-1 max-w-sm">${escapeHTML(description)}</p>
  </div>`;
}

function createPlannerCard(mat) {
  const safeCode = escapeHTML(mat.codigo);
  const safeName = escapeHTML(formatName(mat));
  const coreqBtn = mat.co
    ? `<button type="button" class="planner-coreq-button" data-pa-action="coreq-info" data-codigo="${safeCode}" title="${T('Ver co-requisito')}" aria-label="${T('Ver co-requisito de {name}', { name: safeName })}">C</button>`
    : '';

  return `
  <div class="planner-card block p-3 rounded-xl relative mb-2 select-none bg-white dark:bg-darkCard border border-gray-200 dark:border-darkBorder transition-all duration-200"
         data-codigo="${safeCode}">
    <div class="flex items-center justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center flex-wrap gap-1.5">
          ${subjectStatusIconHTML('eligible')}
          <span class="planner-subject-name text-sm md:text-base font-bold leading-tight text-gray-800 dark:text-gray-100">${safeName}</span>
          ${coreqBtn}
          <button type="button"
                  data-pa-action="copy-code" data-codigo="${safeCode}"
                  title="${T('Copiar código')}"
                  aria-label="${T('Copiar código {code}', { code: safeCode })}"
                  class="copy-code-button p-1 text-gray-400 hover:text-yellowTheme-600 dark:hover:text-yellowTheme-400 transition-colors bg-black/5 dark:bg-white/5 rounded-md shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"></rect>
              <path d="M5 15H4a2 2 0 0 0-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button type="button" data-pa-action="note-open" data-codigo="${safeCode}"
                  title="${T('Anotar sobre esta disciplina')}" aria-label="${T('Anotar sobre {name}', { name: safeName })}"
                  class="note-button copy-code-button p-1 text-gray-400 transition-colors bg-black/5 dark:bg-white/5 rounded-md shrink-0${window.Notas && window.Notas.has(mat.codigo) ? ' has-note' : ''}">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5h8.5L19 8v12.5H6z"></path><path d="M14 3.5V8h5"></path><path d="M9.2 13h6.6M9.2 16.6h4.4"></path></svg>
          </button>
          ${infoButtonHTML('planner-details', safeCode, safeName)}
        </div>
        <div class="flex items-center gap-2 mt-1 flex-wrap">
          <span class="subject-code text-[0.75rem] font-semibold">${safeCode}</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.75rem] font-medium text-gray-500">${escapeHTML(creditsOf(mat))} ${T('Créd.')}</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-[0.75rem] font-medium text-gray-500">${escapeHTML(hoursOf(mat))}h</span>
          ${unlockChipHTML(mat.codigo)}
        </div>
      </div>
      <div class="flex items-center">
        <input type="checkbox" value="${safeCode}" ${appState.plannerCheckedCodes.has(mat.codigo) ? 'checked' : ''} class="w-5 h-5 rounded border-gray-300 text-yellowTheme-500 focus:ring-yellowTheme-500 dark:border-gray-600 dark:bg-gray-700" aria-label="${T('Selecionar {name} para o planejamento', { name: safeName })}">
      </div>
    </div>
  </div>`;
}

function togglePlannerCard(checkbox) {
  const card = checkbox.closest('.planner-card');
  if (!card) return;
  if (checkbox.checked) appState.plannerCheckedCodes.add(checkbox.value);
  else appState.plannerCheckedCodes.delete(checkbox.value);

  card.classList.toggle('line-through', checkbox.checked);
  card.classList.toggle('opacity-50', checkbox.checked);
  persistPlannerCheckedState();
  updatePlannerSummary();
  if (checkbox.checked) suggestPlannerCoreqs(checkbox.value);
}

function setPlannerChecked(codigo, checked) {
  const cb = document.querySelector(`.planner-card[data-codigo="${CSS.escape(codigo)}"] input[type="checkbox"]`);
  if (!cb || cb.checked === checked) return;
  cb.checked = checked;
  togglePlannerCard(cb);
}

// Ao escolher uma matéria com co-requisito, lembra que as duas precisam ser cursadas juntas.
function suggestPlannerCoreqs(codigo) {
  const mat = getDisciplinaByCode(codigo);
  if (!mat) return;
  const pendentes = getCoreqRelatedCodes(codigo)
    .filter(c => !appState.concludedCodes.has(c) && !appState.plannerCheckedCodes.has(c));
  if (!pendentes.length) return;

  const disponiveis = new Set(getPlannerAvailableSubjects().map(d => d.codigo));
  const podem = pendentes.filter(c => disponiveis.has(c));
  const faltam = pendentes.filter(c => !disponiveis.has(c));
  const nomes = codes => codes
    .map(getDisciplinaByCode).filter(Boolean)
    .map(m => `<span class="toast-coreq-name">${escapeHTML(formatName(m))}</span>`).join(', ');
  const origem = `<span class="toast-coreq-name">${escapeHTML(formatName(mat))}</span>`;

  if (podem.length) {
    const nota = faltam.length ? ' ' + T('Também falta {nomes}, que ainda não está disponível.', { nomes: nomes(faltam) }) : '';
    showToast({
      mode: 'coreq',
      duration: 7000,
      html: T('{origem} tem {nomes} como co-requisito: devem ser cursadas juntas.', { origem, nomes: nomes(podem) }) + nota,
      action: { label: T('Marcar também'), onClick: () => podem.forEach(c => setPlannerChecked(c, true)) }
    });
  } else {
    showToast({
      mode: 'coreq',
      duration: 7000,
      html: T('{origem} deve ser cursada junto com {nomes}, que ainda não está disponível (confira os pré-requisitos).', { origem, nomes: nomes(faltam) })
    });
  }
}

function clearPlannerSelection() {
  const checked = document.querySelectorAll('#modal-planner .planner-card input[type="checkbox"]:checked');
  if (!appState.plannerCheckedCodes.size && !checked.length) return;
  // Desmarca pelo mesmo caminho do clique manual (evento "change"), para que todos os
  // indicadores do painel (inclusive os calculados no index.html) sejam atualizados.
  checked.forEach(cb => {
    cb.checked = false;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });
  appState.plannerCheckedCodes.clear();
  persistPlannerCheckedState();
  updatePlannerSummary();
}

// Copia os códigos das disciplinas selecionadas, prontos para colar no SIGA.
function copyPlannerSelectedCodes(event) {
  const codes = getPlannerAvailableSubjects()
    .filter(d => appState.plannerCheckedCodes.has(d.codigo))
    .map(d => d.codigo);
  if (!codes.length) {
    showToast({ text: T('Selecione ao menos uma disciplina para copiar os códigos.') });
    return;
  }
  copyTextToClipboard(codes.join(', '), codes.length === 1 ? T('Código') : T('Códigos'), event, codes.length > 1);
}

function persistPlannerCheckedState() {
  saveJSON(STORAGE_KEYS.plannerChecked, Array.from(appState.plannerCheckedCodes));
}

function restorePlannerCheckedState() {
  document.querySelectorAll('.planner-card input[type="checkbox"]').forEach(cb => {
    cb.checked = appState.plannerCheckedCodes.has(cb.value);
    const card = cb.closest('.planner-card');
    if (!card) return;
    card.classList.toggle('line-through', cb.checked);
    card.classList.toggle('opacity-50', cb.checked);
  });
}

let timerPlannerLongPress = null;
let plannerLongPressPointer = null;
let plannerLongPressStartX = 0;
let plannerLongPressStartY = 0;

// Matérias que têm esta como PRÉ-requisito (as que ela "tranca").
function getPrereqLockedSubjects(codigo) {
  return getLockedSubjects(codigo).filter(t => (preRequisitosPorCodigo.get(t.codigo) || []).includes(codigo));
}

// Matérias ligadas a esta por co-requisito (nos dois sentidos).
function getCoreqRelatedSubjects(codigo) {
  const set = new Set(corequisitosPorCodigo.get(codigo) || []);
  disciplinas.forEach(d => { if ((corequisitosPorCodigo.get(d.codigo) || []).includes(codigo)) set.add(d.codigo); });
  return Array.from(set).map(getDisciplinaByCode).filter(Boolean);
}

const PINFO_COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

function pinfoRowHTML(t) {
  const code = escapeHTML(t.codigo);
  return `<li class="pinfo-row">
    <div class="pinfo-row-main">
      <span class="pinfo-row-name">${escapeHTML(formatName(t))}</span>
      <span class="pinfo-row-code"><span class="subject-code">${code}</span><button type="button" class="pinfo-copy" data-pa-action="copy-code" data-codigo="${code}" title="${T('Copiar código')}" aria-label="${T('Copiar código {code}', { code: t.codigo })}">${PINFO_COPY_ICON}</button></span>
    </div>
    <span class="pinfo-row-period">${escapeHTML(displayPeriod(t))}</span>
  </li>`;
}

function renderPlannerFilterSheet() {
  const disponiveis = getPlannerAvailableSubjects();
  const obrig = disponiveis.filter(d => !periodIsCond(d.periodo));
  const cond = disponiveis.filter(d => periodIsCond(d.periodo));
  const sheet = document.getElementById('modal-planner-filter');
  if (!sheet) return;

  const onlyOne = plannerFilter.types.obrig !== plannerFilter.types.cond;
  sheet.querySelectorAll('[data-pfilter-type]').forEach(btn => {
    const key = btn.dataset.pfilterType;
    const on = plannerFilter.types[key];
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-disabled', onlyOne && on ? 'true' : 'false');
  });
  const setCount = (key, n) => { const el = sheet.querySelector(`[data-pfilter-count="${key}"]`); if (el) el.textContent = String(n); };
  setCount('obrig', obrig.length);
  setCount('cond', cond.length);

  const counts = new Map();
  obrig.forEach(d => { const p = parseInt(d.periodo, 10); counts.set(p, (counts.get(p) || 0) + 1); });
  plannerFilter.periods.forEach(p => { if (!counts.has(p)) counts.set(p, 0); });
  const box = document.getElementById('pfilter-periods');
  if (box) {
    const periods = Array.from(counts.keys()).sort((a, b) => a - b);
    box.innerHTML = periods.length
      ? periods.map(p => {
        const on = plannerFilter.periods.has(p);
        return `<button type="button" class="pfilter-chip pfilter-period${on ? ' is-on' : ''}" data-pfilter-period="${p}" aria-pressed="${on}" aria-label="${escapeHTML(T('{n}º Período', { n: p }))}">${p}º<span class="pfilter-count">${counts.get(p)}</span></button>`;
      }).join('')
      : `<span class="pfilter-hint">${escapeHTML(T('Nenhuma obrigatória disponível agora.'))}</span>`;
  }
  const periodsSection = document.getElementById('pfilter-periods-section');
  if (periodsSection) periodsSection.classList.toggle('is-muted', !plannerFilter.types.obrig);

  const sw = document.getElementById('pfilter-group');
  if (sw) { sw.setAttribute('aria-checked', plannerFilter.group ? 'true' : 'false'); sw.classList.toggle('is-on', plannerFilter.group); }

  const visiveis = disponiveis.filter(passesPlannerFilter).length;
  const sub = document.getElementById('pfilter-sub');
  if (sub) sub.textContent = visiveis === 1 ? T('1 disciplina na lista') : T('{n} disciplinas na lista', { n: visiveis });
  const clearBtn = document.getElementById('pfilter-clear');
  if (clearBtn) clearBtn.disabled = !plannerFilterIsActive() && !plannerFilter.group;
}

function openPlannerFilter() {
  renderPlannerFilterSheet();
  openModal('modal-planner-filter');
}

function applyPlannerFilterChange() {
  savePlannerFilter();
  renderPlanner();
  renderPlannerFilterSheet();
  const input = document.getElementById('planner-search-input');
  if (input && input.value) input.dispatchEvent(new Event('input', { bubbles: true }));
}

function initPlannerFilter() {
  loadPlannerFilter();
  // O cartão interno tem onclick="event.stopPropagation()"; por isso o ouvinte fica nele, não no fundo.
  const sheet = document.querySelector('#modal-planner-filter .pfilter-card');
  if (!sheet) return;
  sheet.addEventListener('click', event => {
    const typeBtn = event.target.closest('[data-pfilter-type]');
    if (typeBtn) {
      const key = typeBtn.dataset.pfilterType;
      const other = key === 'obrig' ? 'cond' : 'obrig';
      if (plannerFilter.types[key] && !plannerFilter.types[other]) return; // sempre fica ao menos um tipo
      plannerFilter.types[key] = !plannerFilter.types[key];
      applyPlannerFilterChange();
      return;
    }
    const periodBtn = event.target.closest('[data-pfilter-period]');
    if (periodBtn) {
      const p = Number(periodBtn.dataset.pfilterPeriod);
      if (plannerFilter.periods.has(p)) plannerFilter.periods.delete(p); else plannerFilter.periods.add(p);
      applyPlannerFilterChange();
      return;
    }
    if (event.target.closest('#pfilter-group')) {
      plannerFilter.group = !plannerFilter.group;
      applyPlannerFilterChange();
      return;
    }
    if (event.target.closest('#pfilter-clear')) {
      plannerFilter.types.obrig = plannerFilter.types.cond = true;
      plannerFilter.periods.clear();
      plannerFilter.group = false;
      applyPlannerFilterChange();
    }
  });
}

// =====================================================================
// Lógica dos contatos importantes: lista, busca e cartões.
// =====================================================================
// ----------------------------------------------------
// CONTATOS SEARCH LOGIC
// ----------------------------------------------------
function renderContatos() {
  if (typeof contatosImportantes === 'undefined') return;
  renderContatosFiltered(contatosImportantes);
}

function renderContatosFiltered(dataToRender) {
  const container = document.getElementById('contatos-content');
  if (!container || typeof contatosImportantes === 'undefined') return;

  if (Array.isArray(dataToRender) && dataToRender.length === 0) {
      container.innerHTML = emptyStateHTML(T('Nenhum professor encontrado.'), T('Tente outro nome ou parte do e-mail.'), 'search');
      return;
  }

  // Identifica se os dados passados já estão no formato original agrupado ou se é uma lista linear de professores do filtro
  let htmlResult = '';
  if (dataToRender[0] && dataToRender[0].professores) {
      // Formato original (agrupado)
      htmlResult = dataToRender.map(grupo => buildContatoCard(grupo.nome, grupo.chefe, grupo.local, grupo.professores)).join('');
  } else {
      // Formato de lista filtrada
      const grouped = {};
      dataToRender.forEach(p => {
          if(!grouped[p.grupo]) grouped[p.grupo] = [];
          grouped[p.grupo].push(p);
      });
      htmlResult = Object.keys(grouped).map(grupoNome => buildContatoCard(grupoNome, '', '', grouped[grupoNome])).join('');
  }

  container.innerHTML = htmlResult;
}

// Rótulos fixos dos contatos (Chefe:, LOCAL:, Bloco, Sala, andar) seguem o idioma; nomes e e-mails não.
function localizeContactLine(text) {
  return String(text || '')
    .replace(/^Chefe:/, T('Chefe:')).replace(/^LOCAL:/, T('LOCAL:'))
    .replace(/\bBloco\b/g, T('Bloco')).replace(/\bSala\b/g, T('Sala')).replace(/\bandar\b/g, T('andar'));
}

function buildContatoCard(nomeGrupo, chefe, local, professores) {
  const safeGrupo = escapeHTML(nomeGrupo);
  const safeChefe = escapeHTML(localizeContactLine(chefe));
  const safeLocal = escapeHTML(localizeContactLine(local));
  return `
    <div class="bg-gray-50 dark:bg-[#15171b] p-4 rounded-xl border border-gray-100 dark:border-darkBorder">
      <h4 class="font-bold text-lg text-yellowTheme-600 dark:text-yellowTheme-400 ${chefe ? 'mb-1' : 'mb-2'}">${safeGrupo}</h4>
      ${chefe ? `<p class="text-sm font-semibold ${local ? 'mb-1' : 'mb-3'}">${safeChefe}</p>` : ''}
      ${local ? `<p class="text-xs text-gray-500 mb-3">${safeLocal}</p>` : ''}
      <ul class="text-xs space-y-2 text-left flex-wrap">
        ${professores.map(p => {
          const name = escapeHTML(p.nome);
          const email = escapeHTML(p.email);
          const mailto = escapeHTML(`mailto:${String(p.email || '').trim()}`);
          const extras = Array.isArray(p.extras) && p.extras.length ? ` | ${p.extras.map(escapeHTML).join(' | ')}` : '';
          const cargo = p.cargo ? ` ${escapeHTML(p.cargo)}` : '';
          return `<li><b>${name}</b> - <a href="${mailto}" class="text-blue-500 hover:underline">${email}</a>${extras}${cargo}</li>`;
        }).join('')}
      </ul>
    </div>
  `;
}

function initContatosSearch() {
  if (typeof contatosImportantes === 'undefined') return;

  const input = document.getElementById('contatos-search-input');
  const suggestions = document.getElementById('contatos-search-suggestions');
  if(!input || !suggestions) return;

  const runSearch = debounce(() => {
    const val = normalizeKeepSpaces(input.value);
    if(!val) {
      suggestions.classList.add('hidden');
      renderContatos();
      return;
    }

    const allProfs = [];
    contatosImportantes.forEach(g => g.professores.forEach(p => allProfs.push({ ...p, grupo: g.nome })));

    const matched = allProfs
      .map(p => ({ p, score: Math.max(scoreSearchText(val, p.nome), scoreSearchText(val, p.email)) }))
      .filter(item => item.score >= (val.length <= 2 ? 430 : 300))
      .sort((a, b) => b.score - a.score || a.p.nome.localeCompare(b.p.nome, 'pt-BR'))
      .map(item => item.p);

    if (matched.length > 0) {
      suggestions.innerHTML = matched.slice(0, 5).map(p => `
        <button type="button" data-contato-nome="${escapeHTML(p.nome)}" class="w-full text-left p-3 border-b border-gray-100 dark:border-darkBorder cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1c22]">
          <p class="font-bold text-sm text-gray-800 dark:text-gray-100">${escapeHTML(p.nome)}</p>
          <p class="text-[0.65rem] text-gray-500">${escapeHTML(p.email)}</p>
        </button>
      `).join('');
      suggestions.classList.remove('hidden');
    } else {
      suggestions.innerHTML = emptyStateHTML(T('Nenhum professor encontrado.'), T('Tente outro nome ou parte do e-mail.'), 'search');
      suggestions.classList.remove('hidden');
    }

    renderContatosFiltered(matched);
  }, 250);

  input.addEventListener('input', runSearch);
  suggestions.addEventListener('click', e => {
    const button = e.target.closest('[data-contato-nome]');
    if (!button) return;
    selectContatoSearch(button.dataset.contatoNome);
  });

  document.addEventListener('click', (e) => {
    if(!input.contains(e.target) && !suggestions.contains(e.target)) suggestions.classList.add('hidden');
  });
}

function selectContatoSearch(nome) {
  const input = document.getElementById('contatos-search-input');
  if(input) input.value = nome;
  document.getElementById('contatos-search-suggestions').classList.add('hidden');
  
  let allProfs = [];
  contatosImportantes.forEach(g => g.professores.forEach(p => allProfs.push({ ...p, grupo: g.nome })));
  const matched = allProfs.filter(p => p.nome === nome);
  renderContatosFiltered(matched);
}

// =====================================================================
// Lógica da busca (motor): normalização, apelidos, pontuação, intenção da pergunta e ranking.
// =====================================================================
// ----------------------------------------------------
// MAIN SEARCH LOGIC — BUSCA INTELIGENTE 2.0
// ----------------------------------------------------
function debounce(fn, wait = 250) {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => { clearTimeout(timer); timer = null; };
  return debounced;
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function buildSearchIndex(mat) {
  if (!mat) return '';
  if (buscaIndexPorCodigo.has(mat.codigo)) return buscaIndexPorCodigo.get(mat.codigo);
  const value = normalizeKeepSpaces([
    formatName(mat),
    mat.codigo,
    displayPeriod(mat),
    `${mat.periodo} periodo`
  ].join(' '));
  buscaIndexPorCodigo.set(mat.codigo, value);
  return value;
}

// Troca apelidos ("qf", "cif", "orgexp"...) pelo texto completo, palavra por palavra.
// Antes o apelido era procurado como pedaço de texto, o que podia corromper termos
// como "bqm101" ou "experimental".
function expandSearchAliases(rawText) {
  const norm = normalizeKeepSpaces(rawText);
  if (!norm || typeof aliasesPesquisaDisciplinas !== 'object' || !aliasesPesquisaDisciplinas) return norm;

  const aliasMap = new Map();
  Object.entries(aliasesPesquisaDisciplinas).forEach(([alias, target]) => {
    const key = normalizeStr(alias);
    if (key) aliasMap.set(key, normalizeKeepSpaces(target));
  });

  const whole = aliasMap.get(norm.replace(/ /g, ''));
  if (whole) return whole;
  return norm.split(' ').map(token => aliasMap.get(token) || token).join(' ');
}

function levenshteinDistance(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

function subsequenceScore(query, target) {
  if (!query || !target) return 0;
  let qi = 0;
  for (const ch of target) {
    if (ch === query[qi]) qi++;
    if (qi === query.length) break;
  }
  return qi / query.length;
}

function scoreSearchText(query, candidate) {
  const q = normalizeKeepSpaces(query);
  const t = normalizeKeepSpaces(candidate);
  if (!q || !t) return 0;

  if (t === q) return 1200;
  if (t.startsWith(q)) return 1080 - Math.min(140, t.length - q.length);
  if (t.includes(q)) return 940 - Math.min(140, t.indexOf(q) * 4);

  const compact = q.replace(/ /g, '');
  const compactTarget = t.replace(/ /g, '');
  // Consulta digitada sem espaços ("quimicaorganica") ainda encontra o texto.
  if (compact.length >= 3 && compactTarget.includes(compact)) {
    return 900 - Math.min(140, compactTarget.indexOf(compact) * 4);
  }

  // Compara também cada palavra. Isso melhora abreviações e pequenos erros
  // (“fisiolgia”, “farmaceutca”) sem deixar a busca permissiva demais.
  const qWords = q.split(' ').filter(Boolean);
  const tWords = t.split(' ').filter(Boolean);
  let wordBest = 0;
  let unmatched = 0;
  for (const qw of qWords) {
    let best = 0;
    for (const tw of tWords) {
      if (tw === qw) { best = 1; break; }
      if (tw.startsWith(qw) && qw.length >= 2) {
        best = Math.max(best, 0.92 - Math.min(.15, (tw.length - qw.length) * .02));
        continue;
      }
      const maxLen = Math.max(qw.length, tw.length);
      if (maxLen < 3) continue;
      const dist = levenshteinDistance(qw, tw);
      const similarity = 1 - (dist / maxLen);
      const allowed = qw.length <= 4 ? 0.74 : qw.length <= 7 ? 0.70 : 0.67;
      if (similarity >= allowed) best = Math.max(best, similarity);
    }
    if (best === 0) unmatched++;
    wordBest += best;
  }
  let wordScore = qWords.length ? (wordBest / qWords.length) * 880 : 0;
  // Em consultas com várias palavras, uma palavra sem correspondência derruba a nota:
  // "quimica 2" não deve trazer qualquer matéria só porque ela é do 2º período.
  if (unmatched > 0 && qWords.length > 1) wordScore *= 0.45;

  // Só conta quando todas as letras aparecem na ordem (ex.: "qfm"); pontuação parcial
  // deixava passar quase qualquer disciplina.
  const compactSubseq = compact.length >= 3 && subsequenceScore(compact, compactTarget) === 1 ? 1 : 0;

  // Abreviações naturais: “qf” → Química Farmacêutica, “bm” → Bases Morfológicas...
  const acronym = buildAcronym(candidate);
  const acronymScore = acronym === compact ? 900 : acronym.startsWith(compact) && compact.length >= 2 ? 760 : 0;

  return Math.max(wordScore, compactSubseq * 480, acronymScore);
}

// Expressões compartilhadas entre a leitura da busca e a remoção dos chips de filtro.
const CREDITS_QUERY_RE = /(?:^|\s)(\d+(?:[.,]\d+)?)\s*cr(?:[eé]d(?:ito|it)?s?)?(?=\s|$|[,;|.])/i;
const HOURS_QUERY_RE = /(?:^|\s)(\d+)\s*h(?:oras?|ours?)?(?=\s|$|[,;|.])/i;
// Ordem importa: as formas negativas precisam vir antes das positivas.
const STATUS_TEXT_SOURCE = 'n[aã]o\\s*pux[aá]veis?|n[aã]o\\s*dispon[ií]veis?|indispon[ií]veis?|unavailable|not\\s*available|no\\s*disponibles?|bloqueadas?|trancadas?|locked|blocked|j[aá]\\s*cursadas?|conclu[ií]das?|cursadas?|completed?|completadas?|finished|pux[aá]veis?|dispon[ií]veis?|disponibles?|available|livres?';

function parseSearchIntent(rawQuery) {
  const raw = String(rawQuery || '').trim().normalize('NFC');
  let text = raw;
  const normalized = normalizeStr(raw);
  const filters = {
    periodo: null,
    creditos: null,
    horas: null,
    status: null,
    condicionada: false,
    semPre: false
  };

  // Período: "4 período", "4º período", "periodo 4" e formas sem espaço.
  let match = normalized.match(/(?:^|[^0-9])(\d{1,2})(?:o|º|°)?periodo/);
  if (!match) match = normalized.match(/periodo(?:o|º|°)?(\d{1,2})/);
  const termMatch = !match ? (normalized.match(/(?:^|[^0-9])(\d{1,2})(?:st|nd|rd|th)?term/) || normalized.match(/term(\d{1,2})/)) : null;
  if (termMatch) {
    filters.periodo = Number(termMatch[1]);
    text = text.replace(/\b\d{1,2}(?:st|nd|rd|th)?\s*term\b/i, ' ').replace(/\bterm\s*\d{1,2}\b/i, ' ');
  }
  if (match && !termMatch) {
    filters.periodo = Number(match[1]);
    text = text.replace(new RegExp(`\\b${match[1]}(?:\\s*(?:º|°|o))?\\s*per[ií]odo\\b`, 'i'), ' ');
    text = text.replace(new RegExp(`per[ií]odo\\s*${match[1]}\\b`, 'i'), ' ');
  } else if (!termMatch && filters.creditos === null && filters.horas === null) {
    // Um número isolado pode significar o período. Quando há texto junto,
    // preservamos o número para permitir buscas como “bio 2” ou “química 2”.
    const onlyNumber = normalized.match(/^(\d{1,2})$/);
    if (onlyNumber && Number(onlyNumber[1]) >= 1 && Number(onlyNumber[1]) <= 10) {
      filters.periodo = Number(onlyNumber[1]);
      text = '';
    }
  }

  // Créditos: "2cr", "2 cred", "2 créd.", "2 créditos". Lê o texto original (com espaços)
  // para não confundir "2 cr" com letras coladas de outra palavra.
  match = raw.match(CREDITS_QUERY_RE);
  if (match) {
    filters.creditos = Number(match[1].replace(',', '.'));
    text = text.replace(match[0], ' ');
  }

  // Carga horária: "30h", "30 horas". Exige fim de palavra: "2 hematologia" não vira 2 horas.
  match = raw.match(HOURS_QUERY_RE);
  if (match) {
    filters.horas = Number(match[1]);
    text = text.replace(match[0], ' ');
  }

  // Os termos NEGATIVOS vêm primeiro: "naopuxaveis" contém "puxaveis" e "indisponiveis"
  // contém "disponiveis"; testados depois, eles seriam lidos como o contrário.
  const statusTerms = [
    { re: /(?:naopuxaveis?|naodisponiveis?|indisponiveis?|unavailable|notavailable|nodisponibles?|bloqueadas?|trancadas?|locked|blocked)/, value: 'bloqueada' },
    { re: /(?:jacursadas?|concluidas?|cursadas?|completed?|completadas?|finished)/, value: 'cursada' },
    { re: /(?:puxaveis?|disponiveis?|disponibles?|available|livres?)/, value: 'disponivel' }
  ];
  for (const term of statusTerms) {
    if (term.re.test(normalized)) {
      filters.status = term.value;
      text = text.replace(new RegExp(STATUS_TEXT_SOURCE, 'ig'), ' ');
      break;
    }
  }

  if (/(?:sem\s*pre|sem\s*pr[eé]-?requisito|sempr[eé]requisito|sin\s*prerrequisitos?|no\s*prerequisites?)/i.test(raw)) {
    filters.semPre = true;
    text = text.replace(/sem\s*(?:pr[eé]-?requisito|pre)|sin\s*prerrequisitos?|no\s*prerequisites?/i, ' ');
  }

  if (/(?:escolha\s*condicionada|condicionadas?)/i.test(raw)) {
    filters.condicionada = true;
    text = text.replace(/escolha\s*condicionada|condicionadas?/gi, ' ');
  }

  // Limpa pontuação usada só como separador, preservando o texto real.
  text = text.replace(/[|,;]+/g, ' ').trim();

  return {
    raw,
    text,
    normalizedText: expandSearchAliases(text),
    filters
  };
}

function isDisciplineAvailable(mat, concluidas) {
  return checkReqs(mat.pre, concluidas);
}

function rankDisciplineSearch(query) {
  if (!query || typeof disciplinas === 'undefined') return [];

  const intent = parseSearchIntent(query);
  const q = intent.normalizedText;
  const concluidas = appState.concludedCodes;

  return disciplinas
    .map(mat => {
      const periodNumber = parseInt(String(mat.periodo).match(/\d+/)?.[0] || '', 10);
      const available = isDisciplineAvailable(mat, concluidas);
      const hasPre = Boolean(preRequisitosPorCodigo.get(mat.codigo)?.length);
      const isCond = periodIsCond(mat.periodo);

      if (intent.filters.periodo !== null && periodNumber !== intent.filters.periodo) return null;
      if (intent.filters.creditos !== null && Number(creditsOf(mat)) !== intent.filters.creditos) return null;
      if (intent.filters.horas !== null && Number(hoursOf(mat)) !== intent.filters.horas) return null;
      if (intent.filters.status === 'cursada' && !concluidas.has(mat.codigo)) return null;
      if (intent.filters.status === 'disponivel' && (concluidas.has(mat.codigo) || !available)) return null;
      if (intent.filters.status === 'bloqueada' && (concluidas.has(mat.codigo) || available)) return null;
      if (intent.filters.semPre && hasPre) return null;
      if (intent.filters.condicionada && !isCond) return null;

      // Se a busca é só um filtro (ex.: "3 período"), todas as correspondentes entram.
      if (!q) return { mat, score: 700, available, hasPre, status: getSubjectStatus(mat), intent };

      const name = formatName(mat);
      const normalizedNameWords = normalizeKeepSpaces(name).split(' ').filter(Boolean);
      const acronym = buildAcronym(name);
      const compactName = normalizedNameWords.join('');
      // q já vem com os apelidos expandidos. Incluir o texto digitado como "candidato"
      // fazia toda disciplina casar com ele mesmo (nota 1200) e a busca nunca filtrava.
      const candidates = [
        name,
        mat.codigo,
        displayPeriod(mat),
        `${mat.periodo} periodo`,
        buildSearchIndex(mat),
        acronym,
        compactName
      ];
      const termScores = q.split(/\s+/).filter(Boolean).map(term =>
        Math.max(...candidates.map(candidate => scoreSearchText(term, candidate)))
      );
      const score = Math.max(
        ...candidates.map(candidate => scoreSearchText(q, candidate)),
        scoreSearchText(intent.text, name),
        scoreSearchText(intent.text, mat.codigo),
        termScores.length
          ? (termScores.reduce((sum, value) => sum + value, 0) / termScores.length) * (termScores.every(value => value >= 300) ? 1 : 0.5)
          : 0
      );

      return { mat, score, available, hasPre, status: getSubjectStatus(mat), intent };
    })
    .filter(Boolean)
    .filter(item => item.score >= (q.length <= 2 ? 430 : 300))
    .sort((a, b) => b.score - a.score || formatName(a.mat).localeCompare(formatName(b.mat), 'pt-BR'));
}

// Mesmo motor da pesquisa principal (abreviações, apelidos, filtros), restrito às
// disciplinas que a pessoa pode puxar agora. Devolve os códigos em ordem de relevância.
function getPlannerSearchMatches(query) {
  const allowed = new Set(getPlannerAvailableSubjects().filter(passesPlannerFilter).map(d => d.codigo));
  return rankDisciplineSearch(String(query || '').trim())
    .filter(item => allowed.has(item.mat.codigo))
    .map(item => item.mat.codigo);
}
window.getPlannerSearchMatches = getPlannerSearchMatches;

function searchStatusLabel(status) {
  return status === 'passed' ? T('Já cursada') : status === 'eligible' ? T('Puxável') : T('Não puxável');
}

function searchStatusClass(status) {
  return status === 'passed' ? 'search-status-passed' : status === 'eligible' ? 'search-status-eligible' : 'search-status-blocked';
}

// =====================================================================
// Lógica da busca (interface): destaque, chips de filtro, painel, resultados e rolagem até o card.
// =====================================================================
function highlightSearchText(value, rawQuery) {
  const text = String(value || '');
  const intent = parseSearchIntent(rawQuery);
  const terms = String(intent.text || '').trim().split(/\s+/).filter(t => t.length >= 2);
  if (!terms.length) return escapeHTML(text);

  const normalizedText = normalizeStr(text);
  const aliasTerms = String(intent.normalizedText || '').trim().split(/\s+/).filter(t => t.length >= 2);
  const normalizedTerms = [...new Set([...terms, ...aliasTerms].map(t => normalizeStr(t)).filter(Boolean))];
  const ranges = [];
  normalizedTerms.forEach(term => {
    let from = 0;
    while (from < normalizedText.length) {
      const index = normalizedText.indexOf(term, from);
      if (index < 0) break;
      ranges.push([index, index + term.length]);
      from = index + term.length;
    }
  });

  // Se não houver correspondência literal (por exemplo, “fisiolgia”),
  // destaca a palavra mais próxima encontrada no nome.
  if (!ranges.length) {
    const wordRegex = /[\p{L}\p{N}]+/gu;
    let match;
    while ((match = wordRegex.exec(text))) {
      const word = normalizeStr(match[0]);
      if (word.length < 3) continue;
      for (const term of normalizedTerms) {
        if (term.length < 3) continue;
        const distance = levenshteinDistance(term, word);
        const similarity = 1 - distance / Math.max(term.length, word.length);
        const threshold = term.length <= 5 ? 0.74 : 0.68;
        if (similarity >= threshold || (word.startsWith(term) && term.length >= 3)) {
          const normalizedStart = normalizeStr(text.slice(0, match.index)).length;
          ranges.push([normalizedStart, normalizedStart + word.length]);
          break;
        }
      }
    }
  }

  if (!ranges.length) return escapeHTML(text);
  ranges.sort((a, b) => a[0] - b[0]);

  // normalizeStr removes accents and spaces, so build an index from normalized
  // positions back to original characters before wrapping the matching spans.
  const map = [];
  let normalizedPos = 0;
  for (let i = 0; i < text.length; i++) {
    const n = normalizeStr(text[i]);
    if (!n) continue;
    for (let j = 0; j < n.length; j++) map[normalizedPos++] = i;
  }

  const originalRanges = [];
  ranges.forEach(([a, b]) => {
    const start = map[a];
    const endChar = map[Math.max(a, b - 1)];
    if (start === undefined || endChar === undefined) return;
    originalRanges.push([start, endChar + 1]);
  });
  originalRanges.sort((a, b) => a[0] - b[0]);

  let merged = [];
  originalRanges.forEach(r => {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push(r);
  });

  let out = '';
  let cursor = 0;
  merged.forEach(([a, b]) => {
    out += escapeHTML(text.slice(cursor, a));
    out += `<mark class="search-highlight">${escapeHTML(text.slice(a, b))}</mark>`;
    cursor = b;
  });
  out += escapeHTML(text.slice(cursor));
  return out;
}

function searchFilterChipHTML(key, label) {
  return `<button type="button" class="search-filter-chip" data-remove-search-filter="${key}" aria-label="${T('Remover filtro {label}', { label: escapeHTML(label) })}">${escapeHTML(label)}<span aria-hidden="true">×</span></button>`;
}

function renderSearchIntentChips(intent) {
  const chips = [];
  if (intent.filters.periodo !== null) chips.push(searchFilterChipHTML('periodo', T('{n}º período', { n: intent.filters.periodo })));
  if (intent.filters.creditos !== null) chips.push(searchFilterChipHTML('creditos', T('{n} créditos', { n: intent.filters.creditos })));
  if (intent.filters.horas !== null) chips.push(searchFilterChipHTML('horas', `${intent.filters.horas}h`));
  if (intent.filters.status === 'cursada') chips.push(searchFilterChipHTML('status', T('Já cursada')));
  if (intent.filters.status === 'disponivel') chips.push(searchFilterChipHTML('status', T('Puxável')));
  if (intent.filters.status === 'bloqueada') chips.push(searchFilterChipHTML('status', T('Não puxável')));
  if (intent.filters.semPre) chips.push(searchFilterChipHTML('semPre', T('Sem pré-requisito')));
  if (intent.filters.condicionada) chips.push(searchFilterChipHTML('condicionada', T('Escolha condicionada')));
  return chips.length ? `<div class="search-filter-chips" aria-label="${T('Filtros interpretados')}">${chips.join('')}</div>` : '';
}

function removeSearchFilter(raw, key) {
  let text = String(raw || '').normalize('NFC');
  if (key === 'periodo') text = text.replace(/\b\d{1,2}(?:st|nd|rd|th)?\s*term\b/ig, ' ').replace(/\bterm\s*\d{1,2}\b/ig, ' ').replace(/\b\d{1,2}(?:\s*(?:º|°|o))?\s*per[ií]odo\b/ig, ' ').replace(/\bper[ií]odo\s*\d{1,2}\b/ig, ' ').replace(/\b\d{1,2}\s*$/, ' ');
  if (key === 'creditos') text = text.replace(new RegExp(CREDITS_QUERY_RE.source, 'ig'), ' ');
  if (key === 'horas') text = text.replace(new RegExp(HOURS_QUERY_RE.source, 'ig'), ' ');
  if (key === 'status') text = text.replace(new RegExp(STATUS_TEXT_SOURCE, 'ig'), ' ');
  if (key === 'semPre') text = text.replace(/sem\s*(?:pr[eé]-?requisito|pre)\b|sin\s*prerrequisitos?|no\s*prerequisites?/ig, ' ');
  if (key === 'condicionada') text = text.replace(/escolha\s*condicionada|condicionadas?/ig, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

function renderSearchDiscoveryPanel() {
  const suggestions = document.getElementById('search-suggestions');
  if (!suggestions) return;
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(STORAGE_KEYS.searchHistory) || '[]'); } catch (_) { recent = []; }
  recent = Array.isArray(recent) ? recent.filter(code => getDisciplinaByCode(code)).slice(0, 5) : [];
  const recentHTML = recent.length ? `
    <section class="search-discovery-section">
      <div class="search-discovery-heading">${T('Pesquisas recentes')}</div>
      <div class="search-recent-list">${recent.map(code => {
        const mat = getDisciplinaByCode(code);
        return `<button type="button" class="search-recent-item" data-search-code="${escapeHTML(code)}"><span class="search-recent-icon">↗</span><span class="min-w-0"><strong>${escapeHTML(formatName(mat))}</strong><small>${escapeHTML(mat.codigo)} • ${escapeHTML(displayPeriod(mat))}</small></span></button>`;
      }).join('')}</div>
    </section>` : '';
  suggestions.innerHTML = `<div class="search-discovery">${recentHTML}<div class="search-discovery-hint">${T('Digite o nome, código, período, créditos, horas ou um status.')}</div></div>`;
  suggestions.classList.remove('hidden');
}

function filterMainSearch(query) {
  const input = document.getElementById('search-input');
  const suggestions = document.getElementById('search-suggestions');
  const results = document.getElementById('search-results');
  const clearBtn = document.getElementById('clear-search-button');
  const raw = String(query ?? '').trim();
  if (!input || !suggestions || !results || typeof disciplinas === 'undefined') return;

  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !raw);
    clearBtn.setAttribute('aria-hidden', raw ? 'false' : 'true');
  }
  input.removeAttribute('aria-activedescendant');
  window.__searchActiveIndex = -1;

  clearSearchFocus();
  const cards = Array.from(document.querySelectorAll('#accordions-container .subject-card'));
  const accordions = Array.from(document.querySelectorAll('#accordions-container > details'));
  // A busca orienta e destaca; não remove do ecrã os restantes períodos ou disciplinas.
  cards.forEach(card => {
    card.hidden = false;
    card.classList.remove('main-search-match');
  });
  accordions.forEach(group => { group.hidden = false; });

  if (!raw) {
    results.textContent = '';
    renderSearchDiscoveryPanel();
    return;
  }

  const ranked = rankDisciplineSearch(raw);
  const matchCodes = new Set(ranked.map(item => item.mat.codigo));
  cards.forEach(card => {
    if (matchCodes.has(card.dataset.codigo)) card.classList.add('main-search-match');
  });
  // Abre apenas grupos que contenham resultados, mantendo os demais acessíveis.
  const matchingGroups = new Set();
  cards.forEach(card => {
    if (matchCodes.has(card.dataset.codigo)) {
      const group = card.closest('details');
      if (group) matchingGroups.add(group);
    }
  });
  matchingGroups.forEach(group => { group.open = true; });

  const intent = parseSearchIntent(raw);
  const filterOnly = !intent.normalizedText && (
    intent.filters.periodo !== null || intent.filters.creditos !== null ||
    intent.filters.horas !== null || intent.filters.status ||
    intent.filters.semPre || intent.filters.condicionada
  );
  results.textContent = filterOnly
    ? T(ranked.length === 1 ? '{n} resultado com esse filtro' : '{n} resultados com esse filtro', { n: ranked.length })
    : T(ranked.length === 1 ? '{n} resultado' : '{n} resultados', { n: ranked.length });

  if (!ranked.length) {
    suggestions.innerHTML = `${renderSearchIntentChips(intent)}${emptyStateHTML(T('Nenhuma disciplina encontrada.'), T('Tente outro nome, código, período, créditos ou um filtro como “disponíveis”.'), 'search')}`;
    suggestions.classList.remove('hidden');
    return;
  }

  suggestions.innerHTML = `${renderSearchIntentChips(intent)}<div class="search-result-list">${ranked.slice(0, 8).map((item, index) => {
    const mat = item.mat;
    const badge = `<span class="search-status-badge ${searchStatusClass(item.status)}">${searchStatusLabel(item.status)}</span>`;
    return `
      <button id="search-option-${index}" type="button" class="search-suggestion text-left" data-search-code="${escapeHTML(mat.codigo)}" role="option" aria-selected="false">
        <div class="search-suggestion-main">
          <div class="search-suggestion-name"><span>${highlightSearchText(formatName(mat), raw)}</span>${badge}</div>
          <div class="search-suggestion-meta">${escapeHTML(mat.codigo)} • ${escapeHTML(displayPeriod(mat))} • ${escapeHTML(creditsOf(mat))} ${T('créditos')} • ${escapeHTML(hoursOf(mat))}h</div>
        </div>
      </button>`;
  }).join('')}</div>${ranked.length > 8 ? `<p class="search-more-note">${T('Mostrando {shown} de {total}. Continue digitando para refinar.', { shown: 8, total: ranked.length })}</p>` : ''}`;
  suggestions.classList.remove('hidden');
}

// ---- Localizar a disciplina escolhida no planejador ----
let searchFocusTimer = null;
let searchJumpToken = 0;

function clearSearchFocus() {
  window.clearTimeout(searchFocusTimer);
  searchFocusTimer = null;
  searchJumpToken++;
  document.querySelectorAll('#accordions-container .search-focus-target').forEach(el => el.classList.remove('search-focus-target'));
}

// Quem rola a tela inicial é o #home-page (position: fixed + overflow-y: auto), não a janela.
function getScrollParent(el) {
  let node = el?.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

// Rola até deixar o card no centro da área realmente visível: entre a barra de busca
// fixa (sticky) no topo e a navegação inferior.
function scrollCardToCenter(card, behavior) {
  const scroller = getScrollParent(card);
  const wrapper = document.getElementById('search-wrapper');
  const nav = document.getElementById('bottom-nav');
  const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;
  const viewBottom = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;

  let visibleTop = viewTop;
  if (wrapper) {
    const stickyTop = parseFloat(getComputedStyle(wrapper).top) || 0;
    visibleTop = viewTop + stickyTop + wrapper.offsetHeight + 8;
  }
  let visibleBottom = viewBottom;
  if (nav) {
    const navTop = nav.getBoundingClientRect().top;
    if (navTop > viewTop) visibleBottom = Math.min(viewBottom, navTop - 8);
  }
  const rect = card.getBoundingClientRect();
  const delta = (rect.top + rect.height / 2) - (visibleTop + visibleBottom) / 2;

  if (scroller) {
    const max = scroller.scrollHeight - scroller.clientHeight;
    const top = Math.max(0, Math.min(max, scroller.scrollTop + delta));
    scroller.scrollTo({ top, behavior });
    return top;
  }
  const topWin = Math.max(0, window.scrollY + delta);
  window.scrollTo({ top: topWin, behavior });
  return topWin;
}

// Espera a rolagem (suave) parar: a posição fica estável por ~140 ms, com teto de segurança.
function whenScrollSettled(scroller, callback, target) {
  const read = () => (scroller ? scroller.scrollTop : window.scrollY);
  let last = read();
  let lastChange = performance.now();
  const startedAt = lastChange;
  let moved = false;
  const tick = now => {
    const current = read();
    if (current !== last) { last = current; lastChange = now; moved = true; }
    // A rolagem suave pode demorar a começar: só vale "parou" depois que se moveu,
    // chegou ao destino ou esgotou a espera pelo início.
    const arrived = typeof target === 'number' && Math.abs(current - target) <= 1;
    const canSettle = moved || arrived || typeof target !== 'number' || now - startedAt >= 900;
    if ((canSettle && now - lastChange >= 140) || now - startedAt >= 3500) { callback(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function jumpToSubject(codigo) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.searchHistory) || '[]');
    const recent = Array.isArray(stored) ? stored : [];
    localStorage.setItem(STORAGE_KEYS.searchHistory, JSON.stringify([codigo, ...recent.filter(c => c !== codigo)].slice(0, 6)));
  } catch (_) {}

  const card = Array.from(document.querySelectorAll('#accordions-container .subject-card'))
    .find(item => item.dataset.codigo === codigo);
  if (!card) return;

  // Uma nova seleção apaga qualquer destaque anterior (inclusive os contornos da lista de resultados).
  clearSearchFocus();
  const token = searchJumpToken;
  document.querySelectorAll('#accordions-container .main-search-match').forEach(el => el.classList.remove('main-search-match'));

  if (typeof activeBottomTabId !== 'undefined' && activeBottomTabId !== 'home-page' && typeof goToHome === 'function') goToHome();

  const group = card.closest('details');
  const wasClosed = Boolean(group && !group.open);
  document.querySelectorAll('#accordions-container > details').forEach(item => { item.hidden = false; });
  if (group) group.open = true;
  document.querySelectorAll('#accordions-container .subject-card').forEach(item => { item.hidden = false; });

  const input = document.getElementById('search-input');
  const suggestions = document.getElementById('search-suggestions');
  const results = document.getElementById('search-results');
  if (input) {
    input.value = getDisciplinaByCode(codigo)?.nome || codigo;
    const clearBtn = document.getElementById('clear-search-button');
    clearBtn?.classList.remove('hidden');
    clearBtn?.setAttribute('aria-hidden', 'false');
    input.blur();
  }
  if (suggestions) suggestions.classList.add('hidden');
  if (results) results.textContent = T('Disciplina selecionada');

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const behavior = reduced ? 'auto' : 'smooth';
  const highlight = () => {
    if (token !== searchJumpToken) return;           // outra busca começou nesse meio-tempo
    card.classList.remove('search-focus-target');
    void card.offsetWidth;
    card.classList.add('search-focus-target');
    searchFocusTimer = window.setTimeout(() => card.classList.remove('search-focus-target'), 2400);
  };
  const go = () => {
    if (token !== searchJumpToken) return;
    const targetTop = scrollCardToCenter(card, behavior);
    // O destaque começa quando a rolagem termina, para o usuário ver a disciplina já no centro.
    whenScrollSettled(getScrollParent(card), () => highlight(), targetTop);
  };
  // Se o período estava fechado, espera a animação de abertura acabar para medir a posição final.
  if (wasClosed && !reduced) window.setTimeout(go, 420);
  else requestAnimationFrame(go);
}

function clearMainSearch() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search-button');
  if (!input) return;
  input.value = '';
  if (clearBtn) {
    clearBtn.classList.add('hidden');
    clearBtn.setAttribute('aria-hidden', 'true');
  }
  filterMainSearch('');
  input.focus();
}

function initMainSearch() {
  const input = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const clearButton = document.getElementById('clear-search-button');
  const suggestions = document.getElementById('search-suggestions');

  if (!input || !suggestions) return;

  input.setAttribute('autocomplete', 'off');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', 'search-suggestions');
  window.__searchActiveIndex = -1;

  // A busca principal precisa reagir ao mesmo caractere que o usuário acabou de digitar.
  // Não usamos debounce aqui: o conjunto de disciplinas é local e pequeno o bastante
  // para recalcular a ordenação imediatamente, sem a sensação de atraso.
  input.addEventListener('input', e => {
    const value = e.target.value;
    const hasText = Boolean(value.trim());
    clearButton?.classList.toggle('hidden', !hasText);
    clearButton?.setAttribute('aria-hidden', hasText ? 'false' : 'true');
    filterMainSearch(value);
  });

  input.addEventListener('keydown', e => {
    const options = Array.from(suggestions.querySelectorAll('[data-search-code][id^="search-option-"]'));
    if (e.key === 'Escape') {
      e.preventDefault();
      clearMainSearch();
      suggestions.classList.add('hidden');
      return;
    }
    if (!options.length || suggestions.classList.contains('hidden')) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const direction = e.key === 'ArrowDown' ? 1 : -1;
      let next = (Number.isInteger(window.__searchActiveIndex) ? window.__searchActiveIndex : -1) + direction;
      if (next < 0) next = options.length - 1;
      if (next >= options.length) next = 0;
      window.__searchActiveIndex = next;

      options.forEach((option, index) => {
        const active = index === next;
        option.classList.toggle('search-suggestion-active', active);
        option.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      input.setAttribute('aria-activedescendant', `search-option-${next}`);
      options[next].scrollIntoView({ block: 'nearest' });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const index = Number.isInteger(window.__searchActiveIndex) && window.__searchActiveIndex >= 0
        ? window.__searchActiveIndex : 0;
      const option = options[index];
      if (option) {
        jumpToSubject(option.dataset.searchCode);
        return;
      }
      const query = e.currentTarget.value.trim();
      if (query) {
        const first = rankDisciplineSearch(query)[0];
        if (first) jumpToSubject(first.mat.codigo);
      }
    }
  });

  clearButton?.addEventListener('click', clearMainSearch);
  searchButton?.addEventListener('click', () => { input.focus(); if (!input.value.trim()) renderSearchDiscoveryPanel(); });
  input.addEventListener('focus', () => { if (!input.value.trim()) renderSearchDiscoveryPanel(); });

  suggestions.addEventListener('click', e => {
    const recent = e.target.closest('[data-search-code]');
    const removeFilter = e.target.closest('[data-remove-search-filter]');
    if (removeFilter) {
      const next = removeSearchFilter(input.value, removeFilter.dataset.removeSearchFilter);
      input.value = next;
      filterMainSearch(next);
      input.focus();
      return;
    }
    if (recent && recent.dataset.searchCode) {
      jumpToSubject(recent.dataset.searchCode);
    }
  });

  let gesture = null;
  suggestions.addEventListener('pointerdown', e => {
    const button = e.target.closest('[data-search-code]');
    if (button) button.classList.add('search-suggestion-pressed');
    gesture = { x: e.clientX, y: e.clientY };
  });
  const clearSearchPressedState = () => {
    suggestions.querySelectorAll('.search-suggestion-pressed').forEach(el => el.classList.remove('search-suggestion-pressed'));
  };

  suggestions.addEventListener('pointerup', e => {
    if (!gesture) { clearSearchPressedState(); return; }
    const dx = e.clientX - gesture.x;
    const dy = e.clientY - gesture.y;
    const horizontal = Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy);
    const vertical = Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx);
    if (horizontal) {
      const options = Array.from(suggestions.querySelectorAll('[data-search-code][id^="search-option-"]'));
      if (options.length) {
        let next = window.__searchActiveIndex >= 0 ? window.__searchActiveIndex : 0;
        next = dx < 0 ? Math.min(options.length - 1, next + 1) : Math.max(0, next - 1);
        window.__searchActiveIndex = next;
        options.forEach((o, i) => o.classList.toggle('search-suggestion-active', i === next));
        options[next]?.scrollIntoView({ block: 'nearest' });
      }
    } else if (vertical && dy < 0) {
      suggestions.classList.add('search-suggestions-expanded');
    } else if (vertical && dy > 0) {
      suggestions.classList.remove('search-suggestions-expanded');
      if (!input.value.trim()) suggestions.classList.add('hidden');
    }
    gesture = null;
    clearSearchPressedState();
  });
  suggestions.addEventListener('pointercancel', () => { gesture = null; clearSearchPressedState(); });

  // O painel de pesquisa é um scroll independente: quando o dedo está nele,
  // o gesto não deve vazar para a página que fica atrás.
  suggestions.addEventListener('touchmove', e => {
    const touch = e.touches?.[0];
    if (!touch) return;
    if (suggestions.scrollHeight <= suggestions.clientHeight + 1) {
      e.preventDefault();
      return;
    }
    const lastY = Number(suggestions.dataset.touchScrollY || touch.clientY);
    const dy = touch.clientY - lastY;
    suggestions.dataset.touchScrollY = String(touch.clientY);
    const atTop = suggestions.scrollTop <= 0;
    const atBottom = suggestions.scrollTop + suggestions.clientHeight >= suggestions.scrollHeight - 1;
    if ((atTop && dy > 0) || (atBottom && dy < 0)) e.preventDefault();
  }, { passive: false });
  suggestions.addEventListener('touchstart', e => {
    const touch = e.touches?.[0];
    if (touch) suggestions.dataset.touchScrollY = String(touch.clientY);
  }, { passive: true });
  suggestions.addEventListener('touchend', () => { delete suggestions.dataset.touchScrollY; }, { passive: true });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !suggestions.contains(e.target) && !searchButton?.contains?.(e.target) && !clearButton?.contains?.(e.target)) {
      suggestions.classList.add('hidden');
    }
  });
}

// =====================================================================
// Lógica de desfazer: fotos do estado, comparação e aviso com botão Desfazer.
// =====================================================================
// ----------------------------------------------------
// DESFAZER, BACKUP, TUTORIAL, ESTIMATIVA E SINCRONIZAÇÃO
// ----------------------------------------------------
const prefersReducedMotion = () => animationsOff() || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

function snapshotState() {
  return {
    concluded: new Set(appState.concludedCodes),
    planner: new Set(appState.plannerCheckedCodes)
  };
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

function applyStateSnapshot(snapshot) {
  appState.concludedCodes.clear();
  snapshot.concluded.forEach(code => { if (disciplinasPorCodigo.has(code)) appState.concludedCodes.add(code); });
  appState.plannerCheckedCodes.clear();
  snapshot.planner.forEach(code => { if (disciplinasPorCodigo.has(code)) appState.plannerCheckedCodes.add(code); });

  checkboxesPorCodigo.forEach((cb, code) => { cb.checked = appState.concludedCodes.has(code); });
  persistCheckedState();
  persistPlannerCheckedState();
  updateDashboard();
  applySelectedVisualization(appState.concludedCodes);
  if (document.getElementById('planner-obrig-container')) renderPlanner();
}

// =====================================================================
// Busca fixa: barra de pesquisa sempre visível (opção de Acessibilidade).
// =====================================================================
// ---- Barra de pesquisa fixa ----
let fsearchBuilt = false;
const FSEARCH_PLACEHOLDER = { all: 'Pesquisar disciplinas...', available: 'Pesquisar disciplinas puxáveis...', contacts: 'Pesquisar contatos...' };

function buildFixedSearch() {
  if (fsearchBuilt) return;
  fsearchBuilt = true;
  const wrap = document.createElement('div');
  wrap.id = 'fsearch';
  wrap.className = 'fsearch';
  wrap.hidden = true;
  wrap.setAttribute('role', 'search');
  wrap.setAttribute('data-no-tab-swipe', 'true');
  wrap.innerHTML = `
    <div class="fsearch-box">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
      <input id="fsearch-input" class="fsearch-input" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${escapeHTML(T('Pesquisar'))}">
      <button id="fsearch-clear" class="fsearch-clear" type="button" hidden aria-label="${escapeHTML(T('Limpar texto'))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
    </div>
    <div id="fsearch-results" class="fsearch-results" role="listbox" hidden></div>`;
  document.body.appendChild(wrap);
  const input = wrap.querySelector('#fsearch-input');
  const clear = wrap.querySelector('#fsearch-clear');
  input.addEventListener('input', () => { clear.hidden = !input.value; renderFixedSearchResults(); });
  input.addEventListener('focus', renderFixedSearchResults);
  clear.addEventListener('click', () => { input.value = ''; clear.hidden = true; renderFixedSearchResults(); input.focus(); });
  wrap.addEventListener('click', event => {
    const item = event.target.closest('[data-fs-kind]');
    if (!item) return;
    const { fsKind, fsValue } = item.dataset;
    closeFixedSearchResults();
    input.blur();
    if (fsKind === 'subject') openSubjectDetails(fsValue);
    else if (fsKind === 'available') openPlannerDetails(fsValue);
    else if (fsKind === 'contact') { openContactsPage(); selectContatoSearch(fsValue); }
  });
  document.addEventListener('pointerdown', event => {
    if (!wrap.contains(event.target)) closeFixedSearchResults();
  }, true);
  input.addEventListener('keydown', event => { if (event.key === 'Escape') { closeFixedSearchResults(); input.blur(); } });
}
function closeFixedSearchResults() {
  const box = document.getElementById('fsearch-results');
  if (box) { box.hidden = true; box.innerHTML = ''; }
}

function fsearchSubjectMatches(query, pool) {
  const tokens = normalizeKeepSpaces(query).split(' ').filter(Boolean);
  if (!tokens.length) return [];
  const allowed = pool ? new Set(pool.map(d => d.codigo)) : null;
  const ranked = rankDisciplineSearch(tokens.join(' ')) || [];
  return ranked
    .filter(r => r.score >= 520 && (!allowed || allowed.has(r.mat.codigo)))
    .filter(r => {
      const hay = normalizeKeepSpaces(formatName(r.mat) + ' ' + r.mat.nome + ' ' + r.mat.codigo);
      return tokens.every(t => t.length < 3 || hay.includes(t) || (t.length >= 6 && r.score >= 700));
    })
    .slice(0, 8).map(r => r.mat);
}
function fsearchContactMatches(query) {
  const val = normalizeKeepSpaces(query);
  if (!val) return [];
  const all = [];
  contatosImportantes.forEach(g => g.professores.forEach(p => all.push({ ...p, grupo: g.nome })));
  return all
    .map(p => ({ p, score: Math.max(scoreSearchText(val, p.nome), scoreSearchText(val, p.email)) }))
    .filter(item => item.score >= (val.length <= 2 ? 430 : 300))
    .sort((a, b) => b.score - a.score || a.p.nome.localeCompare(b.p.nome, 'pt-BR'))
    .slice(0, 8).map(item => item.p);
}
function renderFixedSearchResults() {
  const box = document.getElementById('fsearch-results');
  const input = document.getElementById('fsearch-input');
  if (!box || !input) return;
  const scope = getFixedSearchScope();
  input.placeholder = T(FSEARCH_PLACEHOLDER[scope]);
  const q = input.value.trim();
  let html = '';
  if (scope === 'contacts') {
    if (!q) { closeFixedSearchResults(); return; }
    const list = fsearchContactMatches(q);
    html = list.length ? list.map(p => `<button type="button" class="fsearch-item" data-fs-kind="contact" data-fs-value="${escapeHTML(p.nome)}"><span class="fsearch-item-main"><strong>${escapeHTML(p.nome)}</strong><small>${escapeHTML(p.email || p.grupo || '')}</small></span></button>`).join('') : `<p class="fsearch-empty">${escapeHTML(T('Nenhum professor encontrado.'))}</p>`;
  } else {
    const pool = scope === 'available' ? getPlannerAvailableSubjects() : null;
    let list = q ? fsearchSubjectMatches(q, pool) : (pool ? pool.slice(0, 8) : []);
    if (!q && !pool) { closeFixedSearchResults(); return; }
    const kind = scope === 'available' ? 'available' : 'subject';
    html = list.length ? list.map(m => `<button type="button" class="fsearch-item" data-fs-kind="${kind}" data-fs-value="${escapeHTML(m.codigo)}"><span class="fsearch-item-main"><strong>${escapeHTML(formatName(m))}</strong><small>${escapeHTML(m.codigo)} · ${escapeHTML(periodIsCond(m.periodo) ? T('Escolha Condicionada') : T('{n}º Período', { n: m.periodo }))}</small></span></button>`).join('') : `<p class="fsearch-empty">${escapeHTML(T('Nenhuma disciplina encontrada'))}</p>`;
  }
  box.innerHTML = html;
  box.hidden = false;
}
function applyFixedSearch() {
  const on = getFixedSearchOn();
  document.documentElement.classList.toggle('has-fsearch', on);
  if (on) buildFixedSearch();
  const wrap = document.getElementById('fsearch');
  if (wrap) wrap.hidden = !on;
  if (!on) closeFixedSearchResults();
  else renderFixedSearchResults();
}
function initAccessibilitySettings() {
  applyNoAnim(readSetting(A11Y_KEYS.noAnim) === '1');
  applyFixedSearch();
  updateA11yUI();
}

// =====================================================================
// Seção: planejador-busca-local
// =====================================================================
/* planejador-busca-local.js — busca da aba "O que puxar?": filtra os cards, mostra a contagem e leva até a disciplina.
 * (Antes ficava dentro do index.html.) */
(() => {
  const input = document.getElementById('planner-search-input');
  const clear = document.getElementById('planner-search-clear');
  const results = document.getElementById('planner-search-results');
  const empty = document.getElementById('planner-search-empty');
  const planner = document.getElementById('modal-planner');
  if (!input || !planner) return;

  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  const containers = () => ['planner-obrig-container', 'planner-cond-container'].map(id => document.getElementById(id)).filter(Boolean);

  function updatePlannerMetrics() {
    const cards = planner.querySelectorAll('.planner-card');
    const selected = planner.querySelectorAll('.planner-card input[type="checkbox"]:checked').length;
    const totalSelected = document.getElementById('planner-total-selected');
    const totalAvailable = document.getElementById('planner-total-available');
    if (totalSelected) totalSelected.textContent = String(selected);
    if (totalAvailable) totalAvailable.textContent = String(cards.length);
    const obrigCount = document.getElementById('planner-obrig-group-count');
    const condCount = document.getElementById('planner-cond-group-count');
    if (obrigCount) obrigCount.textContent = String(document.querySelectorAll('#planner-obrig-container .planner-card').length);
    if (condCount) condCount.textContent = String(document.querySelectorAll('#planner-cond-container .planner-card').length);
  }

  function filterPlanner() {
    const query = normalize(input.value);
    const cards = [...planner.querySelectorAll('.planner-card')];
    const ordered = query && typeof window.getPlannerSearchMatches === 'function' ? window.getPlannerSearchMatches(input.value) : [];
    const matchSet = new Set(ordered);
    planner._plannerMatchOrder = ordered;
    let matches = 0;
    cards.forEach(card => {
      const matched = Boolean(query && matchSet.has(card.dataset.codigo));
      card.hidden = false;
      card.classList.toggle('planner-search-match', matched);
      if (matched) matches++;
    });
    containers().forEach(container => {
      const group = container.closest('details');
      const groupHasMatch = [...container.querySelectorAll('.planner-card')].some(card => card.classList.contains('planner-search-match'));
      if (query && groupHasMatch && group) group.open = true;
      container.querySelectorAll(':scope > div:not(.planner-card)').forEach(state => { state.hidden = Boolean(query); });
    });
    clear.hidden = !input.value;
    empty.hidden = !(query && matches === 0);
    results.textContent = query
      ? T(matches === 1 ? '{n} disciplina encontrada' : '{n} disciplinas encontradas', { n: matches })
      : T(cards.length === 1 ? '{n} disciplina disponível' : '{n} disciplinas disponíveis', { n: cards.length });
    updatePlannerMetrics();
  }

  input.addEventListener('input', filterPlanner);
  clear.addEventListener('click', () => {
    input.value = '';
    filterPlanner();
    input.focus();
  });
  planner.addEventListener('change', event => {
    if (event.target.matches('.planner-card input[type="checkbox"]')) updatePlannerMetrics();
  });
  function focusPlannerCard(card) {
    if (!card) return;
    card.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    planner.querySelectorAll('.planner-search-highlight').forEach(item => item.classList.remove('planner-search-highlight'));
    card.classList.add('planner-search-highlight');
    window.clearTimeout(card._plannerHighlightTimer);
    card._plannerHighlightTimer = window.setTimeout(() => card.classList.remove('planner-search-highlight'), 1500);
  }
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const bestCode = (planner._plannerMatchOrder || [])[0];
    const firstMatch = [...planner.querySelectorAll('.planner-card')].find(card => card.dataset.codigo === bestCode)
      || [...planner.querySelectorAll('.planner-card')].find(card => card.classList.contains('planner-search-match'));
    if (firstMatch) { event.preventDefault(); focusPlannerCard(firstMatch); }
  });
  planner.addEventListener('click', event => {
    const card = event.target.closest('.planner-card');
    if (card && event.target.closest('.planner-subject-name')) focusPlannerCard(card);
  });

  // ---- Sugestões em tempo real (mesma lógica da pesquisa principal, só disciplinas puxáveis) ----
  const sugg = document.getElementById('planner-search-suggestions');
  let suggIndex = -1;
  const hideSugg = () => { sugg.classList.add('hidden'); suggIndex = -1; input.setAttribute('aria-expanded', 'false'); };
  function renderSugg() {
    const raw = input.value.trim();
    if (!raw) { hideSugg(); return; }
    const codes = typeof window.getPlannerSearchMatches === 'function' ? window.getPlannerSearchMatches(raw) : [];
    suggIndex = -1;
    if (!codes.length) {
      sugg.innerHTML = '<p class="search-more-note">' + T('Nenhuma disciplina disponível com esse nome.') + '</p>';
    } else {
      sugg.innerHTML = '<div class="search-result-list">' + codes.slice(0, 6).map((code, i) => {
        const mat = getDisciplinaByCode(code);
        return `<button id="planner-option-${i}" type="button" class="search-suggestion text-left" role="option" aria-selected="false" data-planner-code="${escapeHTML(code)}">
          <div class="search-suggestion-main">
            <div class="search-suggestion-name"><span>${highlightSearchText(formatName(mat), raw)}</span></div>
            <div class="search-suggestion-meta">${escapeHTML(mat.codigo)} • ${escapeHTML(displayPeriod(mat))} • ${escapeHTML(creditsOf(mat))} ${T('créditos')} • ${escapeHTML(hoursOf(mat))}h</div>
          </div></button>`;
      }).join('') + '</div>' + (codes.length > 6 ? `<p class="search-more-note">${T('Mostrando {shown} de {total}. Continue digitando para refinar.', { shown: 6, total: codes.length })}</p>` : '');
    }
    sugg.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
  }
  function pickSugg(code) {
    const mat = getDisciplinaByCode(code);
    if (!mat) return;
    input.value = formatName(mat);
    filterPlanner();
    hideSugg();
    const card = planner.querySelector(`.planner-card[data-codigo="${code}"]`);
    const group = card?.closest('details');
    if (group) group.open = true;
    window.setTimeout(() => focusPlannerCard(card), 60);
  }
  input.addEventListener('input', renderSugg);
  input.addEventListener('focus', () => {
    input.closest('.planner-search-section')?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (input.value.trim()) renderSugg();
  });
  sugg.addEventListener('pointerdown', event => { if (event.target.closest('.search-suggestion')) event.preventDefault(); });
  sugg.addEventListener('click', event => {
    const btn = event.target.closest('[data-planner-code]');
    if (btn) pickSugg(btn.dataset.plannerCode);
  });
  input.addEventListener('keydown', event => {
    const opts = [...sugg.querySelectorAll('.search-suggestion')];
    if (sugg.classList.contains('hidden') || !opts.length) { if (event.key === 'Escape') hideSugg(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      suggIndex = (suggIndex + (event.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
      opts.forEach((o, i) => { o.classList.toggle('search-suggestion-active', i === suggIndex); o.setAttribute('aria-selected', String(i === suggIndex)); });
      opts[suggIndex].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault(); event.stopImmediatePropagation();
      pickSugg((opts[suggIndex >= 0 ? suggIndex : 0]).dataset.plannerCode);
    } else if (event.key === 'Escape') hideSugg();
  }, true);
  clear.addEventListener('click', hideSugg);
  document.addEventListener('click', event => { if (!sugg.contains(event.target) && event.target !== input) hideSugg(); });

  const observer = new MutationObserver(() => {
    updatePlannerMetrics();
    filterPlanner();
  });
  containers().forEach(container => observer.observe(container, { childList: true, subtree: true }));

  // Recalcula depois da renderização acionada pela navegação original.
  document.getElementById('bottom-nav-planner')?.addEventListener('click', () => setTimeout(() => {
    updatePlannerMetrics();
    filterPlanner();
  }, 0));
  updatePlannerMetrics();
})();
  
