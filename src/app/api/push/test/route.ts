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
  const r = await sendPush(data.sub, {
    title: "Opa's Score",
    body: fr ? "⚽ BUUUT ! Les notifications fonctionnent." : "⚽ ¡GOOOL! Las notificaciones funcionan.",
    url: "/",
    tag: "test",
    kind: "goal",
  });
  return NextResponse.json({ ok: r === "ok", result: r });
}
