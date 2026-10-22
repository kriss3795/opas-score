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

export async function upcomingFor(comps: string[], f1: boolean): Promise<Predictable[]> {
  const now = new Date();
  const to = new Date(now.getTime() + 7 * 86400000);
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
    if (next) {
      out.push({ key: `f1|${next.season}|${next.round}`, kind: "podium", label: next.name, start: next.start, competition: "Formule 1" });
    }
  }
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true))).sort((a, b) => a.start.localeCompare(b.start));
}

// Resultado real de un evento pronosticado (null si aún no termina).
async function resultOf(key: string): Promise<any | null> {
  const [kind, a, b] = key.split("|");
  if (kind === "fb") {
    const d = await eventSummary(a, b, 600);
    const comp = d?.header?.competitions?.[0];
    if (comp?.status?.type?.state !== "post") return null;
    const cs: any[] = comp.competitors ?? [];
    const h = cs.find((c) => c.homeAway === "home");
    const w = cs.find((c) => c.homeAway === "away");
    const hs = Number(h?.score);
    const as = Number(w?.score);
    return Number.isFinite(hs) && Number.isFinite(as) ? { h: hs, a: as } : null;
  }
  if (kind === "f1") {
    const d = await getJson<any>(`https://api.jolpi.ca/ergast/f1/${a}/${b}/results.json?limit=3`, 3600);
    const res: any[] = d?.MRData?.RaceTable?.Races?.[0]?.Results ?? [];
    return res.length >= 3 ? { p: res.slice(0, 3).map((r) => r.Driver?.driverId) } : null;
  }
  return null;
}

export function score(key: string, pred: any, res: any): number {
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
  const { data: lg } = await db.from("fl_leagues").select("code, name, comps, f1").eq("code", code).maybeSingle();
  if (!lg) return null;
  const { data: members } = await db.from("fl_members").select("id, name, token").eq("league_code", code);
  const ids = (members ?? []).map((m) => m.id);
  const { data: preds } = ids.length
    ? await db.from("fl_preds").select("member_id, event_key, value, label, start_at").in("member_id", ids)
    : { data: [] as any[] };

  const { data: bets } = ids.length
    ? await db.from("fl_bets").select("member_id, event_key, pick, stake, odds, label, start_at").in("member_id", ids)
    : { data: [] as any[] };

  const keys = Array.from(new Set([...(preds ?? []), ...(bets ?? [])].filter((p) => new Date(p.start_at) < new Date()).map((p) => p.event_key)));
  const results = new Map<string, any>();
  await Promise.all(keys.slice(0, 60).map(async (k) => results.set(k, await resultOf(k))));

  const me = (members ?? []).find((m) => token && m.token === token) ?? null;
  const table = (members ?? []).map((m) => {
    const mine = (preds ?? []).filter((p) => p.member_id === m.id);
    let points = 0,
      scored = 0,
      hits = 0;
    for (const p of mine) {
      const r = results.get(p.event_key);
      if (!r) continue;
      const s = score(p.event_key, p.value, r);
      points += s;
      scored++;
      if (s > 0) hits++;
    }
    const w = wallet(m.id, bets ?? [], results);
    return { name: m.name, points, scored, accuracy: scored ? hits / scored : null, coins: w.balance, pending: w.pending, isMe: me?.id === m.id };
  });
  table.sort((a, b) => b.points - a.points || (b.accuracy ?? 0) - (a.accuracy ?? 0));

  const myPreds = me
    ? (preds ?? [])
        .filter((p) => p.member_id === me.id)
        .map((p) => {
          const r = results.get(p.event_key);
          return { key: p.event_key, value: p.value, label: p.label, start: p.start_at, result: r ?? null, points: r ? score(p.event_key, p.value, r) : null };
        })
        .sort((a, b) => String(b.start).localeCompare(String(a.start)))
    : [];

  // Lo que se ve de los demás: solo pronósticos de eventos ya empezados (para no copiar).
  const upcoming = await upcomingFor(lg.comps ?? [], lg.f1);
  const drivers = lg.f1 ? ((await f1Drivers()) ?? []).map((d) => ({ id: d.id, name: d.name, code: d.code })) : [];

  const myBets = me
    ? (bets ?? [])
        .filter((b) => b.member_id === me.id)
        .map((b) => {
          const r = results.get(b.event_key);
          const out = r ? outcome(r) : null;
          const voided = !r && b.start_at && Date.now() - new Date(b.start_at).getTime() > 3 * 86400000;
          return { key: b.event_key, pick: b.pick, stake: b.stake, odds: Number(b.odds), label: b.label, start: b.start_at, result: r ?? null, won: out ? out === b.pick : null, voided };
        })
        .sort((a, b) => String(b.start).localeCompare(String(a.start)))
    : [];
  const myWallet = me ? wallet(me.id, bets ?? [], results) : null;

  return {
    league: { code: lg.code, name: lg.name, comps: lg.comps, f1: lg.f1 },
    me: me ? { name: me.name, coins: myWallet?.balance ?? START_COINS, available: myWallet?.available ?? START_COINS } : null,
    myBets,
    table,
    myPreds,
    upcoming,
    drivers,
  };
}

export const outcome = (r: { h: number; a: number }) => (r.h > r.a ? "H" : r.h < r.a ? "A" : "D");

// Fichas: 1000 al empezar; se gana apuesta × cuota, se pierde la apuesta.
export function wallet(memberId: string, bets: any[], results: Map<string, any>) {
  let balance = START_COINS;
  let pending = 0;
  for (const b of bets.filter((x) => x.member_id === memberId)) {
    const r = results.get(b.event_key);
    if (!r) {
      // Partido aplazado o sin resultado 3 días después: apuesta anulada y fichas devueltas.
      const stale = b.start_at && Date.now() - new Date(b.start_at).getTime() > 3 * 86400000;
      if (!stale) pending += b.stake;
      continue;
    }
    balance += outcome(r) === b.pick ? Math.round(b.stake * Number(b.odds)) - b.stake : -b.stake;
  }
  return { balance, pending, available: balance - pending };
}

export async function memberWallet(memberId: string) {
  const db = supa();
  if (!db) return null;
  const { data: bets } = await db.from("fl_bets").select("member_id, event_key, pick, stake, odds, start_at").eq("member_id", memberId);
  const results = new Map<string, any>();
  await Promise.all(
    (bets ?? []).filter((b) => new Date(b.start_at) < new Date()).map(async (b) => results.set(b.event_key, await resultOf(b.event_key))),
  );
  return wallet(memberId, bets ?? [], results);
}
