/* FarmacIA — configuração do assistente e acesso seguro ao armazenamento local.
 * Módulo novo (v2). Sem dependências. Os demais módulos leem tudo daqui. */
(function () {
  'use strict';
  var M = window.FarmaMod = window.FarmaMod || {};

  M.config = {
    versao: '2.0.0',
    ia: {
      habilitada: true,          // chave geral: false desliga a IA online para todos
      funcao: 'farmacia-ia',     // nome da Edge Function no Supabase
      endpoint: '',              // vazio = {SUPABASE_URL}/functions/v1/{funcao}
      timeoutMs: 20000,          // o servidor corta antes (18 s); o cliente desiste aos 20 s
      intervaloMinMs: 2500,      // intervalo mínimo entre duas chamadas online
      maxPorSessao: 40,          // teto de chamadas online por sessão do navegador
      maxPergunta: 500,          // caracteres enviados da pergunta
      maxHistorico: 4,           // mensagens anteriores enviadas (pares pergunta/resposta recentes)
      maxCharsHistorico: 280,    // cada mensagem do histórico é cortada neste tamanho
      maxTrechos: 4,             // trechos do material local enviados como contexto
      maxCharsTrecho: 650,
      falhasParaPausar: 3,       // disjuntor: após N falhas seguidas, pausa as chamadas
      pausaMs: 60000
    },
    busca: { k: 4, maxChunk: 600, minScore: 2.2, minCobertura: 0.5 },
    storage: {
      consentimento: 'planejador_farma_ia_consent_v1',
      modo: 'planejador_farma_ia_mode_v1',   // 'auto' | 'offline'
      cid: 'planejador_farma_cid_v1'         // identificador anônimo aleatório (só para limite de uso)
    }
  };

  // localStorage pode lançar exceção (modo privado, armazenamento bloqueado): tudo passa por aqui.
  M.armazenar = {
    ler: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    gravar: function (k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    apagar: function (k) { try { window.localStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } }
  };

  M.endpointIA = function () {
    var c = M.config.ia;
    if (c.endpoint) return c.endpoint;
    var cfg = window.Comunicados && window.Comunicados.cfg;
    return cfg && cfg.url ? String(cfg.url).replace(/\/+$/, '') + '/functions/v1/' + c.funcao : '';
  };
  M.chavePublica = function () {
    var cfg = window.Comunicados && window.Comunicados.cfg;
    return cfg && cfg.key ? String(cfg.key) : '';
  };
})();
