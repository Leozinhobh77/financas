/**
 * Store — única porta de entrada para o localStorage. Nenhum outro módulo lê/escreve
 * localStorage diretamente (mesma regra do projeto de referência, Pizza e Cia BH).
 */
(function (global) {
  'use strict';

  var CHAVE = 'financas_v1';
  var CATEGORIAS_PADRAO = ['casa', 'cartão', 'transporte', 'saúde', 'lazer', 'mercado', 'outros'];

  function estadoVazio() {
    return { contas: [], categorias: CATEGORIAS_PADRAO.slice(), config: { tema: 'sistema' } };
  }

  function ler() {
    try {
      var bruto = global.localStorage.getItem(CHAVE);
      if (!bruto) return estadoVazio();
      var dado = JSON.parse(bruto);
      if (!dado.contas) dado.contas = [];
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
