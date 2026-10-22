import { NextRequest, NextResponse } from "next/server";
import { supa, sendPush } from "@/lib/server/push";

export const dynamic = "force-dynamic";

// Lo llama cron-job.org cada minuto. Envía los avisos de 15 min antes
// y, de paso, mantiene activa la base de Supabase (evita la pausa del plan gratuito).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = req.nextUrl.searchParams.get("key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || given !== secret) return NextResponse.json({ ok: false }, { status: 401 });

  const db = supa();
  if (!db) return NextResponse.json({ ok: false, error: "db" }, { status: 503 });

  const now = Date.now();
  const until = new Date(now + 15 * 60000).toISOString();
  const since = new Date(now - 10 * 60000).toISOString(); // no avisar eventos ya empezados hace rato

  const { data: due, error } = await db
    .from("reminders")
    .select("id, endpoint, title, body, url, event_id")
    .eq("sent", false)
    .lte("start_at", until)
    .gte("start_at", since)
    .limit(200);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let sent = 0;
  for (const r of due ?? []) {
    const { data: s } = await db.from("push_subs").select("sub").eq("endpoint", r.endpoint).maybeSingle();
    if (!s) {
      await db.from("reminders").delete().eq("id", r.id);
      continue;
    }
    const res = await sendPush(s.sub, { title: r.title, body: r.body, url: r.url, tag: r.event_id });
    if (res === "gone") {
      await db.from("push_subs").delete().eq("endpoint", r.endpoint);
      await db.from("reminders").delete().eq("endpoint", r.endpoint);
      continue;
    }
    if (res === "ok") sent++;
    await db.from("reminders").update({ sent: true }).eq("id", r.id);
  }

  // Limpieza de avisos viejos.
  await db.from("reminders").delete().lt("start_at", new Date(now - 2 * 86400000).toISOString());

  return NextResponse.json({ ok: true, due: due?.length ?? 0, sent });
}
