import { NextRequest, NextResponse } from "next/server";
import { supa, sendPush } from "@/lib/server/push";

export async function POST(req: NextRequest) {
  const db = supa();
  if (!db) return NextResponse.json({ ok: false, error: "db" }, { status: 503 });
  const b = await req.json().catch(() => null);
  if (!b?.endpoint) return NextResponse.json({ ok: false }, { status: 400 });
  const { data } = await db.from("push_subs").select("sub, lang").eq("endpoint", b.endpoint).maybeSingle();
  if (!data) return NextResponse.json({ ok: false, error: "not subscribed" }, { status: 404 });
  const fr = data.lang !== "es";
  if (b.delayed) {
    // Lo envía el control de cada minuto: llega aunque la app esté cerrada.
    const { error } = await db.from("reminders").insert({
      endpoint: b.endpoint,
      event_id: `diag-${Date.now()}`,
      title: "Opa's Score",
      body: fr ? "✅ Les notifications arrivent même app fermée." : "✅ Los avisos llegan aunque la app esté cerrada.",
      url: "/settings",
      start_at: new Date(Date.now() + 15 * 60000 + 50000).toISOString(),
    });
    return NextResponse.json({ ok: !error });
  }
  const r = await sendPush(data.sub, {
    title: "Opa's Score",
    body: fr ? "⚽ BUUUT ! Les notifications fonctionnent." : "⚽ ¡GOOOL! Las notificaciones funcionan.",
    url: "/",
    tag: "test",
    kind: "goal",
  });
  return NextResponse.json({ ok: r === "ok", result: r });
}
