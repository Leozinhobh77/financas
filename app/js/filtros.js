/**
 * Filtros — traduz um filtro de período (semana atual, mês atual, próximo mês, mês
 * específico, personalizado) num intervalo [inicio, fim] ISO, e aplica filtro completo
 * (período + status + categoria + tipo) sobre uma lista de contas.
 */
(function (global) {
  'use strict';

  var Datas = (typeof module !== 'undefined' && module.exports) ? require('./datas.js') : global.Datas;
  var Contas = (typeof module !== 'undefined' && module.exports) ? require('./contas.js') : global.Contas;

  /** periodo: { tipo, ano, mes, semanaNumero, inicio, fim } -> { inicio, fim } ISO */
  function periodoParaIntervalo(periodo, hojeISO) {
    hojeISO = hojeISO || Datas.hoje();
    var hojeP = Datas.parseISO(hojeISO);

    switch (periodo.tipo) {
      case 'semana-atual': {
        var sem = Datas.semanaDe(hojeISO);
        return { inicio: sem.inicio, fim: sem.fim };
      }
      case 'semana-do-mes': {
        var semanas = Datas.semanasDoMes(periodo.ano, periodo.mes);
        var alvo = semanas[periodo.semanaNumero - 1] || semanas[0];
        return { inicio: alvo.inicio, fim: alvo.fim };
      }
      case 'mes-atual':
        return {
          inicio: Datas.formatarISO(hojeP.ano, hojeP.mes, 1),
          fim: Datas.formatarISO(hojeP.ano, hojeP.mes, Datas.diasDoMes(hojeP.ano, hojeP.mes))
        };
      case 'proximo-mes': {
        var prox = Datas.somarMeses(Datas.formatarISO(hojeP.ano, hojeP.mes, 1), 1);
        var p2 = Datas.parseISO(prox);
        return {
          inicio: Datas.formatarISO(p2.ano, p2.mes, 1),
          fim: Datas.formatarISO(p2.ano, p2.mes, Datas.diasDoMes(p2.ano, p2.mes))
        };
      }
      case 'mes-especifico':
        return {
          inicio: Datas.formatarISO(periodo.ano, periodo.mes, 1),
          fim: Datas.formatarISO(periodo.ano, periodo.mes, Datas.diasDoMes(periodo.ano, periodo.mes))
        };
      case 'personalizado':
        return { inicio: periodo.inicio, fim: periodo.fim };
      default:
        return { inicio: '0000-01-01', fim: '9999-12-31' };
    }
  }

  /**
   * Aplica o filtro completo. `filtro` = { periodo, status: 'todos'|'pendente'|'pago'|'atrasada',
   * categoria: 'todas'|nome, tipo: 'todos'|'pagar'|'receber' }
   */
  function aplicar(contasLista, filtro, hojeISO) {
    hojeISO = hojeISO || Datas.hoje();
    var intervalo = periodoParaIntervalo(filtro.periodo, hojeISO);

    return contasLista.filter(function (c) {
      if (filtro.tipo && filtro.tipo !== 'todos' && c.tipo !== filtro.tipo) return false;
      if (filtro.categoria && filtro.categoria !== 'todas' && c.categoria !== filtro.categoria) return false;

      var sit = Contas.situacao(c, hojeISO);
      if (filtro.status && filtro.status !== 'todos' && sit !== filtro.status) return false;

      if (!Datas.estaEntre(c.vencimento, intervalo.inicio, intervalo.fim)) return false;
      return true;
    });
  }

  function total(contasLista) {
    return contasLista.reduce(function (soma, c) { return soma + c.valor; }, 0);
  }

  var Filtros = { periodoParaIntervalo: periodoParaIntervalo, aplicar: aplicar, total: total };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Filtros;
  } else {
    global.Filtros = Filtros;
  }
})(typeof window !== 'undefined' ? window : globalThis);
