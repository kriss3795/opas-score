"use client";

export type Platform = "ios" | "android" | "desktop";

export function platform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function enablePush(lang: string, query = ""): Promise<"ok" | "denied" | "unsupported" | "error"> {
  if (!pushSupported()) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerSW());
  if (!reg) return "error";
  await navigator.serviceWorker.ready;
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return "error";
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(key) });
  }
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sub: sub.toJSON(), lang, query, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  });
  return res.ok ? "ok" : "error";
}

export async function setReminder(opts: {
  on: boolean;
  eventId: string;
  start: string;
  title: string;
  body: string;
  url: string;
}): Promise<boolean> {
  const sub = await currentSubscription();
  if (!sub) return false;
  const res = await fetch("/api/push/remind", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint, ...opts }),
  });
  return res.ok;
}

export async function sendTest(): Promise<boolean> {
  const sub = await currentSubscription();
  if (!sub) return false;
  const res = await fetch("/api/push/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  return res.ok;
}

// Envía las preferencias al servidor para el resumen matinal (solo si las notificaciones están activas).
export async function syncPrefs(query: string, lang: string, morning: boolean) {
  const sub = await currentSubscription();
  if (!sub) return;
  await fetch("/api/push/prefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint, query, lang, morning, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  }).catch(() => undefined);
}
