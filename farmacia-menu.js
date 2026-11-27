/* =========================================================
   Menu lateral da FarmacIA (v0.7.1): Biblioteca, Agenda, Grade atual, Nova conversa e perfil.
   - Biblioteca: imagens enviadas à FarmacIA, guardadas só neste aparelho (IndexedDB). Cada imagem abre em tela
     cheia com o mesmo menu flutuante do editor: localizar na conversa, compartilhar e baixar.
   - Grade atual: o aluno informa as disciplinas que está cursando (sugestões a partir do cadastro, que aqui só é lido).
   - FarmaMenu.dados() entrega grade e anotações da agenda para a FarmacIA responder a partir deles (tudo local).
   ========================================================= */
(function () {
  'use strict';
  var doc = document, win = window;
  var GRADE_KEY = 'planejador_grade_atual_v1';
  var FOTO_KEY = 'planejador_foto_v1';

  function T(x) { return typeof win.T === 'function' ? win.T(x) : x; }
  function mk(tag, cls, attrs) {
    var el = doc.createElement(tag); if (cls) el.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
  function ico(d, fill) {
    return '<svg viewBox="0 0 24 24" fill="' + (fill || 'none') + '" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
  }
  function toast(msg) { if (typeof win.showToast === 'function') win.showToast({ text: msg }); }
  function semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function ler(k) { try { return win.localStorage.getItem(k); } catch (_) { return null; } }
  function gravar(k, v) { try { win.localStorage.setItem(k, v); return true; } catch (_) { return false; } }

  var I = {
    album: '<rect x="3" y="8" width="12.5" height="13" rx="2.2"></rect><path d="M3 18.2l3.6-3.6 2.8 2.8 1.8-1.8 3.9 3.9"></path><circle cx="17" cy="7.5" r="3.7"></circle><path d="M19.8 10.3l2.4 2.4"></path>',
    agenda: '<rect x="5.2" y="3.4" width="14" height="17.2" rx="2"></rect><path d="M3 7.6h2.2M3 12h2.2M3 16.4h2.2"></path><path d="M9.6 8.2h6M9.6 12h6M9.6 15.8h3.4"></path>',
    calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.4"></rect><path d="M3.5 10h17M8 3v4M16 3v4"></path><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.2h.01M12 17.2h.01"></path>',
    relogio: '<circle cx="12" cy="13.5" r="7.5"></circle><path d="M12 13.5V9.6M9.5 2.8h5M12 2.8v3.2M19 6.2l1.4 1.4"></path>',
    grade: '<rect x="3" y="4" width="18" height="16" rx="2.2"></rect><path d="M3 9.4h18M3 14.7h18M9 4v16"></path>',
    gear: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
    mais: '<path d="M12 5v14M5 12h14"></path>',
    recarregar: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path>',
    voltar: '<path d="M15 5l-7 7 7 7"></path>',
    x: '<path d="M6 6l12 12M18 6L6 18"></path>',
    chev: '<path d="M9 6l6 6-6 6"></path>',
    localizar: '<path d="M4 5h16v11H9.5L5.5 19.5V16H4z"></path><path d="M12 8.2v4.6M9.7 10.5h4.6"></path>',
    compartilhar: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"></path>',
    baixar: '<rect x="3" y="3" width="18" height="18" rx="3"></rect><path d="M12 8v7M9 12l3 3 3-3"></path>'
  };

  /* =============== armazenamento das imagens (IndexedDB, só neste aparelho) =============== */
  var DB = 'planejador_farmacia_midia_v1', STORE = 'imgs';
  var dbp = null, memoria = {}, urls = {};
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (ok, no) {
      try {
        if (!win.indexedDB) throw new Error('sem IndexedDB');
        var r = win.indexedDB.open(DB, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore(STORE, { keyPath: 'id' }); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { no(r.error); };
      } catch (e) { no(e); }
    });
    return dbp;
  }
  function tx(modo, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, no) {
        var t = d.transaction(STORE, modo), req = fn(t.objectStore(STORE));
        t.oncomplete = function () { ok(req && req.result); };
        t.onerror = t.onabort = function () { no(t.error); };
      });
    });
  }
  var Midia = {
    novoId: function () { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    // Guarda a imagem; se o armazenamento do navegador falhar, ela continua disponível até recarregar a página.
    salvar: function (id, blob, meta) {
      var reg = { id: id, blob: blob, em: Date.now(), nome: (meta && meta.nome) || '', convId: (meta && meta.convId) || '' };
      memoria[id] = reg;
      return tx('readwrite', function (s) { return s.put(reg); }).then(function () { return true; }, function () { return false; });
    },
    obter: function (id) {
      if (memoria[id]) return Promise.resolve(memoria[id]);
      return tx('readonly', function (s) { return s.get(id); }).then(function (r) { return r || null; }, function () { return null; });
    },
    listar: function () {
      return tx('readonly', function (s) { return s.getAll(); }).then(function (a) { return a || []; }, function () { return []; }).then(function (a) {
        var vistos = {}; a.forEach(function (r) { vistos[r.id] = 1; });
        Object.keys(memoria).forEach(function (k) { if (!vistos[k]) a.push(memoria[k]); });
        return a.sort(function (x, y) { return y.em - x.em; });
      });
    },
    remover: function (ids) {
      ids.forEach(function (id) { delete memoria[id]; if (urls[id]) { try { URL.revokeObjectURL(urls[id]); } catch (_) {} delete urls[id]; } });
      return tx('readwrite', function (s) { ids.forEach(function (id) { s.delete(id); }); }).then(function () { return true; }, function () { return false; });
    },
    // Apaga TODAS as imagens da biblioteca (usado quando o histórico de conversas é apagado).
    limparTudo: function () {
      Object.keys(urls).forEach(function (k) { try { URL.revokeObjectURL(urls[k]); } catch (_) {} });
      memoria = {}; urls = {};
      return tx('readwrite', function (s) { return s.clear(); }).then(function () { return true; }, function () { return false; });
    },
    url: function (id) {
      if (urls[id]) return Promise.resolve(urls[id]);
      return Midia.obter(id).then(function (r) { if (!r || !r.blob) return ''; urls[id] = URL.createObjectURL(r.blob); return urls[id]; });
    }
  };

  /* =============== telas (sobrepostas ao chat, como o histórico) =============== */
  var telas = [];
  function pagina() { return doc.getElementById('modal-farmacia'); }
  function abrirTela(titulo, classe) {
    var pg = doc.body; if (!pg) return null;
    var el = mk('section', 'fmn-tela ' + (classe || ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': T(titulo) });
    var topo = mk('header', 'fmn-topo');
    var voltar = mk('button', 'fmn-voltar', { type: 'button', 'aria-label': T('Voltar'), title: T('Voltar') }); voltar.innerHTML = ico(I.voltar);
    var h = mk('h2', 'fmn-titulo'); h.textContent = T(titulo);
    topo.appendChild(voltar); topo.appendChild(h); topo.appendChild(mk('span', 'fmn-topo-gap', { 'aria-hidden': 'true' }));
    el.appendChild(topo);
    var corpo = mk('div', 'fmn-corpo'); el.appendChild(corpo);
    pg.appendChild(el);
    doc.documentElement.classList.add('farma-tela-on');
    var t = { el: el, corpo: corpo, fechar: function (foco) {
      var i = telas.indexOf(t); if (i < 0) return; telas.splice(i, 1); el.remove();
      if (!telas.length) doc.documentElement.classList.remove('farma-tela-on');
      if (t.aoFechar) t.aoFechar();
    } };
    voltar.addEventListener('click', function () { t.fechar(true); });
    telas.push(t);
    return t;
  }
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !telas.length || visualizador) return;
    e.preventDefault(); e.stopPropagation(); telas[telas.length - 1].fechar(true);
  }, true);
  function fecharTudo() { while (telas.length) telas[telas.length - 1].fechar(false); if (visualizador) visualizador.fechar(); }

  /* Data da imagem: "Hoje", "Ontem" e "Anteontem" (por dia do calendário, não por 24 h); depois disso, a data por extenso. O horário vai embaixo. */
  function rotuloImagem(ts, agora) {
    var d = new Date(ts), n = agora ? new Date(agora) : new Date();
    var dia = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var dif = Math.round((dia(n) - dia(d)) / 86400000);
    var hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    var titulo = dif === 0 ? 'Hoje' : dif === 1 ? 'Ontem' : dif === 2 ? 'Anteontem' : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    return { titulo: titulo, hora: hora };
  }

  /* =============== Biblioteca =============== */
  var visualizador = null;
  function abrirBiblioteca() {
    var t = abrirTela('Biblioteca', 'fmn-biblioteca'); if (!t) return;
    var grade = mk('div', 'fmn-grid'), vazio = mk('div', 'fmn-vazio');
    vazio.innerHTML = '<strong></strong><span></span>';
    vazio.firstChild.textContent = T('Nenhuma imagem ainda');
    vazio.lastChild.textContent = T('As imagens que você enviar para a FarmacIA ficam guardadas aqui, só neste aparelho.');
    t.corpo.appendChild(vazio); t.corpo.appendChild(grade); vazio.hidden = true;
    if (win.Selecao) win.Selecao.anexar({
      container: grade, item: '.fmn-thumb', id: function (el) { return el.getAttribute('data-id'); }, canto: true,
      aoExcluir: function (ids) {
        Midia.remover(ids).then(function () {
          ids.forEach(function (i) { var b = grade.querySelector('.fmn-thumb[data-id="' + i + '"]'); if (b) b.remove(); });
          if (!grade.children.length) vazio.hidden = false;
        });
      }
    });
    Midia.listar().then(function (lista) {
      if (!t.el.isConnected) return;
      if (!lista.length) { vazio.hidden = false; return; }
      lista.forEach(function (r, i) {
        var b = mk('button', 'fmn-thumb', { type: 'button', 'aria-label': T('Abrir imagem') + ' ' + (i + 1) });
        var im = mk('img', null, { alt: '', loading: 'lazy', decoding: 'async' });
        b.appendChild(im); b.setAttribute('data-id', r.id);
        Midia.url(r.id).then(function (u) { if (u) im.src = u; });
        b.addEventListener('click', function () { abrirImagem(r, lista, i); });
        grade.appendChild(b);
      });
    });
    var primeiro = t.el.querySelector('.fmn-voltar'); if (primeiro) primeiro.focus({ preventScroll: true });
  }

  /* ---- imagem em tela cheia: mesmo visual do editor (reaproveita .fed e o menu flutuante) ---- */
  function abrirImagem(reg) {
    if (visualizador) return;
    var voltarFoco = doc.activeElement;
    var root = mk('div', 'fed fmn-vis', { role: 'dialog', 'aria-modal': 'true', 'aria-label': T('Imagem') });
    var topo = mk('div', 'fed-top');
    var bX = mk('button', 'fed-btn', { type: 'button', 'aria-label': T('Fechar'), title: T('Fechar') }); bX.innerHTML = ico(I.x);
    var rot = rotuloImagem(reg.em), cab = mk('div', 'fmn-vis-data');
    var cabT = mk('strong', 'fmn-vis-dia'), cabH = mk('span', 'fmn-vis-hora');
    cabT.textContent = /^(Hoje|Ontem|Anteontem)$/.test(rot.titulo) ? T(rot.titulo) : rot.titulo; cabH.textContent = rot.hora;
    cab.appendChild(cabT); cab.appendChild(cabH);
    topo.appendChild(bX); topo.appendChild(cab); topo.appendChild(mk('span'));
    var palco = mk('div', 'fed-stage fmn-vis-palco');
    var im = mk('img', 'fmn-vis-img', { alt: reg.nome || T('Imagem') });
    palco.appendChild(im);
    var base = mk('div', 'fed-base');
    var barra = mk('div', 'fed-bar', { role: 'toolbar', 'aria-label': T('Ações da imagem') });
    function botao(icone, rotulo) { var b = mk('button', 'fed-tool', { type: 'button', 'aria-label': T(rotulo), title: T(rotulo) }); b.innerHTML = ico(icone); return b; }
    var bLoc = botao(I.localizar, 'Localizar na conversa'), bCom = botao(I.compartilhar, 'Compartilhar'), bBai = botao(I.baixar, 'Baixar imagem');
    barra.appendChild(bLoc); barra.appendChild(mk('span', 'fed-sep', { 'aria-hidden': 'true' })); barra.appendChild(bCom); barra.appendChild(bBai);
    base.appendChild(barra);
    root.appendChild(topo); root.appendChild(palco); root.appendChild(base);
    doc.body.appendChild(root); doc.documentElement.classList.add('fed-aberto');
    Midia.url(reg.id).then(function (u) { if (u) im.src = u; });
    var v = visualizador = { fechar: function () {
      if (visualizador !== v) return; visualizador = null; root.remove(); doc.removeEventListener('keydown', tecla, true);
      if (!doc.querySelector('.fed:not(.fmn-vis)')) doc.documentElement.classList.remove('fed-aberto');
      if (voltarFoco && voltarFoco.focus && voltarFoco.isConnected) { try { voltarFoco.focus({ preventScroll: true }); } catch (_) {} }
    } };
    function tecla(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); v.fechar(); } }
    doc.addEventListener('keydown', tecla, true);
    bX.addEventListener('click', v.fechar);
    function nomeArq() { return (reg.nome && /\.\w{3,4}$/.test(reg.nome)) ? reg.nome : 'farmacia-imagem-' + new Date(reg.em).toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.jpg'; }
    bBai.addEventListener('click', function () {
      var url = URL.createObjectURL(reg.blob), a = mk('a', '', { href: url, download: nomeArq() });
      a.style.display = 'none'; doc.body.appendChild(a); a.click();
      win.setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
    });
    bCom.addEventListener('click', function () {
      var f = new File([reg.blob], nomeArq(), { type: reg.blob.type || 'image/jpeg' });
      if (navigator.canShare && navigator.share && navigator.canShare({ files: [f] })) {
        navigator.share({ files: [f] }).catch(function (err) { if (err && err.name !== 'AbortError') toast(T('Não foi possível compartilhar.')); });
      } else toast(T('Compartilhar não está disponível neste navegador. Use o botão de baixar.'));
    });
    bLoc.addEventListener('click', function () {
      var V = win.FarmaVisual;
      var conv = reg.convId && V && V.historico ? V.historico.continuar(reg.convId) : null;
      if (!conv) { toast(T('A conversa desta imagem não está mais no histórico.')); return; }
      v.fechar(); fecharTudo();
      if (V && V.fecharMenu) V.fecharMenu();
      if (V.aoContinuar) V.aoContinuar(conv);
      win.setTimeout(function () {
        var alvo = doc.querySelector('#farma-messages [data-mid~="' + reg.id + '"]');
        if (!alvo) { toast(T('Não encontrei a imagem nessa conversa.')); return; }
        alvo.scrollIntoView({ block: 'center', behavior: doc.documentElement.classList.contains('no-anim') ? 'auto' : 'smooth' });
        alvo.classList.add('is-achada'); win.setTimeout(function () { alvo.classList.remove('is-achada'); }, 2200);
      }, 120);
    });
    bX.focus({ preventScroll: true });
  }

  /* =============== Grade atual =============== */
  function catalogo() { try { return typeof disciplinas !== 'undefined' && Array.isArray(disciplinas) ? disciplinas : []; } catch (_) { return []; } }
  function ajuste(cod) { try { return typeof disciplinaAjustes !== 'undefined' && disciplinaAjustes[cod] ? disciplinaAjustes[cod] : ''; } catch (_) { return ''; } }
  function porCodigo(cod) { var c = catalogo(); for (var i = 0; i < c.length; i++) if (c[i].codigo === cod) return c[i]; return null; }
  function lerGrade() {
    var a; try { a = JSON.parse(ler(GRADE_KEY) || '[]'); } catch (_) { a = []; }
    if (!Array.isArray(a)) return [];
    var vistos = {}; return a.filter(function (c) { if (typeof c !== 'string' || vistos[c] || !porCodigo(c)) return false; vistos[c] = 1; return true; });
  }
  function salvarGrade(a) { gravar(GRADE_KEY, JSON.stringify(a)); try { win.dispatchEvent(new CustomEvent('planejador:grade-atual')); } catch (_) {} }
  function corDe(cod) { var n = 0; for (var i = 0; i < cod.length; i++) n = (n * 31 + cod.charCodeAt(i)) >>> 0; return n % 6; }

  function abrirGrade() {
    var t = abrirTela('Informe sua grade atual', 'fmn-grade-tela'); if (!t) return;
    var sel = lerGrade();
    var campo = mk('div', 'fmn-campo');
    var lab = mk('label', 'fmn-lab', { 'for': 'fmn-grade-in' }); lab.textContent = T('Disciplinas que você está cursando');
    var inp = mk('input', 'fmn-in', { id: 'fmn-grade-in', type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', placeholder: T('Nome ou código da disciplina'), role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'fmn-grade-sug', 'aria-autocomplete': 'list' });
    var sug = mk('div', 'fmn-sug', { id: 'fmn-grade-sug', role: 'listbox', 'aria-label': T('Sugestões') }); sug.hidden = true;
    var tags = mk('div', 'fmn-tags', { 'aria-label': T('Disciplinas escolhidas') });
    var cont = mk('p', 'fmn-cont', { 'aria-live': 'polite' });
    campo.appendChild(lab); campo.appendChild(inp); campo.appendChild(sug);
    t.corpo.appendChild(campo); t.corpo.appendChild(cont); t.corpo.appendChild(tags);
    var fim = mk('button', 'fmn-fim', { type: 'button' }); fim.textContent = T('Concluir');
    t.el.appendChild(fim); fim.addEventListener('click', function () { t.fechar(true); });

    function pintarTags() {
      tags.textContent = '';
      sel.forEach(function (cod) {
        var d = porCodigo(cod); if (!d) return;
        var tg = mk('span', 'fmn-tag fmn-c' + corDe(cod));
        var n = mk('span', 'fmn-tag-n'); n.textContent = d.nome + ajuste(cod);
        var c = mk('small', 'fmn-tag-c'); c.textContent = cod;
        var x = mk('button', 'fmn-tag-x', { type: 'button', 'aria-label': T('Remover') + ': ' + d.nome, title: T('Remover') }); x.innerHTML = ico(I.x);
        x.addEventListener('click', function () { sel = sel.filter(function (k) { return k !== cod; }); salvarGrade(sel); pintarTags(); mostrarSug(); });
        tg.appendChild(n); tg.appendChild(c); tg.appendChild(x); tags.appendChild(tg);
      });
      var tot = sel.reduce(function (s, k) { var d = porCodigo(k); return s + (d ? d.cred : 0); }, 0);
      cont.textContent = sel.length ? sel.length + ' ' + T(sel.length === 1 ? 'disciplina' : 'disciplinas') + ' · ' + tot + ' ' + T('créd.') : T('Nenhuma disciplina escolhida ainda.');
    }
    var itens = [], ativo = -1;
    function buscar(q) {
      var toks = semAcento(q).split(/\s+/).filter(Boolean); if (!toks.length) return [];
      return catalogo().filter(function (d) {
        if (sel.indexOf(d.codigo) >= 0) return false;
        var alvo = semAcento(d.codigo + ' ' + d.nome + ajuste(d.codigo));
        return toks.every(function (k) { return alvo.indexOf(k) >= 0; });
      }).slice(0, 6);
    }
    function escolher(d) {
      if (!d || sel.indexOf(d.codigo) >= 0) return;
      sel.push(d.codigo); salvarGrade(sel); inp.value = ''; pintarTags(); mostrarSug(); inp.focus({ preventScroll: true });
    }
    function mostrarSug() {
      itens = buscar(inp.value); ativo = itens.length ? 0 : -1; sug.textContent = '';
      sug.hidden = !itens.length; inp.setAttribute('aria-expanded', itens.length ? 'true' : 'false');
      itens.forEach(function (d, i) {
        var b = mk('button', 'fmn-sug-i' + (i === ativo ? ' is-on' : ''), { type: 'button', role: 'option', 'aria-selected': i === ativo ? 'true' : 'false' });
        var a = mk('strong'); a.textContent = d.nome + ajuste(d.codigo); var c = mk('small'); c.textContent = d.codigo + ' · ' + (/^\d+$/.test(d.periodo) ? d.periodo + 'º ' + T('período') : T(d.periodo));
        b.appendChild(a); b.appendChild(c);
        b.addEventListener('pointerdown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { escolher(d); });
        sug.appendChild(b);
      });
    }
    inp.addEventListener('input', mostrarSug);
    inp.addEventListener('keydown', function (e) {
      if (!itens.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); ativo = (ativo + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length;
        Array.prototype.forEach.call(sug.children, function (b, i) { b.classList.toggle('is-on', i === ativo); b.setAttribute('aria-selected', i === ativo ? 'true' : 'false'); });
      } else if (e.key === 'Enter') { e.preventDefault(); escolher(itens[ativo < 0 ? 0 : ativo]); }
    });
    pintarTags(); win.setTimeout(function () { inp.focus({ preventScroll: true }); }, 60);
  }

  /* =============== Dados para a FarmacIA (somente leitura, tudo local) =============== */
  function dados() {
    var grade = lerGrade().map(function (c) { var d = porCodigo(c); return { codigo: c, nome: d.nome + ajuste(c), cred: d.cred, ch: d.ch, periodo: d.periodo }; });
    var notas = [];
    try {
      var j = JSON.parse(ler('planejador_notas_v1') || 'null');
      if (j && Array.isArray(j.notes)) j.notes.forEach(function (n) {
        var txt = String(n.text || n.texto || '').trim(), tit = String(n.title || n.titulo || '').trim();
        if (txt || tit) notas.push({ titulo: tit, texto: txt, codigo: n.code || n.codigo || '' });
      });
    } catch (_) {}
    return { grade: grade, notas: notas };
  }

  /* =============== Tela inicial do menu lateral =============== */
  function nomeCurto() {
    var p = win.FarmacIA && win.FarmacIA._perfil ? win.FarmacIA._perfil() : null, n = p && p.nome ? String(p.nome).trim().split(/\s+/)[0] : '';
    return n;
  }
  function foto() { var v = ler(FOTO_KEY); return v && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v) ? v : ''; }
  function linha(icone, nome, aoClicar, valor) {
    var el = mk('button', 'fm-row fmn-row', { type: 'button', role: 'menuitem' });
    var ic = mk('span', 'fm-row-ico'); ic.innerHTML = ico(icone); el.appendChild(ic);
    var t = mk('span', 'fm-row-txt'); var s = mk('strong'); s.textContent = T(nome); t.appendChild(s); el.appendChild(t);
    var v = mk('span', 'fm-row-val'); if (valor) { var q = mk('span', 'fmn-badge'); q.textContent = valor; v.appendChild(q); } var ch = mk('span', 'fmn-chev'); ch.innerHTML = ico(I.chev); v.appendChild(ch); el.appendChild(v);
    el.addEventListener('click', aoClicar); return el;
  }
  // Abre "Meu perfil" nas Configurações (o perfil mora lá).
  function abrirPerfil() {
    try {
      if (typeof openModal === 'function') openModal('modal-settings');
      if (typeof openSettingsView === 'function') openSettingsView('profile');
    } catch (_) {}
  }
  function historico(hooks) {
    var V = win.FarmaVisual, lista = V && V.historico ? V.historico.listar() : [];
    var nav = mk('nav', 'fmn-hist', { 'aria-label': T('Conversas anteriores') });
    if (!lista.length) { var v = mk('p', 'fmn-hist-vazio'); v.textContent = T('Suas conversas aparecem aqui.'); nav.appendChild(v); return nav; }
    lista.forEach(function (c) {
      var b = mk('button', 'fmn-hist-i', { type: 'button', title: c.titulo || '' });
      b.textContent = c.titulo || T('Conversa'); b.setAttribute('data-id', c.id);
      b.addEventListener('click', function () { hooks.abrirConversa(c.id); });
      nav.appendChild(b);
    });
    if (win.Selecao) win.Selecao.anexar({
      container: nav, item: '.fmn-hist-i', id: function (el) { return el.getAttribute('data-id'); },
      aoExcluir: function (ids) { ids.forEach(function (i) { V.historico.excluir(i); }); if (nav.parentNode) nav.replaceWith(historico(hooks)); }
    });
    return nav;
  }
  // Desenha o conteúdo "home" dentro do container do menu. hooks: { fechar, nova, abrirConversa }
  function home(menu, hooks) {
    menu.textContent = '';
    menu.classList.add('is-home');
    var topo = mk('div', 'fmn-atalhos');
    topo.appendChild(linha(I.album, 'Biblioteca', function () { abrirBiblioteca(); }));
    topo.appendChild(linha(I.agenda, 'Agenda', function () { hooks.fechar(); if (win.Notas && win.Notas.open) win.Notas.open(); }));
    topo.appendChild(linha(I.calendario, 'Calendário', function () { hooks.fechar(); if (win.Calendario) win.Calendario.abrir(); }));
    topo.appendChild(linha(I.relogio, 'Relógio', function () { hooks.fechar(); if (win.Relogio) win.Relogio.abrir(); }));
    menu.appendChild(topo);
    menu.appendChild(mk('hr', 'fmn-div'));
    menu.appendChild(historico(hooks));
    var rodape = mk('div', 'fmn-rodape');
    var perfil = mk('button', 'fmn-perfil', { type: 'button', 'aria-label': T('Gerenciar perfil') });
    var av = mk('span', 'fmn-avatar', { 'aria-hidden': 'true' }), f = foto();
    if (f) { av.style.backgroundImage = 'url("' + f + '")'; av.classList.add('has-foto'); } else av.innerHTML = '<svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="36" r="15"></circle><path d="M17 88c2-17 14-26 31-26s29 9 31 26z"></path></svg>';
    var nm = mk('span', 'fmn-nome'); nm.textContent = nomeCurto() || T('Você');
    perfil.appendChild(av); perfil.appendChild(nm);
    perfil.addEventListener('click', function () { hooks.fechar(); abrirPerfil(); });
    // Novo chat: o mesmo ícone de recarregar do cabeçalho do chat, num círculo, com o nome em duas linhas.
    var nova = mk('button', 'fmn-nova', { type: 'button', 'aria-label': T('Nova conversa') });
    var nIco = mk('span', 'fmn-nova-ico', { 'aria-hidden': 'true' }); nIco.innerHTML = ico(I.recarregar);
    var nTxt = mk('span', 'fmn-nova-txt', { 'aria-hidden': 'true' }); nTxt.appendChild(doc.createTextNode(T('Novo'))); nTxt.appendChild(mk('br')); nTxt.appendChild(doc.createTextNode(T('Chat')));
    nova.appendChild(nIco); nova.appendChild(nTxt);
    nova.addEventListener('click', hooks.nova);
    rodape.appendChild(perfil); rodape.appendChild(nova); menu.appendChild(rodape);
  }

  /* Botão "Grade atual" em Meu perfil > Vida acadêmica */
  function atualizarBotaoGrade() {
    var v = doc.getElementById('profile-grade-val'); if (!v) return;
    var n = lerGrade().length;
    v.textContent = n ? n + ' ' + T(n === 1 ? 'disciplina' : 'disciplinas') : T('Informar');
  }
  function ligarBotaoGrade() {
    var b = doc.getElementById('profile-grade-btn');
    if (b && !b.getAttribute('data-fmn')) { b.setAttribute('data-fmn', '1'); b.addEventListener('click', function (e) { e.preventDefault(); abrirGrade(); }); }
    atualizarBotaoGrade();
  }
  win.addEventListener('planejador:grade-atual', atualizarBotaoGrade);
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', ligarBotaoGrade); else ligarBotaoGrade();

  win.FarmaMenu = { rotuloImagem: rotuloImagem, home: home, dados: dados, Midia: Midia, abrirBiblioteca: abrirBiblioteca, abrirGrade: abrirGrade, fecharTudo: fecharTudo, icones: I };
})();
