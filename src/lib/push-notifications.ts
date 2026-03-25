/**
 * Push notification utilities for PWA
 * Integrates with the notification module (store.ts)
 */

export async function requestNotificationPermission(): Promise<
  "granted" | "denied" | "default"
> {
  if (!("Notification" in window)) {
    console.log("[Push] Notifications not supported");
    return "denied";
  }

  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  const result = await Notification.requestPermission();
  return result;
}

export function isNotificationSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!("Notification" in window)) return null;
  return Notification.permission;
}

export async function showLocalNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    url?: string;
  }
): Promise<void> {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    registration.showNotification(title, {
      body: options?.body || "",
      icon: options?.icon || "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: options?.tag || "ihalepro-local",
      data: options?.url ? { url: options.url } : undefined,
    } as NotificationOptions);
  } else {
    // Fallback to Notification API
    new Notification(title, {
      body: options?.body || "",
      icon: options?.icon || "/icons/icon-192x192.png",
      tag: options?.tag || "ihalepro-local",
    });
  }
}

/**
 * Subscribe to push notifications (requires VAPID keys in production)
 * Demo implementation - in production this would send the subscription to backend
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check existing subscription
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    // In production, use real VAPID public key
    // This is a demo placeholder
    console.log("[Push] Push subscription would be created with VAPID key in production");
    return null;
  } catch (err) {
    console.error("[Push] Subscription failed:", err);
    return null;
  }
}
