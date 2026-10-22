import "server-only";
import { randomBytes } from "crypto";
import { supa } from "./push";
import { teamScoreboard, eventSummary } from "./espn";
import { f1Calendar, f1Drivers } from "./jolpica";
import { getJson } from "./http";
import { leagueMeta } from "../catalog";
import { eloFixtures, matchElo } from "./clubelo";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Liga de amigos: pronósticos de marcadores de fútbol y podios de F1.
// Puntos: marcador exacto 3, resultado correcto 1. Podio F1: 1 por piloto en el podio + 1 si la posición es exacta.

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newCode = () => Array.from(randomBytes(6), (b) => ALPHA[b % ALPHA.length]).join("");
export const newToken = () => randomBytes(24).toString("hex");

export interface Predictable {
  key: string;
  kind: "score" | "podium";
  label: string;
  start: string;
  competition: string;
  home?: { name: string; logo?: string };
  away?: { name: string; logo?: string };
  odds?: { H: number; D: number; A: number }; // cuotas = 1 / probabilidad ClubElo
  probs?: { H: number; D: number; A: number };
}

export const START_COINS = 1000;
const toOdds = (p: number) => Math.max(1.05, Math.round((1 / p) * 100) / 100);

export async function upcomingFor(comps: string[], f1: boolean, until?: string | null): Promise<Predictable[]> {
  const now = new Date();
  // Solo partidos de los próximos 7 días y dentro de la temporada de la liga.
  const end = until ? new Date(until) : null;
  if (end && end <= now) return [];
  const to = new Date(Math.min(now.getTime() + 7 * 86400000, end ? end.getTime() : Infinity));
  const out: Predictable[] = [];
  const elo = await eloFixtures();
  await Promise.all(
    comps
      .filter((c) => leagueMeta(c)?.sport === "football")
      .map(async (c) => {
        const evs = await teamScoreboard(c, now, to);
        for (const e of evs ?? []) {
          if (e.status !== "pre" || !e.home || !e.away) continue;
          out.push({
            key: `fb|${c}|${e.id}`,
            kind: "score",
            label: `${e.home.short ?? e.home.name} – ${e.away.short ?? e.away.name}`,
            start: e.start,
            competition: leagueMeta(c)?.name.fr ?? c,
            home: { name: e.home.short ?? e.home.name, logo: e.home.logo },
            away: { name: e.away.short ?? e.away.name, logo: e.away.logo },
            ...(() => {
              const f = elo ? matchElo(elo, e.start, [e.home.name, e.home.short ?? ""], [e.away.name, e.away.short ?? ""]) : null;
              return f
                ? {
                    probs: { H: f.pHome, D: f.pDraw, A: f.pAway },
                    odds: { H: toOdds(f.pHome), D: toOdds(f.pDraw), A: toOdds(f.pAway) },
                  }
                : {};
            })(),
          });
        }
      }),
  );
  if (f1) {
    const cal = await f1Calendar();
    const next = cal?.find((r) => new Date(r.start) > now);
    if (next && (!end || new Date(next.start) <= end)) {
      out.push({ key: `f1|${next.season}|${next.round}`, kind: "podium", label: next.name, start: next.start, competition: "Formule 1" });
    }
  }
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true))).sort((a, b) => a.start.localeCompare(b.start));
}

// Resultado real de un evento pronosticado (null si aún no termina).
async function resultOfSource(key: string): Promise<any | null> {
  const [kind, a, b] = key.split("|");
  if (kind === "fb") {
    const d = await eventSummary(a, b, 600);
    const comp = d?.header?.competitions?.[0];
    const type = comp?.status?.type ?? {};
    const name = String(type.name ?? "");
    // Aplazado, suspendido o cancelado: el pronóstico y la apuesta quedan anulados (no es un 0-0).
    if (/POSTPONED|CANCELED|CANCELLED|ABANDONED|FORFEIT/.test(name)) return { void: true };
    if (type.state !== "post") return null;
    const cs: any[] = comp.competitors ?? [];
    const h = cs.find((c) => c.homeAway === "home");
    const w = cs.find((c) => c.homeAway === "away");
    let hs = Number(h?.score);
    let as = Number(w?.score);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) return null;
    // Regla de apuestas: se cuenta el resultado a los 90 minutos (sin prórroga ni penales).
    if (/AET|PEN|SHOOTOUT|EXTRA/.test(name)) {
      for (const k of d?.keyEvents ?? []) {
        const per = Number(k.period?.number ?? 0);
        if (per !== 3 && per !== 4) continue; // solo goles de la prórroga
        const t = String(k.type?.text ?? "").toLowerCase();
        if (!(k.scoringPlay || t.startsWith("goal") || (t.includes("penalty") && t.includes("scored")))) continue;
        if (t.includes("own goal")) return { void: true }; // atribución ambigua: mejor anular que equivocarse
        if (String(k.team?.id) === String(h?.team?.id ?? h?.id)) hs--;
        else if (String(k.team?.id) === String(w?.team?.id ?? w?.id)) as--;
      }
      if (hs !== as || hs < 0) return { void: true }; // datos incoherentes: se anula
    }
    return { h: hs, a: as };
  }
  if (kind === "f1") {
    const d = await getJson<any>(`https://api.jolpi.ca/ergast/f1/${a}/${b}/results.json?limit=3`, 3600);
    const res: any[] = d?.MRData?.RaceTable?.Races?.[0]?.Results ?? [];
    return res.length >= 3 ? { p: res.slice(0, 3).map((r) => r.Driver?.driverId) } : null;
  }
  return null;
}

