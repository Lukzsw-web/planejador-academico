/* FarmacIA — orquestrador híbrido (offline + online).
 * O farmacia.js responde primeiro (grade, regras da UFRJ, conversa) e entrega o resultado a interceptar().
 * Aqui se decide se a pergunta é de CONTEÚDO (conceito, explicação, comparação, exemplo, revisão) e, se for:
 *   interpreta -> resolve referências ("isso") -> recupera trechos (RAG) -> IA online, se permitida e disponível;
 *   senão, material local; se nada serve, admite que não sabe. Falha online nunca trava a tela nem apaga a pergunta.
 * Respostas de IA e respostas prontas do material local são rotuladas de forma diferente. */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};
  var F = function () { return window.FarmacIA || {}; };
  function esc(v) { return F()._esc ? F()._esc(v) : String(v); }
  function p(h) { return '<p>' + h + '</p>'; }
  function R(html, chips) { return { html: html, chips: chips || [], id: 'conceito' }; }
  function perfil() { try { return F()._perfil ? F()._perfil() : {}; } catch (e) { return {}; } }
  function nomeHTML() { var n = perfil().nome; return n ? '<strong>' + esc(n) + '</strong>' : ''; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var OVERR = { info: 1, topic: 1, unknown: 1, followup: 1, reexplain: 1, more: 1, why: 1 };
  var SOCIAL = { ack: 1, thanks: 1, greet: 1, bye: 1, praise: 1, howare: 1, invite: 1, who: 1, about: 1, myname: 1, setname: 1, setpron: 1, setperiod: 1, setshift: 1, frustrated: 1, empty: 1 };
  var pendente = null, primeiro = true, cache = [], consentMostrado = false;

  // ---------- comandos de privacidade e de modo ----------
  function consentimento() { return M.armazenar.ler(M.config.storage.consentimento) === '1'; }
  function privacidadeHTML() {
    var on = consentimento() && M.armazenar.ler(M.config.storage.modo) !== 'offline';
    return p('<strong>O que fica no seu aparelho</strong>') +
      p('• Nome, pronome, período, turno e foto do perfil (só aqui, nas Configurações).<br>• Se você permitiu ou não a IA online, e um código aleatório sem ligação com você, usado só para limitar abusos.<br>• O histórico desta conversa fica apenas na memória da página: some ao recarregar ou em “Nova conversa”.') +
      p('<strong>O que sai do aparelho (só quando uso a IA online, e só se você permitir)</strong>') +
      p('• A sua pergunta (até ' + M.config.ia.maxPergunta + ' caracteres) e as últimas mensagens da conversa, resumidas.<br>• Trechos do material local usados como base.<br>• Dados públicos da disciplina citada e o seu período e turno, se estiverem no perfil.<br>• O servidor vê o seu endereço de rede (IP) para limitar abusos; ele não guarda o texto das perguntas nos registros.') +
      p('<strong>O que nunca é enviado:</strong> nome, pronome, foto, notas, disciplinas que você marcou como cursadas e e-mail.') +
      p('Perguntas sobre a sua grade e sobre as regras da UFRJ são respondidas no próprio aparelho, sem enviar nada. A IA online está <strong>' + (on ? 'ativada' : 'desativada') + '</strong>.');
  }
  function comando(n, raw) {
    if (/\b(o que (e|eh|foi|sao) (enviado|mandado|armazenado|guardado|salvo|enviados)|o que (voce )?(envia|manda|guarda|armazena|coleta)|privacidade|meus dados|dados (enviados|armazenados)|para onde (vai|vao) (a )?(minha|as)|ia online (e )?segura)\b/.test(n)) {
      var on = consentimento() && M.armazenar.ler(M.config.storage.modo) !== 'offline';
      return R(privacidadeHTML(), on ? [{ label: 'Usar só offline', q: 'Usar só offline' }] : [{ label: 'Permitir IA online', q: 'Permitir IA online' }]);
    }
    if (/\b(permitir|ativar|ativa|autorizo|autorizar|liberar|habilitar|ligar)\b.*\bia\b|\busar ia( online)?\b/.test(n) && !/\b(nao|desativ\w*|desligar)\b/.test(n)) {
      M.armazenar.gravar(M.config.storage.consentimento, '1'); M.armazenar.apagar(M.config.storage.modo);
      if (pendente) { var pd = pendente; pendente = null; return tratar(pd.raw, pd.interp, pd.local, p('Combinado' + (nomeHTML() ? ', ' + nomeHTML() : '') + ': IA online ativada. Respondendo a sua pergunta…')); }
      return R(p('Pronto' + (nomeHTML() ? ', ' + nomeHTML() : '') + ': a <strong>IA online</strong> está ativada para perguntas de conteúdo. Ela nunca é usada para a sua grade ou para as regras da UFRJ. Para desligar, diga “usar só offline”.'), [{ label: 'O que é enviado?', q: 'O que é enviado?' }]);
    }
    if (/\b(so offline|somente offline|apenas offline|usar offline|desativar ia|desativa ia|desligar ia|nao usar ia|sem ia|parar de usar ia|revogar)\b/.test(n)) {
      M.armazenar.gravar(M.config.storage.modo, 'offline'); M.armazenar.apagar(M.config.storage.consentimento); pendente = null; M.ia.cancelar();
      return R(p('Certo: a <strong>IA online está desligada</strong>. Continuo respondendo a grade, as regras e o material local, sem enviar nada para fora. Para religar, diga “permitir IA online”.'), [{ label: 'Permitir IA online', q: 'Permitir IA online' }]);
    }
    if (/\b(esquecer (a )?conversa|limpar (o )?contexto|apagar (o )?historico (da conversa)?)\b/.test(n)) {
      M.contexto.reset();
      return R(p('Pronto, esqueci o contexto desta conversa. O próximo assunto começa do zero.'));
    }
    return null;
  }

  // ---------- mensagens ----------
  function chipsPos(interp) {
    var todos = [['exemplo', 'Me dá um exemplo', 'Me dá um exemplo'], ['reformular', 'Explicar de outro jeito', 'Pode explicar de outro jeito?'], ['aprofundar', 'Aprofundar', 'Quero uma explicação mais aprofundada'], ['exercicio', 'Me faça perguntas', 'Me faça perguntas de revisão sobre isso']];
    return todos.filter(function (c) { return c[0] !== interp.intencao; }).slice(0, 4).map(function (c) { return { label: c[1], q: c[2] }; });
  }
  function consentHTML() {
    return p('<strong>Quer que eu use IA online para explicar melhor' + (nomeHTML() ? ', ' + nomeHTML() : '') + '?</strong>') +
      p('Só para perguntas de conteúdo de Farmácia. Ao permitir, enviamos ao serviço de IA a sua pergunta, as últimas mensagens (resumidas), trechos do material usado e o seu período e turno, se estiverem no perfil. <strong>Não enviamos</strong> nome, pronome, foto, notas nem as matérias que você marcou. Dá para desligar quando quiser.');
  }
  var CHIPS_CONSENT = [{ label: 'Permitir IA online', q: 'Permitir IA online' }, { label: 'Só offline', q: 'Usar só offline' }, { label: 'O que é enviado?', q: 'O que é enviado?' }];
  function avisoFalha(e) {
    var nm = nomeHTML() ? ', ' + nomeHTML() : '';
    switch (e.codigo) {
      case 'offline': return p('Estou sem conexão agora' + nm + ', então não consegui usar a IA online.');
      case 'timeout': return p('A IA online demorou demais para responder e eu parei de esperar.');
      case 'limite': return p('Muita gente usando a IA online ou muitas perguntas em pouco tempo (limite de uso). Tente de novo em ' + Math.max(5, Math.round((e.retryMs || 30000) / 1000)) + ' segundos.');
      case 'auth': return p('A IA online recusou a conexão (falha de autenticação do serviço). Isso é problema do app, não seu: avise a equipe do Planejador.');
      case 'resposta_invalida': return p('A IA online devolveu uma resposta que eu não consegui usar.');
      case 'pausado': return p('A IA online está pausada por alguns instantes depois de falhas seguidas.');
      case 'teto_sessao': return p('Você já usou bastante a IA online nesta sessão; para poupar o serviço gratuito, ela descansa até você recarregar a página.');
      case 'intervalo': return p('Calma, uma pergunta de cada vez: espere alguns segundos para a próxima.');
      case 'fora_do_escopo': return p('Esse assunto está fora do que eu posso ajudar: conteúdo de Farmácia e vida acadêmica na UFRJ.');
      default: return p('O serviço de IA online está indisponível agora.');
    }
  }
  function chave(res, interp, busca) {
    var u = M.contexto.ultimo();
    return [M.busca.norm(res.texto), interp.intencao, interp.nivel, (busca.resultados || []).map(function (r) { return r.id; }).join(','), u ? M.busca.norm(u.q) : ''].join('|');
  }

  function semIA(raw, interp, local, busca, aviso, retry) {
    var loc = M.rag.formatarLocal(busca, interp), html = aviso || '', chips = [];
    if (loc) { html += loc; M.contexto.registrar({ pergunta: raw, html: loc, interp: interp, modo: 'conceitual' }); chips = chipsPos(interp).slice(0, 2); }
    else if (local && local.id === 'topic') { html += local.html; chips = local.chips || []; }
    else if (interp.intencao === 'exercicio') html += p('Para criar perguntas de revisão eu preciso da IA online. Sem ela, só consigo mostrar o material local.');
    else html += p('Não encontrei isso no material local e, sem a IA online, prefiro não arriscar uma explicação. Você pode tentar com outras palavras ou procurar o professor da disciplina.');
    if (retry) chips = [{ label: 'Tentar novamente', q: raw }].concat(chips);
    return R(html, chips.length ? chips : (F()._chips ? F()._chips() : []));
  }

  function tratar(raw, interp, local, prefixo) {
    var res = M.contexto.resolver(interp, raw), busca = M.rag.preparar(interp, res.texto), chk = M.ia.pode();
    if (!busca.suficiente) busca = { resultados: [], cobertura: busca.cobertura, suficiente: false, vazio: busca.vazio };   // material fraco não vira "fonte" nem contexto
    prefixo = prefixo || '';
    if (!chk.ok) {
      if (chk.motivo === 'sem_consentimento') {
        pendente = { raw: raw, interp: interp, local: local };
        var base = semIA(raw, interp, local, busca, '', false);
        var pedido = consentMostrado ? '' : consentHTML(); consentMostrado = true;
        return Promise.resolve(R(base.html + pedido, CHIPS_CONSENT));
      }
      if (chk.motivo === 'intervalo' && chk.aguardarMs <= 3000) return sleep(chk.aguardarMs + 50).then(function () { return tratar(raw, interp, local, prefixo); });
      var aviso = chk.motivo === 'offline' ? p('Você está sem internet: respondo com o material local.') : (['pausado', 'teto_sessao', 'intervalo'].indexOf(chk.motivo) >= 0 ? avisoFalha({ codigo: chk.motivo }) : '');
      return Promise.resolve(semIA(raw, interp, local, busca, aviso, false));
    }
    var k = chave(res, interp, busca), hit = cache.filter(function (c) { return c.k === k; })[0];
    if (hit) { M.contexto.registrar({ pergunta: raw, html: hit.texto, interp: interp, modo: 'conceitual' }); return Promise.resolve(R(prefixo + M.rag.formatarIA(hit.texto, busca), chipsPos(interp))); }
    return M.ia.enviar(M.rag.payload(interp, res, busca)).then(function (r) {
      cache.push({ k: k, texto: r.texto }); if (cache.length > 30) cache.shift();
      var abertura = primeiro && nomeHTML() ? p('Vamos lá, ' + nomeHTML() + '.') : ''; primeiro = false;
      M.contexto.registrar({ pergunta: raw, html: r.texto, interp: interp, modo: 'conceitual' });
      return R(prefixo + abertura + M.rag.formatarIA(r.texto, busca), chipsPos(interp));
    }, function (e) {
      if (e.codigo === 'cancelado') return R(p('Cancelado.'));
      var retentavel = ['offline', 'timeout', 'indisponivel', 'resposta_invalida', 'limite', 'pausado'].indexOf(e.codigo) >= 0;
      return semIA(raw, interp, local, busca, prefixo + avisoFalha(e), retentavel);
    });
  }

  function interceptar(raw, local) {
    var n = M.busca.norm(raw), cmd = comando(n, raw);
    if (cmd) return cmd.then ? cmd : Promise.resolve(cmd);
    var st = F()._state ? F()._state() : {};
    if (st.awaiting) return null;
    var lid = local && local.id, interp = M.interpretador.interpretar(raw);
    var conceitual = M.contexto.modo() === 'conceitual' && !!M.contexto.topico();
    var temEnt = interp.conceitos.length > 0 || interp.farmacos.length > 0, decide = false;
    var regraPlain = lid === 'rule' && window.FarmaRegras && window.FarmaRegras.match(n);   // regra pedida com as próprias palavras (não por correção ortográfica)
    var manter = SOCIAL[lid] || lid === 'glossary' || lid === 'contacts' || lid === 'offscope' || lid === 'ementa' || !!regraPlain;
    var academico = interp.academica || interp.codigoExplicito || (!!interp.disciplina && !temEnt && (!interp.pedagogica || interp.numeral));
    if (lid === 'topic') decide = true;
    else if (interp.seguimento && !conceitual) decide = false;   // "explica de novo" sem assunto anterior: o farmacia.js responde
    else if (!manter && !academico) {
      if (conceitual && interp.seguimento) decide = true;
      else if (temEnt && (interp.pedagogica || OVERR[lid]) && !(lid === 'info' && interp.numeral)) decide = true;
      else if (!temEnt && OVERR[lid] && interp.pedagogica) decide = true;
    }
    if (!decide) { if (!SOCIAL[lid]) M.contexto.marcarLocal(); return null; }
    if (interp.ambiguidade && !interp.seguimento) {
      var a = interp.ambiguidade;
      return Promise.resolve(R(p(esc(a.pergunta)), a.opcoes.map(function (o) { return { label: o[0], q: o[1] }; })));
    }
    return tratar(raw, interp, local);
  }

  function reset() { M.contexto.reset(); M.ia.cancelar(); pendente = null; primeiro = true; consentMostrado = false; }
  M.orquestrador = { interceptar: interceptar, reset: reset, _cache: function () { return cache; }, _limparCache: function () { cache = []; } };
})();
