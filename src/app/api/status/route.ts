import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/server/push";

export const dynamic = "force-dynamic";

// Diagnóstico de avisos (sin datos personales): cuántos teléfonos, partidos seguidos y su estado.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.nextUrl.searchParams.get("key") !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  const db = supa();
  if (!db) return NextResponse.json({ ok: false, error: "db" });
  const now = Date.now();
  const { data: subs } = await db.from("push_subs").select("lang, tz, prefs, morning, last_morning, created_at");
  const { data: rem } = await db
    .from("reminders")
    .select("event_id, league, start_at, sent, last_state, title")
    .gte("start_at", new Date(now - 2 * 86400000).toISOString())
    .order("start_at");
  return NextResponse.json({
    ok: true,
    vapid: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    phones: (subs ?? []).map((s) => ({
      lang: s.lang,
      tz: s.tz,
      since: s.created_at,
      hasPrefs: Boolean(s.prefs),
      teams: String((s.prefs as Record<string, string> | null)?.teams ?? "").split(",").filter(Boolean).length,
      morning: s.morning,
      lastMorning: s.last_morning,
    })),
    followed: (rem ?? []).map((r) => ({ id: r.event_id, league: r.league, start: r.start_at, sent: r.sent, state: r.last_state, title: r.title })),
  });
}
