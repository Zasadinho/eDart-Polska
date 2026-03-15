import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.error("SW registration failed:", e);
    return null;
  }
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return true; // already subscribed

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const json = subscription.toJSON();
    const { error } = await supabase.from("push_subscriptions" as any).insert({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh || "",
      auth: json.keys?.auth || "",
    } as any);

    return !error;
  } catch (e) {
    console.error("Push subscription failed:", e);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    await supabase.from("push_subscriptions" as any).delete().eq("endpoint", endpoint);
    return true;
  } catch (e) {
    console.error("Push unsubscribe failed:", e);
    return false;
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

export async function getNotificationPreferences() {
  const { data } = await supabase
    .from("notification_preferences" as any)
    .select("*")
    .maybeSingle();
  return data as any || {
    match_reminders: true,
    match_results: true,
    challenge_updates: true,
    announcements: true,
  };
}

export async function updateNotificationPreferences(prefs: {
  match_reminders?: boolean;
  match_results?: boolean;
  challenge_updates?: boolean;
  announcements?: boolean;
}) {
  const { data: existing } = await supabase
    .from("notification_preferences" as any)
    .select("id")
    .maybeSingle();

  if (existing) {
    await supabase.from("notification_preferences" as any).update(prefs as any).eq("id", (existing as any).id);
  } else {
    await supabase.from("notification_preferences" as any).insert(prefs as any);
  }
}
