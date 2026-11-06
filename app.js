
const STORAGE_KEYS = {
  checked: 'farma_checked_v4',
  plannerChecked: 'planner_checked_v1',
  theme: 'theme',
  searchHistory: 'planejador-search-history',
  onboarded: 'planejador_onboarded_v1'
};
const PERIODO_COND = 'Escolha Condicionada';
// ÚNICA fonte da versão do site: index.html, sw.js e o botão "Verificar atualização" leem daqui.
const APP_VERSION = '1.9.7';
const T = (key, params) => (window.I18N ? window.I18N.t(key, params) : String(key).replace(/\{(\w+)\}/g, (m, k) => (params && k in params ? params[k] : m)));
const META_COND_CRED = 12;
const META_COND_HORAS = 180;

// Regras do SIGA para a carga de um período.
const SIGA_MIN_CRED = 6;
const SIGA_MAX_CRED = 32;
const html = document.documentElement;
let timerLongPress = null;
let activeModalCount = 0;
