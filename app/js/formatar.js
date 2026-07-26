/**
 * Formatação — dinheiro, data, texto. Única porta pra transformar dado bruto em texto de
 * tela. Nenhuma outra parte do app deve montar string de valor/data na mão.
 */
(function (global) {
  'use strict';

  var Datas = (typeof module !== 'undefined' && module.exports) ? require('./datas.js') : global.Datas;

  function dinheiro(valor) {
    var n = Number(valor) || 0;
    var negativo = n < 0;
    n = Math.abs(n);
    var partes = n.toFixed(2).split('.');
    var inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (negativo ? '-' : '') + 'R$ ' + inteiro + ',' + partes[1];
  }

  function dataCurta(iso) {
    var p = Datas.parseISO(iso);
    return (p.dia < 10 ? '0' : '') + p.dia + '/' + (p.mes < 10 ? '0' : '') + p.mes;
  }

  function dataLonga(iso) {
    var p = Datas.parseISO(iso);
    return p.dia + ' de ' + Datas.nomeMes(p.mes) + ' de ' + p.ano;
  }

  function dataComDiaSemana(iso) {
    var dia = Datas.nomeDiaSemana(iso);
    return dia.charAt(0).toUpperCase() + dia.slice(1) + ', ' + dataCurta(iso);
  }

  function capitalizar(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function rotuloParcela(conta) {
    if (!conta.parcela) return '';
    return '(' + conta.parcela.atual + '/' + conta.parcela.total + ')';
  }

  var Formatar = {
    dinheiro: dinheiro,
    dataCurta: dataCurta,
    dataLonga: dataLonga,
    dataComDiaSemana: dataComDiaSemana,
    capitalizar: capitalizar,
    rotuloParcela: rotuloParcela
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Formatar;
  } else {
    global.Formatar = Formatar;
  }
})(typeof window !== 'undefined' ? window : globalThis);
