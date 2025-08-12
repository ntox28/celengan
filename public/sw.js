const CACHE_NAME = 'celengan-app-cache-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
];

// Install event: precache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(err => {
        console.error('Failed to open cache or cache files:', err);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;

  // For Supabase API calls and authentication, always go to the network.
  if (request.url.includes('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // For other requests (app assets), use a "Cache first, then network" strategy.
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(networkResponse => {
        // Don't cache unsuccessful responses.
        if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
        }

        // Cache the new response for future use.
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(error => {
        console.error('Fetch failed; returning offline page instead.', error);
        // Optionally, return an offline fallback page here.
        // For now, it will just fail if not in cache.
      });
    })
  );
});
