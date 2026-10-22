import "server-only";
import { getJson, ymd } from "./http";
import type { SportEvent, Standings, StandingRow, TeamOption, EventStatus } from "../types";
import { leagueMeta, LEAGUES } from "../catalog";

// API no oficial de ESPN: puede cambiar sin aviso. Todo se lee de forma defensiva.
const SITE = "https://site.api.espn.com/apis/site/v2/sports";
const V2 = "https://site.api.espn.com/apis/v2/sports";

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapStatus(st: any): { status: EventStatus; detail?: string } {
  const type = st?.type ?? {};
  const name: string = type.name ?? "";
  if (name.includes("POSTPONED")) return { status: "cancelled", detail: "postponed" };
  if (name.includes("CANCELED") || name.includes("CANCELLED") || name.includes("ABANDONED"))
    return { status: "cancelled", detail: "cancelled" };
  if (name.includes("HALFTIME")) return { status: "in", detail: "HT" };
  const state = type.state;
  if (state === "in") return { status: "in", detail: st?.displayClock || type.shortDetail };
  if (state === "post") return { status: "post", detail: type.shortDetail };
  return { status: "pre" };
}

function logoOf(team: any): string | undefined {
  return team?.logo || team?.logos?.[0]?.href;
}

// ESPN no siempre acepta rangos de fechas en fútbol: se intenta una vez y, si falla,
// se piden los días uno por uno (cada día con su propia caché).
let rangeWorks: boolean | null = null;

export async function soccerScoreboard(league: string, from: Date, to: Date): Promise<SportEvent[] | null> {
  if (rangeWorks !== false) {
    const url = `${SITE}/soccer/${league}/scoreboard?dates=${ymd(from)}-${ymd(to)}&limit=300`;
    const data = await getJson<any>(url, 60);
    if (data?.events) {
      rangeWorks = true;
      return parseScoreboard(league, data);
    }
    if (rangeWorks === null) rangeWorks = false;
  }
  const today = ymd(new Date());
  const days: Date[] = [];
  for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 86400000)) days.push(d);
  const results = await Promise.all(
    days.map((d) => {
      const key = ymd(d);
      const reval = key === today ? 30 : key < today ? 3600 : 900;
      return getJson<any>(`${SITE}/soccer/${league}/scoreboard?dates=${key}`, reval);
    }),
  );
  if (results.every((r) => r === null)) return null;
  const seen = new Set<string>();
  const out: SportEvent[] = [];
  for (const r of results) {
    if (!r) continue;
    for (const e of parseScoreboard(league, r)) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push(e);
    }
  }
  return out;
}

function parseScoreboard(league: string, data: any): SportEvent[] {
  const meta = leagueMeta(league);
  const leagueName = meta?.name.fr ?? data?.leagues?.[0]?.name ?? league;
  const out: SportEvent[] = [];
  for (const ev of data.events ?? []) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const cs: any[] = comp.competitors ?? [];
    const h = cs.find((c) => c.homeAway === "home") ?? cs[0];
    const a = cs.find((c) => c.homeAway === "away") ?? cs[1];
    if (!h || !a) continue;
    const { status, detail } = mapStatus(comp.status ?? ev.status);
    out.push({
      id: String(ev.id),
      sport: "football",
      competitionId: league,
      competitionName: leagueName,
      start: ev.date,
      status,
      statusDetail: detail,
      home: {
        id: String(h.team?.id ?? ""),
        name: h.team?.displayName ?? "?",
        short: h.team?.shortDisplayName ?? h.team?.abbreviation,
        logo: logoOf(h.team),
        score: status === "pre" ? undefined : h.score,
        winner: h.winner,
      },
      away: {
        id: String(a.team?.id ?? ""),
        name: a.team?.displayName ?? "?",
        short: a.team?.shortDisplayName ?? a.team?.abbreviation,
        logo: logoOf(a.team),
        score: status === "pre" ? undefined : a.score,
        winner: a.winner,
      },
      venue: comp.venue?.fullName,
      link: `/match/${league}/${ev.id}`,
      source: "ESPN",
    });
  }
  return out;
}

