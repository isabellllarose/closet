const CACHE = 'closet-v3';

// Network first — always tries to get the latest, falls back to cache if offline
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Only cache same-origin requests (app files), not Supabase API calls
  const url = new URL(e.request.url);
  const isAppFile = url.origin === self.location.origin;

  if (!isAppFile) return; // let Supabase calls pass through normally

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache a copy of the fresh response
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request)) // offline fallback
  );
});
