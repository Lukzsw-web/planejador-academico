/* =========================================================
   Editor de imagem da FarmacIA (v0.6.9)
   Tela cheia: cortar (moldura livre), girar 90°, desenhar (caneta), apagar (borracha),
   desfazer/refazer (até 5 passos), compartilhar e baixar.
   Uso: EditorImagem.abrir(arquivo, { aoConfirmar(blob, nome), aoCancelar() })
   Não depende de bibliotecas e funciona offline.
   ========================================================= */
(function () {
  'use strict';
  var doc = document;
  var MAX_LADO = 1800;          // maior lado da imagem de trabalho (protege a memória em celulares simples)
  var MAX_PASSOS = 5;           // desfazer: no máximo 5 passos
  var MIN_CORTE = 0.06;         // moldura mínima (fração da imagem)

  function T(x) { return typeof window.T === 'function' ? window.T(x) : x; }
  function toast(msg) { if (typeof window.showToast === 'function') window.showToast({ text: msg }); }
  function mk(tag, cls, attrs) {
    var el = doc.createElement(tag); if (cls) el.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
  function ico(d, extra) {
    return '<svg viewBox="0 0 24 24" fill="' + ((extra && extra.fill) || 'none') + '" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
  }
  var I = {
    x: '<path d="M6 6l12 12M18 6L6 18"></path>',
    ok: '<path d="M5 12.5l4.5 4.5L19 7.5"></path>',
    girar: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path>',
    caneta: '<path d="M14.5 5.5l4 4"></path><path d="M4 20l1.2-4.4L16.6 4.2a2.1 2.1 0 0 1 3 3L8.2 18.8z"></path>',
    borracha: '<path d="M7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"></path><path d="M22 21H7"></path><path d="M5 11l9 9"></path>',
    desfazer: '<path d="M9 14L4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"></path>',
    refazer: '<path d="M15 14l5-5-5-5"></path><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"></path>',
    compartilhar: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"></path>',
    baixar: '<rect x="3" y="3" width="18" height="18" rx="3"></rect><path d="M12 8v7M9 12l3 3 3-3"></path>'
  };

  var ativo = null;   // sessão aberta (só uma por vez)

  /* ---------- utilidades de imagem ---------- */
  function canvas(w, h) { var c = doc.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  function decodificar(file) {
    return new Promise(function (resolve, reject) {
      function fim(src, w, h) {
        var k = Math.min(1, MAX_LADO / Math.max(w, h));
        var c = canvas(w * k, h * k), x = c.getContext('2d');
        x.imageSmoothingQuality = 'high';
        x.drawImage(src, 0, 0, c.width, c.height);
        if (src.close) { try { src.close(); } catch (_) {} }
        resolve(c);
      }
      function viaImg() {
        var url = URL.createObjectURL(file), img = new Image();
        img.onload = function () { var w = img.naturalWidth, h = img.naturalHeight; fim(img, w, h); URL.revokeObjectURL(url); };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
        img.src = url;
      }
      if (window.createImageBitmap) {
        window.createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bm) { fim(bm, bm.width, bm.height); }, function () {
          window.createImageBitmap(file).then(function (bm) { fim(bm, bm.width, bm.height); }, viaImg);
        });
      } else viaImg();
    });
  }
  function copia(c) { var n = canvas(c.width, c.height); n.getContext('2d').drawImage(c, 0, 0); return n; }
  function girar90(c) {
    var n = canvas(c.height, c.width), x = n.getContext('2d');
    x.translate(0, n.height); x.rotate(-Math.PI / 2); x.drawImage(c, 0, 0);
    return n;
  }
  function hsv(h, s, v) {
    var f = function (n) { var k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
  }
  function rgbParaHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx];
  }

  /* ---------- sessão ---------- */
  function abrir(file, opcoes) {
    if (ativo) return;
    opcoes = opcoes || {};
    var voltarFoco = doc.activeElement;
    var S = {
      base: null, draw: null, ov: null, tmp: null,
      undo: [], redo: [],
      ferramenta: 'caneta',
      cor: { h: 354, s: .72, v: .9 },
      caneta: { tam: 10, op: 100 }, borracha: { tam: 24, op: 100 },
      corte: { x: 0, y: 0, w: 1, h: 1 },
      traco: null, quadro: 0, vista: { w: 0, h: 0 }
    };
    ativo = S;

    /* ----- DOM ----- */
    var root = mk('div', 'fed', { role: 'dialog', 'aria-modal': 'true', 'aria-label': T('Editor de imagem') });
    root.setAttribute('data-no-tab-swipe', 'true');
    var topo = mk('div', 'fed-top');
    var bX = mk('button', 'fed-btn fed-x', { type: 'button', 'aria-label': T('Cancelar'), title: T('Cancelar') }); bX.innerHTML = ico(I.x);
    var bGirar = mk('button', 'fed-btn fed-girar', { type: 'button', 'aria-label': T('Girar 90°'), title: T('Girar 90°') }); bGirar.innerHTML = ico(I.girar);
    var bOk = mk('button', 'fed-btn fed-ok', { type: 'button', 'aria-label': T('Aplicar'), title: T('Aplicar') }); bOk.innerHTML = ico(I.ok);
    topo.appendChild(bX); topo.appendChild(bGirar); topo.appendChild(bOk);

    var palco = mk('div', 'fed-stage');
    var cv = mk('canvas', 'fed-cv');
    var moldura = mk('div', 'fed-crop');
    ['nw', 'ne', 'sw', 'se'].forEach(function (p) { moldura.appendChild(mk('span', 'fed-h fed-h-' + p)); });
    ['n', 's', 'w', 'e'].forEach(function (p) { moldura.appendChild(mk('span', 'fed-e fed-e-' + p)); });
    moldura.appendChild(mk('span', 'fed-grade'));
    palco.appendChild(cv); palco.appendChild(moldura);

    var cartao = mk('div', 'fed-card', { role: 'group' }); cartao.hidden = true;
    var barra = mk('div', 'fed-bar', { role: 'toolbar', 'aria-label': T('Ferramentas de desenho') });
    function botao(cls, icone, rotulo) {
      var b = mk('button', 'fed-tool ' + cls, { type: 'button', 'aria-label': T(rotulo), title: T(rotulo) });
      b.innerHTML = ico(icone); return b;
    }
    var bCaneta = botao('fed-caneta', I.caneta, 'Caneta');
    var bBorracha = botao('fed-borracha', I.borracha, 'Borracha');
    var bDesf = botao('fed-desfazer', I.desfazer, 'Desfazer');
    var bRef = botao('fed-refazer', I.refazer, 'Refazer');
    var sep = mk('span', 'fed-sep', { 'aria-hidden': 'true' });
    var bComp = botao('fed-comp', I.compartilhar, 'Compartilhar');
    var bBaixar = botao('fed-baixar', I.baixar, 'Baixar imagem');
    [bCaneta, bBorracha, bDesf, bRef, sep, bComp, bBaixar].forEach(function (e) { barra.appendChild(e); });
    root.appendChild(topo); root.appendChild(palco); root.appendChild(cartao); root.appendChild(barra);
    doc.body.appendChild(root);
    doc.documentElement.classList.add('fed-aberto');

    var ctx = cv.getContext('2d');

    /* ----- geometria ----- */
    function ajustarVista() {
      if (!S.base) return;
      var r = palco.getBoundingClientRect();
      var m = 14, aw = Math.max(40, r.width - m * 2), ah = Math.max(40, r.height - m * 2);
      var k = Math.min(aw / S.base.width, ah / S.base.height);
      var w = Math.floor(S.base.width * k), h = Math.floor(S.base.height * k);
      S.vista = { w: w, h: h };
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      cv.style.left = Math.round((r.width - w) / 2) + 'px'; cv.style.top = Math.round((r.height - h) / 2) + 'px';
      posicionarMoldura();
    }
    function posicionarMoldura() {
      var L = cv.offsetLeft, Tt = cv.offsetTop, w = S.vista.w, h = S.vista.h, c = S.corte;
      moldura.style.left = (L + c.x * w) + 'px'; moldura.style.top = (Tt + c.y * h) + 'px';
      moldura.style.width = (c.w * w) + 'px'; moldura.style.height = (c.h * h) + 'px';
    }
    function pintar() {
      S.quadro = 0;
      if (cv.width !== S.base.width || cv.height !== S.base.height) { cv.width = S.base.width; cv.height = S.base.height; }
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(S.base, 0, 0);
      var t = S.traco;
      if (t && t.tipo === 'caneta') {
        ctx.drawImage(S.draw, 0, 0);
        ctx.globalAlpha = t.op; ctx.drawImage(S.ov, 0, 0); ctx.globalAlpha = 1;
      } else if (t && t.tipo === 'borracha') {
        var tx = S.tmp.getContext('2d');
        tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, S.tmp.width, S.tmp.height); tx.drawImage(S.draw, 0, 0);
        tx.globalCompositeOperation = 'destination-out'; tx.globalAlpha = t.op; tx.drawImage(S.ov, 0, 0); tx.globalAlpha = 1; tx.globalCompositeOperation = 'source-over';
        ctx.drawImage(S.tmp, 0, 0);
      } else ctx.drawImage(S.draw, 0, 0);
    }
    function agendar() { if (!S.quadro) S.quadro = window.requestAnimationFrame(pintar); }
    function camadas() {
      S.ov = canvas(S.base.width, S.base.height);
      S.tmp = canvas(S.base.width, S.base.height);
    }

    /* ----- histórico (até 5 passos) ----- */
    function atualizarHist() { bDesf.disabled = !S.undo.length; bRef.disabled = !S.redo.length; }
    function empilhar(lista, e) { lista.push(e); while (lista.length > MAX_PASSOS) lista.shift(); }
    function estadoAtual(copiar) { return { base: S.base, draw: copiar ? copia(S.draw) : S.draw }; }
    function aplicarEstado(e) {
      var mudou = !S.base || S.base.width !== e.base.width || S.base.height !== e.base.height || S.base !== e.base;
      S.base = e.base; S.draw = e.draw; camadas();
      if (mudou) { S.corte = { x: 0, y: 0, w: 1, h: 1 }; ajustarVista(); }
      pintar();
    }
    function desfazer() {
      if (!S.undo.length) return;
      empilhar(S.redo, estadoAtual(false));
      aplicarEstado(S.undo.pop()); atualizarHist();
    }
    function refazer() {
      if (!S.redo.length) return;
      empilhar(S.undo, estadoAtual(false));
      aplicarEstado(S.redo.pop()); atualizarHist();
    }

    /* ----- desenho ----- */
    function tamanhoBmp(tam) { return Math.max(1, tam * (S.base.width / Math.max(1, S.vista.w))); }
    function corCss() { var c = hsv(S.cor.h, S.cor.s, S.cor.v); return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
    function ponto(e) {
      var r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * S.base.width, y: (e.clientY - r.top) / r.height * S.base.height };
    }
    function iniciarTraco(e) {
      var cfg = S.ferramenta === 'caneta' ? S.caneta : S.borracha, p = ponto(e);
      var o = S.ov.getContext('2d');
      o.clearRect(0, 0, S.ov.width, S.ov.height);
      o.lineCap = 'round'; o.lineJoin = 'round'; o.lineWidth = tamanhoBmp(cfg.tam);
      o.strokeStyle = S.ferramenta === 'caneta' ? corCss() : '#000';
      o.beginPath(); o.moveTo(p.x, p.y); o.lineTo(p.x + .01, p.y); o.stroke();
      S.traco = { tipo: S.ferramenta, op: cfg.op / 100, ult: p, meio: p, moveu: false };
      agendar();
    }
    function continuarTraco(e) {
      var t = S.traco; if (!t) return;
      var p = ponto(e), o = S.ov.getContext('2d');
      var m = { x: (t.ult.x + p.x) / 2, y: (t.ult.y + p.y) / 2 };
      o.beginPath(); o.moveTo(t.meio.x, t.meio.y); o.quadraticCurveTo(t.ult.x, t.ult.y, m.x, m.y); o.stroke();
      t.meio = m; t.ult = p; t.moveu = true; agendar();
    }
    function encerrarTraco() {
      var t = S.traco; if (!t) return;
      var o = S.ov.getContext('2d');
      o.beginPath(); o.moveTo(t.meio.x, t.meio.y); o.lineTo(t.ult.x, t.ult.y); o.stroke();
      empilhar(S.undo, estadoAtual(true)); S.redo = [];          // guarda o desenho ANTES deste traço
      var d = S.draw.getContext('2d');
      d.globalAlpha = t.op;
      d.globalCompositeOperation = t.tipo === 'caneta' ? 'source-over' : 'destination-out';
      d.drawImage(S.ov, 0, 0);
      d.globalAlpha = 1; d.globalCompositeOperation = 'source-over';
      S.traco = null; S.ov.getContext('2d').clearRect(0, 0, S.ov.width, S.ov.height);
      atualizarHist(); pintar();
    }

    /* ----- moldura de corte ----- */
    var arrasto = null;
    function zona(e) {
      var r = moldura.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, g = 26;
      var perto = function (v, lim) { return Math.abs(v - lim) <= g; };
      var dentroX = x > -g && x < r.width + g, dentroY = y > -g && y < r.height + g;
      if (!dentroX || !dentroY) return '';
      var n = perto(y, 0), s = perto(y, r.height), w = perto(x, 0), l = perto(x, r.width);
      if (n && w) return 'nw'; if (n && l) return 'ne'; if (s && w) return 'sw'; if (s && l) return 'se';
      if (n) return 'n'; if (s) return 's'; if (w) return 'w'; if (l) return 'e';
      return '';
    }
    function moverMoldura(e) {
      var a = arrasto, w = S.vista.w, h = S.vista.h;
      var dx = (e.clientX - a.x) / w, dy = (e.clientY - a.y) / h, c = a.ini, z = a.z;
      var x0 = c.x, y0 = c.y, x1 = c.x + c.w, y1 = c.y + c.h;
      if (z.indexOf('w') >= 0) x0 = Math.min(Math.max(0, c.x + dx), x1 - MIN_CORTE);
      if (z.indexOf('e') >= 0) x1 = Math.max(Math.min(1, c.x + c.w + dx), x0 + MIN_CORTE);
      if (z.indexOf('n') >= 0) y0 = Math.min(Math.max(0, c.y + dy), y1 - MIN_CORTE);
      if (z.indexOf('s') >= 0) y1 = Math.max(Math.min(1, c.y + c.h + dy), y0 + MIN_CORTE);
      S.corte = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; posicionarMoldura();
    }

    palco.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      fecharCartao();
      var z = zona(e);
      try { palco.setPointerCapture(e.pointerId); } catch (_) {}
      if (z) { arrasto = { z: z, x: e.clientX, y: e.clientY, ini: { x: S.corte.x, y: S.corte.y, w: S.corte.w, h: S.corte.h }, id: e.pointerId }; moldura.classList.add('is-arrasto'); e.preventDefault(); return; }
      var r = cv.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      iniciarTraco(e); arrasto = { desenho: true, id: e.pointerId }; e.preventDefault();
    });
    palco.addEventListener('pointermove', function (e) {
      if (!arrasto || e.pointerId !== arrasto.id) return;
      if (arrasto.desenho) {
        var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
        if (evs && evs.length) evs.forEach(continuarTraco); else continuarTraco(e);
      } else moverMoldura(e);
      e.preventDefault();
    });
    function soltar(e) {
      if (!arrasto || (e && e.pointerId !== arrasto.id)) return;
      if (arrasto.desenho) encerrarTraco(); else moldura.classList.remove('is-arrasto');
      arrasto = null;
    }
    palco.addEventListener('pointerup', soltar);
    palco.addEventListener('pointercancel', soltar);
    palco.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* ----- cartões (cor, espessura, opacidade) ----- */
    function fecharCartao() { cartao.hidden = true; cartao.innerHTML = ''; bCaneta.classList.remove('is-card'); bBorracha.classList.remove('is-card'); }
    function slider(rotulo, min, max, valor, aoMudar, sufixo) {
      var linha = mk('label', 'fed-slider');
      var topoL = mk('span', 'fed-slider-top'), nome = mk('span', '', {}), val = mk('output', 'fed-slider-val');
      nome.textContent = T(rotulo); topoL.appendChild(nome); topoL.appendChild(val);
      var inp = mk('input', '', { type: 'range', min: String(min), max: String(max), step: '1' });
      inp.value = String(valor);
      var mostrar = function () { val.textContent = inp.value + (sufixo || ''); inp.style.setProperty('--p', ((inp.value - min) / (max - min) * 100) + '%'); };
      inp.addEventListener('input', function () { mostrar(); aoMudar(+inp.value); amostra(); });
      mostrar(); linha.appendChild(topoL); linha.appendChild(inp); return linha;
    }
    var amostraEl = null;
    function amostra() {
      if (!amostraEl) return;
      var cfg = S.ferramenta === 'caneta' ? S.caneta : S.borracha, c = amostraEl, x = c.getContext('2d');
      x.clearRect(0, 0, c.width, c.height);
      var w = c.width, h = c.height;
      x.fillStyle = '#3a3d3c'; x.fillRect(0, 0, w, h);
      x.globalAlpha = cfg.op / 100; x.lineCap = 'round'; x.lineWidth = Math.min(cfg.tam, h - 6);
      x.strokeStyle = S.ferramenta === 'caneta' ? corCss() : '#f4f7f5';
      x.beginPath(); x.moveTo(18, h / 2); x.bezierCurveTo(w * .35, h * .2, w * .6, h * .8, w - 18, h / 2); x.stroke();
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    }
    function abrirCartao(qual) {
      cartao.innerHTML = ''; cartao.hidden = false;
      cartao.setAttribute('aria-label', T(qual === 'caneta' ? 'Caneta' : 'Borracha'));
      (qual === 'caneta' ? bCaneta : bBorracha).classList.add('is-card');
      var cfg = qual === 'caneta' ? S.caneta : S.borracha;
      amostraEl = mk('canvas', 'fed-amostra'); amostraEl.width = 300; amostraEl.height = 56;
      if (qual === 'caneta') {
        var roda = mk('div', 'fed-roda', { role: 'application', 'aria-label': T('Círculo de cores') });
        var pino = mk('span', 'fed-pino'); roda.appendChild(pino);
        var posPino = function () {
          var a = S.cor.h * Math.PI / 180, rr = S.cor.s * 50;
          pino.style.left = (50 + Math.cos(a) * rr) + '%'; pino.style.top = (50 + Math.sin(a) * rr) + '%';
          var c = hsv(S.cor.h, S.cor.s, 1); pino.style.background = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        };
        var escolher = function (e) {
          var r = roda.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          var raio = r.width / 2, d = Math.min(raio, Math.hypot(dx, dy));
          var h = Math.atan2(dy, dx) * 180 / Math.PI; if (h < 0) h += 360;
          S.cor.h = h; S.cor.s = d / raio; posPino(); claro.style.setProperty('--cor', corBase()); amostra();
        };
        var arr = false;
        roda.addEventListener('pointerdown', function (e) { arr = true; try { roda.setPointerCapture(e.pointerId); } catch (_) {} escolher(e); e.preventDefault(); });
        roda.addEventListener('pointermove', function (e) { if (arr) { escolher(e); e.preventDefault(); } });
        roda.addEventListener('pointerup', function () { arr = false; });
        roda.addEventListener('pointercancel', function () { arr = false; });
        var corBase = function () { var c = hsv(S.cor.h, S.cor.s, 1); return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; };
        var claro = slider('Brilho', 5, 100, Math.round(S.cor.v * 100), function (v) { S.cor.v = v / 100; }, '%');
        claro.classList.add('fed-slider-brilho'); claro.style.setProperty('--cor', corBase());
        cartao.appendChild(roda); cartao.appendChild(claro); posPino();
      }
      cartao.appendChild(slider('Espessura', 2, 60, cfg.tam, function (v) { cfg.tam = v; }, ' px'));
      cartao.appendChild(slider('Opacidade', 5, 100, cfg.op, function (v) { cfg.op = v; }, '%'));
      cartao.appendChild(amostraEl); amostra();
    }
    function escolherFerramenta(qual) {
      var jaAtiva = S.ferramenta === qual;
      S.ferramenta = qual;
      bCaneta.classList.toggle('is-on', qual === 'caneta'); bBorracha.classList.toggle('is-on', qual === 'borracha');
      bCaneta.setAttribute('aria-pressed', qual === 'caneta' ? 'true' : 'false'); bBorracha.setAttribute('aria-pressed', qual === 'borracha' ? 'true' : 'false');
      if (jaAtiva && !cartao.hidden && cartao.getAttribute('aria-label') === T(qual === 'caneta' ? 'Caneta' : 'Borracha')) fecharCartao();
      else { fecharCartao(); abrirCartao(qual); }
    }

    /* ----- exportar / compartilhar / baixar ----- */
    function recorte() {
      var c = S.corte, w = S.base.width, h = S.base.height;
      var x = Math.round(c.x * w), y = Math.round(c.y * h), cw = Math.max(1, Math.round(c.w * w)), ch = Math.max(1, Math.round(c.h * h));
      var o = canvas(cw, ch), ox = o.getContext('2d');
      ox.drawImage(S.base, x, y, cw, ch, 0, 0, cw, ch);
      ox.drawImage(S.draw, x, y, cw, ch, 0, 0, cw, ch);
      return o;
    }
    function gerarBlob() {
      return new Promise(function (res, rej) {
        var o = recorte();
        if (o.toBlob) o.toBlob(function (b) { b ? res(b) : rej(new Error('blob')); }, 'image/jpeg', 0.92);
        else rej(new Error('blob'));
      });
    }
    function nomeArquivo() { return 'farmacia-imagem-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.jpg'; }
    function baixar() {
      gerarBlob().then(function (b) {
        var url = URL.createObjectURL(b), a = mk('a', '', { href: url, download: nomeArquivo() });
        a.style.display = 'none'; doc.body.appendChild(a); a.click();
        window.setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
      }, function () { toast(T('Não foi possível gerar a imagem.')); });
    }
    function compartilhar() {
      gerarBlob().then(function (b) {
        var f = new File([b], nomeArquivo(), { type: 'image/jpeg' });
        if (navigator.canShare && navigator.share && navigator.canShare({ files: [f] })) {
          navigator.share({ files: [f] }).catch(function (err) { if (err && err.name !== 'AbortError') toast(T('Não foi possível compartilhar.')); });
        } else toast(T('Compartilhar não está disponível neste navegador. Use o botão de baixar.'));
      }, function () { toast(T('Não foi possível gerar a imagem.')); });
    }

    /* ----- fechar ----- */
    function fechar(foco) {
      if (!ativo) return;
      if (S.quadro) window.cancelAnimationFrame(S.quadro);
      window.removeEventListener('resize', ajustarVista);
      doc.removeEventListener('keydown', teclas, true);
      root.remove(); doc.documentElement.classList.remove('fed-aberto');
      ativo = null;
      if (foco !== false && voltarFoco && voltarFoco.focus) { try { voltarFoco.focus({ preventScroll: true }); } catch (_) {} }
    }
    function cancelar() { fechar(); if (opcoes.aoCancelar) opcoes.aoCancelar(); }
    function aplicar() {
      bOk.disabled = true;
      gerarBlob().then(function (b) { var nome = nomeArquivo(); fechar(); if (opcoes.aoConfirmar) opcoes.aoConfirmar(b, nome); },
        function () { bOk.disabled = false; toast(T('Não foi possível gerar a imagem.')); });
    }
    function teclas(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!cartao.hidden) fecharCartao(); else cancelar(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? refazer() : desfazer(); return; }
      if (e.key === 'Tab') {      // mantém o foco dentro do editor
        var fs = [].filter.call(root.querySelectorAll('button:not([disabled]), input'), function (el) { return el.offsetParent !== null; });
        if (!fs.length) return;
        var i = fs.indexOf(doc.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); fs[fs.length - 1].focus(); }
        else if (!e.shiftKey && i === fs.length - 1) { e.preventDefault(); fs[0].focus(); }
      }
    }

    bX.addEventListener('click', cancelar);
    bOk.addEventListener('click', aplicar);
    bGirar.addEventListener('click', function () {
      fecharCartao();
      empilhar(S.undo, estadoAtual(false)); S.redo = [];
      S.base = girar90(S.base); S.draw = girar90(S.draw); camadas();
      S.corte = { x: 0, y: 0, w: 1, h: 1 }; ajustarVista(); pintar(); atualizarHist();
    });
    bCaneta.addEventListener('click', function () { escolherFerramenta('caneta'); });
    bBorracha.addEventListener('click', function () { escolherFerramenta('borracha'); });
    bDesf.addEventListener('click', function () { fecharCartao(); desfazer(); });
    bRef.addEventListener('click', function () { fecharCartao(); refazer(); });
    bComp.addEventListener('click', compartilhar);
    bBaixar.addEventListener('click', baixar);
    doc.addEventListener('keydown', teclas, true);
    window.addEventListener('resize', ajustarVista);
    bCaneta.classList.add('is-on'); bCaneta.setAttribute('aria-pressed', 'true'); bBorracha.setAttribute('aria-pressed', 'false');
    atualizarHist();
    root.classList.add('is-carregando');

    /* ----- carregar a imagem ----- */
    decodificar(file).then(function (c) {
      if (ativo !== S) return;
      S.base = c; S.draw = canvas(c.width, c.height); camadas();
      root.classList.remove('is-carregando');
      ajustarVista(); pintar();
      bX.focus({ preventScroll: true });
    }, function () {
      fechar(false); toast(T('Não foi possível abrir esta imagem.'));
      if (opcoes.aoCancelar) opcoes.aoCancelar();
    });
  }

  window.EditorImagem = { abrir: abrir, aberto: function () { return !!ativo; } };
})();
