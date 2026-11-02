/* Service worker: офлайн-режим (кэш приложения) */
const CACHE = 'gromila-v12';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'css/fonts.css',
  'fonts/manrope-cyrillic.woff2', 'fonts/manrope-latin.woff2', 'fonts/oswald-cyrillic.woff2', 'fonts/oswald-latin.woff2',
  'js/data/exercises.js', 'js/data/program.js', 'js/figure.js', 'js/db.js', 'js/sync.js', 'js/music.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(r => { if (r.ok && new URL(e.request.url).origin === location.origin) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
