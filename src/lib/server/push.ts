import "server-only";
import webpush from "web-push";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let db: SupabaseClient | null = null;
export function supa(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!db) db = createClient(url, key, { auth: { persistSession: false } });
  return db;
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:opas-score@example.com", pub, priv);
  vapidReady = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Devuelve "gone" si la suscripción ya no existe (el teléfono la anuló).
export async function sendPush(sub: webpush.PushSubscription, payload: PushPayload): Promise<"ok" | "gone" | "error"> {
  if (!ensureVapid()) return "error";
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 900 });
    return "ok";
  } catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) return "gone";
    console.warn("[push] error", code);
    return "error";
  }
}
