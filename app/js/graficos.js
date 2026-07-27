/**
 * Graficos — SVG desenhado a mao, sem biblioteca. Mantem a regra do SPEC: zero dependencia
 * externa em runtime, app 100% offline. Cada funcao recebe dado ja normalizado por
 * analise.js e devolve string de SVG.
 */
(function (global) {
  'use strict';

  var Formatar = global.Formatar;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * Anel de progresso. `fracao` 0..1. Usa stroke-dasharray sobre um circulo — mais simples e
   * mais preciso que montar arco com path, e nao tem o problema do arco de 360 graus.
   */
  function anelProgresso(fracao, rotuloCentro, subRotulo) {
    var R = 52, ESPESSURA = 11;
    var circunferencia = 2 * Math.PI * R;
    var preenchido = Math.max(0, Math.min(1, fracao)) * circunferencia;

    return (
      '<div class="anel">' +
        '<svg viewBox="0 0 130 130" class="anel-svg" role="img" aria-label="Progresso: ' +
          Math.round(fracao * 100) + '%">' +
          '<circle cx="65" cy="65" r="' + R + '" fill="none" stroke="var(--trilho)" stroke-width="' + ESPESSURA + '"/>' +
          '<circle cx="65" cy="65" r="' + R + '" fill="none" stroke="var(--accent)" stroke-width="' + ESPESSURA + '"' +
            ' stroke-linecap="round" stroke-dasharray="' + preenchido + ' ' + circunferencia + '"' +
            ' transform="rotate(-90 65 65)" class="anel-arco"/>' +
        '</svg>' +
        '<div class="anel-centro">' +
          '<span class="anel-valor">' + esc(rotuloCentro) + '</span>' +
          (subRotulo ? '<span class="anel-sub">' + esc(subRotulo) + '</span>' : '') +
        '</div>' +
      '</div>'
    );
  }

  /**
   * Barras por semana. Cada barra tem a parte paga (cheia) e a pendente (esmaecida), então o
   * usuario ve de relance nao so quanto vence naquela semana, mas quanto ja resolveu.
   */
  function barrasSemana(semanas) {
    var maior = semanas.reduce(function (m, s) { return Math.max(m, s.total); }, 0);
    if (maior === 0) {
      return '<p class="grafico-vazio">Nenhuma conta neste mês.</p>';
    }

    var barras = semanas.map(function (s) {
      var alturaTotal = (s.total / maior) * 100;
      var fracaoPaga = s.total > 0 ? (s.pago / s.total) : 0;
      var classe = 'barra' + (s.ehSemanaAtual ? ' barra--atual' : '') +
                   (s.total === 0 ? ' barra--zero' : '') +
                   (s.deixouResto ? ' barra--resto' : '');
      var titulo = 'Semana ' + s.numero + ': ' + Formatar.dinheiro(s.total) +
                   (s.pago > 0 ? ' · ' + Formatar.dinheiro(s.pago) + ' já pago' : '') +
                   (s.deixouResto ? ' · deixou ' + Formatar.dinheiro(s.resto) + ' pendente' : '');

      // marcador: ▲ semana atual, ⚠ semana que passou deixando resto
      var marca = s.ehSemanaAtual ? '<span class="barra-marca barra-marca--atual">▲</span>'
                : (s.deixouResto ? '<span class="barra-marca barra-marca--resto">!</span>' : '');

      return (
        '<div class="' + classe + '" title="' + esc(titulo) + '">' +
          '<div class="barra-valor">' + (s.total > 0 ? Formatar.dinheiro(s.total).replace('R$ ', '') : '—') + '</div>' +
          '<div class="barra-trilho">' +
            '<div class="barra-preenchida" style="height:' + alturaTotal.toFixed(1) + '%">' +
              '<div class="barra-paga" style="height:' + (fracaoPaga * 100).toFixed(1) + '%"></div>' +
            '</div>' +
          '</div>' +
          '<div class="barra-rotulo">S' + s.numero + '</div>' +
          '<div class="barra-marca-linha">' + marca + '</div>' +
        '</div>'
      );
    }).join('');

    return '<div class="barras">' + barras + '</div>';
  }

  /**
   * Donut por categoria. Mesma tecnica do anel (dasharray sobre circulo), com um offset
   * acumulado por fatia — evita path de arco e o caso degenerado de fatia unica de 100%.
   */
  function donutCategorias(categorias, totalTexto) {
    if (!categorias.length) {
      return '<p class="grafico-vazio">Nenhuma conta neste período.</p>';
    }

    var R = 52, ESPESSURA = 20;
    var circunferencia = 2 * Math.PI * R;
    var offset = 0;

    var fatias = categorias.map(function (cat) {
      var comprimento = (cat.percentual / 100) * circunferencia;
      var svg =
        '<circle cx="65" cy="65" r="' + R + '" fill="none" stroke="var(--cat-' + cat.cor + ')"' +
        ' stroke-width="' + ESPESSURA + '"' +
        ' stroke-dasharray="' + comprimento + ' ' + circunferencia + '"' +
        ' stroke-dashoffset="' + (-offset) + '"' +
        ' transform="rotate(-90 65 65)">' +
        '<title>' + esc(cat.categoria + ': ' + Formatar.dinheiro(cat.valor)) + '</title>' +
        '</circle>';
      offset += comprimento;
      return svg;
    }).join('');

    return (
      '<div class="donut">' +
        '<svg viewBox="0 0 130 130" class="donut-svg" role="img" aria-label="Gastos por categoria">' +
          '<circle cx="65" cy="65" r="' + R + '" fill="none" stroke="var(--trilho)" stroke-width="' + ESPESSURA + '"/>' +
          fatias +
        '</svg>' +
        (totalTexto ? '<div class="donut-centro"><span class="donut-valor">' + esc(totalTexto) + '</span></div>' : '') +
      '</div>'
    );
  }

  /** Legenda do donut: bolinha da cor, nome, valor e percentual. */
  function legendaCategorias(categorias) {
    if (!categorias.length) return '';
    return '<ul class="legenda">' + categorias.map(function (cat) {
      return (
        '<li class="legenda-item">' +
          '<span class="legenda-cor" style="background:var(--cat-' + cat.cor + ')"></span>' +
          '<span class="legenda-nome">' + esc(cat.categoria) + '</span>' +
          '<span class="legenda-valor">' + Formatar.dinheiro(cat.valor) + '</span>' +
          '<span class="legenda-pct">' + cat.percentual.toFixed(0) + '%</span>' +
        '</li>'
      );
    }).join('') + '</ul>';
  }

  /** Barra horizontal simples de progresso (usada no card-herói). */
  function barraProgresso(fracao) {
    var pct = Math.max(0, Math.min(1, fracao)) * 100;
    return (
      '<div class="progresso" role="progressbar" aria-valuenow="' + Math.round(pct) + '" aria-valuemin="0" aria-valuemax="100">' +
        '<div class="progresso-preenchido" style="width:' + pct.toFixed(1) + '%"></div>' +
      '</div>'
    );
  }

  global.Graficos = {
    anelProgresso: anelProgresso,
    barrasSemana: barrasSemana,
    donutCategorias: donutCategorias,
    legendaCategorias: legendaCategorias,
    barraProgresso: barraProgresso
  };
})(typeof window !== 'undefined' ? window : globalThis);
