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

// Último error de envío (para diagnóstico).
export let lastPushError: string | null = null;

// Devuelve "gone" si la suscripción ya no existe (el teléfono la anuló).
export async function sendPush(sub: webpush.PushSubscription, payload: PushPayload): Promise<"ok" | "gone" | "error"> {
  if (!ensureVapid()) {
    lastPushError = "vapid keys missing";
    return "error";
  }
  try {
    // Urgencia alta: Android entrega el aviso al instante aunque el teléfono esté en reposo.
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 900, urgency: "high" });
    return "ok";
  } catch (e: unknown) {
    const err = e as { statusCode?: number; body?: string; message?: string };
    lastPushError = `${err.statusCode ?? ""} ${String(err.body ?? err.message ?? "").slice(0, 200)}`;
    if (err.statusCode === 404 || err.statusCode === 410) return "gone";
    console.warn("[push] error", lastPushError);
    return "error";
  }
}
