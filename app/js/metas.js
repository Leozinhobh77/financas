/**
 * Motor de METAS — campanhas de vários meses com caixinha, sobra e cofre.
 *
 * Vocabulário (fechado com o usuário, ver docs/METAS.md):
 *   CAIXINHA  alvo de quanto juntar naquele mês (o usuário digita)
 *   CONTAS    o que há para pagar naquele mês (calculado das contas selecionadas)
 *   SOBRA     caixinha − contas. É o PROPÓSITO da meta, não um detalhe.
 *   COFRE     a soma das sobras ao longo da campanha.
 *
 * A caixinha é o bolso de onde as contas saem. Não são dois bolsos — quem junta 9.000 para
 * pagar 6.000 está querendo ficar com 3.000.
 *
 * Funções puras: recebem dados, devolvem dados novos. Não tocam em armazenamento.js nem no
 * DOM, e por isso rodam no Node (testes/motor.teste.js) sem navegador. Roda nos dois
 * ambientes pelo rodapé UMD, igual datas.js e contas.js.
 *
 * INVARIANTE DO MÓDULO (RN017 / D007.3):
 *   Dinheiro que já se moveu nunca é desfeito por mudança de filtro.
 *   Conta com movimento registrado continua na meta mesmo que a categoria dela mude ou que
 *   a categoria saia da seleção. Só sai se o movimento for desfeito, explicitamente.
 */
