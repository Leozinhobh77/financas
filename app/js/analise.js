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

  /** Dias entre hoje e o vencimento. Negativo = ja passou. Delega pra Datas (fonte unica). */
  function diasAte(vencimentoISO, hojeISO) {
    return Datas.diasEntre(hojeISO, vencimentoISO);
  }

  /**
   * Proximos vencimentos: contas pendentes ordenadas por vencimento, das mais urgentes pra
   * frente. Inclui as atrasadas primeiro (dias negativo), que sao as que precisam de acao.
   *
   * `desdeISO` (opcional) corta o que venceu antes daquela data — usado no dashboard pra
   * excluir pendencia de meses anteriores, que ja tem bloco proprio ("Veio de antes"). Sem
   * isso as contas antigas apareceriam nos dois lugares e empurrariam as do mes pra baixo,
   * voltando a misturar o que o usuario pediu pra separar.
   */
  function proximosVencimentos(lista, hojeISO, limite, tipo, desdeISO) {
    return lista
      .filter(function (c) {
        if (c.status !== 'pendente') return false;
        if (tipo && c.tipo !== tipo) return false;
        if (desdeISO && Datas.compararISO(c.vencimento, desdeISO) < 0) return false;
        return true;
      })
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

  // ============================================================
  // META POR DIA / RITMO — quanto preciso juntar por dia pra fechar
  // ============================================================

  /**
   * Dias que ainda restam ate uma data-fim, contando HOJE (decisao do usuario: o dia ainda
   * nao acabou, ainda da pra arrumar dinheiro hoje). Piso 1 — nunca zero, senao dividiria
   * por zero no ultimo dia.
   */
  function diasRestantesAte(fimISO, hojeISO) {
    var d = diasAte(fimISO, hojeISO) + 1;
    return Math.max(1, d);
  }

  /**
   * Ritmo "ideal": o que teria sido preciso por dia se o periodo tivesse comecado hoje com
   * tudo em dia. Serve so de referencia pro semaforo — nao e mostrado como numero.
   */
  function semaforoDoRitmo(ritmoAtual, ritmoIdeal) {
    if (ritmoAtual <= 0) return 'ok';
    if (ritmoIdeal <= 0) return 'critico';
    var razao = ritmoAtual / ritmoIdeal;
    if (razao <= 1.05) return 'ok';
    if (razao <= 1.5) return 'atencao';
    return 'critico';
  }

  /**
   * META POR DIA (mes): quanto precisa juntar por dia, de hoje ate o ultimo dia do mes, pra
   * zerar o que falta. Sobe sozinho conforme os dias passam sem pagamento; cai ao pagar.
   * NAO inclui pendencia de meses anteriores (decisao do usuario: fica em bloco separado).
   */
  function metaPorDia(lista, ano, mes, hojeISO) {
    var r = resumoDoMes(lista, ano, mes, hojeISO);
    var fimMes = r.fim;
    var hojeP = Datas.parseISO(hojeISO);

    // se hoje esta fora do mes analisado, o "restante" e o mes inteiro (visao de planejamento)
    var dentroDoMes = (hojeP.ano === ano && hojeP.mes === mes);
    var dias = dentroDoMes ? diasRestantesAte(fimMes, hojeISO) : Datas.diasDoMes(ano, mes);

    var meta = r.totalFalta / dias;
    var ideal = r.totalPagar / Datas.diasDoMes(ano, mes);

    return {
      falta: r.totalFalta,
      total: r.totalPagar,
      dias: dias,
      meta: meta,
      ideal: ideal,
      semaforo: semaforoDoRitmo(meta, ideal),
      dentroDoMes: dentroDoMes,
      fim: fimMes
    };
  }

  /**
   * RITMO DESTA SEMANA. A semana atual cobre TUDO que esta pendente no mes e vence ate o
   * domingo dela — isso produz a cascata (S1 -> S2 -> S3...) numa regra so, sem precisar
   * somar semana a semana. O que vence em semanas FUTURAS fica de fora de proposito.
   * Pendencia de meses anteriores tambem fica de fora (bloco separado).
   */
  function ritmoDaSemana(lista, hojeISO) {
    var sem = Datas.semanaDe(hojeISO);
    var p = Datas.parseISO(hojeISO);
    var iv = intervaloDoMes(p.ano, p.mes);

    var pendentesDoMes = lista.filter(function (c) {
      return c.tipo === 'pagar' && c.status === 'pendente' &&
             Datas.estaEntre(c.vencimento, iv.inicio, iv.fim);
    });

    var venceNestaSemana = pendentesDoMes.filter(function (c) {
      return Datas.estaEntre(c.vencimento, sem.inicio, sem.fim);
    });
    // arrastado = pendente do mes que venceu ANTES do inicio desta semana
    var arrastado = pendentesDoMes.filter(function (c) {
      return Datas.compararISO(c.vencimento, sem.inicio) < 0;
    });

    var vVence = somar(venceNestaSemana);
    var vArrastado = somar(arrastado);
    var aCobrir = vVence + vArrastado;
    var dias = diasRestantesAte(sem.fim, hojeISO);

    // ideal: so o que vence nesta semana, diluido nos 7 dias dela
    var diasDaSemana = diasAte(sem.fim, sem.inicio) + 1;
    var ideal = vVence / Math.max(1, diasDaSemana);

    var ritmo = aCobrir / dias;

    return {
      semana: sem,
      venceNestaSemana: vVence,
      arrastado: vArrastado,
      aCobrir: aCobrir,
      dias: dias,
      ritmo: ritmo,
      ideal: ideal,
      semaforo: semaforoDoRitmo(ritmo, ideal),
      qtdArrastadas: arrastado.length,
      qtdVence: venceNestaSemana.length
    };
  }

  /**
   * Pendencias de MESES ANTERIORES ao mes de referencia. Bloco separado, informativo — nao
   * entra na meta do mes nem no ritmo da semana (pedido explicito: "nao misturar").
   */
  function pendenteDeMesesAnteriores(lista, ano, mes) {
    var inicioDoMes = Datas.formatarISO(ano, mes, 1);
    var antigas = lista.filter(function (c) {
      return c.tipo === 'pagar' && c.status === 'pendente' &&
             Datas.compararISO(c.vencimento, inicioDoMes) < 0;
    }).sort(function (a, b) { return Datas.compararISO(a.vencimento, b.vencimento); });

    // agrupa por mes de vencimento, do mais recente pro mais antigo
    var meses = {};
    antigas.forEach(function (c) {
      var p = Datas.parseISO(c.vencimento);
      var chave = p.ano + '-' + p.mes;
      if (!meses[chave]) meses[chave] = { ano: p.ano, mes: p.mes, valor: 0, qtd: 0 };
      meses[chave].valor += c.valor;
      meses[chave].qtd++;
    });

    return {
      total: somar(antigas),
      qtd: antigas.length,
      contas: antigas,
      meses: Object.keys(meses).map(function (k) { return meses[k]; })
        .sort(function (a, b) { return (b.ano * 12 + b.mes) - (a.ano * 12 + a.mes); })
    };
  }

  /** Quais semanas do mes deixaram resto pendente (para o marcador nas barras). */
  function semanasComResto(lista, ano, mes, hojeISO) {
    return porSemana(lista, ano, mes, 'pagar', hojeISO).map(function (s) {
      var pendentes = lista.filter(function (c) {
        return c.tipo === 'pagar' && c.status === 'pendente' &&
               Datas.estaEntre(c.vencimento, s.inicio, s.fim);
      });
      var jaPassou = Datas.compararISO(s.fim, hojeISO) < 0;
      s.resto = somar(pendentes);
      s.deixouResto = jaPassou && s.resto > 0;
      return s;
    });
  }

  /**
   * Resumo de um INTERVALO QUALQUER (mes, semana, personalizado) — generalizacao de
   * resumoDoMes, usada pelo painel das telas de lista. Recebe a lista JA filtrada por
   * categoria/busca; nunca deve receber filtro de status, porque e justamente a quebra por
   * status que ela produz (ver RN009).
   */
  function resumoDoPeriodo(lista, inicio, fim, tipo, hojeISO) {
    hojeISO = hojeISO || Datas.hoje();
    var doPeriodo = noPeriodo(lista, inicio, fim).filter(function (c) {
      return !tipo || c.tipo === tipo;
    });

    var pagas = doPeriodo.filter(function (c) { return c.status === 'pago'; });
    var pendentes = doPeriodo.filter(function (c) { return c.status === 'pendente'; });
    var atrasadas = pendentes.filter(function (c) { return Contas.estaAtrasada(c, hojeISO); });

    var total = somar(doPeriodo);
    var pago = somar(pagas);

    return {
      inicio: inicio, fim: fim, tipo: tipo,
      total: total,
      pago: pago,
      falta: somar(pendentes),
      atrasado: somar(atrasadas),
      progresso: total > 0 ? (pago / total) : 0,
      qtd: doPeriodo.length,
      qtdPaga: pagas.length,
      qtdPendente: pendentes.length,
      qtdAtrasada: atrasadas.length
    };
  }

  /**
   * Meta por dia de um INTERVALO QUALQUER. Se o periodo ja terminou (fim < hoje), nao existe
   * "dias restantes" — devolve `encerrado: true` e a interface troca a meta por "Ficou
   * pendente". Se o periodo ainda nem comecou, usa a duracao inteira dele.
   */
  function metaDoPeriodo(resumo, hojeISO) {
    hojeISO = hojeISO || Datas.hoje();

    var duracao = Math.max(1, diasAte(resumo.fim, resumo.inicio) + 1);
    var encerrado = Datas.compararISO(resumo.fim, hojeISO) < 0;
    var aindaNaoComecou = Datas.compararISO(hojeISO, resumo.inicio) < 0;

    var dias;
    if (encerrado) dias = 0;
    else if (aindaNaoComecou) dias = duracao;
    else dias = diasRestantesAte(resumo.fim, hojeISO);

    var meta = encerrado ? 0 : (resumo.falta / dias);
    var ideal = resumo.total / duracao;

    return {
      meta: meta,
      dias: dias,
      duracao: duracao,
      encerrado: encerrado,
      aindaNaoComecou: aindaNaoComecou,
      ideal: ideal,
      semaforo: encerrado ? (resumo.falta > 0 ? 'critico' : 'ok') : semaforoDoRitmo(meta, ideal)
    };
  }

  var Analise = {
    resumoDoPeriodo: resumoDoPeriodo,
    metaDoPeriodo: metaDoPeriodo,
    diasRestantesAte: diasRestantesAte,
    metaPorDia: metaPorDia,
    ritmoDaSemana: ritmoDaSemana,
    pendenteDeMesesAnteriores: pendenteDeMesesAnteriores,
    semanasComResto: semanasComResto,
    semaforoDoRitmo: semaforoDoRitmo,
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
