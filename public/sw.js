const CACHE_NAME = 'apex-drift-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Don't persist Vite's development HTML as an offline app shell.
      const shell = await fetch('/', { cache: 'no-store' });
      if (shell.ok) {
        const html = await shell.clone().text();
        if (!html.includes('/@vite/client')) {
          await cache.put('/', shell);
          const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
            .map(match => new URL(match[1], self.location.origin))
            .filter(url => url.origin === self.location.origin && url.pathname.startsWith('/assets/'));
          await cache.addAll(assets.map(url => url.href));
        }
      }
      await cache.addAll(APP_SHELL.slice(1));
    })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('apex-drift-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Leave Vite's module graph, HMR websocket, and cross-origin requests alone.
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname.startsWith('/@') || url.pathname.startsWith('/src/') ||
      url.pathname.startsWith('/node_modules/') || url.pathname.includes('__vite')) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === 'navigate') {
        return (await cache.match('/')) || Response.error();
      }
      throw error;
    }
  })());
});