(function (global) {
  'use strict';

  var ehNode = (typeof module !== 'undefined' && module.exports);
  var Datas = ehNode ? require('./datas.js') : global.Datas;
  var Contas = ehNode ? require('./contas.js') : global.Contas;

  var TIPOS_MOVIMENTO = ['aporte', 'retirada', 'baixa'];

  // ============================================================
  // BÁSICO
  // ============================================================

  function somar(lista) {
    return lista.reduce(function (s, c) { return s + c.valor; }, 0);
  }

  function intervaloDoMes(ano, mes) {
    return {
      inicio: Datas.formatarISO(ano, mes, 1),
      fim: Datas.formatarISO(ano, mes, Datas.diasDoMes(ano, mes))
    };
  }

  function chaveMes(ano, mes) { return ano * 100 + mes; }

  function mesesOrdenados(meta) {
    return (meta.meses || []).slice().sort(function (a, b) {
      return chaveMes(a.ano, a.mes) - chaveMes(b.ano, b.mes);
    });
  }

  function temMes(meta, ano, mes) {
    return (meta.meses || []).some(function (m) { return m.ano === ano && m.mes === mes; });
  }

  function alvoDoMes(meta, ano, mes) {
    var achado = (meta.meses || []).filter(function (m) { return m.ano === ano && m.mes === mes; })[0];
    return achado ? Number(achado.alvo) || 0 : 0;
  }

  /** 'encerrado' (mês já passou) | 'corrente' (é agora) | 'futuro' (ainda vem). */
  function estadoDoMes(ano, mes, hojeISO) {
    var iv = intervaloDoMes(ano, mes);
    if (Datas.compararISO(iv.fim, hojeISO) < 0) return 'encerrado';
    if (Datas.compararISO(hojeISO, iv.inicio) < 0) return 'futuro';
    return 'corrente';
  }

  /**
   * Dias que ainda restam no mês, contando HOJE — mesma decisão de analise.js: o dia ainda
   * não acabou, ainda dá para arrumar dinheiro hoje. Piso 1, nunca zero (não divide por zero).
   */
  function diasRestantesNoMes(ano, mes, hojeISO) {
    var iv = intervaloDoMes(ano, mes);
    var estado = estadoDoMes(ano, mes, hojeISO);
    if (estado === 'encerrado') return 0;
    if (estado === 'futuro') return Datas.diasDoMes(ano, mes);
    return Math.max(1, Datas.diasEntre(hojeISO, iv.fim) + 1);
  }

  // ============================================================
  // CRIAÇÃO
  // ============================================================

  function novaMeta(dados) {
    return {
      id: Contas.gerarId(),
      nome: (dados.nome || 'Nova meta').trim(),
      criadoEm: new Date().toISOString(),
      meses: (dados.meses || []).map(function (m) {
        return { ano: Number(m.ano), mes: Number(m.mes), alvo: Number(m.alvo) || 0 };
      }).sort(function (a, b) { return chaveMes(a.ano, a.mes) - chaveMes(b.ano, b.mes); }),
      selecao: {
        categorias: (dados.categorias || []).slice(),
        incluidas: [],
        excluidas: []
      },
      movimentos: [],
      contasConhecidas: [],
      config: { excedente: (dados.excedente === 'abate' ? 'abate' : 'cofre') }
    };
  }

  /**
   * Divide um total em N parcelas iguais em CENTAVOS, jogando o resto na última. Usado pelo
   * assistente de criação ("quero juntar 36.000 em 4 meses" → 9.000 cada). Sem isso,
   * 10.000/3 viraria 3333,33 × 3 = 9999,99 e a meta nasceria com um centavo faltando.
   */
  function dividirIgual(total, n) {
    if (!n || n < 1) return [];
    var centavos = Math.round(Number(total) * 100);
    var base = Math.floor(centavos / n);
    var resto = centavos - base * n;
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push((base + (i === n - 1 ? resto : 0)) / 100);
    }
    return out;
  }

  // ============================================================
  // MOVIMENTOS — o extrato único (D007.4)
  // ============================================================

  /**
   * Um extrato só, em ordem de tempo, em vez de três listas (aportes / baixas / retiradas).
   * Três listas para o mesmo dinheiro é exatamente como saldo desanda: qualquer número de
   * painel precisa ser conferível linha a linha aqui.
   *
   * `foto` guarda descrição e valor da conta NO MOMENTO do lançamento (D007.2/RN019). Sem isso,
   * excluir ou editar a conta depois deixaria o extrato órfão ou mentindo.
   */
  function novoMovimento(dados) {
    var tipo = TIPOS_MOVIMENTO.indexOf(dados.tipo) !== -1 ? dados.tipo : 'aporte';
    return {
      id: Contas.gerarId(),
      tipo: tipo,
      data: dados.data,
      valor: Math.abs(Number(dados.valor) || 0),
      nota: dados.nota || '',
      contaId: dados.contaId || null,
      foto: dados.conta ? fotoDaConta(dados.conta) : (dados.foto || null),
      criadoEm: new Date().toISOString()
    };
  }

  function fotoDaConta(conta) {
    return {
      descricao: conta.descricao,
      valor: conta.valor,
      vencimento: conta.vencimento,
      categoria: conta.categoria
    };
  }

  /** +1 entra dinheiro, −1 sai. O valor é sempre guardado positivo; o tipo dá a direção. */
  function sinal(tipo) { return tipo === 'aporte' ? 1 : -1; }

  function efeito(mov) { return sinal(mov.tipo) * mov.valor; }

  function movimentosDoMes(meta, ano, mes) {
    var iv = intervaloDoMes(ano, mes);
    return (meta.movimentos || []).filter(function (m) {
      return Datas.estaEntre(m.data, iv.inicio, iv.fim);
    }).sort(function (a, b) { return Datas.compararISO(a.data, b.data); });
  }

  function somaPorTipo(movs, tipo) {
    return movs.filter(function (m) { return m.tipo === tipo; })
      .reduce(function (s, m) { return s + m.valor; }, 0);
  }

  /**
   * Saldo da campanha inteira — o dinheiro que existe AGORA. É de campanha, não de mês: se
   * agosto fechou com 3.000 sobrando, esses 3.000 continuam na mão em setembro. Tratar saldo
   * por mês faria setembro parecer negativo enquanto havia dinheiro guardado.
   */
  function saldoDaMeta(meta) {
    return (meta.movimentos || []).reduce(function (s, m) { return s + efeito(m); }, 0);
  }

  /** Extrato com saldo correndo ao lado — é o que torna todo painel conferível a olho nu. */
  function extrato(meta) {
    var acumulado = 0;
    return (meta.movimentos || []).slice()
      .sort(function (a, b) {
        var d = Datas.compararISO(a.data, b.data);
        return d !== 0 ? d : String(a.criadoEm || '').localeCompare(String(b.criadoEm || ''));
      })
      .map(function (m) {
        acumulado += efeito(m);
        return { movimento: m, efeito: efeito(m), acumulado: acumulado };
      });
  }

  function temMovimentoDaConta(meta, contaId) {
    return (meta.movimentos || []).some(function (m) { return m.contaId === contaId; });
  }

  // ============================================================
  // SELEÇÃO DE CONTAS — regra viva, não fotografia
  // ============================================================

  /**
   * A seleção por categoria é uma REGRA, não um retrato: conta nova que caia numa categoria
   * marcada entra sozinha. É isso que faz os meses futuros da campanha se encherem sozinhos
   * conforme recorrências e parcelas chegam.
   *
   * Ordem de precedência (a primeira que casar decide):
   *   1. tem movimento registrado  → ENTRA sempre (invariante RN017/D007.3)
   *   2. está em `excluidas`       → fica de fora
   *   3. está em `incluidas`       → entra
   *   4. categoria marcada         → entra
   */
  function contaEntra(meta, conta) {
    if (!conta || conta.tipo !== 'pagar') return false;
    var sel = meta.selecao || {};
    if (temMovimentoDaConta(meta, conta.id)) return true;
    if ((sel.excluidas || []).indexOf(conta.id) !== -1) return false;
    if ((sel.incluidas || []).indexOf(conta.id) !== -1) return true;
    return (sel.categorias || []).indexOf(conta.categoria) !== -1;
  }

  /**
   * RN012 / D007.1 — uma conta pertence a NO MÁXIMO UMA meta. Sem isso, duas campanhas que
   * marquem a mesma categoria contam o mesmo aluguel duas vezes e os dois cofres mentem.
   *
   * Critério de desempate, nesta ordem:
   *   1. a meta que já mexeu no dinheiro dessa conta (tem movimento) — dinheiro manda
   *   2. a meta mais antiga (criadoEm; empate desfeito pelo id, para ser determinístico)
   */
  function donoDaConta(metas, conta) {
    var candidatas = (metas || []).filter(function (m) { return contaEntra(m, conta); });
    if (!candidatas.length) return null;

    var comMovimento = candidatas.filter(function (m) { return temMovimentoDaConta(m, conta.id); });
    if (comMovimento.length) candidatas = comMovimento;

    return candidatas.sort(function (a, b) {
      var d = String(a.criadoEm || '').localeCompare(String(b.criadoEm || ''));
      return d !== 0 ? d : String(a.id).localeCompare(String(b.id));
    })[0];
  }

  /** As contas de um mês da meta. `outrasMetas` (opcional) aplica a exclusividade RN012. */
  function contasDaMeta(meta, contas, ano, mes, outrasMetas) {
    var iv = intervaloDoMes(ano, mes);
    return (contas || []).filter(function (c) {
      if (!Datas.estaEntre(c.vencimento, iv.inicio, iv.fim)) return false;
      if (!contaEntra(meta, c)) return false;
      if (outrasMetas && outrasMetas.length > 1) {
        var dono = donoDaConta(outrasMetas, c);
        if (dono && dono.id !== meta.id) return false;
      }
      return true;
    }).sort(function (a, b) { return Datas.compararISO(a.vencimento, b.vencimento); });
  }

  /** Contas que a meta quer mas que outra meta já reservou — para travar a caixinha na tela. */
  function contasReservadasPorOutra(meta, contas, metas) {
    return (contas || []).filter(function (c) {
      if (!contaEntra(meta, c)) return false;
      var dono = donoDaConta(metas, c);
      return dono && dono.id !== meta.id;
    }).map(function (c) {
      return { conta: c, dono: donoDaConta(metas, c) };
    });
  }

  // ============================================================
  // BAIXA CRUZADA — a conta e a caixinha são coisas diferentes
  // ============================================================

  /**
   * RN016 — "a conta foi paga" e "o dinheiro saiu da minha caixinha" são fatos SEPARADOS.
   * A conta tem um estado só (pago ou não); a meta tem o registro do débito. Pagar pelo
   * salário e pagar pela caixinha são coisas diferentes, e só o usuário sabe qual foi.
   *
   *   'aberta'                 pendente, sem movimento — o caso normal
   *   'abatida'                paga E debitada da caixinha — o ciclo completo
   *   'paga-fora'              paga em Contas a Pagar, ainda NÃO debitada — precisa de aviso
   *   'abatida-sem-pagamento'  debitada mas a conta voltou a pendente — inconsistência
   *
   * O último estado não deveria acontecer pela interface (RN018 desfaz o débito ao desmarcar
   * o pagamento), mas existe aqui para a tela poder mostrar e oferecer conserto em vez de
   * exibir um número errado calado.
   */
  function situacaoNaMeta(meta, conta) {
    var temMov = temMovimentoDaConta(meta, conta.id);
    if (conta.status === 'pago') return temMov ? 'abatida' : 'paga-fora';
    return temMov ? 'abatida-sem-pagamento' : 'aberta';
  }

  /** O movimento de baixa ligado a uma conta (o primeiro, se houver mais de um). */
  function movimentoDaConta(meta, contaId) {
    return (meta.movimentos || []).filter(function (m) { return m.contaId === contaId; })[0] || null;
  }

  /** Contas já pagas fora da meta que ainda não foram abatidas da caixinha. */
  function pendentesDeAbatimento(meta, contas, ano, mes, outrasMetas) {
    return contasDaMeta(meta, contas, ano, mes, outrasMetas).filter(function (c) {
      return situacaoNaMeta(meta, c) === 'paga-fora';
    });
  }

  /** Qual meta (se alguma) já debitou esta conta — usado pelo alerta anti-baixa-dupla. */
  function metaQueAbateu(metas, contaId) {
    return (metas || []).filter(function (m) { return temMovimentoDaConta(m, contaId); })[0] || null;
  }

  // ============================================================
  // RESUMO DE UM MÊS
  // ============================================================

  function estaPaga(c) { return c.status === 'pago'; }
  function estaPendente(c) { return c.status !== 'pago'; }

  /**
   * Tudo que um mês da campanha sabe sobre si. `opcoes`:
   *   outrasMetas       lista completa de metas, para aplicar a exclusividade
   *   arrastadas        contas pendentes de meses ANTERIORES da campanha (ver resumoDaCampanha)
   *   saldoDisponivel   saldo da campanha inteira — o piso por dia depende do que já há em mãos
   */
  function resumoDoMes(meta, contas, ano, mes, hojeISO, opcoes) {
    hojeISO = hojeISO || Datas.hoje();
    opcoes = opcoes || {};

    var iv = intervaloDoMes(ano, mes);
    var estado = estadoDoMes(ano, mes, hojeISO);
    var alvo = alvoDoMes(meta, ano, mes);

    var proprias = contasDaMeta(meta, contas, ano, mes, opcoes.outrasMetas);
    var arrastadas = (opcoes.arrastadas || []).slice();
    var todas = proprias.concat(arrastadas);

    var pagas = todas.filter(estaPaga);
    var pendentes = todas.filter(estaPendente);
    var atrasadas = pendentes.filter(function (c) { return Contas.estaAtrasada(c, hojeISO); });

    var totalContas = somar(todas);
    var totalProprias = somar(proprias);
    var pagoContas = somar(pagas);
    var faltaContas = somar(pendentes);

    var movs = movimentosDoMes(meta, ano, mes);
    var juntado = somaPorTipo(movs, 'aporte');
    var retirado = somaPorTipo(movs, 'retirada');
    var pagoDaMeta = somaPorTipo(movs, 'baixa');
    var contribuicao = juntado - retirado - pagoDaMeta;

    var faltaJuntar = Math.max(0, alvo - juntado);
    var excedente = Math.max(0, juntado - alvo);

    // O saldo é da campanha inteira: dinheiro de agosto continua existindo em setembro.
    var saldo = (opcoes.saldoDisponivel != null) ? opcoes.saldoDisponivel : contribuicao;
    var descoberto = Math.max(0, faltaContas - saldo);

    var diasRestantes = diasRestantesNoMes(ano, mes, hojeISO);
    var duracao = Datas.diasDoMes(ano, mes);
    var encerrado = estado === 'encerrado';

    var metaPorDia = (encerrado || faltaJuntar <= 0) ? 0 : faltaJuntar / diasRestantes;
    var pisoPorDia = (encerrado || descoberto <= 0) ? 0 : descoberto / diasRestantes;

    var diasCorridos = estado === 'corrente' ? (Datas.diasEntre(iv.inicio, hojeISO) + 1)
                     : (encerrado ? duracao : 0);
    var ritmo = diasCorridos > 0 ? (juntado / diasCorridos) : 0;
    var projecao = estado === 'corrente' ? (ritmo * duracao) : juntado;

    // Dia da virada: quando o que já se juntou passa a cobrir tudo que falta pagar.
    var jaVirou = descoberto <= 0;
    var viradaISO = null;
    if (!jaVirou && ritmo > 0 && estado === 'corrente') {
      var faltamDias = Math.ceil(descoberto / ritmo);
      if (faltamDias <= diasRestantes) viradaISO = Datas.somarDias(hojeISO, faltamDias);
    }

    var semContas = todas.length === 0;

    // As duas linhas da meta: o PISO (cobrir as contas) e o ALVO (a sobra completa).
    var faixa;
    if (estado === 'futuro') faixa = 'futuro';
    else if (juntado >= alvo && alvo > 0) faixa = 'verde';
    else if (juntado >= totalContas) faixa = 'amarelo';
    else faixa = 'vermelho';

    return {
      ano: ano, mes: mes, inicio: iv.inicio, fim: iv.fim,
      estado: estado, faixa: faixa, semContas: semContas,

      alvo: alvo,
      juntado: juntado,
      retirado: retirado,
      pagoDaMeta: pagoDaMeta,
      contribuicao: contribuicao,
      faltaJuntar: faltaJuntar,
      excedente: excedente,
      progresso: alvo > 0 ? (juntado / alvo) : 0,

      contas: {
        proprias: proprias,
        arrastadas: arrastadas,
        todas: todas,
        pendentes: pendentes,
        total: totalContas,
        totalProprias: totalProprias,
        pago: pagoContas,
        falta: faltaContas,
        atrasado: somar(atrasadas),
        qtd: todas.length,
        qtdPaga: pagas.length,
        qtdPendente: pendentes.length,
        qtdAtrasada: atrasadas.length,
        qtdArrastada: arrastadas.length
      },

      sobraPrevista: alvo - totalContas,
      saldo: saldo,
      descoberto: descoberto,

      metaPorDia: metaPorDia,
      pisoPorDia: pisoPorDia,
      diasRestantes: diasRestantes,
      duracao: duracao,
      diasCorridos: diasCorridos,
      ritmo: ritmo,
      projecao: projecao,
      jaVirou: jaVirou,
      viradaISO: viradaISO,

      movimentos: movs
    };
  }

  // ============================================================
  // RESUMO DA CAMPANHA + ESCADA DO COFRE
  // ============================================================

  /**
   * A campanha inteira, mês a mês, com o cofre subindo em escada.
   *
   * ARRASTO: conta que ficou pendente num mês JÁ ENCERRADO não some — ela é colada no
   * primeiro mês ainda aberto, que é onde ela vai ter que ser paga de verdade. É isso que faz
   * a sobra do mês seguinte encolher sozinha quando um mês fecha devendo.
   *
   * O cofre nunca é negativo (RN014/D007.6): o que faltou vira conta em aberto, não saldo
   * negativo. Dívida e dinheiro guardado são coisas diferentes e moram em linhas diferentes.
   */
  function resumoDaCampanha(meta, contas, hojeISO, outrasMetas) {
    hojeISO = hojeISO || Datas.hoje();

    var meses = mesesOrdenados(meta);
    var saldo = saldoDaMeta(meta);

    var arrastoPendente = [];
    var vistas = {};
    var jaColou = false;

    var linhas = meses.map(function (m, i) {
      var estado = estadoDoMes(m.ano, m.mes, hojeISO);
      var ultimoMes = (i === meses.length - 1);

      // O arrasto entra no primeiro mês ainda aberto. Se a campanha inteira já encerrou,
      // entra no último mês — senão a dívida sumiria da tela.
      var arrastadas = [];
      if (!jaColou && (estado !== 'encerrado' || ultimoMes)) {
        arrastadas = arrastoPendente.slice();
        jaColou = true;
      }

      var r = resumoDoMes(meta, contas, m.ano, m.mes, hojeISO, {
        outrasMetas: outrasMetas,
        arrastadas: arrastadas,
        saldoDisponivel: saldo
      });

      if (estado === 'encerrado') {
        r.contas.pendentes.forEach(function (c) {
          if (!vistas[c.id]) { vistas[c.id] = true; arrastoPendente.push(c); }
        });
      }
      return r;
    });

    // Quanto ainda vai entrar no cofre daqui pra frente. Meses encerrados já deram o que tinham
    // que dar; dos abertos, o que falta é (o que falta juntar) − (o que falta pagar).
    var faltaContribuir = linhas.reduce(function (s, r) {
      if (r.estado === 'encerrado') return s;
      return s + (r.faltaJuntar - r.contas.falta);
    }, 0);

    var cofreHoje = Math.max(0, saldo);
    var cofrePrevisto = saldo + faltaContribuir;

    // A escada: cada mês contribui, o cofre acumula.
    var acumulado = 0;
    var escada = linhas.map(function (r) {
      var previstaRestante = r.estado === 'encerrado' ? 0 : (r.faltaJuntar - r.contas.falta);
      var contribuicaoPrevista = r.contribuicao + previstaRestante;
      acumulado += contribuicaoPrevista;
      return {
        ano: r.ano, mes: r.mes, estado: r.estado, faixa: r.faixa,
        alvo: r.alvo,
        contas: r.contas.total,
        qtdArrastada: r.contas.qtdArrastada,
        arrastado: somar(r.contas.arrastadas),
        semContas: r.semContas,
        sobraPrevista: r.sobraPrevista,
        realizado: r.contribuicao,
        temRealizado: r.estado !== 'futuro',
        contribuicaoPrevista: contribuicaoPrevista,
        diferenca: r.estado === 'encerrado' ? (r.contribuicao - r.sobraPrevista) : 0,
        acumulado: acumulado
      };
    });

    var totalAlvo = linhas.reduce(function (s, r) { return s + r.alvo; }, 0);
    var totalContas = linhas.reduce(function (s, r) { return s + r.contas.totalProprias; }, 0);
    var totalJuntado = linhas.reduce(function (s, r) { return s + r.juntado; }, 0);
    var totalPago = linhas.reduce(function (s, r) { return s + r.pagoDaMeta; }, 0);
    var totalRetirado = linhas.reduce(function (s, r) { return s + r.retirado; }, 0);

    var emAberto = linhas.reduce(function (s, r) { return s + r.contas.falta; }, 0);
    var mesCorrente = linhas.filter(function (r) { return r.estado === 'corrente'; })[0] || null;

    return {
      meta: meta,
      meses: linhas,
      escada: escada,
      mesCorrente: mesCorrente,

      totalAlvo: totalAlvo,
      totalContas: totalContas,
      sobraPrevistaTotal: totalAlvo - totalContas,

      totalJuntado: totalJuntado,
      totalPago: totalPago,
      totalRetirado: totalRetirado,

      saldo: saldo,
      cofreHoje: cofreHoje,
      cofrePrevisto: cofrePrevisto,
      emAberto: emAberto,

      progresso: totalAlvo > 0 ? (totalJuntado / totalAlvo) : 0,
      qtdMeses: linhas.length,
      encerrada: linhas.length > 0 && linhas.every(function (r) { return r.estado === 'encerrado'; })
    };
  }

  // ============================================================
  // INTELIGÊNCIA — o que o app percebe sozinho
  // ============================================================

  /** Todos os ids de conta que a meta enxerga hoje, em todos os meses dela. */
  function idsDasContasDaMeta(meta, contas, outrasMetas) {
    var ids = [];
    mesesOrdenados(meta).forEach(function (m) {
      contasDaMeta(meta, contas, m.ano, m.mes, outrasMetas).forEach(function (c) {
        if (ids.indexOf(c.id) === -1) ids.push(c.id);
      });
    });
    return ids;
  }

  /**
   * Contas que entraram na meta DEPOIS da última fotografia — o efeito colateral de a seleção
   * ser uma regra viva (RN011). Entrar sozinha é o comportamento certo; entrar EM SILÊNCIO
   * não é: a sobra do mês encolheria sem o usuário saber por quê.
   *
   * Meta sem `snapshotEm` ainda não foi fotografada (criada antes desta versão, ou recém-criada
   * antes do primeiro registro): devolve vazio para não acusar o acervo inteiro como novidade.
   */
  function contasNovas(meta, contas, outrasMetas) {
    if (!meta.snapshotEm) return [];
    var conhecidas = {};
    (meta.contasConhecidas || []).forEach(function (id) { conhecidas[id] = true; });

    var novas = [];
    mesesOrdenados(meta).forEach(function (m) {
      contasDaMeta(meta, contas, m.ano, m.mes, outrasMetas).forEach(function (c) {
        if (!conhecidas[c.id]) novas.push({ conta: c, ano: m.ano, mes: m.mes });
      });
    });
    return novas;
  }

  /** Agrupa as contas novas por mês, com o quanto elas encolheram a sobra daquele mês. */
  function impactoDasContasNovas(meta, contas, outrasMetas) {
    var porMes = {};
    contasNovas(meta, contas, outrasMetas).forEach(function (n) {
      var k = n.ano + '-' + n.mes;
      if (!porMes[k]) porMes[k] = { ano: n.ano, mes: n.mes, contas: [], total: 0 };
      porMes[k].contas.push(n.conta);
      porMes[k].total += n.conta.valor;
    });
    return Object.keys(porMes).map(function (k) { return porMes[k]; })
      .sort(function (a, b) { return chaveMes(a.ano, a.mes) - chaveMes(b.ano, b.mes); });
  }

  /**
   * Até onde o dinheiro em mãos alcança, pagando por ordem de vencimento. Responde a pergunta
   * prática de quem está apertado: "com o que eu tenho, quais eu consigo pagar?" — em vez de
   * deixar o usuário descobrir no susto, na hora do vencimento.
   */
  function ateOndeAlcanca(pendentes, saldo) {
    var ordenadas = (pendentes || []).slice().sort(function (a, b) {
      return Datas.compararISO(a.vencimento, b.vencimento);
    });
    var restante = Math.max(0, saldo);
    var cobertas = [], descobertas = [], cortada = null, faltam = 0;

    ordenadas.forEach(function (c) {
      if (cortada) { descobertas.push(c); return; }
      if (c.valor <= restante) { cobertas.push(c); restante -= c.valor; return; }
      cortada = c;
      faltam = c.valor - restante;
    });

    return {
      cobertas: cobertas,
      cortada: cortada,
      descobertas: descobertas,
      sobra: restante,
      faltam: faltam,
      cobreTudo: !cortada && ordenadas.length > 0,
      vazio: ordenadas.length === 0
    };
  }

  /** Meses da campanha em que as contas passam da caixinha — o mês fecharia no vermelho. */
  function mesesEmRisco(resumo) {
    return resumo.meses.filter(function (r) {
      return !r.semContas && r.sobraPrevista < 0;
    });
  }

  /**
   * Série dia a dia do mês: quanto foi juntado de verdade × a linha reta do plano. É o gráfico
   * que responde "estou conseguindo acompanhar?" numa olhada, sem ler número nenhum.
   */
  function serieAcumulada(meta, ano, mes) {
    var totalDias = Datas.diasDoMes(ano, mes);
    var alvo = alvoDoMes(meta, ano, mes);
    var aportes = movimentosDoMes(meta, ano, mes).filter(function (m) { return m.tipo === 'aporte'; });

    var acumulado = 0;
    var out = [];
    for (var d = 1; d <= totalDias; d++) {
      var iso = Datas.formatarISO(ano, mes, d);
      aportes.forEach(function (m) { if (m.data === iso) acumulado += m.valor; });
      out.push({ dia: d, iso: iso, real: acumulado, ideal: alvo * (d / totalDias) });
    }
    return out;
  }

  /**
   * Dias seguidos lançando. Ontem ainda conta: quem lançou ontem e ainda não lançou hoje não
   * perdeu a sequência — ela só quebra depois de um dia inteiro em branco.
   */
  function sequenciaDeDias(meta, hojeISO) {
    hojeISO = hojeISO || Datas.hoje();
    var comAporte = {};
    (meta.movimentos || []).forEach(function (m) {
      if (m.tipo === 'aporte') comAporte[m.data] = true;
    });

    var lancouHoje = !!comAporte[hojeISO];
    var cursor = lancouHoje ? hojeISO : Datas.somarDias(hojeISO, -1);
    var n = 0;
    while (comAporte[cursor]) { n++; cursor = Datas.somarDias(cursor, -1); }
    return { dias: n, lancouHoje: lancouHoje };
  }

  /**
   * "E se eu juntar R$ X por dia?" — projeta o fechamento do mês corrente e o cofre da
   * campanha. A conta é a diferença entre o que a hipótese junta e o que ainda faltava juntar;
   * o resto do cofre previsto já está calculado e não se mexe.
   */
  function simular(resumo, porDia, hojeISO) {
    var r = resumo.mesCorrente;
    if (!r) return null;
    hojeISO = hojeISO || Datas.hoje();

    var vaiJuntar = Math.max(0, porDia) * r.diasRestantes;
    var fechaCom = r.juntado + vaiJuntar;
    var diferenca = vaiJuntar - r.faltaJuntar;

    var viradaISO = null;
    if (r.descoberto > 0 && porDia > 0) {
      var d = Math.ceil(r.descoberto / porDia);
      if (d <= r.diasRestantes) viradaISO = Datas.somarDias(hojeISO, d);
    }

    return {
      porDia: porDia,
      fechaCom: fechaCom,
      alvo: r.alvo,
      acimaDoAlvo: fechaCom - r.alvo,
      cofre: resumo.cofrePrevisto + diferenca,
      cofreBase: resumo.cofrePrevisto,
      diferenca: diferenca,
      jaVirou: r.descoberto <= 0,
      viradaISO: viradaISO
    };
  }

  /** Índice absoluto de mês — permite deslocar uma campanha sem se perder na virada do ano. */
  function indiceMes(ano, mes) { return ano * 12 + (mes - 1); }

  /**
   * Os meses de uma cópia da campanha, deslocados para depois do fim dela. Mantém os buracos:
   * quem pulou dezembro continua pulando o mês equivalente.
   */
  function mesesParaDuplicar(meta) {
    var meses = mesesOrdenados(meta);
    if (!meses.length) return [];
    var primeiro = indiceMes(meses[0].ano, meses[0].mes);
    var ultimo = indiceMes(meses[meses.length - 1].ano, meses[meses.length - 1].mes);
    var desloc = (ultimo - primeiro) + 1;

    return meses.map(function (m) {
      var i = indiceMes(m.ano, m.mes) + desloc;
      return { ano: Math.floor(i / 12), mes: (i % 12) + 1, alvo: m.alvo };
    });
  }

  /** Rótulo curto de um mês; só mostra o ano quando a campanha cruza a virada do ano. */
  function rotuloMes(ano, mes, mostrarAno) {
    var nome = Datas.nomeMes(mes);
    var curto = nome.slice(0, 3);
    return mostrarAno ? (curto + '/' + String(ano).slice(2)) : curto;
  }

  function campanhaCruzaAno(meta) {
    var meses = mesesOrdenados(meta);
    if (meses.length < 2) return false;
    return meses[0].ano !== meses[meses.length - 1].ano;
  }

  var Metas = {
    // criação
    novaMeta: novaMeta,
    dividirIgual: dividirIgual,
    // movimentos
    novoMovimento: novoMovimento,
    fotoDaConta: fotoDaConta,
    efeito: efeito,
    sinal: sinal,
    movimentosDoMes: movimentosDoMes,
    saldoDaMeta: saldoDaMeta,
    extrato: extrato,
    temMovimentoDaConta: temMovimentoDaConta,
    // seleção
    contaEntra: contaEntra,
    donoDaConta: donoDaConta,
    contasDaMeta: contasDaMeta,
    contasReservadasPorOutra: contasReservadasPorOutra,
    // baixa cruzada
    situacaoNaMeta: situacaoNaMeta,
    movimentoDaConta: movimentoDaConta,
    pendentesDeAbatimento: pendentesDeAbatimento,
    metaQueAbateu: metaQueAbateu,
    // resumos
    resumoDoMes: resumoDoMes,
    resumoDaCampanha: resumoDaCampanha,
    // inteligência
    idsDasContasDaMeta: idsDasContasDaMeta,
    contasNovas: contasNovas,
    impactoDasContasNovas: impactoDasContasNovas,
    ateOndeAlcanca: ateOndeAlcanca,
    mesesEmRisco: mesesEmRisco,
    serieAcumulada: serieAcumulada,
    sequenciaDeDias: sequenciaDeDias,
    simular: simular,
    mesesParaDuplicar: mesesParaDuplicar,
    indiceMes: indiceMes,
    // utilidades de mês
    intervaloDoMes: intervaloDoMes,
    estadoDoMes: estadoDoMes,
    diasRestantesNoMes: diasRestantesNoMes,
    mesesOrdenados: mesesOrdenados,
    temMes: temMes,
    alvoDoMes: alvoDoMes,
    rotuloMes: rotuloMes,
    campanhaCruzaAno: campanhaCruzaAno,
    chaveMes: chaveMes
  };

  if (ehNode) {
    module.exports = Metas;
  } else {
    global.Metas = Metas;
  }
})(typeof window !== 'undefined' ? window : globalThis);
