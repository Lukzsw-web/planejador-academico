/* =========================================================
   Barra de mensagem da FarmacIA (v0.6.9)
   - Sem texto: só o campo (cálice | divisória | texto). Com texto: o texto sobe e aparece a linha de baixo
     com o botão "+", a opção escolhida e o envio (seta em bola verde, dentro da barra).
   - "+" abre a folha "Selecionar opção": Câmera, Fotos, Arquivos e a lista de opções.
   - Câmera/Fotos abrem o editor de imagem (editor-imagem.js); o resultado entra como anexo.
   Esta camada só cuida da interface. A lógica de cada opção (ex.: conversor de PDF) fica a cargo de quem
   escutar o evento "farma:enviar" (document), que traz { texto, opcao, anexos }.
   ========================================================= */
(function () {
  'use strict';
  var doc = document, win = window;

  // Para acrescentar opções, basta incluir um item aqui.
  var OPCOES = [
    { id: 'pdf', nome: 'Conversor para PDF', sub: 'Transforma qualquer arquivo, ou imagem, em PDF' }
  ];

  function T(x) { return typeof win.T === 'function' ? win.T(x) : x; }
  function $(id) { return doc.getElementById(id); }
  function mk(tag, cls) { var el = doc.createElement(tag); if (cls) el.className = cls; return el; }

  var form, box, input, bar, send, plus, chip, chipNome, anexosEl, sheet, lista;
  var estado = { opcao: null, anexos: [] };
  var seq = 0;

  /* ---------- aparência: recolhida × expandida ---------- */
  function sync() {
    if (!input) return;
    var texto = input.value.trim().length > 0;
    var expandida = texto || estado.anexos.length > 0;
    box.classList.toggle('is-expandida', expandida);
    send.hidden = !texto;
    chip.hidden = !estado.opcao;
    if (estado.opcao) chipNome.textContent = T(estado.opcao.nome);
    chip.setAttribute('aria-label', estado.opcao ? T('Remover opção selecionada') + ': ' + T(estado.opcao.nome) : T('Remover opção selecionada'));
    anexosEl.hidden = !estado.anexos.length;
    // altura do campo: 1 linha recolhida; cresce com o texto quando expandida
    input.style.height = 'auto';
    if (expandida) input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    else input.style.removeProperty('height');
    input.style.overflowY = input.scrollHeight > 140 ? 'auto' : 'hidden';
  }

  /* ---------- anexos ---------- */
  function adicionarAnexo(arquivo, nome) {
    var a = { id: ++seq, arquivo: arquivo, nome: nome || arquivo.name || T('Arquivo'), imagem: /^image\//.test(arquivo.type), url: '' };
    if (a.imagem) a.url = URL.createObjectURL(arquivo);
    estado.anexos.push(a); desenharAnexos(); sync();
  }
  function removerAnexo(id) {
    estado.anexos = estado.anexos.filter(function (a) { if (a.id === id && a.url) URL.revokeObjectURL(a.url); return a.id !== id; });
    desenharAnexos(); sync();
  }
  function desenharAnexos() {
    anexosEl.innerHTML = '';
    estado.anexos.forEach(function (a) {
      var it = mk('div', 'farma-anexo' + (a.imagem ? ' is-img' : '')); it.setAttribute('role', 'listitem');
      if (a.imagem) { var im = mk('img'); im.src = a.url; im.alt = a.nome; it.appendChild(im); }
      else {
        it.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></svg>';
        var n = mk('span', 'farma-anexo-nome'); n.textContent = a.nome; it.appendChild(n);
      }
      var x = mk('button', 'farma-anexo-x'); x.type = 'button';
      x.setAttribute('aria-label', T('Remover anexo') + ': ' + a.nome);
      x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"></path></svg>';
      x.addEventListener('click', function () { removerAnexo(a.id); input.focus({ preventScroll: true }); });
      it.appendChild(x); anexosEl.appendChild(it);
    });
  }

  /* ---------- folha "Selecionar opção" ---------- */
  var fecharTimer = 0;
  function desenharLista() {
    lista.innerHTML = '';
    OPCOES.forEach(function (o) {
      var on = estado.opcao && estado.opcao.id === o.id;
      var li = mk('li'); li.setAttribute('role', 'presentation');
      var b = mk('button', 'farma-opt' + (on ? ' is-on' : '')); b.type = 'button';
      b.setAttribute('role', 'option'); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.setAttribute('data-farma-opcao', o.id);
      var t = mk('span', 'farma-opt-t'); t.textContent = T(o.nome);
      var s = mk('span', 'farma-opt-s'); s.textContent = T(o.sub);
      var txt = mk('span', 'farma-opt-txt'); txt.appendChild(t); txt.appendChild(s); b.appendChild(txt);
      var ck = mk('span', 'farma-opt-ck');
      ck.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
      b.appendChild(ck); li.appendChild(b); lista.appendChild(li);
    });
  }
  function abrirFolha() {
    win.clearTimeout(fecharTimer);
    desenharLista();
    sheet.hidden = false; doc.documentElement.classList.add('farma-sheet-on');
    plus.setAttribute('aria-expanded', 'true');
    win.requestAnimationFrame(function () { win.requestAnimationFrame(function () { sheet.classList.add('is-open'); }); });
    var x = sheet.querySelector('.farma-sheet-x'); if (x) x.focus({ preventScroll: true });
  }
  function fecharFolha(devolverFoco) {
    if (sheet.hidden) return;
    sheet.classList.remove('is-open');
    plus.setAttribute('aria-expanded', 'false');
    var reduz = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches || doc.documentElement.classList.contains('no-anim');
    fecharTimer = win.setTimeout(function () { sheet.hidden = true; doc.documentElement.classList.remove('farma-sheet-on'); }, reduz ? 0 : 260);
    if (devolverFoco !== false) { try { plus.focus({ preventScroll: true }); } catch (_) {} }
  }
  function abrirSeletor(id) {
    var inp = $(id); if (!inp) return;
    try { if (id === 'farma-file-fotos' && inp.showPicker) inp.showPicker(); else inp.click(); } catch (_) { inp.click(); }
  }
  function aoEscolherArquivo(e, tipo) {
    var inp = e.target, f = inp.files && inp.files[0];
    inp.value = '';
    if (!f) return;
    fecharFolha(false);
    if (tipo !== 'arquivos' && /^image\//.test(f.type) && win.EditorImagem) {
      win.EditorImagem.abrir(f, { aoConfirmar: function (blob, nome) { adicionarAnexo(new File([blob], nome, { type: blob.type }), nome); input.focus({ preventScroll: true }); } });
    } else adicionarAnexo(f);
  }
  function escolherOpcao(id) {
    var o = OPCOES.filter(function (x) { return x.id === id; })[0];
    estado.opcao = (estado.opcao && estado.opcao.id === id) ? null : (o || null);   // tocar de novo desmarca
    sync(); fecharFolha(false);
    try { input.focus({ preventScroll: true }); } catch (_) {}
  }

  /* ---------- envio ---------- */
  function aoEnviar() {
    var texto = input.value.trim();
    if (!texto) return;
    try { doc.dispatchEvent(new CustomEvent('farma:enviar', { detail: { texto: texto, opcao: estado.opcao ? estado.opcao.id : null, anexos: estado.anexos.map(function (a) { return a.arquivo; }) } })); } catch (_) {}
    // limpa depois que a FarmacIA já leu o texto (o envio dela roda no mesmo ciclo)
    win.setTimeout(function () {
      estado.anexos.forEach(function (a) { if (a.url) URL.revokeObjectURL(a.url); });
      estado.anexos = []; estado.opcao = null; desenharAnexos(); sync();
    }, 0);
  }

  function init() {
    form = $('farma-form'); input = $('farma-input'); send = $('farma-send');
    box = $('farma-box'); bar = $('farma-bar'); plus = $('farma-plus'); chip = $('farma-opcao'); chipNome = $('farma-opcao-nome');
    anexosEl = $('farma-anexos'); sheet = $('farma-sheet'); lista = $('farma-sheet-list');
    if (!form || !input || !box || !sheet) return;

    // o texto pode ser limpo por código (ao enviar, ao reiniciar): reavalia sempre que o valor muda
    var desc = Object.getOwnPropertyDescriptor(win.HTMLTextAreaElement.prototype, 'value');
    if (desc && desc.set) Object.defineProperty(input, 'value', { configurable: true, get: function () { return desc.get.call(input); }, set: function (v) { desc.set.call(input, v); sync(); } });

    input.addEventListener('input', sync);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        if (input.value.trim()) { if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true })); }
      }
    });
    form.addEventListener('submit', aoEnviar, true);

    plus.addEventListener('click', function () { if (sheet.hidden) abrirFolha(); else fecharFolha(); });
    chip.addEventListener('click', function () { estado.opcao = null; sync(); input.focus({ preventScroll: true }); });
    sheet.addEventListener('click', function (e) {
      var t = e.target; if (!t.closest) return;
      if (t.closest('[data-farma-sheet-close]')) { fecharFolha(); return; }
      var pick = t.closest('[data-farma-pick]');
      if (pick) { abrirSeletor('farma-file-' + pick.getAttribute('data-farma-pick')); return; }
      var op = t.closest('[data-farma-opcao]');
      if (op) escolherOpcao(op.getAttribute('data-farma-opcao'));
    });
    ['camera', 'fotos', 'arquivos'].forEach(function (k) { $('farma-file-' + k).addEventListener('change', function (e) { aoEscolherArquivo(e, k); }); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden && !(win.EditorImagem && win.EditorImagem.aberto())) { e.preventDefault(); fecharFolha(); } });
    // trocar de aba ou abrir o menu lateral fecha a folha
    doc.addEventListener('click', function (e) { if (!sheet.hidden && e.target.closest && e.target.closest('#bottom-nav, #farma-menu-btn')) fecharFolha(false); }, true);
    sync();
  }

  win.FarmaBarra = { opcoes: OPCOES, estado: function () { return { opcao: estado.opcao && estado.opcao.id, anexos: estado.anexos.length }; }, sync: sync };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
