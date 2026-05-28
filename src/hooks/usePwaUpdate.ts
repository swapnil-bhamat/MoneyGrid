import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/infrastructure/db/db";
import { CONFIG_KEYS } from "@/services/configService";
import packageJson from "../../package.json";

const APP_VERSION = packageJson.version;

const isNewerVersion = (v1: string, v2: string): boolean => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return true;
    if (p1 < p2) return false;
  }
  return false;
};

export function usePwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);
  const [noUpdateFound, setNoUpdateFound] = useState(false);

  // Live Query to reactively watch IndexedDB APP_VERSION
  const dbVersion = useLiveQuery(async () => {
    try {
      const config = await db.configs.filter((c) => c.key === CONFIG_KEYS.APP_VERSION).first();
      return (config?.value as string) || null;
    } catch {
      return null;
    }
  });

  // Watch dbVersion changes reactively
  useEffect(() => {
    if (dbVersion && isNewerVersion(dbVersion, APP_VERSION)) {
      setUpdateAvailable(true);
    }
  }, [dbVersion]);

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
    setCheckingForUpdate(true);
    setNoUpdateFound(false);

    try {
      // Check database version first
      const config = await db.configs.filter((c) => c.key === CONFIG_KEYS.APP_VERSION).first();
      const dbVer = (config?.value as string) || null;

      if (dbVer && isNewerVersion(dbVer, APP_VERSION)) {
        setUpdateAvailable(true);
        setCheckingForUpdate(false);
        return;
      }

      // If no database version difference, fallback to standard service worker check
      if (!registration) {
        // In development or if SW isn't ready yet, simulate update check and return up-to-date
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setNoUpdateFound(true);
        setTimeout(() => setNoUpdateFound(false), 3000);
        return;
      }

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

