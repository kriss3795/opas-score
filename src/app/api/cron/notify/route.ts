import { NextRequest, NextResponse } from "next/server";
import { supa, sendPush } from "@/lib/server/push";
import { isMorning, localDate, morningSummary } from "@/lib/server/morning";

export const dynamic = "force-dynamic";

// Lo llama cron-job.org cada minuto. Envía los avisos de 15 min antes
// y, de paso, mantiene activa la base de Supabase (evita la pausa del plan gratuito).
export async function GET(req: NextRequest) {
  try {
    return await run(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[cron]", msg);
    return NextResponse.json({ ok: false, step: "exception", error: msg.slice(0, 200) }, { status: 500 });
  }
}

async function run(req: NextRequest) {
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
  if (error) return NextResponse.json({ ok: false, step: "reminders", error: error.message }, { status: 500 });

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

  // Resumen matinal a las 8:00 en la hora local de cada teléfono.
  let mornings = 0;
  const { data: subs, error: subErr } = await db.from("push_subs").select("endpoint, sub, lang, tz, prefs, morning, last_morning").eq("morning", true).limit(50);
  if (subErr) return NextResponse.json({ ok: true, due: due?.length ?? 0, sent, morningError: subErr.message });
  for (const s of subs ?? []) {
    const tz = s.tz || "Europe/Paris";
    if (!s.prefs || !isMorning(tz)) continue;
    const today = localDate(tz);
    if (s.last_morning === today) continue;
    await db.from("push_subs").update({ last_morning: today }).eq("endpoint", s.endpoint);
    const sum = await morningSummary(s.prefs, s.lang === "es" ? "es" : "fr", tz).catch(() => null);
    if (!sum) continue;
    const r = await sendPush(s.sub, { title: sum.title, body: sum.body, url: "/", tag: `morning-${today}` });
    if (r === "gone") await db.from("push_subs").delete().eq("endpoint", s.endpoint);
    if (r === "ok") mornings++;
  }

  return NextResponse.json({ ok: true, due: due?.length ?? 0, sent, mornings });
}
