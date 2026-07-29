/**
 * arquivo.js — o "Atualizar" do backup: reescreve SEMPRE o mesmo arquivo em disco.
 *
 * Por que isto existe: um site nao pode reescrever um arquivo que baixou. A unica saida e a
 * File System Access API — o usuario escolhe o arquivo uma vez, o navegador devolve um
 * FileSystemFileHandle, e com ele da para gravar de novo naquele mesmo arquivo.
 *
 * O handle NAO cabe em localStorage (nao vira JSON). Ele so sobrevive em IndexedDB, que
 * guarda o objeto por clonagem estruturada. Dai o vaivem de IndexedDB aqui embaixo.
 *
 * ⚠️ A API e de desktop (Chrome/Edge). No Android e no iOS ela nao existe — por isso todo
 * uso passa por `suportado()` e a tela tem um caminho alternativo, nunca um botao inerte.
 */
(function (global) {
  'use strict';

  var BD = 'financas_arquivo';
  var LOJA = 'handles';
  var CHAVE = 'backup';

  function suportado() {
    return typeof global.showSaveFilePicker === 'function' && typeof global.indexedDB !== 'undefined';
  }

  function abrirBanco() {
    return new Promise(function (resolve, reject) {
      var req = global.indexedDB.open(BD, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(LOJA); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function transacao(modo, acao) {
    return abrirBanco().then(function (bd) {
      return new Promise(function (resolve, reject) {
        var tx = bd.transaction(LOJA, modo);
        var req = acao(tx.objectStore(LOJA));
        tx.oncomplete = function () { bd.close(); resolve(req && req.result); };
        tx.onerror = function () { bd.close(); reject(tx.error); };
      });
    });
  }

  function guardarHandle(h) { return transacao('readwrite', function (s) { return s.put(h, CHAVE); }); }
  function lerHandle() { return transacao('readonly', function (s) { return s.get(CHAVE); }); }
  function apagarHandle() { return transacao('readwrite', function (s) { return s.delete(CHAVE); }); }

  /**
   * A permissao nao e eterna: o navegador a revoga entre sessoes. Reconsultar a cada uso e
   * obrigatorio, e o `requestPermission` so funciona dentro do gesto do usuario (o clique).
   */
  function garantirPermissao(h) {
    if (!h || !h.queryPermission) return Promise.resolve(true);
    var opc = { mode: 'readwrite' };
    return h.queryPermission(opc).then(function (p) {
      if (p === 'granted') return true;
      return h.requestPermission(opc).then(function (r) { return r === 'granted'; });
    });
  }

  /**
   * SO PERGUNTA — nunca pede. E a diferenca que faz o auto-save existir sem incomodar:
   * `requestPermission` exige o gesto do usuario, entao chamar ele de dentro de uma gravacao
   * automatica ou nao faz nada, ou e ignorado pelo navegador. Aqui a resposta e honesta:
   * `false` significa "precisa de um toque", e quem chama mostra o aviso em vez de fingir.
   */
  function permissaoConcedida(h) {
    if (!h) return Promise.resolve(false);
    if (!h.queryPermission) return Promise.resolve(true);
    return h.queryPermission({ mode: 'readwrite' })
      .then(function (p) { return p === 'granted'; }, function () { return false; });
  }

  function escrever(h, texto) {
    return h.createWritable().then(function (w) {
      return w.write(texto).then(function () { return w.close(); });
    });
  }

  /** Pergunta onde guardar e memoriza a escolha. So aqui aparece dialogo de arquivo. */
  function escolher(nomeSugerido) {
    return global.showSaveFilePicker({
      suggestedName: nomeSugerido || 'financas.json',
      types: [{ description: 'Backup do Finanças', accept: { 'application/json': ['.json'] } }]
    }).then(function (h) {
      return guardarHandle(h).then(function () { return h; });
    });
  }

  /** O handle memorizado, ou null. Nunca rejeita: banco indisponivel = simplesmente sem arquivo. */
  function vinculado() {
    if (!suportado()) return Promise.resolve(null);
    return lerHandle().then(function (h) { return h || null; }, function () { return null; });
  }

  /**
   * Grava no arquivo ja vinculado. Devolve o nome gravado, ou null se nao havia vinculo /
   * a permissao foi negada — quem chama decide se cai no download comum.
   *
   * ⚠️ PEDE permissao se ela nao estiver de pe, entao so pode ser chamada de dentro de um
   * clique do usuario. Para gravacao automatica use `atualizarSePuder`.
   */
  function atualizar(texto) {
    return vinculado().then(function (h) {
      if (!h) return null;
      return garantirPermissao(h).then(function (ok) {
        if (!ok) return null;
        return escrever(h, texto).then(function () { return h.name; });
      });
    });
  }

  /**
   * A versao para gravacao automatica: grava so se a permissao JA estiver concedida, sem
   * nunca abrir dialogo. Devolve o nome gravado, ou null — e `null` aqui nao e falha, e
   * "agora nao da, mostre o aviso e espere o toque".
   */
  function atualizarSePuder(texto) {
    return vinculado().then(function (h) {
      if (!h) return null;
      return permissaoConcedida(h).then(function (ok) {
        if (!ok) return null;
        return escrever(h, texto).then(function () { return h.name; }, function () { return null; });
      });
    });
  }

  var Arquivo = {
    suportado: suportado,
    escolher: escolher,
    vinculado: vinculado,
    permissaoConcedida: permissaoConcedida,
    atualizar: atualizar,
    atualizarSePuder: atualizarSePuder,
    esquecer: apagarHandle
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Arquivo;
  else global.Arquivo = Arquivo;
})(typeof window !== 'undefined' ? window : globalThis);
