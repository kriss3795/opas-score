import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/server/push";
import { leagueState, memberWallet, newCode, newToken, upcomingFor } from "@/lib/server/league";
import { leagueMeta } from "@/lib/catalog";

export const maxDuration = 60;

export const dynamic = "force-dynamic";

const cleanName = (s: unknown) => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
// Duración de la temporada: 7, 30 o 90 días, o hasta el 30 de junio (fin de las ligas europeas).
function seasonEnd(d: unknown): string {
  const now = new Date();
  if (d === "season") {
    const y = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
    return new Date(Date.UTC(y, 5, 30, 22, 0)).toISOString();
  }
  const days = [7, 14, 30, 90].includes(Number(d)) ? Number(d) : 30;
  return new Date(now.getTime() + days * 86400000).toISOString();
}

const cleanCode = (s: unknown) => String(s ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

export async function GET(req: NextRequest) {
  const code = cleanCode(req.nextUrl.searchParams.get("code"));
  const token = req.nextUrl.searchParams.get("token") ?? undefined;
  if (!code) return NextResponse.json({ error: "code" }, { status: 400 });
  const st = await leagueState(code, token);
  if (!st) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(st);
}

export async function POST(req: NextRequest) {
  const db = supa();
  if (!db) return NextResponse.json({ error: "db" }, { status: 503 });
  const b = await req.json().catch(() => ({}));

  if (b.action === "create") {
    const name = cleanName(b.name);
    const player = cleanName(b.player);
    const comps = (Array.isArray(b.comps) ? b.comps : []).map(String).filter((c: string) => leagueMeta(c)?.sport === "football").slice(0, 12);
    if (!name || !player || (!comps.length && !b.f1)) return NextResponse.json({ error: "missing" }, { status: 400 });
    const endsAt = seasonEnd(b.duration);
    let code = newCode();
    for (let i = 0; i < 5; i++) {
      const { error } = await db.from("fl_leagues").insert({ code, name, comps, f1: Boolean(b.f1), starts_at: new Date().toISOString(), ends_at: endsAt });
      if (!error) break;
      code = newCode();
      if (i === 4) return NextResponse.json({ error: "db" }, { status: 500 });
    }
    const token = newToken();
    const { error } = await db.from("fl_members").insert({ league_code: code, name: player, token });
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    return NextResponse.json({ code, token });
  }

  if (b.action === "join") {
    const code = cleanCode(b.code);
    const player = cleanName(b.player);
    if (!code || !player) return NextResponse.json({ error: "missing" }, { status: 400 });
    const { data: lg } = await db.from("fl_leagues").select("code").eq("code", code).maybeSingle();
    if (!lg) return NextResponse.json({ error: "not found" }, { status: 404 });
    const token = newToken();
    const { error } = await db.from("fl_members").insert({ league_code: code, name: player, token });
    if (error) return NextResponse.json({ error: "name taken" }, { status: 409 });
    return NextResponse.json({ code, token });
  }

  if (b.action === "predict") {
    const code = cleanCode(b.code);
    const { data: me } = await db.from("fl_members").select("id, league_code").eq("token", String(b.token ?? "")).maybeSingle();
    if (!me || me.league_code !== code) return NextResponse.json({ error: "auth" }, { status: 403 });
    const { data: lg } = await db.from("fl_leagues").select("comps, f1, ends_at").eq("code", code).maybeSingle();
    if (!lg) return NextResponse.json({ error: "not found" }, { status: 404 });
    // Solo se puede pronosticar lo que aún no empieza y cae dentro de la temporada.
    const open = await upcomingFor(lg.comps ?? [], lg.f1, lg.ends_at);
    const ev = open.find((e) => e.key === b.key);
    if (!ev || new Date(ev.start) <= new Date()) return NextResponse.json({ error: "closed" }, { status: 409 });
    let value: unknown = null;
    if (ev.kind === "score") {
      const h = Number(b.value?.h),
        a = Number(b.value?.a);
      if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 20 || a > 20) return NextResponse.json({ error: "value" }, { status: 400 });
      value = { h, a };
    } else {
      const p = Array.isArray(b.value?.p) ? b.value.p.map(String).slice(0, 3) : [];
      if (p.length !== 3 || new Set(p).size !== 3) return NextResponse.json({ error: "value" }, { status: 400 });
      value = { p };
    }
    const { error } = await db
      .from("fl_preds")
      .upsert({ member_id: me.id, event_key: ev.key, value, label: ev.label, start_at: ev.start }, { onConflict: "member_id,event_key" });
    return NextResponse.json({ ok: !error });
  }

  if (b.action === "bet") {
    const code = cleanCode(b.code);
    const { data: me } = await db.from("fl_members").select("id, league_code").eq("token", String(b.token ?? "")).maybeSingle();
    if (!me || me.league_code !== code) return NextResponse.json({ error: "auth" }, { status: 403 });
    const { data: lg } = await db.from("fl_leagues").select("comps, f1, ends_at").eq("code", code).maybeSingle();
    if (!lg) return NextResponse.json({ error: "not found" }, { status: 404 });
    const open = await upcomingFor(lg.comps ?? [], lg.f1, lg.ends_at);
    const ev = open.find((e) => e.key === b.key);
    if (!ev || !ev.odds || new Date(ev.start) <= new Date()) return NextResponse.json({ error: "closed" }, { status: 409 });
    const pick = String(b.pick);
    if (!["H", "D", "A"].includes(pick)) return NextResponse.json({ error: "pick" }, { status: 400 });
    const stake = Math.floor(Number(b.stake));
    // Si ya había apostado en este partido, esa apuesta se reemplaza (se libera su monto).
    const { data: prev } = await db.from("fl_bets").select("stake").eq("member_id", me.id).eq("event_key", ev.key).maybeSingle();
    const w = await memberWallet(me.id);
    const available = (w?.available ?? 0) + (prev?.stake ?? 0);
    if (!Number.isInteger(stake) || stake < 1 || stake > available) return NextResponse.json({ error: "stake", available }, { status: 400 });
    const odds = ev.odds[pick as "H" | "D" | "A"];
    const { error } = await db
      .from("fl_bets")
      .upsert({ member_id: me.id, event_key: ev.key, pick, stake, odds, label: ev.label, start_at: ev.start }, { onConflict: "member_id,event_key" });
    return NextResponse.json({ ok: !error });
  }

  if (b.action === "rematch") {
    // Nueva temporada con la misma configuración; quien la crea entra con su mismo nombre.
    const code = cleanCode(b.code);
    const { data: me } = await db.from("fl_members").select("name, league_code").eq("token", String(b.token ?? "")).maybeSingle();
    if (!me || me.league_code !== code) return NextResponse.json({ error: "auth" }, { status: 403 });
    const { data: lg } = await db.from("fl_leagues").select("name, comps, f1, starts_at, ends_at").eq("code", code).maybeSingle();
    if (!lg) return NextResponse.json({ error: "not found" }, { status: 404 });
    const len = lg.ends_at ? new Date(lg.ends_at).getTime() - new Date(lg.starts_at).getTime() : 30 * 86400000;
    const base = String(lg.name).replace(/\s*·\s*S\d+$/, "");
    const n = Number(String(lg.name).match(/·\s*S(\d+)$/)?.[1] ?? 1) + 1;
    const name = `${base} · S${n}`.slice(0, 30);
    const newC = newCode();
    const { error } = await db.from("fl_leagues").insert({
      code: newC,
      name,
      comps: lg.comps,
      f1: lg.f1,
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + len).toISOString(),
    });
    if (error) return NextResponse.json({ error: "db" }, { status: 500 });
    const token = newToken();
    await db.from("fl_members").insert({ league_code: newC, name: me.name, token });
    return NextResponse.json({ code: newC, token, name });
  }

  return NextResponse.json({ error: "action" }, { status: 400 });
}
