/* FarmacIA — contexto conversacional (camada v2), só em memória da página (some ao recarregar ou em "Nova conversa").
 * Imediato: última pergunta/resposta, assunto, referências ("isso", "ele").
 * Da conversa: assunto principal, conceitos já explicados, perguntas anteriores.
 * Acadêmico: apenas dados públicos da disciplina citada (nunca o histórico/progresso do aluno). */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};
  function novo() { return { turnos: [], topico: null, conceitos: [], explicados: {}, modo: null }; }
  var S = novo();

  function plano(html) { return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
  function cortar(t, max) { t = String(t || ''); return t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, '') + '…'; }

  // Se a pergunta depende do que veio antes, devolve o texto com o assunto explícito.
  function resolver(interp, texto) {
    var original = String(texto || '');
    if (!S.topico || !interp || !interp.seguimento) return { texto: original, topico: S.topico ? S.topico.rotulo : '', usou: false };
    var rot = S.topico.rotulo;
    var t = original.replace(/\b(isso|disso|nisso|aquilo|esse processo|esse conceito|este conceito)\b/gi, rot);
    if (t === original) t = original.replace(/[?!.\s]+$/, '') + ' (assunto: ' + rot + ')';
    return { texto: t, topico: rot, usou: true };
  }

  function registrar(t) {   // t: { pergunta, html, interp, modo }
    var interp = t.interp || {};
    if (interp.conceitos && interp.conceitos.length) {
      S.topico = { rotulo: interp.conceitos.map(function (c) { return c.rotulo; }).slice(0, 2).join(' e '), termos: interp.conceitos.map(function (c) { return c.termo; }), categoria: interp.conceitos[0].categoria };
      interp.conceitos.forEach(function (c) { if (S.conceitos.indexOf(c.termo) < 0) S.conceitos.push(c.termo); S.explicados[c.termo] = true; });
    } else if (interp.farmacos && interp.farmacos.length) {
      S.topico = { rotulo: interp.farmacos[0], termos: interp.farmacos.slice(0, 1), categoria: 'farmacologia' };
    }
    S.turnos.push({ q: cortar(t.pergunta, 300), a: cortar(plano(t.html), 600), intencao: interp.intencao || '', modo: t.modo || 'conceitual' });
    if (S.turnos.length > 20) S.turnos.shift();
    S.modo = t.modo || 'conceitual';
  }
  function marcarLocal() { S.modo = 'local'; }

  // mensagens recentes (curtas) para enviar ao modelo: no máximo maxHistorico mensagens
  function historico() {
    var c = M.config.ia, out = [];
    S.turnos.filter(function (x) { return x.modo === 'conceitual'; }).slice(-Math.ceil(c.maxHistorico / 2)).forEach(function (x) {
      out.push({ r: 'u', t: cortar(x.q, c.maxCharsHistorico) });
      out.push({ r: 'a', t: cortar(x.a, c.maxCharsHistorico) });
    });
    return out.slice(-c.maxHistorico);
  }
  // dados públicos da grade (disciplinas.js) — não é progresso do aluno
  function academico(codigo) {
    if (!codigo || typeof getDisciplinaByCode !== 'function') return null;
    var d = getDisciplinaByCode(codigo);
    if (!d) return null;
    return { codigo: d.codigo, nome: d.nome, periodo: String(d.periodo), creditos: d.cred, horas: d.ch, pre: d.pre || '', co: d.co || '' };
  }
  // perfil: só período e turno (não identificam ninguém); nome e pronome ficam no aparelho
  function perfil() {
    try { var p = window.FarmacIA && window.FarmacIA._perfil ? window.FarmacIA._perfil() : {}; return { periodo: p.periodo || 0, turno: p.turno || '' }; } catch (e) { return { periodo: 0, turno: '' }; }
  }

  M.contexto = {
    resolver: resolver, registrar: registrar, marcarLocal: marcarLocal, historico: historico, academico: academico, perfil: perfil,
    modo: function () { return S.modo; }, topico: function () { return S.topico; }, explicados: function () { return S.conceitos.slice(); },
    ultimo: function () { return S.turnos[S.turnos.length - 1] || null; }, turnos: function () { return S.turnos.slice(); },
    reset: function () { S = novo(); }
  };
})();
