/**
 * Analise — todos os numeros do dashboard. Funcoes puras: recebem a lista de contas e a data
 * de hoje, devolvem dado pronto pra desenhar. Nenhum numero do painel nasce dentro de codigo
 * de tela, e por isso tudo aqui e testavel em Node (testes/motor.teste.js).
 */
(function (global) {
  'use strict';

  var ehNode = (typeof module !== 'undefined' && module.exports);
  var Datas = ehNode ? require('./datas.js') : global.Datas;
  var Contas = ehNode ? require('./contas.js') : global.Contas;
  var Categorias = ehNode ? require('./categorias.js') : global.Categorias;

  function noPeriodo(lista, inicio, fim) {
    return lista.filter(function (c) { return Datas.estaEntre(c.vencimento, inicio, fim); });
  }

  function somar(lista) {
    return lista.reduce(function (s, c) { return s + c.valor; }, 0);
  }

  function intervaloDoMes(ano, mes) {
    return {
      inicio: Datas.formatarISO(ano, mes, 1),
      fim: Datas.formatarISO(ano, mes, Datas.diasDoMes(ano, mes))
    };
  }

  /**
   * Resumo de um mes: quanto vence, quanto ja foi pago, quanto falta, separado por tipo.
   * `progresso` e a fracao paga (0..1) das contas A PAGAR — e o que alimenta o anel.
   */
  function resumoDoMes(lista, ano, mes, hojeISO) {
    var iv = intervaloDoMes(ano, mes);
    var doMes = noPeriodo(lista, iv.inicio, iv.fim);

    var pagar = doMes.filter(function (c) { return c.tipo === 'pagar'; });
    var receber = doMes.filter(function (c) { return c.tipo === 'receber'; });

    var pagarPago = pagar.filter(function (c) { return c.status === 'pago'; });
    var pagarPendente = pagar.filter(function (c) { return c.status === 'pendente'; });
    var atrasadas = pagar.filter(function (c) { return Contas.estaAtrasada(c, hojeISO); });

    var totalPagar = somar(pagar);
    var totalPago = somar(pagarPago);

    return {
      ano: ano, mes: mes, inicio: iv.inicio, fim: iv.fim,
      totalPagar: totalPagar,
      totalReceber: somar(receber),
      totalPago: totalPago,
      totalFalta: somar(pagarPendente),
      saldo: somar(receber) - totalPagar,
      progresso: totalPagar > 0 ? (totalPago / totalPagar) : 0,
      qtdPagar: pagar.length,
      qtdPago: pagarPago.length,
      qtdAtrasadas: atrasadas.length,
      totalAtrasado: somar(atrasadas)
    };
  }

  /** Variacao percentual do total a pagar entre este mes e o anterior. null se nao da pra comparar. */
  function comparativoMesAnterior(lista, ano, mes, hojeISO) {
    var atual = resumoDoMes(lista, ano, mes, hojeISO);
    var isoAnterior = Datas.somarMeses(Datas.formatarISO(ano, mes, 1), -1);
    var p = Datas.parseISO(isoAnterior);
    var anterior = resumoDoMes(lista, p.ano, p.mes, hojeISO);

    if (anterior.totalPagar === 0) {
      return { anterior: anterior.totalPagar, atual: atual.totalPagar, variacao: null };
    }
    var variacao = ((atual.totalPagar - anterior.totalPagar) / anterior.totalPagar) * 100;
    return { anterior: anterior.totalPagar, atual: atual.totalPagar, variacao: variacao };
  }

  /**
   * Total por categoria num periodo, ordenado do maior pro menor, com o percentual de cada
   * uma sobre o total. E o que alimenta o donut e a legenda.
   */
  function porCategoria(lista, inicio, fim, tipo) {
    var doPeriodo = noPeriodo(lista, inicio, fim).filter(function (c) {
      return !tipo || c.tipo === tipo;
    });
    var total = somar(doPeriodo);

    var mapa = {};
    doPeriodo.forEach(function (c) {
      var nome = Categorias.normalizar(c.categoria);
      if (!mapa[nome]) mapa[nome] = { categoria: nome, valor: 0, qtd: 0 };
      mapa[nome].valor += c.valor;
      mapa[nome].qtd++;
    });

    return Object.keys(mapa).map(function (k) {
      var item = mapa[k];
      item.percentual = total > 0 ? (item.valor / total) * 100 : 0;
      item.cor = Categorias.cor(item.categoria);
      return item;
    }).sort(function (a, b) { return b.valor - a.valor; });
  }

  /**
   * Total por semana do mes (RN003 — semana seg-dom numerada dentro do mes). E a visao que
   * o usuario pediu desde o inicio e que nenhum app generico tem.
   */
  function porSemana(lista, ano, mes, tipo, hojeISO) {
    var semanas = Datas.semanasDoMes(ano, mes);
    return semanas.map(function (s) {
      var doPeriodo = noPeriodo(lista, s.inicio, s.fim).filter(function (c) {
        return !tipo || c.tipo === tipo;
      });
      var pagas = doPeriodo.filter(function (c) { return c.status === 'pago'; });
      return {
        numero: s.numero,
        inicio: s.inicio,
        fim: s.fim,
        total: somar(doPeriodo),
        pago: somar(pagas),
        qtd: doPeriodo.length,
        ehSemanaAtual: hojeISO ? Datas.estaEntre(hojeISO, s.inicio, s.fim) : false
      };
    });
  }

  /** Dias entre hoje e o vencimento. Negativo = ja passou. */
  function diasAte(vencimentoISO, hojeISO) {
    var a = Datas.paraDate(hojeISO);
    var b = Datas.paraDate(vencimentoISO);
    return Math.round((b - a) / 86400000);
  }

  /**
   * Proximos vencimentos: contas pendentes ordenadas por vencimento, das mais urgentes pra
   * frente. Inclui as atrasadas primeiro (dias negativo), que sao as que precisam de acao.
   */
  function proximosVencimentos(lista, hojeISO, limite, tipo) {
    return lista
      .filter(function (c) { return c.status === 'pendente' && (!tipo || c.tipo === tipo); })
      .map(function (c) {
        return { conta: c, dias: diasAte(c.vencimento, hojeISO) };
      })
      .sort(function (a, b) { return a.dias - b.dias; })
      .slice(0, limite || 5);
  }

  /** Texto humano pro prazo: "vence hoje", "vence em 3 dias", "atrasada há 5 dias". */
  function rotuloPrazo(dias) {
    if (dias === 0) return 'vence hoje';
    if (dias === 1) return 'vence amanhã';
    if (dias === -1) return 'atrasada há 1 dia';
    if (dias > 1) return 'vence em ' + dias + ' dias';
    return 'atrasada há ' + Math.abs(dias) + ' dias';
  }

  var Analise = {
    resumoDoMes: resumoDoMes,
    comparativoMesAnterior: comparativoMesAnterior,
    porCategoria: porCategoria,
    porSemana: porSemana,
    proximosVencimentos: proximosVencimentos,
    diasAte: diasAte,
    rotuloPrazo: rotuloPrazo,
    somar: somar
  };

  if (ehNode) {
    module.exports = Analise;
  } else {
    global.Analise = Analise;
  }
})(typeof window !== 'undefined' ? window : globalThis);
