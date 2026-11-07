/* app.js — Base do app: constantes/versão e utilidades gerais.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Seção: app
// =====================================================================

const STORAGE_KEYS = {
  checked: 'farma_checked_v4',
  plannerChecked: 'planner_checked_v1',
  theme: 'theme',
  searchHistory: 'planejador-search-history',
  onboarded: 'planejador_onboarded_v1'
};
const PERIODO_COND = 'Escolha Condicionada';
// ÚNICA fonte da versão do site: index.html, sw.js e o botão "Verificar atualização" leem daqui.
const APP_VERSION = '1.9.9';
const T = (key, params) => (window.I18N ? window.I18N.t(key, params) : String(key).replace(/\{(\w+)\}/g, (m, k) => (params && k in params ? params[k] : m)));
const META_COND_CRED = 12;
const META_COND_HORAS = 180;

// Regras do SIGA para a carga de um período.
const SIGA_MIN_CRED = 6;
const SIGA_MAX_CRED = 32;
const html = document.documentElement;
let timerLongPress = null;
let activeModalCount = 0;

// =====================================================================
// Seção: utilidades
// =====================================================================
/* utilidades.js — Utilidades gerais: texto, armazenamento, nomes/períodos e índices das disciplinas.
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Utilidades gerais: normalização de texto, leitura/escrita segura do localStorage, nomes e períodos, e os índices de disciplinas por código.
// =====================================================================
const normalizeStr = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();

// Igual à anterior, mas preserva (um único) espaço entre as palavras.
// A busca precisa das palavras separadas para comparar termo a termo e montar siglas.
const normalizeKeepSpaces = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const STOPWORDS_SIGLA = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'ao', 'as', 'o', 'os', 'na', 'no', 'nas', 'nos', 'para', 'com']);

// "Química Farmacêutica e Medicinal I" -> "qfmi"
function buildAcronym(text) {
  return normalizeKeepSpaces(text)
    .replace(/[()&]/g, ' ')
    .split(' ')
    .filter(word => word && !STOPWORDS_SIGLA.has(word))
    .map(word => word[0])
    .join('');
}

const loadJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const saveJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('Não foi possível salvar.', error);
    showStorageErrorToast(T('Não foi possível salvar suas alterações neste dispositivo.'));
    return false;
  }
};

function formatName(mat) {
  return mat.nome + (typeof disciplinaAjustes !== 'undefined' && disciplinaAjustes[mat.codigo] ? disciplinaAjustes[mat.codigo] : '');
}

function displayPeriod(mat) {
  return mat.periodo === PERIODO_COND ? T('Escolha Condicionada') : T('{n}º Período', { n: mat.periodo });
}

function extractCodes(str) {
  return str ? (str.match(/[A-Z]{3}[A-Z0-9]{3}|MACF/g) || []) : [];
}

// Índices internos de desempenho. Não alteram nem duplicam a fonte de dados;
// apenas evitam buscas repetidas por toda a lista de disciplinas.
const disciplinasPorCodigo = new Map();
const preRequisitosPorCodigo = new Map();
const corequisitosPorCodigo = new Map();
const dependentesPorCodigo = new Map();
const buscaIndexPorCodigo = new Map();

function inicializarIndicesDisciplinas() {
  if (typeof disciplinas === 'undefined' || !Array.isArray(disciplinas)) return;

  disciplinasPorCodigo.clear();
  preRequisitosPorCodigo.clear();
  corequisitosPorCodigo.clear();
  dependentesPorCodigo.clear();
  buscaIndexPorCodigo.clear();

  disciplinas.forEach(d => {
    disciplinasPorCodigo.set(d.codigo, d);
    preRequisitosPorCodigo.set(d.codigo, extractCodes(d.pre));
    corequisitosPorCodigo.set(d.codigo, extractCodes(d.co));
    if (!dependentesPorCodigo.has(d.codigo)) dependentesPorCodigo.set(d.codigo, new Set());
  });

  disciplinas.forEach(d => {
    const relacionados = [
      ...preRequisitosPorCodigo.get(d.codigo),
      ...corequisitosPorCodigo.get(d.codigo)
    ];
    relacionados.forEach(codigo => {
      if (!dependentesPorCodigo.has(codigo)) dependentesPorCodigo.set(codigo, new Set());
      dependentesPorCodigo.get(codigo).add(d.codigo);
    });
  });
}

function getDisciplinaByCode(codigo) {
  return disciplinasPorCodigo.get(codigo) || null;
}

inicializarIndicesDisciplinas();

function periodIsCond(periodo) {
  return periodo === PERIODO_COND;
}

function creditsOf(mat) {
  return mat.cred || 4;
}

function hoursOf(mat) {
  return mat.ch || creditsOf(mat) * 15;
}

// Totais do curso (usam as funções acima, por isso ficam aqui e não no app.js).
// Usado só na estimativa de conclusão mostrada nos ajustes (não é regra do curso).

const TOTAL_OBRIG_CRED = (typeof disciplinas !== 'undefined' ? disciplinas : [])
  .filter(d => !periodIsCond(d.periodo))
  .reduce((sum, d) => sum + creditsOf(d), 0);
const TOTAL_GRAD_CRED_EQUIV = TOTAL_OBRIG_CRED + META_COND_CRED;

let totalObrig = (typeof disciplinas !== 'undefined' ? disciplinas : []).filter(d => !periodIsCond(d.periodo)).length;
let totalCond = (typeof disciplinas !== 'undefined' ? disciplinas : []).filter(d => periodIsCond(d.periodo)).length;