// Los resultados finales se guardan en la base: una temporada larga no vuelve a consultar la fuente.
async function resultsFor(keys: string[]): Promise<Map<string, any>> {
  const out = new Map<string, any>();
  if (!keys.length) return out;
  const db = supa();
  if (db) {
    const { data } = await db.from("fl_results").select("event_key, value").in("event_key", keys);
    (data ?? []).forEach((r) => out.set(r.event_key, r.value));
  }
  const missing = keys.filter((k) => !out.has(k)).slice(0, 80);
  const fresh: { event_key: string; value: any }[] = [];
  await Promise.all(
    missing.map(async (k) => {
      const r = await resultOfSource(k);
      if (r) {
        out.set(k, r);
        fresh.push({ event_key: k, value: r });
      }
    }),
  );
  if (db && fresh.length) await db.from("fl_results").upsert(fresh);
  return out;
}

export const isVoid = (r: any) => Boolean(r?.void);

export function score(key: string, pred: any, res: any): number {
  if (isVoid(res)) return 0;
  if (key.startsWith("fb|")) {
    if (pred.h === res.h && pred.a === res.a) return 3;
    return Math.sign(pred.h - pred.a) === Math.sign(res.h - res.a) ? 1 : 0;
  }
  if (key.startsWith("f1|")) {
    let pts = 0;
    (pred.p ?? []).forEach((d: string, i: number) => {
      if (res.p.includes(d)) pts += 1;
      if (res.p[i] === d) pts += 1;
    });
    return pts;
  }
  return 0;
}

