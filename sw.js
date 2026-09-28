// Service Worker per Prompt Manager: rende l'app utilizzabile offline.
// I prompt sono salvati nel localStorage dalla pagina, qui si mettono in cache solo i file dell'app.
const CACHE_NAME = 'prompt-manager-v3';

const APP_FILES = [
  './prompt-manager-app.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

// Elimina cache e database lasciati dalle versioni precedenti (solo quelli di questa app)
self.addEventListener('activate', event => {
  indexedDB.deleteDatabase('PromptManagerDB');
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(name => name.startsWith('prompt') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first: online si ricevono sempre gli aggiornamenti, offline si usa la cache
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })
        .then(cached => cached ||
          (request.mode === 'navigate' ? caches.match('./prompt-manager-app.html') : Response.error())))
  );
});
