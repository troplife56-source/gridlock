/* Gridlock — service worker : le jeu fonctionne hors-ligne une fois installé.
   Change VERSION à chaque mise en ligne pour que les joueurs reçoivent la nouvelle version. */
const VERSION = 'gridlock-v4';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/solver.js', 'js/art.js', 'js/levels.js', 'js/game.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Polices Google : servies depuis le cache, mises à jour en arrière-plan
  if (url.host.endsWith('googleapis.com') || url.host.endsWith('gstatic.com')) {
    e.respondWith(caches.open(VERSION + '-fonts').then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Fichiers du jeu : cache d'abord, réseau sinon
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return r;
  }).catch(() => caches.match('index.html'))));
});
