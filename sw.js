const CACHE      = 'kixikila-v1';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/components.css',
  '/js/api.js',
  '/js/app.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap',
  'https://unpkg.com/lucide@latest'
];

// Instalar e fazer cache dos assets estáticos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

// Limpar caches antigas ao activar
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: Network first para API, Cache first para assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Pedidos à API — sempre network, sem cache
  if (url.hostname === 'sire-kixikila-api.vercel.app') {
    e.respondWith(fetch(e.request));
    return;
  }

  // Assets estáticos — cache first, fallback network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      });
    })
  );
});