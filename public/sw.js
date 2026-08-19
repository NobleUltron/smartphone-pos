const CACHE_NAME = 'smartpos-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline app shell');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests for cache, but handle network errors for offline API queuing
  if (request.method !== 'GET') {
    return;
  }

  // Handle static assets & page requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone response to put in cache if valid static asset
        if (
          response &&
          response.status === 200 &&
          (url.pathname.startsWith('/build/') || url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json')
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Try cache fallback when offline
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Return offline page shell fallback for HTML navigation requests
        if (request.headers.get('accept')?.includes('text/html')) {
          const appShell = await caches.match('/');
          if (appShell) {
            return appShell;
          }
        }

        return new Response('Offline: Connection unavailable', {
          status: 533,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Background Sync / Offline Queue Listener
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-sales') {
    event.waitUntil(syncOfflineSales());
  }
});

async function syncOfflineSales() {
  console.log('[Service Worker] Background sync triggered for offline sales');
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_OFFLINE_SALES' });
  });
}
