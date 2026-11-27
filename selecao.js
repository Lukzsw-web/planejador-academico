/* Seleção por toque longo nos balões (Agenda, Calendário, Histórico, Biblioteca...).
 * Selecao.anexar({ container, item, id(el), padding, canto, aoExcluir(ids), rotulo:{um,varios}, aoMudar })
 *  - segurar um balão liga o modo de seleção e marca esse balão;
 *  - uma bolinha aparece no canto do balão (centralizada na vertical, empurrando o texto para o lado);
 *  - barra no topo: bolinha "selecionar todos" à esquerda, contagem ao centro, Excluir e Cancelar à direita;
 *  - em modo de seleção, tocar num balão marca/desmarca (não abre).
 * Tudo local, sem dependências. */
(function () {
  'use strict';
  var doc = document, win = window;
  var PRESS_MS = 480, MOVE_PX = 9;
  function T(x) { return typeof win.T === 'function' ? win.T(x) : x; }
  function mk(tag, cls, attrs) {
    var el = doc.createElement(tag); if (cls) el.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
  var ativo = null; // só um modo de seleção por vez

  function anexar(o) {
    var box = typeof o.container === 'function' ? o.container() : o.container;
    if (!box || box._selecao) return box && box._selecao;
    var sel = new Set(), ligado = false, barra = null, timer = 0, press = null, engolir = false, armado = false, armTimer = 0;
    var ctl = { ligado: function () { return ligado; }, sair: sair, selecionados: function () { return Array.from(sel); } };
    box._selecao = ctl;

    function itens() { return Array.prototype.slice.call(box.querySelectorAll(o.item)); }
    function idDe(el) { try { return String(o.id(el)); } catch (_) { return ''; } }
    function pintar() {
      itens().forEach(function (el) {
        el.classList.add('sel-item'); if (o.canto) el.classList.add('sel-canto');
        if (o.padding) { var alvo = el.matches(o.padding) ? el : el.querySelector(o.padding); if (alvo) alvo.classList.add('sel-pad'); }
        var on = sel.has(idDe(el));
        el.classList.toggle('is-sel', on); el.setAttribute('aria-selected', String(on));
      });
      if (barra) atualizarBarra();
    }
    var obs = null;
    function entrar(el) {
      if (ligado) return;
      if (ativo && ativo !== ctl) ativo.sair();
      ligado = true; ativo = ctl; box.classList.add('sel-on'); doc.documentElement.classList.add('sel-modo');
      montarBarra();
      if (win.MutationObserver) { obs = new MutationObserver(function () { pintar(); }); obs.observe(box, { childList: true, subtree: true }); }
      if (el) sel.add(idDe(el));
      pintar();
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (_) {}
    }
    function sair() {
      if (!ligado) return;
      ligado = false; if (ativo === ctl) ativo = null; sel.clear();
      box.classList.remove('sel-on'); doc.documentElement.classList.remove('sel-modo');
      if (obs) { obs.disconnect(); obs = null; }
      itens().forEach(function (el) { el.classList.remove('is-sel', 'sel-item', 'sel-canto'); el.removeAttribute('aria-selected'); });
      box.querySelectorAll('.sel-pad').forEach(function (e) { e.classList.remove('sel-pad'); });
      if (barra) { barra.remove(); barra = null; }
      clearTimeout(armTimer); armado = false;
      if (o.aoMudar) o.aoMudar(false);
    }
    function alternar(el) {
      var id = idDe(el); if (!id) return;
      if (sel.has(id)) sel.delete(id); else sel.add(id);
      pintar();
    }
    function todos() {
      var ids = itens().map(idDe).filter(Boolean);
      var todosOn = ids.length && ids.every(function (i) { return sel.has(i); });
      sel.clear(); if (!todosOn) ids.forEach(function (i) { sel.add(i); });
      pintar();
    }
    function montarBarra() {
      barra = mk('div', 'sel-barra', { role: 'toolbar', 'aria-label': T('Seleção') });
      var bt = mk('button', 'sel-todos', { type: 'button', 'aria-label': T('Selecionar todos'), title: T('Selecionar todos') });
      bt.appendChild(mk('span', 'sel-bolinha'));
      var cnt = mk('strong', 'sel-conta', { 'aria-live': 'polite' });
      var dir = mk('div', 'sel-dir');
      var bx = mk('button', 'sel-excluir', { type: 'button' });
      var bc = mk('button', 'sel-cancelar', { type: 'button' }); bc.textContent = T('Cancelar');
      dir.appendChild(bx); dir.appendChild(bc);
      barra.appendChild(bt); barra.appendChild(cnt); barra.appendChild(dir);
      doc.body.appendChild(barra);
      bt.addEventListener('click', todos);
      bc.addEventListener('click', sair);
      bx.addEventListener('click', function () {
        if (!sel.size) return;
        if (!armado) {
          armado = true; bx.classList.add('is-sure'); bx.textContent = T('Excluir') + ' ' + sel.size + '?';
          armTimer = win.setTimeout(function () { armado = false; if (barra) atualizarBarra(); }, 3500);
          return;
        }
        var ids = Array.from(sel); sair();
        if (o.aoExcluir) o.aoExcluir(ids);
      });
      barra._bt = bt; barra._cnt = cnt; barra._bx = bx;
    }
    function atualizarBarra() {
      var n = sel.size, tot = itens().length;
      barra._cnt.textContent = n === 0 ? T('Selecione itens') : (n === 1 ? '1 ' + T((o.rotulo && o.rotulo.um) || 'selecionado') : n + ' ' + T((o.rotulo && o.rotulo.varios) || 'selecionados'));
      barra._bt.classList.toggle('is-on', tot > 0 && n === tot);
      barra._bt.setAttribute('aria-pressed', String(tot > 0 && n === tot));
      barra._bx.disabled = !n;
      if (!armado) { barra._bx.classList.remove('is-sure'); barra._bx.textContent = T('Excluir'); }
      else { barra._bx.textContent = T('Excluir') + ' ' + n + '?'; }
    }

    // ---- toque longo ----
    function achar(e) { var t = e.target; return t && t.closest ? t.closest(o.item) : null; }
    box.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var el = achar(e); if (!el || !box.contains(el)) return;
      if (ligado) return;
      press = { x: e.clientX, y: e.clientY, el: el };
      clearTimeout(timer);
      timer = win.setTimeout(function () { if (!press) return; var alvo = press.el; press = null; engolir = true; entrar(alvo); }, PRESS_MS);
    }, true);
    function cancelar() { press = null; clearTimeout(timer); }
    box.addEventListener('pointermove', function (e) {
      if (!press) return;
      if (Math.abs(e.clientX - press.x) > MOVE_PX || Math.abs(e.clientY - press.y) > MOVE_PX) cancelar();
    }, true);
    box.addEventListener('pointerup', cancelar, true);
    box.addEventListener('pointercancel', cancelar, true);
    box.addEventListener('scroll', cancelar, true);
    box.addEventListener('contextmenu', function (e) { if (achar(e) && (press || ligado || engolir)) e.preventDefault(); }, true);
    // o clique que vem ao soltar o dedo depois do toque longo não pode abrir o balão
    box.addEventListener('click', function (e) {
      var el = achar(e);
      if (engolir) { engolir = false; if (el) { e.preventDefault(); e.stopPropagation(); } return; }
      if (!ligado || !el) return;
      e.preventDefault(); e.stopPropagation(); alternar(el);
    }, true);
    return ctl;
  }

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ativo) { e.preventDefault(); e.stopPropagation(); ativo.sair(); }
  }, true);

  win.Selecao = { anexar: anexar, sair: function () { if (ativo) ativo.sair(); }, ativa: function () { return !!ativo; } };
})();
