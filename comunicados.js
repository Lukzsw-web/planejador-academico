/* comunicados.js — Aba Comunicados (a área da equipe é carregada só quando alguém a abre: comunicados-equipe.js).
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Seção: comunicados-lista
// =====================================================================
/* Comunicados — lista pública (somente leitura) vinda do Supabase.
 * Usa apenas a chave publishable, que é pública por desenho; quem decide o que cada pessoa vê é o RLS do banco.
 * Não envia a chave no cabeçalho Authorization (chaves sb_publishable_ não são JWT).
 * A última lista carregada fica no aparelho para funcionar sem conexão.
 * Todo texto vindo do banco entra na página via textContent (nunca innerHTML). */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://tbmjgnaaehyqbridlqil.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_IyDFk6pjE3jEmgc2tVBTZQ_GUD1nDmP';
  // autor_id fica de fora de propósito: o acesso anônimo a essa coluna é revogado no banco.
  const COLUMNS = ['id', 'titulo', 'mensagem', 'categoria', 'prioridade', 'status', 'fixado', 'link_url',
    'autor_nome', 'origem', 'criado_em', 'atualizado_em', 'publicar_em', 'publicado_em', 'validade'];
  const CACHE_KEY = 'planejador_comunicados_v1';
  const TIMEOUT_MS = 10000;
  const STALE_MS = 60000;
  const MAX_ITEMS = 60;
  const CATS = { disciplinas: 'Disciplinas', eventos: 'Eventos', inscricoes: 'Inscrições', oportunidades: 'Oportunidades', avisos: 'Avisos', geral: 'Geral' };
  const PRIOS = { urgente: 'Urgente', importante: 'Importante' };

  const tr = (s, p) => (typeof T === 'function' ? T(s, p) : s);
  const $ = id => document.getElementById(id);
  const state = { items: [], loadedAt: 0, loading: false, online: null, filter: 'all', fromCache: false, savedAt: 0 };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function str(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }
  function iso(v) { return typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null; }

  // Aceita só o formato esperado; qualquer campo estranho é descartado.
  function clean(row) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string') return null;
    const titulo = str(row.titulo, 180), mensagem = str(row.mensagem, 20000);
    if (!titulo || !mensagem) return null;
    // Só publicado e agendado interessam ao público; qualquer outra coisa é descartada aqui também.
    if (row.status !== 'publicado' && row.status !== 'agendado') return null;
    return {
      id: row.id.slice(0, 64), titulo, mensagem,
      categoria: CATS[row.categoria] ? row.categoria : 'geral',
      prioridade: PRIOS[row.prioridade] ? row.prioridade : 'normal',
      status: row.status,
      fixado: row.fixado === true,
      link_url: safeLink(row.link_url),
      autor_nome: str(row.autor_nome, 120), origem: str(row.origem, 120),
      criado_em: iso(row.criado_em), atualizado_em: iso(row.atualizado_em),
      publicar_em: iso(row.publicar_em), publicado_em: iso(row.publicado_em), validade: iso(row.validade)
    };
  }

  function safeLink(u) {
    if (typeof u !== 'string' || u.length > 2000) return null;
    try { const x = new URL(u); return x.protocol === 'https:' ? x.href : null; } catch (_) { return null; }
  }

  // Mesma regra da política do banco, repetida aqui para a lista guardada no aparelho não mostrar aviso vencido.
  function isVisible(c, now) {
    const okStatus = c.status === 'publicado' || (c.status === 'agendado' && c.publicar_em && Date.parse(c.publicar_em) <= now);
    return okStatus && (!c.validade || Date.parse(c.validade) > now);
  }
  function when(c) { return c.status === 'agendado' ? c.publicar_em : (c.publicado_em || c.publicar_em || c.criado_em); }
  function sorted(items) {
    return items.slice().sort((a, b) => (b.fixado - a.fixado) || ((Date.parse(when(b)) || 0) - (Date.parse(when(a)) || 0)));
  }

  function fmt(isoStr) {
    if (!isoStr) return '';
    const lang = document.documentElement.lang || 'pt-BR';
    try {
      return new Intl.DateTimeFormat(lang, { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(isoStr));
    } catch (_) { return ''; }
  }

  function readCache() {
    try {
      const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!raw || !Array.isArray(raw.items)) return null;
      return { savedAt: Number(raw.savedAt) || 0, items: raw.items.map(clean).filter(Boolean).slice(0, MAX_ITEMS) };
    } catch (_) { return null; }
  }
  function writeCache(items) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items })); } catch (_) {}
  }

  async function fetchRemote() {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : null;
    try {
      const q = 'select=' + COLUMNS.join(',') + '&order=fixado.desc,criado_em.desc&limit=' + MAX_ITEMS;
      const res = await fetch(SUPABASE_URL + '/rest/v1/comunicados?' + q, {
        method: 'GET', headers: { apikey: SUPABASE_KEY, Accept: 'application/json' }, signal: ctl ? ctl.signal : undefined, cache: 'no-store'
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('formato inesperado');
      return data.map(clean).filter(Boolean);
    } finally { if (timer) clearTimeout(timer); }
  }

  async function load(force) {
    if (state.loading) return;
    if (!force && state.loadedAt && Date.now() - state.loadedAt < STALE_MS) return;
    state.loading = true; render();
    try {
      state.items = await fetchRemote();
      state.online = true; state.fromCache = false; state.loadedAt = Date.now(); state.savedAt = Date.now();
      writeCache(state.items);
    } catch (_) {
      state.online = false;
      if (!state.items.length) { const c = readCache(); if (c) { state.items = c.items; state.savedAt = c.savedAt; state.fromCache = true; } }
      else state.fromCache = true;
    } finally { state.loading = false; render(); }
  }

  // Código de disciplina escrito no aviso (ex.: BQM101) vira o nome da disciplina (ex.: Bioquímica I).
  // Só troca códigos que existem no cadastro; o código original fica no title do trecho trocado.
  const CODE_RE = /\b(?=[A-Za-z0-9]*\d)[A-Za-z]{3}[A-Za-z0-9]{3}\b/g;
  function codeName(code) {
    try { const d = typeof getDisciplinaByCode === 'function' ? getDisciplinaByCode(String(code).toUpperCase()) : null; return d && d.nome ? d.nome : null; } catch (_) { return null; }
  }
  const plain = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  function appendRich(node, text, ctr) {
    let last = 0, m;
    CODE_RE.lastIndex = 0;
    while ((m = CODE_RE.exec(text))) {
      const name = codeName(m[0]);
      if (!name) continue;
      const start = m.index, end = start + m[0].length;
      // "Nome (CÓDIGO)": já tem o nome por perto, mantém como está.
      if (text.slice(Math.max(0, start - name.length - 2), start).toLowerCase() === (name + ' (').toLowerCase() && text[end] === ')') continue;
      let skipTo = end;
      // "CÓDIGO (Nome)": evita repetir o nome.
      const par = /^\s*\(\s*([^)]{1,120})\)/.exec(text.slice(end));
      if (par && plain(par[1]) === plain(name)) skipTo = end + par[0].length;
      if (start > last) node.appendChild(document.createTextNode(text.slice(last, start)));
      const span = el('span', 'com-disc', name); span.title = m[0].toUpperCase();
      if (ctr) span.style.setProperty('--i', String(ctr.i++));
      node.appendChild(span);
      last = skipTo; CODE_RE.lastIndex = skipTo;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
  }

  // Dia, mês e hora sempre no horário de Brasília (o ano só aparece quando não é o ano atual).
  function dateParts(isoStr) {
    const d = new Date(isoStr); if (Number.isNaN(d.getTime())) return null;
    try {
      const lang = document.documentElement.lang || 'pt-BR', p = {};
      const f = (o) => new Intl.DateTimeFormat(lang, Object.assign({ timeZone: 'America/Sao_Paulo' }, o)).formatToParts(d).forEach(x => { p[x.type] = x.value; });
      f({ day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
      const nowYear = new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date());
      return { day: String(parseInt(p.day, 10)), mon: String(p.month || '').replace('.', ''), year: p.year !== nowYear ? p.year : '', time: (p.hour || '') + ':' + (p.minute || '') };
    } catch (_) { return null; }
  }

  const PIN_SVG = ['M9 3.5h6l-1 5 3 3v1.5h-5v6.5l-1 1-1-1V13H5v-1.5l3-3z'];
  function pinIcon() {
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'currentColor'); svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(ns, 'path'); p.setAttribute('d', PIN_SVG[0]); svg.appendChild(p); return svg;
  }

  function card(c) {
    const art = el('article', 'com-card' + (c.prioridade !== 'normal' ? ' com-' + c.prioridade : '') + (c.fixado ? ' is-pinned' : ''));
    const when_ = when(c), dp = dateParts(when_);
    if (c.fixado) { const pin = el('span', 'com-pin'); pin.title = tr('Fixado'); pin.appendChild(pinIcon()); pin.appendChild(el('span', 'com-sr', tr('Fixado'))); art.appendChild(pin); }
    const date = el('time', 'com-date');
    if (dp) {
      date.setAttribute('datetime', when_); date.setAttribute('aria-label', fmt(when_));
      date.appendChild(el('span', 'com-day', dp.day)); date.appendChild(el('span', 'com-mon', dp.mon));
      if (dp.year) date.appendChild(el('span', 'com-yr', dp.year));
      if (dp.time) date.appendChild(el('span', 'com-time', dp.time));
    }
    art.appendChild(date);
    const main = el('div', 'com-main'), ctr = { i: 0 };
    const h3 = el('h3', 'com-title'); appendRich(h3, c.titulo, ctr); main.appendChild(h3);
    const body = el('div', 'com-body');
    c.mensagem.split(/\n{1,}/).forEach(line => { if (line.trim()) { const p = el('p'); appendRich(p, line, ctr); body.appendChild(p); } });
    main.appendChild(body);
    if (c.link_url) {
      const a = el('a', 'com-link', tr('Abrir link'));
      a.href = c.link_url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      main.appendChild(a);
    }
    const foot = el('p', 'com-foot');
    if (PRIOS[c.prioridade]) foot.appendChild(el('span', 'com-flag', tr(PRIOS[c.prioridade])));
    if (c.origem) foot.appendChild(el('span', '', c.origem));
    foot.appendChild(el('span', '', tr(CATS[c.categoria])));
    main.appendChild(foot);
    art.appendChild(main);
    return art;
  }

  function emptyState(title, text) {
    const box = el('div', 'comunicados-empty');
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
    ['M3.5 10.2v3.6a1 1 0 0 0 1 1h2.3l5.2 3.9a.6.6 0 0 0 1-.5V5.8a.6.6 0 0 0-1-.5L6.8 9.2H4.5a1 1 0 0 0-1 1z', 'M16.6 9.2a4 4 0 0 1 0 5.6', 'M19.2 6.6a7.7 7.7 0 0 1 0 10.8'].forEach(d => {
      const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); svg.appendChild(p);
    });
    box.appendChild(svg); box.appendChild(el('strong', '', title)); box.appendChild(el('span', '', text));
    return box;
  }

  function render() {
    const list = $('comunicados-list'); if (!list) return;
    const status = $('comunicados-status'), filters = $('comunicados-filters'), btn = $('comunicados-refresh');
    const now = Date.now();
    const visible = sorted(state.items.filter(c => isVisible(c, now)));
    if (btn) { btn.disabled = state.loading; btn.setAttribute('aria-busy', state.loading ? 'true' : 'false'); }

    if (status) {
      let msg = '';
      if (state.loading) msg = tr('Atualizando…');
      else if (state.online === false) msg = state.items.length ? tr('Sem conexão. Mostrando a última lista salva.') : tr('Não foi possível carregar os comunicados agora.');
      else if (state.online) msg = tr('Atualizado às {hora}.', { hora: new Intl.DateTimeFormat(document.documentElement.lang || 'pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(state.savedAt)) });
      status.textContent = msg;
      status.classList.toggle('is-warn', state.online === false);
    }

    if (filters) {
      filters.textContent = '';
      const present = Object.keys(CATS).filter(k => visible.some(c => c.categoria === k));
      if (present.length > 1) {
        [['all', 'Todos']].concat(present.map(k => [k, CATS[k]])).forEach(([k, label]) => {
          const b = el('button', 'com-chip' + (state.filter === k ? ' is-on' : ''), tr(label));
          b.type = 'button'; b.dataset.comFilter = k; b.setAttribute('aria-pressed', state.filter === k ? 'true' : 'false');
          filters.appendChild(b);
        });
      } else state.filter = 'all';
    }

    list.textContent = '';
    const shown = state.filter === 'all' ? visible : visible.filter(c => c.categoria === state.filter);
    if (shown.length) {
      shown.forEach(c => list.appendChild(card(c)));
      if (!state.loading && !state.drawn) { state.drawn = true; list.classList.add('draw'); setTimeout(() => list.classList.remove('draw'), 3000); }
      return;
    }
    if (state.loading) { list.appendChild(emptyState(tr('Carregando comunicados…'), tr('Só um instante.'))); return; }
    if (state.online === false && !state.items.length) list.appendChild(emptyState(tr('Sem conexão'), tr('Conecte-se à internet e toque em Atualizar para ver os comunicados.')));
    else list.appendChild(emptyState(tr('Nenhum comunicado por aqui ainda'), tr('Quando a coordenação publicar um aviso, ele aparece nesta aba.')));
  }

  let staffLoading = null;
  function openStaff() {
    const run = () => window.ComunicadosAdmin && window.ComunicadosAdmin.open();
    if (window.ComunicadosAdmin) return run();
    if (!staffLoading) {
      staffLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'js/comunicados-equipe.js'; s.onload = resolve; s.onerror = () => { staffLoading = null; reject(new Error('load')); };
        document.head.appendChild(s);
      });
    }
    staffLoading.then(run).catch(() => { const st = $('comunicados-status'); if (st) { st.textContent = tr('Não foi possível abrir a área da equipe agora.'); st.classList.add('is-warn'); } });
  }

  function init() {
    const c = readCache();
    if (c) { state.items = c.items; state.savedAt = c.savedAt; state.fromCache = true; }
    $('comunicados-refresh')?.addEventListener('click', () => load(true));
    $('com-staff-open')?.addEventListener('click', openStaff);
    $('comunicados-filters')?.addEventListener('click', e => {
      const b = e.target.closest('[data-com-filter]'); if (!b) return;
      state.filter = b.dataset.comFilter; render();
    });
    window.addEventListener('online', () => { if ($('modal-comunicados')?.classList.contains('bottom-tab-current')) load(true); });
    render();
  }

  window.Comunicados = { cfg: { url: SUPABASE_URL, key: SUPABASE_KEY, columns: COLUMNS }, CATS, PRIOS, clean, card, appendRich, fmt, show() { state.drawn = false; render(); load(false); }, refresh: () => load(true), _state: state, _clean: clean, _isVisible: isVisible };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
