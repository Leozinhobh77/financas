/**
 * backup.js — logica pura de backup: mesclar, diagnosticar, podar.
 *
 * Nada aqui toca localStorage, arquivo ou DOM: sao funcoes puras, e e por isso que
 * `node testes/motor.teste.js` consegue cobrir dinheiro do usuario sem abrir browser.
 * O lado com efeito colateral mora em armazenamento.js (estado) e arquivo.js (disco).
 */
(function (global) {
  'use strict';

  var MAX_PONTOS = 5;

  function lista(x) { return Array.isArray(x) ? x : []; }

  function idsDe(itens) {
    var mapa = {};
    lista(itens).forEach(function (i) { if (i && i.id) mapa[i.id] = true; });
    return mapa;
  }

  /** Aceita o arquivo? So exige o minimo — `contas` como lista. O resto tem default. */
  function valido(dado) {
    return !!dado && typeof dado === 'object' && Array.isArray(dado.contas);
  }

  /**
   * RN025 — juntar SO ACRESCENTA. Id que ja existe no app nao e sobrescrito, e nada e
   * removido. E a unica definicao de "juntar" que nao consegue perder dado, e por isso
   * ela e a recomendada no dialogo de importacao.
   */
  function mesclar(atual, importado) {
    var base = atual || {};
    var novo = importado || {};

    var contasAtuais = lista(base.contas);
    var temConta = idsDe(contasAtuais);
    var contasNovas = lista(novo.contas).filter(function (c) { return c && c.id && !temConta[c.id]; });

    var metasAtuais = lista(base.metas);
    var temMeta = idsDe(metasAtuais);
    var metasNovas = lista(novo.metas).filter(function (m) { return m && m.id && !temMeta[m.id]; });

    var categorias = lista(base.categorias).slice();
    lista(novo.categorias).forEach(function (c) {
      if (c && categorias.indexOf(c) === -1) categorias.push(c);
    });

    return {
      contas: contasAtuais.concat(contasNovas),
      metas: metasAtuais.concat(metasNovas),
      categorias: categorias,
      // config e preferencia deste aparelho (tema, contador). O arquivo nao manda nela.
      config: base.config
    };
  }

  /** Numeros que o dialogo de importacao mostra ANTES de o usuario decidir. */
  function diagnosticar(atual, importado) {
    var base = atual || {};
    var novo = importado || {};

    var temConta = idsDe(lista(base.contas));
    var temMeta = idsDe(lista(base.metas));
    var doArquivo = idsDe(lista(novo.contas));

    var contasNovas = lista(novo.contas).filter(function (c) { return c && c.id && !temConta[c.id]; }).length;
    var metasNovas = lista(novo.metas).filter(function (m) { return m && m.id && !temMeta[m.id]; }).length;
    var perdidasSeSubstituir = lista(base.contas).filter(function (c) { return c && !doArquivo[c.id]; }).length;

    var catsNovas = lista(novo.categorias).filter(function (c) {
      return c && lista(base.categorias).indexOf(c) === -1;
    }).length;

    return {
      contasNoApp: lista(base.contas).length,
      metasNoApp: lista(base.metas).length,
      contasNoArquivo: lista(novo.contas).length,
      metasNoArquivo: lista(novo.metas).length,
      contasNovas: contasNovas,
      metasNovas: metasNovas,
      categoriasNovas: catsNovas,
      perdidasSeSubstituir: perdidasSeSubstituir
    };
  }

  /** Ids de conta que alguma meta ja abateu — nao podem ser apagados pela limpeza. */
  function contasUsadasPorMetas(metas) {
    var usadas = {};
    lista(metas).forEach(function (m) {
      lista(m && m.movimentos).forEach(function (mv) {
        if (mv && mv.contaId) usadas[mv.contaId] = true;
      });
    });
    return usadas;
  }

  /**
   * RN026/RN027 — limpeza de historico. Remove SO conta paga com vencimento anterior ao
   * corte, e NUNCA remove conta ligada a movimento de meta: o extrato da meta aponta para
   * a conta, e uma conta fantasma deixaria o extrato mentindo (D007.8).
   *
   * Devolve { contas, removidas, preservadas } — `preservadas` e o que a regra salvou,
   * para a tela poder explicar por que o numero foi menor do que o esperado.
   */
  function podarPagas(estado, dataCorte) {
    var base = estado || {};
    var usadas = contasUsadasPorMetas(base.metas);
    var removidas = 0;
    var preservadas = 0;

    var contas = lista(base.contas).filter(function (c) {
      if (!c || c.status !== 'pago') return true;
      if (!c.vencimento || c.vencimento >= dataCorte) return true;
      if (usadas[c.id]) { preservadas++; return true; }
      removidas++;
      return false;
    });

    return { contas: contas, removidas: removidas, preservadas: preservadas };
  }

  /** Quantas contas pagas a limpeza levaria, sem mexer em nada. Para o dialogo. */
  function contarPodaveis(estado, dataCorte) {
    return podarPagas(estado, dataCorte).removidas;
  }

  /** Mantem os N mais recentes. A lista chega com o mais novo na frente. */
  function limitar(pontos, max) {
    var teto = typeof max === 'number' ? max : MAX_PONTOS;
    return lista(pontos).slice(0, teto);
  }

  /** Resumo curto de um estado, para rotulo de ponto de restauracao e do arquivo. */
  function resumoDoArquivo(dado) {
    return {
      contas: lista(dado && dado.contas).length,
      metas: lista(dado && dado.metas).length
    };
  }

  var Backup = {
    MAX_PONTOS: MAX_PONTOS,
    valido: valido,
    mesclar: mesclar,
    diagnosticar: diagnosticar,
    podarPagas: podarPagas,
    contarPodaveis: contarPodaveis,
    contasUsadasPorMetas: contasUsadasPorMetas,
    limitar: limitar,
    resumoDoArquivo: resumoDoArquivo
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Backup;
  else global.Backup = Backup;
})(typeof window !== 'undefined' ? window : globalThis);
