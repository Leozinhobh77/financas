/**
 * sw.js — service worker do Finanças.
 *
 * Faz duas coisas: permite instalar o app na tela de inicio (o Chrome no Android exige um
 * service worker com tratamento de `fetch`) e faz o app ABRIR SEM INTERNET.
 *
 * ┌──────────────────────────────────────────────────────────────────────────────────┐
 * │ ⚠️  SUBA A `VERSAO` A CADA PUBLICACAO.                                            │
 * │                                                                                  │
 * │ O nome do cache sai dela. Se ela nao subir, o navegador continua servindo os      │
 * │ arquivos velhos e NENHUMA correcao chega no usuario — ele fica presinho numa      │
 * │ versao antiga sem entender por que. E o erro classico de service worker.          │
 * └──────────────────────────────────────────────────────────────────────────────────┘
 *
 * DESARME DE EMERGENCIA (se uma versao ruim for ao ar e o app quebrar em producao):
 *   1. Troque o corpo deste arquivo por:
 *        self.addEventListener('install', () => self.skipWaiting());
 *        self.addEventListener('activate', (e) => e.waitUntil(
 *          caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))))
 *            .then(() => self.registration.unregister())
 *            .then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.navigate(c.url)))
 *        ));
 *   2. Publique. Todo mundo que abrir o app se autolimpa e volta ao site normal.
 *   Isto funciona porque o proprio sw.js e sempre buscado na rede (ver `updateViaCache` e a
 *   regra do navegador de nao cachear o script do worker por mais de 24h).
 */
'use strict';

var VERSAO = 'v1';
var CACHE = 'financas-' + VERSAO;

/**
 * O app inteiro. Se um arquivo novo nascer em js/, ele PRECISA entrar aqui — senao o app
 * abre offline quebrado, que e pior do que nao abrir.
 */
var ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './css/estilo.css',
  './js/datas.js',
  './js/contas.js',
  './js/categorias.js',
  './js/filtros.js',
  './js/analise.js',
  './js/metas.js',
  './js/backup.js',
  './js/arquivo.js',
  './js/armazenamento.js',
  './js/formatar.js',
  './js/icones.js',
  './js/graficos.js',
  './js/render.js',
  './js/render-metas.js',
  './js/app.js',
  './img/logo.svg',
  './img/icone-192.png',
  './img/icone-512.png'
];

self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // `reload` obriga a buscar na rede: sem isso, o proprio precache pode gravar a versao
      // velha que o navegador tinha guardado, e a atualizacao nunca acontece de fato.
      return cache.addAll(ARQUIVOS.map(function (u) { return new Request(u, { cache: 'reload' }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.map(function (n) {
        return n === CACHE ? null : caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/**
 * Abrir o app: REDE PRIMEIRO, cache como reserva.
 *
 * O contrario (cache primeiro no HTML) e a armadilha classica: o usuario trava numa versao
 * antiga e nenhuma correcao chega. Assim, com internet ele sempre pega o que ha de mais novo;
 * sem internet, abre do cache.
 */
function paginaComReserva(requisicao) {
  return fetch(requisicao).then(function (resposta) {
    var copia = resposta.clone();
    caches.open(CACHE).then(function (c) { c.put(requisicao, copia); });
    return resposta;
  }).catch(function () {
    return caches.match(requisicao).then(function (r) {
      return r || caches.match('./index.html');
    });
  });
}

/**
 * Demais arquivos (css/js/imagem): CACHE PRIMEIRO, atualizando por baixo.
 * Abre instantaneo e mesmo assim converge para a versao nova na visita seguinte.
 */
function arquivoComAtualizacao(requisicao) {
  return caches.match(requisicao).then(function (guardado) {
    var daRede = fetch(requisicao).then(function (resposta) {
      if (resposta && resposta.status === 200 && resposta.type === 'basic') {
        var copia = resposta.clone();
        caches.open(CACHE).then(function (c) { c.put(requisicao, copia); });
      }
      return resposta;
    }).catch(function () { return guardado; });
    return guardado || daRede;
  });
}

self.addEventListener('fetch', function (evento) {
  var req = evento.request;

  // So GET e so o proprio site. Nao e papel deste worker interferir em mais nada.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') evento.respondWith(paginaComReserva(req));
  else evento.respondWith(arquivoComAtualizacao(req));
});
