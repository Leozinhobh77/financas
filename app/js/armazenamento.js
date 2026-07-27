/**
 * Store — única porta de entrada para o localStorage. Nenhum outro módulo lê/escreve
 * localStorage diretamente (mesma regra do projeto de referência, Pizza e Cia BH).
 */
(function (global) {
  'use strict';

  var CHAVE = 'financas_v1';
  var CATEGORIAS_PADRAO = ['casa', 'cartão', 'transporte', 'saúde', 'lazer', 'mercado', 'outros'];

  function estadoVazio() {
    return { contas: [], metas: [], categorias: CATEGORIAS_PADRAO.slice(), config: { tema: 'sistema' } };
  }

  function ler() {
    try {
      var bruto = global.localStorage.getItem(CHAVE);
      if (!bruto) return estadoVazio();
      var dado = JSON.parse(bruto);
      if (!dado.contas) dado.contas = [];
      // Migracao: backup gerado antes das Metas nao tem o campo. Sem este default, qualquer
      // leitura de metas quebraria ao restaurar um backup antigo.
      if (!dado.metas) dado.metas = [];
      if (!dado.categorias) dado.categorias = CATEGORIAS_PADRAO.slice();
      if (!dado.config) dado.config = { tema: 'sistema' };
      return dado;
    } catch (e) {
      console.error('Falha ao ler dados salvos — iniciando vazio.', e);
      return estadoVazio();
    }
  }

  function salvar(estado) {
    global.localStorage.setItem(CHAVE, JSON.stringify(estado));
  }

  function listarContas() { return ler().contas; }

  function adicionarConta(conta) {
    var estado = ler();
    estado.contas.push(conta);
    salvar(estado);
    return conta;
  }

  function adicionarContas(contas) {
    var estado = ler();
    estado.contas = estado.contas.concat(contas);
    salvar(estado);
    return contas;
  }

  function atualizarConta(id, mudancas) {
    var estado = ler();
    var alvo = null;
    estado.contas = estado.contas.map(function (c) {
      if (c.id === id) { alvo = Object.assign({}, c, mudancas); return alvo; }
      return c;
    });
    salvar(estado);
    return alvo;
  }

  function removerConta(id) {
    var estado = ler();
    estado.contas = estado.contas.filter(function (c) { return c.id !== id; });
    salvar(estado);
  }

  function removerGrupo(grupoId) {
    var estado = ler();
    estado.contas = estado.contas.filter(function (c) {
      return !(c.parcela && c.parcela.grupoId === grupoId);
    });
    salvar(estado);
  }

  // ---------------------------------------------------------------- METAS
  function listarMetas() { return ler().metas; }

  function obterMeta(id) {
    return ler().metas.filter(function (m) { return m.id === id; })[0] || null;
  }

  function adicionarMeta(meta) {
    var estado = ler();
    estado.metas.push(meta);
    salvar(estado);
    return meta;
  }

  function atualizarMeta(id, mudancas) {
    var estado = ler();
    var alvo = null;
    estado.metas = estado.metas.map(function (m) {
      if (m.id === id) { alvo = Object.assign({}, m, mudancas); return alvo; }
      return m;
    });
    salvar(estado);
    return alvo;
  }

  /**
   * D007.8 — remover a meta NAO mexe nas contas. Contas sao a fonte da verdade e existem
   * independentemente de qualquer meta; a meta so as LE.
   */
  function removerMeta(id) {
    var estado = ler();
    estado.metas = estado.metas.filter(function (m) { return m.id !== id; });
    salvar(estado);
  }

  function adicionarMovimento(metaId, movimento) {
    var estado = ler();
    estado.metas = estado.metas.map(function (m) {
      if (m.id !== metaId) return m;
      var copia = Object.assign({}, m);
      copia.movimentos = (m.movimentos || []).concat([movimento]);
      return copia;
    });
    salvar(estado);
    return movimento;
  }

  function removerMovimento(metaId, movimentoId) {
    var estado = ler();
    estado.metas = estado.metas.map(function (m) {
      if (m.id !== metaId) return m;
      var copia = Object.assign({}, m);
      copia.movimentos = (m.movimentos || []).filter(function (mv) { return mv.id !== movimentoId; });
      return copia;
    });
    salvar(estado);
  }

  /** Remove os movimentos ligados a uma conta — usado ao desfazer pagamento (RN018). */
  function removerMovimentosDaConta(metaId, contaId) {
    var estado = ler();
    estado.metas = estado.metas.map(function (m) {
      if (m.id !== metaId) return m;
      var copia = Object.assign({}, m);
      copia.movimentos = (m.movimentos || []).filter(function (mv) { return mv.contaId !== contaId; });
      return copia;
    });
    salvar(estado);
  }

  function listarCategorias() { return ler().categorias; }

  function adicionarCategoria(nome) {
    var estado = ler();
    var normalizado = nome.trim().toLowerCase();
    if (normalizado && estado.categorias.indexOf(normalizado) === -1) {
      estado.categorias.push(normalizado);
      salvar(estado);
    }
    return estado.categorias;
  }

  function getConfig() { return ler().config; }

  function setTema(tema) {
    var estado = ler();
    estado.config.tema = tema;
    salvar(estado);
  }

  function exportarBackup() {
    return JSON.stringify(ler(), null, 2);
  }

  function importarBackup(json) {
    var dado = JSON.parse(json);
    if (!dado || !Array.isArray(dado.contas)) throw new Error('Arquivo de backup inválido.');
    salvar(dado);
  }

  var Store = {
    listarContas: listarContas,
    adicionarConta: adicionarConta,
    adicionarContas: adicionarContas,
    atualizarConta: atualizarConta,
    removerConta: removerConta,
    removerGrupo: removerGrupo,
    listarMetas: listarMetas,
    obterMeta: obterMeta,
    adicionarMeta: adicionarMeta,
    atualizarMeta: atualizarMeta,
    removerMeta: removerMeta,
    adicionarMovimento: adicionarMovimento,
    removerMovimento: removerMovimento,
    removerMovimentosDaConta: removerMovimentosDaConta,
    listarCategorias: listarCategorias,
    adicionarCategoria: adicionarCategoria,
    getConfig: getConfig,
    setTema: setTema,
    exportarBackup: exportarBackup,
    importarBackup: importarBackup,
    CATEGORIAS_PADRAO: CATEGORIAS_PADRAO
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Store;
  } else {
    global.Store = Store;
  }
})(typeof window !== 'undefined' ? window : globalThis);
