import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/server/push";

// Activa o desactiva el aviso de 15 minutos antes de un evento.
export async function POST(req: NextRequest) {
  const db = supa();
  if (!db) return NextResponse.json({ ok: false, error: "db" }, { status: 503 });
  const b = await req.json().catch(() => null);
  if (!b?.endpoint || !b?.eventId || !b?.start) return NextResponse.json({ ok: false }, { status: 400 });
  if (!b.on) {
    const { error } = await db.from("reminders").delete().eq("endpoint", b.endpoint).eq("event_id", b.eventId);
    return NextResponse.json({ ok: !error });
  }
  const start = new Date(b.start);
  if (isNaN(start.getTime())) return NextResponse.json({ ok: false }, { status: 400 });
  const { error } = await db.from("reminders").upsert(
    {
      endpoint: b.endpoint,
      event_id: String(b.eventId).slice(0, 120),
      title: String(b.title ?? "").slice(0, 120),
      body: String(b.body ?? "").slice(0, 240),
      url: String(b.url ?? "/").slice(0, 200),
      start_at: start.toISOString(),
      league: typeof b.league === "string" ? b.league.slice(0, 60) : null,
    },
    { onConflict: "endpoint,event_id" },
  );
  return NextResponse.json({ ok: !error });
}
