/**
 * Motor de contas: criação, recorrência (RN001) e parcelamento (RN002). Funções puras onde
 * possível (recebem dados, devolvem dados novos) — sem tocar em armazenamento.js. Mesmo
 * arquivo roda no browser e no Node (ver rodapé UMD), igual datas.js.
 */
(function (global) {
  'use strict';

  var Datas = (typeof module !== 'undefined' && module.exports)
    ? require('./datas.js')
    : global.Datas;

  function gerarId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    // fallback simples (ambiente sem crypto.randomUUID) — suficiente para IDs locais
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /**
   * Cria uma conta avulsa (não recorrente, não parcelada) a partir dos dados do formulário.
   */
  function novaConta(dados) {
    return {
      id: gerarId(),
      tipo: dados.tipo,                    // 'pagar' | 'receber'
      descricao: dados.descricao,
      categoria: dados.categoria || 'outros',
      valor: Number(dados.valor),
      vencimento: dados.vencimento,         // ISO
      status: 'pendente',
      pagoEm: null,
      recorrente: !!dados.recorrente,
      recorrenciaOrigemId: null,
      parcela: null,
      criadoEm: new Date().toISOString(),
      notas: dados.notas || ''
    };
  }

  /**
   * RN002 — Parcelamento: gera as N ocorrências de uma vez, uma por mês a partir do
   * vencimento da 1ª parcela. Todas compartilham o mesmo grupoId (para excluir a série
   * inteira depois, se o usuário pedir — ver RN005).
   */
  function gerarParcelas(dados, totalParcelas) {
    var grupoId = gerarId();
    var parcelas = [];
    for (var i = 0; i < totalParcelas; i++) {
      parcelas.push({
        id: gerarId(),
        tipo: dados.tipo,
        descricao: dados.descricao,
        categoria: dados.categoria || 'outros',
        valor: Number(dados.valor),
        vencimento: Datas.somarMeses(dados.vencimento, i),
        status: 'pendente',
        pagoEm: null,
        recorrente: false,
        recorrenciaOrigemId: null,
        parcela: { atual: i + 1, total: totalParcelas, grupoId: grupoId },
        criadoEm: new Date().toISOString(),
        notas: dados.notas || ''
      });
    }
    return parcelas;
  }

  /**
   * RN001 — Recorrência sob demanda: a partir de uma conta recorrente que ACABOU de ser
   * marcada como paga, gera a PRÓXIMA ocorrência (mesmo dia do mês seguinte, clampado pelo
   * motor de datas se o mês não tiver aquele dia). Nunca gera mais de uma por vez, e nunca
   * gera sozinha pelo tempo passar — só como efeito direto do pagamento.
   */
  function gerarProximaRecorrencia(contaPaga) {
    if (!contaPaga.recorrente) return null;
    return {
      id: gerarId(),
      tipo: contaPaga.tipo,
      descricao: contaPaga.descricao,
      categoria: contaPaga.categoria,
      valor: contaPaga.valor,
      vencimento: Datas.somarMeses(contaPaga.vencimento, 1),
      status: 'pendente',
      pagoEm: null,
      recorrente: true,
      recorrenciaOrigemId: contaPaga.id,
      parcela: null,
      criadoEm: new Date().toISOString(),
      notas: contaPaga.notas || ''
    };
  }

  /** RN004 — "Atrasada" é sempre calculado na leitura, nunca gravado. */
  function estaAtrasada(conta, hojeISO) {
    hojeISO = hojeISO || Datas.hoje();
    return conta.status === 'pendente' && Datas.compararISO(conta.vencimento, hojeISO) < 0;
  }

  /** Situação de exibição de uma conta: 'paga' | 'atrasada' | 'pendente'. */
  function situacao(conta, hojeISO) {
    if (conta.status === 'pago') return 'paga';
    if (estaAtrasada(conta, hojeISO)) return 'atrasada';
    return 'pendente';
  }

  var Contas = {
    gerarId: gerarId,
    novaConta: novaConta,
    gerarParcelas: gerarParcelas,
    gerarProximaRecorrencia: gerarProximaRecorrencia,
    estaAtrasada: estaAtrasada,
    situacao: situacao
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Contas;
  } else {
    global.Contas = Contas;
  }
})(typeof window !== 'undefined' ? window : globalThis);
