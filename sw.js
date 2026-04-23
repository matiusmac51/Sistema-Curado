// ═══════════════════════════════════════════════
//  Manisur Curado — Service Worker (PWA)
//  Permite instalación y uso offline
// ═══════════════════════════════════════════════

const CACHE_NAME = 'manisur-curado-v9';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600;700;900&family=DM+Sans:wght@400;500;700&display=swap'
];

// Instalar: cachear todos los assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS).catch(err => {
                console.warn('SW: algunos recursos no se pudieron cachear', err);
            });
        })
    );
    self.skipWaiting();
});

// Activar: limpiar caches viejas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// Fetch: Network First para todo (para evitar problemas de caché durante desarrollo)
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return res;
            })
            .catch(() => caches.match(event.request))
    );
});
