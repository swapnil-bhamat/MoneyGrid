// This optional code is used to register a service worker.
// register() is not called by default.

// This lets the app load faster on subsequent visits in production, and gives
// it offline capabilities. However, it also means that developers (and users)
// will only see deployed updates on subsequent visits to a page, after all the
// existing tabs open on the page have been closed, since previously cached
// resources are updated in the background.

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === "[::1]" ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

export function register(config?: Config) {
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    // The URL constructor is available in all browsers that support SW.
    const publicUrl = new URL(import.meta.env.BASE_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if PUBLIC_URL is on a different origin
      // from what our page is served on. This might happen if a CDN is used to
      // serve assets; see https://github.com/facebook/create-react-app/issues/2374
      return;
    }

    window.addEventListener("load", () => {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;

      if (isLocalhost) {
        // This is running on localhost. Let's check if a service worker still exists or not.
        checkValidServiceWorker(swUrl, config);

        // Add some additional logging to localhost, pointing developers to the
        // service worker/PWA documentation.
        navigator.serviceWorker.ready.then(() => {
          console.log(
            "This web app is being served cache-first by a service " +
              "worker. To learn more, visit https://cra.link/PWA"
          );
        });
      } else {
        // Is not localhost. Just register service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then(async (registration) => {
      // Request notification permission
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        console.log("Notification permission:", permission);
      }

      // Register periodic sync if available
      if ("periodicSync" in registration) {
        const status = await navigator.permissions.query({
          name: "periodic-background-sync" as PermissionName,
        });

        if (status.state === "granted") {
          try {
            interface PeriodicSyncRegistration {
              periodicSync: {
                register(
                  tag: string,
                  options: { minInterval: number }
                ): Promise<void>;
              };
            }

            await (
              registration as unknown as PeriodicSyncRegistration
            ).periodicSync.register("sync-data", {
              minInterval: 24 * 60 * 60 * 1000, // 24 hours
            });
            console.log("Periodic background sync registered");
          } catch (error) {
            console.error(
              "Periodic background sync registration failed:",
              error
            );
          }
        }
      }

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              console.log("New content is available");

              // Show update notification
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                registration.showNotification("Update Available", {
                  body: "A new version of the app is available. Click to update.",
                  icon: "/android/android-launchericon-192-192.png",
                  badge: "/android/android-launchericon-96-96.png",
                  tag: "update-available",
                  requireInteraction: true,
                });
              }

              // Update notification handled natively by React UI in Layout and Settings.

              // Listen for skip waiting message and notifications
              navigator.serviceWorker.addEventListener("message", (event) => {
                if (event.data && event.data.type === "SKIP_WAITING") {
                  void installingWorker.postMessage({ type: "SKIP_WAITING" });
                } else if (event.data && event.data.type === "SYNC_DATA") {
                  // Refresh the page when sync is complete
                  window.location.reload();
                }
              });

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              console.log("Content is cached for offline use.");

              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error("Error during service worker registration:", error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { "Service-Worker": "script" },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get("content-type");
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf("javascript") === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log(
        "No internet connection found. App is running in offline mode."
      );
    });
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
