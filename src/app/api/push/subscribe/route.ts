import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/server/push";

export async function POST(req: NextRequest) {
  const db = supa();
  if (!db) return NextResponse.json({ ok: false, error: "db" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const sub = body?.sub;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth)
    return NextResponse.json({ ok: false }, { status: 400 });
  const { error } = await db.from("push_subs").upsert({
    endpoint: sub.endpoint,
    sub,
    lang: body.lang === "es" ? "es" : "fr",
    tz: typeof body.tz === "string" ? body.tz.slice(0, 64) : null,
  });
  return NextResponse.json({ ok: !error });
}