export async function soccerStandings(league: string): Promise<Standings | null> {
  const url = `${V2}/soccer/${league}/standings`;
  const data = await getJson<any>(url, 900);
  if (!data) return null;
  const groups: any[] = data.children?.length ? data.children : [data];
  const g = groups[0];
  const entries: any[] = g?.standings?.entries ?? [];
  if (!entries.length) return null;
  const stat = (e: any, n: string) => {
    const s = (e.stats ?? []).find((x: any) => x.name === n);
    return s ? Number(s.value) : undefined;
  };
  const rows: StandingRow[] = entries.map((e) => ({
    rank: stat(e, "rank") ?? 0,
    teamId: String(e.team?.id ?? ""),
    name: e.team?.displayName ?? "?",
    logo: logoOf(e.team),
    played: stat(e, "gamesPlayed"),
    won: stat(e, "wins"),
    drawn: stat(e, "ties"),
    lost: stat(e, "losses"),
    diff: stat(e, "pointDifferential"),
    points: stat(e, "points") ?? 0,
    note: e.note ? { color: e.note.color, description: e.note.description } : undefined,
  }));
  rows.sort((a, b) => a.rank - b.rank);
  return {
    competitionId: league,
    competitionName: leagueMeta(league)?.name.fr ?? data.name ?? league,
    rows,
    source: "ESPN",
    sourceUrl: `https://www.espn.com/soccer/standings/_/league/${league}`,
  };
}

export async function soccerTeams(league: string): Promise<TeamOption[] | null> {
  const data = await getJson<any>(`${SITE}/soccer/${league}/teams`, 86400);
  if (!data) return null;
  const teams: any[] = data.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return teams.map((w) => {
    const tm = w.team ?? w;
    return {
      id: String(tm.id),
      name: tm.displayName,
      short: tm.shortDisplayName,
      logo: logoOf(tm),
      leagues: [league],
    };
  });
}

// Lista gigante: une los equipos de todas las competiciones del catálogo.
export async function allSoccerTeams(): Promise<TeamOption[]> {
  const results = await Promise.all(LEAGUES.map((l) => soccerTeams(l.id)));
  const map = new Map<string, TeamOption>();
  results.forEach((list) => {
    for (const tm of list ?? []) {
      const prev = map.get(tm.id);
      if (prev) prev.leagues = Array.from(new Set([...prev.leagues, ...tm.leagues]));
      else map.set(tm.id, { ...tm });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function soccerSummary(league: string, id: string) {
  return getJson<any>(`${SITE}/soccer/${league}/summary?event=${encodeURIComponent(id)}`, 30);
}

// F1 en vivo: posiciones de la sesión en curso según ESPN.
export interface LiveRow {
  pos: number;
  name: string;
  flag?: string;
}
export interface LiveSession {
  name: string;
  status: EventStatus;
  detail?: string;
  rows: LiveRow[];
  start?: string;
}

export async function f1Live(): Promise<LiveSession[] | null> {
  const data = await getJson<any>(`${SITE}/racing/f1/scoreboard`, 20);
  if (!data) return null;
  const ev = data.events?.[0];
  if (!ev) return [];
  const sessions: LiveSession[] = [];
  for (const c of ev.competitions ?? []) {
    const { status, detail } = mapStatus(c.status);
    const rows: LiveRow[] = (c.competitors ?? [])
      .map((x: any) => ({
        pos: Number(x.order),
        name: x.athlete?.displayName ?? x.athlete?.fullName ?? "?",
        flag: x.athlete?.flag?.href,
      }))
      .filter((r: LiveRow) => Number.isFinite(r.pos))
      .sort((a: LiveRow, b: LiveRow) => a.pos - b.pos);
    sessions.push({ name: c.type?.abbreviation ?? c.type?.text ?? "", status, detail, rows, start: c.date });
  }
  return sessions;
}