export async function leagueState(code: string, token?: string) {
  const db = supa();
  if (!db) return null;
  const { data: lg } = await db.from("fl_leagues").select("code, name, comps, f1, starts_at, ends_at").eq("code", code).maybeSingle();
  if (!lg) return null;
  const { data: members } = await db.from("fl_members").select("id, name, token, created_at").eq("league_code", code).order("created_at", { ascending: true });
  const ids = (members ?? []).map((m) => m.id);
  const { data: preds } = ids.length
    ? await db.from("fl_preds").select("member_id, event_key, value, label, start_at").in("member_id", ids)
    : { data: [] as any[] };

  const { data: bets } = ids.length
    ? await db.from("fl_bets").select("member_id, event_key, pick, stake, odds, label, start_at").in("member_id", ids)
    : { data: [] as any[] };

  const keys = Array.from(new Set([...(preds ?? []), ...(bets ?? [])].filter((p) => new Date(p.start_at) < new Date()).map((p) => p.event_key)));
  const results = await resultsFor(keys);

  const me = (members ?? []).find((m) => token && m.token === token) ?? null;
  const table = (members ?? []).map((m) => {
    const mine = (preds ?? []).filter((p) => p.member_id === m.id);
    let points = 0,
      scored = 0,
      hits = 0;
    for (const p of mine) {
      const r = results.get(p.event_key);
      if (!r || isVoid(r)) continue; // anulado: no cuenta para el porcentaje de acierto
      const s = score(p.event_key, p.value, r);
      points += s;
      scored++;
      if (s > 0) hits++;
    }
    const w = wallet(m.id, bets ?? [], results);
    return { name: m.name, points, scored, accuracy: scored ? hits / scored : null, coins: w.balance, pending: w.pending, rescues: w.rescues, isMe: me?.id === m.id };
  });
  table.sort((a, b) => b.points - a.points || (b.accuracy ?? 0) - (a.accuracy ?? 0));

  const myPreds = me
    ? (preds ?? [])
        .filter((p) => p.member_id === me.id)
        .map((p) => {
          const r = results.get(p.event_key);
          const v = isVoid(r);
          return { key: p.event_key, value: p.value, label: p.label, start: p.start_at, result: r && !v ? r : null, voided: v, points: r && !v ? score(p.event_key, p.value, r) : null };
        })
        .sort((a, b) => String(b.start).localeCompare(String(a.start)))
    : [];

  // Temporada: inicio, fin y jornadas semanales con su ganador.
  const now = Date.now();
  const startsAt = new Date(lg.starts_at ?? Date.now()).getTime();
  const endsAt = lg.ends_at ? new Date(lg.ends_at).getTime() : null;
  const finished = endsAt !== null && now > endsAt;
  const WEEK = 7 * 86400000;
  const totalRounds = endsAt ? Math.max(1, Math.ceil((endsAt - startsAt) / WEEK)) : null;
  const roundOf = (iso: string) => Math.floor((new Date(iso).getTime() - startsAt) / WEEK) + 1;
  const currentRound = Math.min(Math.max(1, Math.floor((now - startsAt) / WEEK) + 1), totalRounds ?? Infinity);
  const rounds: { round: number; from: string; to: string; done: boolean; standings: { name: string; points: number }[]; winners: string[] }[] = [];
  const nRounds = totalRounds ?? currentRound;
  for (let r = 1; r <= nRounds; r++) {
    const from = startsAt + (r - 1) * WEEK;
    const to = Math.min(from + WEEK, endsAt ?? Infinity);
    const standings = (members ?? []).map((m) => {
      let pts = 0;
      for (const p of (preds ?? []).filter((x) => x.member_id === m.id && roundOf(x.start_at) === r)) {
        const res = results.get(p.event_key);
        if (res) pts += score(p.event_key, p.value, res);
      }
      return { name: m.name, points: pts };
    });
    standings.sort((a, b) => b.points - a.points);
    const top = standings[0]?.points ?? 0;
    const done = now > to;
    rounds.push({
      round: r,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      done,
      standings,
      winners: done && top > 0 ? standings.filter((x) => x.points === top).map((x) => x.name) : [],
    });
  }
  const weekWins = new Map<string, number>();
  rounds.forEach((r) => r.winners.forEach((w) => weekWins.set(w, (weekWins.get(w) ?? 0) + 1)));
  table.forEach((row) => Object.assign(row, { weekWins: weekWins.get(row.name) ?? 0 }));

  // Lo que se ve de los demás: solo pronósticos de eventos ya empezados (para no copiar).
  const upcoming = finished ? [] : await upcomingFor(lg.comps ?? [], lg.f1, lg.ends_at);
  const drivers = lg.f1 ? ((await f1Drivers()) ?? []).map((d) => ({ id: d.id, name: d.name, code: d.code })) : [];

  const myBets = me
    ? (bets ?? [])
        .filter((b) => b.member_id === me.id)
        .map((b) => {
          const r = results.get(b.event_key);
          const out = r && !isVoid(r) ? outcome(r) : null;
          const voided = isVoid(r) || (!r && b.start_at && Date.now() - new Date(b.start_at).getTime() > 3 * 86400000);
          return { key: b.event_key, pick: b.pick, stake: b.stake, odds: Number(b.odds), label: b.label, start: b.start_at, result: r && !isVoid(r) ? r : null, won: out ? out === b.pick : null, voided };
        })
        .sort((a, b) => String(b.start).localeCompare(String(a.start)))
    : [];
  const myWallet = me ? wallet(me.id, bets ?? [], results) : null;

  return {
    league: { code: lg.code, name: lg.name, comps: lg.comps, f1: lg.f1 },
    season: {
      startsAt: new Date(startsAt).toISOString(),
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      finished,
      totalRounds,
      currentRound,
      rounds,
      champion: finished ? table.filter((r) => r.points === table[0]?.points && r.points > 0).map((r) => r.name) : [],
      coinChampion: finished ? [...table].sort((a, b) => b.coins - a.coins || a.rescues - b.rescues)[0]?.name ?? null : null,
    },
    me: me
      ? { isOwner: members?.[0]?.id === me.id, name: me.name, coins: myWallet?.balance ?? START_COINS, available: myWallet?.available ?? START_COINS, pending: myWallet?.pending ?? 0 }
      : null,
    myBets,
    table,
    myPreds,
    upcoming,
    drivers,
  };
}

export const outcome = (r: { h: number; a: number }) => (r.h > r.a ? "H" : r.h < r.a ? "A" : "D");

// Fichas, como en un casino: 1000 al empezar; si aciertas cobras apuesta × cuota, si fallas pierdes lo apostado.
// Rescate: si tras perder te quedan menos de 100 fichas, recibes lo necesario para volver a 100
// (así nunca te quedas sin poder jugar). Los rescates se cuentan y se muestran en la tabla.
export const RESCUE = 100;
export function wallet(memberId: string, bets: any[], results: Map<string, any>) {
  let balance = START_COINS;
  let pending = 0;
  let rescues = 0;
  const mine = bets.filter((x) => x.member_id === memberId).sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
  for (const b of mine) {
    const r = results.get(b.event_key);
    if (!r) {
      // Partido aplazado o sin resultado 3 días después: apuesta anulada y fichas devueltas.
      const stale = b.start_at && Date.now() - new Date(b.start_at).getTime() > 3 * 86400000;
      if (!stale) pending += b.stake;
      continue;
    }
    if (isVoid(r)) continue; // partido anulado: se devuelven las fichas
    balance += outcome(r) === b.pick ? Math.round(b.stake * Number(b.odds)) - b.stake : -b.stake;
    if (balance < RESCUE) {
      rescues++;
      balance = RESCUE;
    }
  }
  return { balance, pending, available: Math.max(0, balance - pending), rescues };
}

export async function memberWallet(memberId: string) {
  const db = supa();
  if (!db) return null;
  const { data: bets } = await db.from("fl_bets").select("member_id, event_key, pick, stake, odds, start_at").eq("member_id", memberId);
  const results = await resultsFor((bets ?? []).filter((b) => new Date(b.start_at) < new Date()).map((b) => b.event_key));
  return wallet(memberId, bets ?? [], results);
}
