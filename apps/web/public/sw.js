const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '');
/* This file is stamped with the static build ID during export. No credentials are stored here. */
const CACHE = 'apex-__BUILD_ID__';
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch(BASE + '/precache.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Missing precache manifest');
      const urls = await response.json();
      const cache = await caches.open(CACHE);
      for (let i = 0; i < urls.length; i += 8) await cache.addAll(urls.slice(i, i + 8));
    })(),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith('apex-') && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/')
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (
        url.pathname.startsWith(BASE + '/_next/static/') ||
        url.pathname.startsWith(BASE + '/fonts/')
      ) {
        const cached = await cache.match(request);
        if (cached) return cached;
      }
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate')
          return (
            (await cache.match(
              BASE + '/' + (url.pathname.slice(BASE.length).split('/')[1] || 'pl') + '/',
            )) || (await cache.match(BASE + '/'))
          );
        return Response.error();
      }
    })(),
  );
});
self.addEventListener('sync', (event) => {
  if (event.tag === 'apex-bookings')
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window' })
        .then((clients) => clients.forEach((client) => client.postMessage('SYNC_BOOKINGS'))),
    );
});
