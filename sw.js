/* FamilIA · funcionamiento sin conexión */
var CACHE = 'familia-v5';
var BASE = ['./', 'index.html', 'styles.css', 'data.js', 'contenido-base.js', 'app.js', 'manifest.webmanifest', 'img/icon-192.png', 'img/icon-512.png'];
var ESPECIES = ['unicornio', 'conejo', 'perro', 'gato', 'zorro', 'futbolista'];
var EXPR = ['feliz', 'saluda', 'guino', 'pensando', 'festeja', 'sorpresa'];
ESPECIES.forEach(function (e) {
  EXPR.forEach(function (x) { if (!(e === 'unicornio' && x === 'sorpresa')) BASE.push('img/mascotas/' + e + '-' + x + '.webp'); });
});

self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(BASE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (ev) {
  ev.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (ev) {
  if (ev.request.method !== 'GET') return;
  /* contenido.json siempre va a la red: la app guarda su propia copia y decide si actualizar */
  if (new URL(ev.request.url).pathname.endsWith('/contenido.json')) return;
  ev.respondWith(caches.match(ev.request).then(function (r) {
    return r || fetch(ev.request).then(function (resp) {
      var copia = resp.clone();
      if (resp.ok && new URL(ev.request.url).origin === location.origin) caches.open(CACHE).then(function (c) { c.put(ev.request, copia); });
      return resp;
    });
  }).catch(function () { return caches.match('index.html'); }));
});
