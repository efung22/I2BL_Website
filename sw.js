const CACHE_NAME = 'labcorp_data_cache'; // A version name for your cache
const APPS_SCRIPT_URL_PREFIX = 'https://script.google.com/macros/s/AKfycbzK3iC-xXKQubOI5Zr5Es7K2wivt9PTsXFdPoGFO4cKps12Alv8wUs_ILZd5KLjjbPgBQ/exec'; 

// Define the maximum age for the Apps Script data cache (e.g., 24 hours)
const DATA_CACHE_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours in seconds

// List of static assets to cache on install (your main website files)
const urlsToCache = [
  '/', 
  'index.html',
  'style.css',
  'script.js',
  'logo.png',
];

// --- Install Event: Cache static assets ---
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(urlsToCache); 
      })
      .then(() => self.skipWaiting()) 
      .catch((error) => console.error('[SW] Failed to cache static assets:', error))
  );
});

// --- Activate Event: Clean up old caches ---
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) { 
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) 
  );
});

// --- Fetch Event: Intercept network requests and serve from cache ---
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // --- Strategy for Google Apps Script data: Network-First with Cache Fallback and Expiry ---
  // Check if the request is for your Apps Script URL
  if (requestUrl.origin === new URL(APPS_SCRIPT_URL_PREFIX).origin && requestUrl.pathname.startsWith(new URL(APPS_SCRIPT_URL_PREFIX).pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          // 1. Try to get the response from the network (prioritize freshness)
          const networkResponse = await fetch(event.request);

          // 2. If network successful, update cache with the new response and a timestamp
          const responseToCache = networkResponse.clone();
          const headers = new Headers(responseToCache.headers);
          // Add a custom header to the cached response to store its timestamp
          headers.set('sw-cached-time', new Date().getTime().toString()); 
          const responseWithTimestamp = new Response(responseToCache.body, {
            status: networkResponse.status,
            statusText: networkResponse.statusText,
            headers: headers
          });
          cache.put(event.request, responseWithTimestamp); // Store the response with its timestamp
          console.log('[SW] Fetched from network, cached, and served:', event.request.url);
          return networkResponse; // Serve the fresh network response

        } catch (error) {
          // 3. Network request failed (e.g., offline, server error): Try to get from cache
          console.warn('[SW] Network failed, trying cache for:', event.request.url);
          const cachedResponse = await cache.match(event.request);

          if (cachedResponse) {
            // Check the timestamp from the custom header
            const cachedTime = parseInt(cachedResponse.headers.get('sw-cached-time') || '0', 10);
            const now = new Date().getTime();
            const ageSeconds = (now - cachedTime) / 1000;

            if (ageSeconds < DATA_CACHE_MAX_AGE_SECONDS) {
              // 4. Cache hit and still fresh enough: Serve from cache
              console.log(`[SW] Serving from cache (${Math.floor(ageSeconds)}s old):`, event.request.url);
              return cachedResponse;
            } else {
              // 5. Cache hit but stale: Don't serve, throw an error to signal no valid response
              console.warn('[SW] Cache hit, but data is stale. Not serving from cache:', event.request.url);
              throw new Error('Cached data is stale and network is unavailable.'); // Propagate error
            }
          }
          // 6. No cached response found (or cache empty/failed): This indicates a complete failure
          console.error('[SW] Neither network nor cache has valid response:', event.request.url, error);
          throw error; // Propagate the original network error or new stale error
        }
      })
    );
    return; // Important: Stop here, as we've handled this specific request
  }

  // --- Strategy for other static assets (e.g., cache-first with network fallback) ---
  // For requests that are not your Apps Script API, a common strategy is to serve from cache first,
  // then fall back to network, and then cache the network response.
  event.respondWith(
    caches.match(event.request).then((response) => {
      // If found in cache, return it immediately
      return response || fetch(event.request).then((networkResponse) => {
        // If not in cache, fetch from network, then cache it for next time
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});