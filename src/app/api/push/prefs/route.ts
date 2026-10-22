import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/server/push";

export async function POST(req: NextRequest) {
  const db = supa();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  const b = await req.json().catch(() => null);
  if (!b?.endpoint || typeof b.query !== "string") return NextResponse.json({ ok: false }, { status: 400 });
  const { error } = await db
    .from("push_subs")
    .update({
      prefs: Object.fromEntries(new URLSearchParams(b.query.slice(0, 4000)).entries()),
      lang: b.lang === "es" ? "es" : "fr",
      tz: typeof b.tz === "string" ? b.tz.slice(0, 64) : null,
      morning: b.morning !== false,
    })
    .eq("endpoint", b.endpoint);
  return NextResponse.json({ ok: !error });
}
