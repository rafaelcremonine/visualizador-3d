// Service worker — deixa o portal e os apps funcionarem offline
const CACHE = 'portal-pedro-v7';
const M = './icons/mod/';
const B = './samples/blocks/';
const ASSETS = [
  './', './index.html',
  './app-3d.html', './app-3d.js',
  './app-mob.html', './app-mob.js',
  './app-item.html', './app-item.js',
  './app-block.html', './app-block.js',
  './app-skin.html', './app-skin.js',
  './app-som.html', './app-som.js',
  './app-comandos.html', './app-comandos.js',
  './app-mundo.html', './app-mundo.js',
  './vendor.js', './common.js', './bedrock.js', './style.css', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png', './icons/maskable-512.png',
  M + '3d.png', M + 'mob.png', M + 'item.png', M + 'block.png', M + 'skin.png', M + 'som.png', M + 'comandos.png', M + 'mundo.png',
  './samples/arvore_minecraft.glb',
  './samples/mob_porquinho.geo.json', './samples/mob_porquinho.png',
  './samples/item_maca.png', './samples/skin_steve.png',
  './samples/cano.geo.json', './samples/cano.png',
  B + 'grama_top.png', B + 'grama_side.png', B + 'grama_bottom.png',
  B + 'terra.png', B + 'pedra.png', B + 'pedregulho.png', B + 'planks.png',
  B + 'tronco_top.png', B + 'tronco_side.png', B + 'areia.png', B + 'folhas.png',
  B + 'minerio_diamante.png', B + 'minerio_ouro.png', B + 'minerio_carvao.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network-first: online sempre pega a versão nova; offline usa a cópia guardada.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))
  );
});
