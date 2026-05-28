import { useState, useEffect, useCallback } from "react";
import { APP_VERSION } from "@/utils/version";

export function usePwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);
  const [noUpdateFound, setNoUpdateFound] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Helper to bind lifecycle listeners to a service worker registration
    const bindRegistration = (reg: ServiceWorkerRegistration) => {
      setRegistration(reg);

      // 1. If a service worker is already waiting in the background, update is ready!
      if (reg.waiting) {
        setUpdateAvailable(true);
      }

      // 2. Listen for future service worker updates installing
      const handleUpdateFound = () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        const handleStateChange = () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        };

        newWorker.addEventListener("statechange", handleStateChange);
      };

      reg.addEventListener("updatefound", handleUpdateFound);

      // 3. Handle if an update was already in the installing state on load
      if (reg.installing) {
        reg.installing.addEventListener("statechange", () => {
          if (reg.installing?.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      }
    };

    // Query the active service worker registration immediately
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        bindRegistration(reg);
      }
    });

    // Also wait for the service worker to become ready/active
    navigator.serviceWorker.ready.then((reg) => {
      bindRegistration(reg);
    });

    // 4. Set up page auto-reload once the waiting service worker activates and takes over control
    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  // Exposes manual update checking
  const checkForUpdates = useCallback(async () => {
    if (!registration) {
      // In development or if SW isn't ready yet, simulate update check and return up-to-date
      setCheckingForUpdate(true);
      setNoUpdateFound(false);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setCheckingForUpdate(false);
      setNoUpdateFound(true);
      setTimeout(() => setNoUpdateFound(false), 3000);
      return;
    }

    setCheckingForUpdate(true);
    setNoUpdateFound(false);
    try {
      const hadWaiting = !!registration.waiting;
      const reg = await registration.update();
      
      // If after update check there is no waiting worker and none installing
      if (!reg.waiting && !reg.installing && !hadWaiting) {
        setNoUpdateFound(true);
        setTimeout(() => setNoUpdateFound(false), 3000);
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
    } finally {
      setCheckingForUpdate(false);
    }
  }, [registration]);

  // Exposes a call to trigger skipWaiting on the waiting service worker
  const updateApp = useCallback(() => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      // Fallback: force page reload if no waiting worker is found
      window.location.reload();
    }
  }, [registration]);

  return {
    currentVersion: APP_VERSION,
    updateAvailable,
    checkingForUpdate,
    noUpdateFound,
    checkForUpdates,
    updateApp,
  };
}

