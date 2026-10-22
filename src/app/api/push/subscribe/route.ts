import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/server/push";

export async function POST(req: NextRequest) {
  const db = supa();
  if (!db) return NextResponse.json({ ok: false, error: "db" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const sub = body?.sub;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth)
    return NextResponse.json({ ok: false }, { status: 400 });
  // Si viene de una renovación, se heredan los datos de la suscripción anterior.
  let inherited: Record<string, unknown> = {};
  if (typeof body.oldEndpoint === "string" && body.oldEndpoint !== sub.endpoint) {
    const { data: old } = await db.from("push_subs").select("lang, tz, prefs, morning").eq("endpoint", body.oldEndpoint).maybeSingle();
    if (old) inherited = old;
  }
  const { error } = await db.from("push_subs").upsert({
    ...inherited,
    endpoint: sub.endpoint,
    sub,
    ...(body.lang ? { lang: body.lang === "es" ? "es" : "fr" } : {}),
    ...(typeof body.tz === "string" ? { tz: body.tz.slice(0, 64) } : {}),
    ...(typeof body.query === "string" && body.query
      ? { prefs: Object.fromEntries(new URLSearchParams(body.query.slice(0, 4000)).entries()) }
      : {}),
  });
  if (!error && inherited.lang) {
    await db.from("reminders").update({ endpoint: sub.endpoint }).eq("endpoint", body.oldEndpoint);
    await db.from("push_subs").delete().eq("endpoint", body.oldEndpoint);
  }
  return NextResponse.json({ ok: !error });
}
