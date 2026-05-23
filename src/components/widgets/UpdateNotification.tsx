import { useState, useEffect } from "react";

export function UpdateNotification() {
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Register service worker update handler
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Check for updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setShowUpdateAlert(true);
              }
            });
          }
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Send message to service worker to skip waiting and activate new version
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  };

  if (!showUpdateAlert) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg">
      <p>A new version is available!</p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={handleUpdate}
          className="bg-body text-blue-500 px-4 py-2 rounded hover:bg-blue-50"
        >
          Update Now
        </button>
        <button
          onClick={() => setShowUpdateAlert(false)}
          className="text-white hover:text-blue-100"
        >
          Later
        </button>
      </div>
    </div>
  );
}
