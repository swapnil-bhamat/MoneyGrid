// Service Worker version - increment this when you push updates
const CACHE_VERSION = "v1.0.2";
const CACHE_NAME = `moneygrid-${CACHE_VERSION}`;

// Assets to cache
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/android/android-launchericon-192-192.png",
  "/android/android-launchericon-96-96.png",
];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith("moneygrid-"))
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      }),
      // Immediately claim all clients
      self.clients.claim(),
      // Notify all clients about activation
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "NEW_VERSION_ACTIVATED",
            version: CACHE_VERSION,
          });
        });
      }),
    ])
  );
});

// Background Sync
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-data") {
    event.waitUntil(syncData());
  }
});

// Handle background sync
async function syncData() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_DATA",
      });
    });

    // Show notification when sync is complete
    await self.registration.showNotification("MoneyGrid", {
      body: "Your financial data has been updated",
      icon: "/android/android-launchericon-192-192.png",
      badge: "/android/android-launchericon-96-96.png",
      tag: "sync-complete",
    });
  } catch (error) {
    console.error("Sync failed:", error);
  }
}

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).catch(() => {
        return caches.match("/offline.html");
      });
    })
  );
});

// Push notification event
self.addEventListener("push", (event) => {
  const options = {
    body: event.data.text(),
    icon: "/android/android-launchericon-192-192.png",
    badge: "/android/android-launchericon-96-96.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "1",
    },
  };

  event.waitUntil(
    self.registration.showNotification("MoneyGrid", options)
  );
});
