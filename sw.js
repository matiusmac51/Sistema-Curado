// ═══════════════════════════════════════════════
//  Manisur Curado — Service Worker (PWA)
//  Permite instalación y uso offline
// ═══════════════════════════════════════════════

const CACHE_NAME = 'manisur-curado-v1';
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

// Fetch: Network First para HTML, Cache First para el resto
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Solo interceptar requests del mismo origen o fonts/cdn
    if (event.request.method !== 'GET') return;

    // Estrategia Network-First para HTML (siempre contenido fresco)
    if (event.request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return res;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    // Cache-First para todo lo demás (CSS, JS, fuentes)
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(res => {
                if (res && res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return res;
            }).catch(() => cached);
        })
    );
});
