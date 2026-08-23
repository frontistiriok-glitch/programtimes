// Απλό service worker: κρατάει cache το app-shell ώστε η εφαρμογή να "εγκαθίσταται"
// σαν PWA. Δεν κάνει καθόλου cache τα δεδομένα του API (/api/...) — αυτά πρέπει πάντα
// να έρχονται φρέσκα από το Firestore, ώστε το πρόγραμμα να μη δείχνει μπαγιάτικα δεδομένα.

const CACHE_NAME = "frontistirio-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ποτέ cache για κλήσεις API — πάντα network.
  if (url.pathname.startsWith("/api/")) return;

  // Για όλα τα άλλα (app shell): network-first με fallback σε cache αν είσαι offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
