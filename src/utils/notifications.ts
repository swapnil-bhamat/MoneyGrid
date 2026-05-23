export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

export const sendNotification = async (
  title: string,
  options: NotificationOptions
): Promise<void> => {
  if (!("Notification" in window)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: "/android/android-launchericon-192-192.png",
      badge: "/android/android-launchericon-96-96.png",
      ...options,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

export const setupPeriodicSync = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;

    if ("periodicSync" in registration) {
      const status = await navigator.permissions.query({
        name: "periodic-background-sync" as PermissionName,
      });

      if (status.state === "granted") {
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
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error setting up periodic sync:", error);
    return false;
  }
};
