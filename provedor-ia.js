/* FarmacIA — camada de provedores de IA (independente de fornecedor).
 * Interface de um provedor: { id, disponivel() -> bool, enviar(payload, { signal, timeoutMs }) -> Promise<{ texto, modelo, cache }> }.
 * Erros sempre viram { codigo, mensagem, retryMs }. O provedor padrão ('edge') fala com a Edge Function do Supabase,
 * que guarda as chaves e escolhe o modelo: nenhuma chave privada existe no navegador. */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};
  var registro = {}, atual = 'edge';
  var est = { chamadas: 0, ultima: 0, falhas: 0, pausadoAte: 0, ctl: null };

  function erro(codigo, mensagem, retryMs) { var e = new Error(mensagem || codigo); e.codigo = codigo; e.retryMs = retryMs || 0; return e; }

  var edge = {
    id: 'edge',
    disponivel: function () { return !!M.endpointIA() && !!M.chavePublica(); },
    enviar: function (payload, o) {
      var timer, ctl = new AbortController(), fim = false;
      if (o.signal) o.signal.addEventListener('abort', function () { ctl.abort(); });
      var limite = new Promise(function (_, rej) { timer = setTimeout(function () { fim = true; ctl.abort(); rej(erro('timeout', 'tempo esgotado')); }, o.timeoutMs); });
      var req = fetch(M.endpointIA(), {
        method: 'POST', cache: 'no-store', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', apikey: M.chavePublica() }, body: JSON.stringify(payload)
      }).then(function (res) {
        var retry = Number(res.headers.get('Retry-After')) * 1000 || 0;
        return res.text().then(function (txt) {
          var j = null; try { j = JSON.parse(txt); } catch (e) { j = null; }
          if (res.status === 429) throw erro('limite', 'limite de uso', retry || (j && j.retryMs) || 30000);
          if (res.status === 401 || res.status === 403) throw erro('auth', 'autenticação recusada');
          if (res.status >= 500 || res.status === 404) throw erro('indisponivel', 'serviço indisponível (' + res.status + ')');
          if (!res.ok) throw erro(j && j.erro === 'fora_do_escopo' ? 'fora_do_escopo' : 'indisponivel', (j && j.erro) || 'erro ' + res.status);
          if (!j || typeof j.texto !== 'string' || j.texto.trim().length < 2 || j.texto.length > 8000) throw erro('resposta_invalida', 'resposta inválida');
          return { texto: j.texto, modelo: j.modelo || '', cache: !!j.cache };
        });
      }).catch(function (e) {
        if (e && e.codigo) throw e;
        if (e && e.name === 'AbortError') throw fim ? erro('timeout', 'tempo esgotado') : erro('cancelado', 'cancelado');
        throw erro('offline', 'sem conexão');
      });
      return Promise.race([req, limite]).then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
    }
  };
  registro.edge = edge;

  function registrar(id, impl) { registro[id] = impl; }
  function usar(id) { if (registro[id]) atual = id; }
  function provedor() { return registro[atual]; }

  // Pode chamar agora? Considera chave geral, consentimento, modo, rede, disjuntor, intervalo e teto da sessão.
  function pode() {
    var c = M.config.ia, now = Date.now(), p = provedor();
    if (!c.habilitada || !p || !p.disponivel()) return { ok: false, motivo: 'desabilitado' };
    if (M.armazenar.ler(M.config.storage.modo) === 'offline') return { ok: false, motivo: 'modo_offline' };
    if (M.armazenar.ler(M.config.storage.consentimento) !== '1') return { ok: false, motivo: 'sem_consentimento' };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, motivo: 'offline' };
    if (est.pausadoAte > now) return { ok: false, motivo: 'pausado', aguardarMs: est.pausadoAte - now };
    if (est.chamadas >= c.maxPorSessao) return { ok: false, motivo: 'teto_sessao' };
    if (now - est.ultima < c.intervaloMinMs) return { ok: false, motivo: 'intervalo', aguardarMs: c.intervaloMinMs - (now - est.ultima) };
    return { ok: true };
  }

  function enviar(payload) {
    var c = M.config.ia, chk = pode();
    if (!chk.ok) return Promise.reject(Object.assign(erro(chk.motivo, chk.motivo, chk.aguardarMs), { bloqueio: true }));
    est.chamadas += 1; est.ultima = Date.now();
    est.ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var ctl = est.ctl;
    return provedor().enviar(payload, { signal: ctl && ctl.signal, timeoutMs: c.timeoutMs }).then(function (r) { est.falhas = 0; return r; }, function (e) {
      if (e.codigo !== 'cancelado' && e.codigo !== 'fora_do_escopo' && e.codigo !== 'limite') {
        est.falhas += 1;
        if (est.falhas >= c.falhasParaPausar) { est.pausadoAte = Date.now() + c.pausaMs; est.falhas = 0; }
      }
      throw e;
    });
  }
  function cancelar() { if (est.ctl) { try { est.ctl.abort(); } catch (e) { /* já encerrada */ } } }

  M.ia = { enviar: enviar, cancelar: cancelar, pode: pode, registrar: registrar, usar: usar, estado: function () { return { chamadas: est.chamadas, pausadoAte: est.pausadoAte, falhas: est.falhas }; }, resetar: function () { est.chamadas = 0; est.ultima = 0; est.falhas = 0; est.pausadoAte = 0; } };
})();
