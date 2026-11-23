/* FarmacIA — extensões visuais (indicadores, planilhas e exportação CSV)
 * Compatível com a camada FarmaVisual já existente. Sem dependências externas.
 * Carregar DEPOIS de farmacia-ia.js.
 */
(function (root) {
  'use strict';

  var V = root.FarmaVisual;
  if (!V || typeof V.aprimorar !== 'function') {
    console.warn('[FarmacIA] farmacia-visual.js: FarmaVisual não foi carregado.');
    return;
  }

  var aprimorarOriginal = V.aprimorar;
  var MAX_JSON = 24000;
  var MAX_COLUNAS = 12;
  var MAX_LINHAS = 250;
  var MAX_CELULA = 240;

  function el(tag, classe, texto) {
    var node = root.document.createElement(tag);
    if (classe) node.className = classe;
    if (texto !== undefined && texto !== null) node.textContent = String(texto);
    return node;
  }

  function lerObjeto(texto) {
    if (typeof texto !== 'string' || texto.length > MAX_JSON) return null;
    try {
      var obj = JSON.parse(texto);
      return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null;
    } catch (_) {
      return null;
    }
  }

  function textoSeguro(valor) {
    if (valor === null || valor === undefined) return '';
    if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
      return String(valor).slice(0, MAX_CELULA);
    }
    return '';
  }

  function aviso(mensagem) {
    var box = el('div', 'fm-extra-notice', mensagem);
    box.setAttribute('role', 'status');
    return box;
  }

  function criarBotaoCSV(conteudo, nomeArquivo) {
    var botao = el('button', 'fm-extra-export', 'Baixar CSV');
    botao.type = 'button';
    botao.setAttribute('data-fm-ui', '1');
    botao.addEventListener('click', function () {
      baixarCSV(conteudo, nomeArquivo);
    });
    return botao;
  }

  function normalizarNome(nome) {
    var s = String(nome || 'dados-farmacia')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return (s || 'dados-farmacia').slice(0, 60);
  }

  function baixarCSV(linhas, nomeArquivo) {
    if (!Array.isArray(linhas) || !linhas.length) return;
    var csv = linhas.map(function (linha) {
      return linha.map(function (valor) {
        var s = textoSeguro(valor).replace(/"/g, '""');
        return '"' + s + '"';
      }).join(';');
    }).join('\r\n');

    // BOM UTF-8 e separador ; facilitam a abertura no Excel em português.
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = root.URL.createObjectURL(blob);
    var a = el('a');
    a.href = url;
    a.download = normalizarNome(nomeArquivo) + '.csv';
    a.style.display = 'none';
    root.document.body.appendChild(a);
    a.click();
    a.remove();
    root.setTimeout(function () { root.URL.revokeObjectURL(url); }, 1500);
  }

  function dadosTabela(tabela) {
    return Array.prototype.map.call(tabela.querySelectorAll('tr'), function (tr) {
      return Array.prototype.map.call(tr.querySelectorAll('th, td'), function (celula) {
        return (celula.innerText || celula.textContent || '').trim();
      });
    }).filter(function (linha) { return linha.length > 0; });
  }

  function adicionarExportacaoTabelas(raiz) {
    Array.prototype.forEach.call(raiz.querySelectorAll('.farma-md-table-wrap'), function (wrap) {
      if (wrap.dataset.farmaCsv === '1') return;
      var tabela = wrap.querySelector('table');
      if (!tabela) return;
      var linhas = dadosTabela(tabela);
      if (linhas.length < 2) return;
      wrap.dataset.farmaCsv = '1';
      var acoes = el('div', 'fm-extra-actions');
      acoes.appendChild(criarBotaoCSV(linhas, 'tabela-farmacia'));
      wrap.appendChild(acoes);
    });
  }

  function montarIndicadores(dados) {
    var itens = Array.isArray(dados.indicadores) ? dados.indicadores :
      (Array.isArray(dados.itens) ? dados.itens : null);
    if (!itens || !itens.length || itens.length > 8) return aviso('Os indicadores não foram exibidos porque os dados estão incompletos ou excedem o limite permitido.');

    var card = el('section', 'fm-kpi-panel');
    if (dados.titulo) card.appendChild(el('h3', 'fm-kpi-title', textoSeguro(dados.titulo)));
    var grade = el('div', 'fm-kpi-grid');

    itens.forEach(function (item) {
      if (!item || typeof item !== 'object' || item.valor === undefined) return;
      var bloco = el('article', 'fm-kpi-card');
      bloco.appendChild(el('span', 'fm-kpi-label', textoSeguro(item.rotulo || item.nome || 'Indicador')));
      var valor = textoSeguro(item.valor);
      var unidade = textoSeguro(item.unidade);
      bloco.appendChild(el('strong', 'fm-kpi-value', (valor + (unidade ? ' ' + unidade : '')).slice(0, 100)));
      if (item.variacao !== undefined && item.variacao !== null && String(item.variacao).trim()) {
        bloco.appendChild(el('span', 'fm-kpi-change', textoSeguro(item.variacao)));
      }
      if (item.descricao) bloco.appendChild(el('small', 'fm-kpi-description', textoSeguro(item.descricao)));
      grade.appendChild(bloco);
    });

    if (!grade.children.length) return aviso('Não havia valores válidos para montar os indicadores.');
    card.appendChild(grade);
    return card;
  }

  function montarPlanilha(dados) {
    var colunas = Array.isArray(dados.colunas) ? dados.colunas.slice(0, MAX_COLUNAS) : [];
    var linhas = Array.isArray(dados.linhas) ? dados.linhas.slice(0, MAX_LINHAS) : [];
    if (!colunas.length || !linhas.length || colunas.length > MAX_COLUNAS) {
      return aviso('A planilha não foi exibida porque faltam colunas ou linhas válidas.');
    }

    var matriz = [colunas.map(textoSeguro)];
    var tabela = el('table', 'fm-sheet-table');
    var thead = el('thead');
    var trHead = el('tr');
    colunas.forEach(function (coluna) { trHead.appendChild(el('th', '', textoSeguro(coluna))); });
    thead.appendChild(trHead);
    tabela.appendChild(thead);

    var tbody = el('tbody');
    linhas.forEach(function (linha) {
      if (!Array.isArray(linha)) return;
      var valores = colunas.map(function (_, i) { return textoSeguro(linha[i]); });
      matriz.push(valores);
      var tr = el('tr');
      valores.forEach(function (valor) { tr.appendChild(el('td', '', valor)); });
      tbody.appendChild(tr);
    });
    if (!tbody.children.length) return aviso('A planilha não contém linhas válidas.');
    tabela.appendChild(tbody);

    var painel = el('section', 'fm-sheet-panel');
    var topo = el('div', 'fm-sheet-head');
    topo.appendChild(el('h3', 'fm-sheet-title', textoSeguro(dados.titulo || 'Planilha')));
    topo.appendChild(criarBotaoCSV(matriz, dados.nomeArquivo || 'planilha-farmacia'));
    painel.appendChild(topo);

    var rolagem = el('div', 'fm-sheet-scroll');
    rolagem.appendChild(tabela);
    painel.appendChild(rolagem);
    painel.appendChild(el('p', 'fm-sheet-foot', 'Planilha exportável em CSV · abre no Excel e no Google Planilhas.'));
    return painel;
  }

  function processarBlocos(raiz) {
    Array.prototype.forEach.call(raiz.querySelectorAll('pre > code'), function (code) {
      var match = /language-([a-z0-9_-]+)/i.exec(code.className || '');
      var linguagem = match ? match[1].toLowerCase() : '';
      if (linguagem !== 'indicadores' && linguagem !== 'kpi' && linguagem !== 'planilha') return;

      var pre = code.parentNode;
      var dados = lerObjeto(code.textContent.replace(/\n$/, ''));
      var novo = null;
      if (dados) novo = linguagem === 'planilha' ? montarPlanilha(dados) : montarIndicadores(dados);
      else novo = aviso('O bloco visual não foi exibido porque o JSON está inválido. A resposta textual continua disponível.');
      pre.replaceWith(novo);
    });
  }

  V.aprimorar = function (raiz) {
    if (!raiz || raiz.getAttribute('data-fm-ok')) return;
    processarBlocos(raiz);
    aprimorarOriginal.call(V, raiz);
    adicionarExportacaoTabelas(raiz);
  };

  V.extras = V.extras || {};
  V.extras.exportarCSV = baixarCSV;
  V.extras.versao = '1.0.0';
})(window);
