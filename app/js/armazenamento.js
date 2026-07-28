/**
 * Store — única porta de entrada para o localStorage. Nenhum outro módulo lê/escreve
 * localStorage diretamente (mesma regra do projeto de referência, Pizza e Cia BH).
 */
(function (global) {
  'use strict';

  // backup.js precisa vir antes deste arquivo no index.html — a logica pura de mesclar/podar
  // mora la, e o Store so a orquestra.
  var Backup = global.Backup || (typeof require !== 'undefined' ? require('./backup.js') : null);

  var CHAVE = 'financas_v1';
  // Pontos de restauracao moram FORA do estado principal de proposito: dentro dele, entrariam
  // no arquivo exportado e o backup engordaria de forma recursiva a cada exportacao.
  var CHAVE_PONTOS = 'financas_v1_pontos';
  var CHAVE_DIA_PONTO = 'financas_v1_ultimo_ponto';
  var MAX_PONTOS = 5;
  var CATEGORIAS_PADRAO = ['casa', 'cartão', 'transporte', 'saúde', 'lazer', 'mercado', 'outros'];

  function estadoVazio() {
    return { contas: [], metas: [], categorias: CATEGORIAS_PADRAO.slice(), config: { tema: 'sistema', versaoDados: 0 } };
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
      if (typeof dado.config.versaoDados !== 'number') dado.config.versaoDados = 0;
      return dado;
    } catch (e) {
      console.error('Falha ao ler dados salvos — iniciando vazio.', e);
      return estadoVazio();
    }
  }

  /**
   * Toda gravacao incrementa `config.versaoDados`. E assim que a tela de Ajustes sabe dizer
   * "12 alteracoes desde o ultimo backup" sem precisar carimbar data em cada conta nem
   * comparar o conteudo inteiro — o contador e exato e custa nada.
   */
  function salvar(estado) {
    if (!estado.config) estado.config = { tema: 'sistema', versaoDados: 0 };
    estado.config.versaoDados = (estado.config.versaoDados || 0) + 1;
    pontoDoDia();
    gravar(estado);
  }

  /**
   * Cota estourada: os pontos de restauracao sao a primeira coisa a cair. Dado real do
   * usuario sempre vence backup interno — perder a conta para salvar a fotografia dela
   * seria o avesso do proposito.
   */
  function gravar(estado) {
    try {
      global.localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch (e) {
      try {
        global.localStorage.removeItem(CHAVE_PONTOS);
        global.localStorage.setItem(CHAVE, JSON.stringify(estado));
        console.warn('Sem espaço: os pontos de restauração foram descartados para salvar os dados.', e);
      } catch (e2) {
        console.error('Falha ao salvar.', e2);
        throw e2;
      }
    }
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

  // ------------------------------------------------ PONTOS DE RESTAURACAO
  function agoraISO() { return new Date().toISOString(); }
  function diaDeHoje() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function lerPontos() {
    try {
      var bruto = global.localStorage.getItem(CHAVE_PONTOS);
      var l = bruto ? JSON.parse(bruto) : [];
      return Array.isArray(l) ? l : [];
    } catch (e) { return []; }
  }

  function gravarPontos(l) {
    // Sem espaco, o ponto simplesmente nao nasce. Nunca deixe isto derrubar a gravacao
    // dos dados reais — e so uma rede de seguranca, nao o dado.
    try { global.localStorage.setItem(CHAVE_PONTOS, JSON.stringify(l)); } catch (e) { /* ok */ }
  }

  function criarPonto(motivo, dado) {
    var estado = dado || ler();
    var ponto = {
      id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      em: agoraISO(),
      motivo: motivo || 'automático',
      contas: (estado.contas || []).length,
      metas: (estado.metas || []).length,
      dado: estado
    };
    gravarPontos([ponto].concat(lerPontos()).slice(0, MAX_PONTOS));
    return ponto;
  }

  /** Uma fotografia por dia, do estado ANTERIOR — e o que da o "ontem" e o "3 dias atrás". */
  function pontoDoDia() {
    var hoje = diaDeHoje();
    if (global.localStorage.getItem(CHAVE_DIA_PONTO) === hoje) return;
    global.localStorage.setItem(CHAVE_DIA_PONTO, hoje);
    var bruto = global.localStorage.getItem(CHAVE);
    if (!bruto) return;
    try { criarPonto('automático', JSON.parse(bruto)); } catch (e) { /* ok */ }
  }

  /** Lista sem o `dado` — a tela so precisa do rotulo, e carregar tudo seria desperdicio. */
  function listarPontos() {
    return lerPontos().map(function (p) {
      return { id: p.id, em: p.em, motivo: p.motivo, contas: p.contas, metas: p.metas };
    });
  }

  /**
   * Restaurar tambem cria ponto antes: voltar atras precisa poder voltar atras.
   * `config` NAO e restaurada — tema, contador e histórico de backup sao do aparelho,
   * nao do dado (mesma regra da importacao).
   */
  function restaurarPonto(id) {
    var alvo = lerPontos().filter(function (p) { return p.id === id; })[0];
    if (!alvo || !alvo.dado) return false;
    var atual = ler();
    criarPonto('antes de restaurar', atual);
    var novo = {
      contas: alvo.dado.contas || [],
      metas: alvo.dado.metas || [],
      categorias: alvo.dado.categorias || CATEGORIAS_PADRAO.slice(),
      config: atual.config
    };
    salvar(novo);
    return true;
  }

  // ------------------------------------------------ BACKUP
  function exportarBackup() {
    return JSON.stringify(ler(), null, 2);
  }

  /**
   * Marca "backup feito agora". Usa `gravar` e nao `salvar` de proposito: registrar um
   * backup nao e alteracao de dado — se contasse, a tela diria "1 alteração desde o
   * backup" no instante seguinte a ele.
   */
  function registrarBackup(destino) {
    var estado = ler();
    estado.config.ultimoBackup = {
      em: agoraISO(),
      versaoDados: estado.config.versaoDados || 0,
      contas: (estado.contas || []).length,
      metas: (estado.metas || []).length,
      destino: destino || 'download'
    };
    gravar(estado);
  }

  /** Quanto tempo e quantas mudancas desde o ultimo backup — o aviso da tela de Ajustes. */
  function statusBackup() {
    var cfg = ler().config || {};
    var ultimo = cfg.ultimoBackup || null;
    return {
      ultimo: ultimo,
      alteracoes: ultimo
        ? Math.max(0, (cfg.versaoDados || 0) - (ultimo.versaoDados || 0))
        : (cfg.versaoDados || 0)
    };
  }

  /**
   * `modo`: 'juntar' acrescenta o que falta (RN025); qualquer outra coisa substitui.
   * Sempre cria ponto de restauracao antes — importar era a unica operacao do app capaz
   * de destruir tudo em silencio (RN026).
   */
  function importarBackup(json, modo) {
    var dado = JSON.parse(json);
    if (!Backup.valido(dado)) throw new Error('Arquivo de backup inválido.');
    var atual = ler();
    criarPonto('antes de importar', atual);
    var novo = (modo === 'juntar')
      ? Backup.mesclar(atual, dado)
      : {
          contas: dado.contas || [],
          metas: dado.metas || [],
          categorias: dado.categorias || CATEGORIAS_PADRAO.slice(),
          config: atual.config
        };
    novo.config = atual.config;
    salvar(novo);
    return Backup.resumoDoArquivo(novo);
  }

  // ------------------------------------------------ LIMPEZA
  function apagarTudo() {
    var atual = ler();
    criarPonto('antes de apagar tudo', atual);
    var vazio = estadoVazio();
    vazio.config = atual.config;
    salvar(vazio);
  }

  /** RN027 — poda historico pago antigo, preservando o que alguma meta ja abateu. */
  function limparPagasAntesDe(dataCorte) {
    var estado = ler();
    var r = Backup.podarPagas(estado, dataCorte);
    if (r.removidas > 0) {
      criarPonto('antes de limpar histórico', estado);
      estado.contas = r.contas;
      salvar(estado);
    }
    return r;
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
    registrarBackup: registrarBackup,
    statusBackup: statusBackup,
    criarPonto: criarPonto,
    listarPontos: listarPontos,
    restaurarPonto: restaurarPonto,
    apagarTudo: apagarTudo,
    limparPagasAntesDe: limparPagasAntesDe,
    estadoAtual: ler,
    CATEGORIAS_PADRAO: CATEGORIAS_PADRAO
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Store;
  } else {
    global.Store = Store;
  }
})(typeof window !== 'undefined' ? window : globalThis);
