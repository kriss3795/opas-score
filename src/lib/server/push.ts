import "server-only";
import webpush from "web-push";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let db: SupabaseClient | null = null;
export function supa(): SupabaseClient | null {
  // Se limpian espacios, comillas o saltos de línea que se cuelan al copiar y pegar.
  const clean = (v?: string) => v?.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  const url = clean(process.env.SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) return null;
  if (!db) db = createClient(url, key, { auth: { persistSession: false } });
  return db;
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) return false;
  webpush.setVapidDetails("https://opas-score.vercel.app", pub, priv);
  vapidReady = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  kind?:
    | "goal"
    | "start"
    | "halftime"
    | "secondhalf"
    | "final"
    | "yellow"
    | "red"
    | "penalty"
    | "lights"
    | "checkered"
    | "reminder"
    | "morning"
    | "test";
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
