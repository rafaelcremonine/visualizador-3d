// Service worker — deixa o portal e os apps funcionarem offline
const CACHE = 'portal-pedro-v1';
const ASSETS = [
  './', './index.html',
  './app-3d.html', './app-3d.js',
  './app-mob.html', './app-mob.js',
  './app-item.html', './app-item.js',
  './app-block.html', './app-block.js',
  './vendor.js', './common.js', './style.css', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png', './icons/maskable-512.png',
  './samples/arvore_minecraft.glb',
  './samples/mob_porquinho.geo.json', './samples/mob_porquinho.png',
  './samples/item_maca.png', './samples/bloco_madeira.png',
  './samples/grama_top.png', './samples/grama_side.png', './samples/grama_bottom.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
