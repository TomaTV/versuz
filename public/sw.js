// Self-unregistering service worker.
//
// Versuz doesn't ship a PWA. The browser keeps requesting /sw.js because a
// previous service worker (from another project on this localhost, or a
// stale install) is cached. This script installs as a no-op SW that
// immediately unregisters itself and clears its caches, so the next page
// load is clean.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll();
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});
