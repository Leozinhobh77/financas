/**
 * Render — funções que transformam dado em HTML. Sem lógica de negócio, sem acesso a
 * Store. Recebem dados prontos, devolvem string de HTML (o app.js insere no DOM e liga os
 * eventos por delegação, usando os atributos data-* daqui).
 */
(function (global) {
  'use strict';

  var Formatar = global.Formatar, Icones = global.Icones, Contas = global.Contas;

  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function itemConta(conta, hojeISO) {
    var sit = Contas.situacao(conta, hojeISO);
    var atrasadaClasse = sit === 'atrasada' ? ' atrasada' : '';
    var iconeStatus = sit === 'paga' ? 'check' : (sit === 'atrasada' ? 'alerta' : 'calendario');
    var rotuloAcaoStatus = sit === 'paga' ? 'Desmarcar como paga' : 'Marcar como paga';

    var selo = conta.parcela
      ? '<span class="item-selo">' + escapeHTML(Formatar.rotuloParcela(conta)) + '</span>'
      : '';
    var iconeRecorrente = conta.recorrente
      ? '<span class="item-icone-recorrente" title="Recorrente">' + Icones.get('repetir') + '</span>'
      : '';

    return (
      '<article class="item-conta" data-id="' + conta.id + '">' +
        '<button class="item-status ' + sit + '" data-acao="alternar-pago" data-id="' + conta.id + '" aria-label="' + rotuloAcaoStatus + '">' +
          Icones.get(iconeStatus) +
        '</button>' +
        '<div class="item-corpo">' +
          '<div class="item-titulo-linha">' +
            '<span class="item-descricao">' + escapeHTML(conta.descricao) + '</span>' +
            selo + iconeRecorrente +
          '</div>' +
          '<div class="item-meta">' +
            '<span class="tag-categoria">' + escapeHTML(conta.categoria) + '</span>' +
            '<span class="data' + atrasadaClasse + '">' + Formatar.dataCurta(conta.vencimento) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="item-direita">' +
          '<span class="item-valor ' + conta.tipo + '">' + Formatar.dinheiro(conta.valor) + '</span>' +
          '<div class="item-acoes">' +
            '<button class="icon-btn" data-acao="editar" data-id="' + conta.id + '" aria-label="Editar">' + Icones.get('editar') + '</button>' +
            '<button class="icon-btn" data-acao="excluir" data-id="' + conta.id + '" aria-label="Excluir">' + Icones.get('excluir') + '</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function estadoVazio(mensagem) {
    return (
      '<div class="estado-vazio">' + Icones.get('vazio') +
      '<p>' + escapeHTML(mensagem) + '</p></div>'
    );
  }

  function listaFlat(contasLista, hojeISO, mensagemVazio) {
    if (!contasLista.length) return estadoVazio(mensagemVazio || 'Nada por aqui neste filtro.');
    return '<div class="lista-contas">' + contasLista.map(function (c) { return itemConta(c, hojeISO); }).join('') + '</div>';
  }

  /** grupos: [{ numero, inicio, fim, itens: [conta...] }, ...] (semanas de um mês) */
  function listaAgrupada(grupos, hojeISO, mensagemVazio) {
    var comItens = grupos.filter(function (g) { return g.itens.length > 0; });
    if (!comItens.length) return estadoVazio(mensagemVazio || 'Nada por aqui neste filtro.');

    return comItens.map(function (g) {
      var total = g.itens.reduce(function (s, c) { return s + c.valor; }, 0);
      return (
        '<div class="grupo-semana">' +
          '<div class="grupo-semana-cabeca">' +
            '<span>Semana ' + g.numero + ' · ' + Formatar.dataCurta(g.inicio) + '–' + Formatar.dataCurta(g.fim) + '</span>' +
            '<span class="valor">' + Formatar.dinheiro(total) + '</span>' +
          '</div>' +
          listaFlat(g.itens, hojeISO) +
        '</div>'
      );
    }).join('');
  }

  function cardPeriodo(rotulo, periodoTexto, totalPagar, totalReceber, destaque) {
    var saldo = totalReceber - totalPagar;
    return (
      '<div class="card' + (destaque ? ' card--destaque' : '') + '">' +
        '<span class="card-rotulo">' + escapeHTML(rotulo) + '</span>' +
        '<span class="card-periodo">' + escapeHTML(periodoTexto) + '</span>' +
        '<div class="card-linha">' +
          '<span class="card-linha-rotulo">' + Icones.get('pagar') + ' A pagar</span>' +
          '<span class="card-valor pagar">' + Formatar.dinheiro(totalPagar) + '</span>' +
        '</div>' +
        '<div class="card-linha">' +
          '<span class="card-linha-rotulo">' + Icones.get('receber') + ' A receber</span>' +
          '<span class="card-valor receber">' + Formatar.dinheiro(totalReceber) + '</span>' +
        '</div>' +
        '<div class="card-linha card-saldo">' +
          '<span class="card-linha-rotulo">Saldo do período</span>' +
          '<span class="card-valor ' + (saldo < 0 ? 'pagar' : 'receber') + '">' + Formatar.dinheiro(saldo) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function categoriaPill(nome) {
    return (
      '<span class="categoria-pill">' + escapeHTML(nome) +
        '<button type="button" data-acao="remover-categoria" data-nome="' + escapeHTML(nome) + '" aria-label="Remover ' + escapeHTML(nome) + '">' + Icones.get('fechar') + '</button>' +
      '</span>'
    );
  }

  var Render = {
    escapeHTML: escapeHTML,
    itemConta: itemConta,
    estadoVazio: estadoVazio,
    listaFlat: listaFlat,
    listaAgrupada: listaAgrupada,
    cardPeriodo: cardPeriodo,
    categoriaPill: categoriaPill
  };

  global.Render = Render;
})(typeof window !== 'undefined' ? window : globalThis);
