const CACHE_PREFIX = 'pharmaarmoire-florans-';
const CACHE_NAME = CACHE_PREFIX + 'v1';
const URLS_TO_CACHE = [
  '/armoire-pharma/',
  '/armoire-pharma/index.html'
];

// Install: cache the app
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('SW: caching app');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches (Florans only + ancien cache 'pharmaarmoire-v1' — ne touche pas au cache d'Éguilles sur le même domaine)
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return (key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME) || key === 'pharmaarmoire-v1'; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network first, cache fallback when offline
self.addEventListener('fetch', function(event) {
  // Ne gérer que les pages de l'application (GET, même domaine).
  // Les appels externes (Mailjet, CDN…) passent directement, sans interception.
  var url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    // cache:'no-cache' : toujours vérifier auprès de GitHub s'il y a une nouvelle version
    fetch(event.request.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then(function(response) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(function() {
        return caches.open(CACHE_NAME).then(function(cache) {
          return cache.match(event.request).then(function(cached) {
            return cached || cache.match('/armoire-pharma/');
          });
        });
      })
  );
});
