import "server-only";
import { getJson, ymd } from "./http";
import type { SportEvent, Standings, StandingRow, TeamOption, EventStatus, PlayerOption } from "../types";
import { leagueMeta, LEAGUES } from "../catalog";

// API no oficial de ESPN: puede cambiar sin aviso. Todo se lee de forma defensiva.
const SITE = "https://site.api.espn.com/apis/site/v2/sports";
const V2 = "https://site.api.espn.com/apis/v2/sports";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Detalle en vivo sin palabras en inglés: minuto, cuarto, periodo, entrada o set.
export function liveDetail(st: any, sport: string): string | undefined {
  const type = st?.type ?? {};
  const clock = st?.displayClock && st.displayClock !== "0:00" ? st.displayClock : "";
  const p = Number(st?.period ?? 0);
  if (sport === "football" || sport === "rugby") return st?.displayClock || undefined;
  if (sport === "tennis") return p ? `Set ${p}` : undefined;
  if (sport === "baseball") {
    const d = String(type.shortDetail ?? type.detail ?? "");
    const half = /^top/i.test(d) ? "▲" : /^bot/i.test(d) ? "▼" : /^mid/i.test(d) ? "◆" : /^end/i.test(d) ? "■" : "";
    return p ? `${half}${p}` : undefined;
  }
  if (sport === "hockey") return p ? `P${p > 3 ? "OT" : p}${clock ? ` ${clock}` : ""}` : undefined;
  if (["basketball", "nfl", "afl"].includes(sport)) return p ? `${p > 4 ? "OT" : `Q${p}`}${clock ? ` ${clock}` : ""}` : undefined;
  return clock || undefined;
}

function mapStatus(st: any, sport = "football"): { status: EventStatus; detail?: string } {
  const type = st?.type ?? {};
  const name: string = type.name ?? "";
  if (name.includes("POSTPONED")) return { status: "cancelled", detail: "postponed" };
  if (name.includes("CANCELED") || name.includes("CANCELLED") || name.includes("ABANDONED"))
    return { status: "cancelled", detail: "cancelled" };
  if (name.includes("HALFTIME")) return { status: "in", detail: "HT" };
  const state = type.state;
  // Fútbol y rugby: el minuto ("67'"). Otros deportes: el periodo completo ("Q3 5:32", "2nd 10:14").
  if (state === "in") return { status: "in", detail: liveDetail(st, sport) };
  if (state === "post") return { status: "post", detail: type.shortDetail };
  return { status: "pre" };
}

function logoOf(team: any): string | undefined {
  return team?.logo || team?.logos?.[0]?.href;
}

// Nombre corto para tarjetas (evita nombres cortados en el teléfono).
function shortName(team: any): string | undefined {
  const s = team?.shortDisplayName;
  if (s && s.length <= 16) return s;
  return team?.name && team.name.length <= 16 ? team.name : s ?? team?.abbreviation;
}

// ESPN no acepta rangos de fechas de forma fiable: se pide día por día (cada día con su propia caché).
export async function teamScoreboard(league: string, from: Date, to: Date): Promise<SportEvent[] | null> {
  const meta = leagueMeta(league);
  if (!meta) return null;
  const path = meta.path;
  const today = ymd(new Date());
  const days: Date[] = [];
  for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 86400000)) days.push(d);
  const results = await Promise.all(
    days.map((d) => {
      const key = ymd(d);
      const reval = key === today ? 30 : key < today ? 3600 : 900;
      return getJson<any>(`${SITE}/${path}/scoreboard?dates=${key}`, reval);
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
  if (meta?.kind === "event") {
    // Torneos, veladas y carreras: un evento por fecha, sin rivales.
    for (const ev of data.events ?? []) {
      const comp = ev.competitions?.[0];
      const { status, detail } = mapStatus(comp?.status ?? ev.status, meta.sport);
      out.push({
        id: String(ev.id),
        sport: meta.sport,
        competitionId: league,
        competitionName: leagueName,
        start: ev.date,
        status,
        statusDetail: detail,
        title: ev.name,
        venue: comp?.venue?.fullName ?? ev.circuit?.fullName,
        link: `/event/${league}/${ev.id}?d=${String(ev.date).slice(0, 10).replace(/-/g, "")}`,
        source: "ESPN",
      });
    }
    return out;
  }
  for (const ev of data.events ?? []) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const cs: any[] = comp.competitors ?? [];
    const h = cs.find((c) => c.homeAway === "home") ?? cs[0];
    const a = cs.find((c) => c.homeAway === "away") ?? cs[1];
    if (!h || !a) continue;
    const { status, detail } = mapStatus(comp.status ?? ev.status, meta?.sport);
    out.push({
      id: String(ev.id),
      sport: meta?.sport ?? "football",
      competitionId: league,
      competitionName: leagueName,
      start: ev.date,
      status,
      statusDetail: detail,
      home: {
        id: String(h.team?.id ?? ""),
        name: h.team?.displayName ?? "?",
        short: shortName(h.team),
        logo: logoOf(h.team),
        score: status === "pre" ? undefined : h.score,
        winner: h.winner,
      },
      away: {
        id: String(a.team?.id ?? ""),
        name: a.team?.displayName ?? "?",
        short: shortName(a.team),
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

export async function teamStandings(league: string): Promise<Standings | null> {
  const meta = leagueMeta(league);
  if (!meta) return null;
  const url = `${V2}/${meta.path}/standings`;
  const data = await getJson<any>(url, 900);
  if (!data) return null;
  // Ligas de EE. UU. (NBA, NHL, NFL, MLB): se juntan conferencias y divisiones en una sola tabla.
  const usSport = ["basketball", "hockey", "nfl", "baseball"].includes(meta.sport);
  const collect = (node: any): any[] =>
    node?.standings?.entries?.length ? node.standings.entries : (node?.children ?? []).flatMap((c: any) => collect(c));
  const groups: any[] = data.children?.length ? data.children : [data];
  const entries: any[] = usSport ? collect(data) : groups[0]?.standings?.entries ?? [];
  if (!entries.length) return null;
  const isNBA = usSport && meta.sport !== "hockey";
  const stat = (e: any, n: string) => {
    const s = (e.stats ?? []).find((x: any) => x.name === n);
    return s ? Number(s.value) : undefined;
  };
  const rows: StandingRow[] = entries.map((e) => ({
    rank: stat(e, "rank") ?? stat(e, "playoffSeed") ?? 0,
    teamId: String(e.team?.id ?? ""),
    name: e.team?.displayName ?? "?",
    logo: logoOf(e.team),
    played: stat(e, "gamesPlayed"),
    won: stat(e, "wins"),
    drawn: stat(e, "ties"),
    lost: stat(e, "losses"),
    diff: stat(e, "pointDifferential") ?? stat(e, "differential"),
    gf: stat(e, "pointsFor"),
    ga: stat(e, "pointsAgainst"),
    points: isNBA ? stat(e, "wins") ?? 0 : stat(e, "points") ?? 0,
    note: !usSport && e.note ? { color: e.note.color, description: e.note.description } : undefined,
  }));
  if (meta.sport === "hockey") rows.sort((a, b) => b.points - a.points || (b.won ?? 0) - (a.won ?? 0)).forEach((r, i) => (r.rank = i + 1));
  else if (isNBA) rows.sort((a, b) => b.points - a.points || (a.lost ?? 0) - (b.lost ?? 0)).forEach((r, i) => (r.rank = i + 1));
  else rows.sort((a, b) => a.rank - b.rank);
  return {
    competitionId: league,
    competitionName: meta.name.fr,
    rows,
    source: "ESPN",
    sourceUrl: `https://www.espn.com/${meta.path.split("/")[0]}/standings`,
  };
}

export async function teamsOf(league: string): Promise<TeamOption[] | null> {
  const meta = leagueMeta(league);
  if (!meta) return null;
  const data = await getJson<any>(`${SITE}/${meta.path}/teams`, 86400);
  if (!data) return null;
  const teams: any[] = data.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return teams.map((w) => {
    const tm = w.team ?? w;
    return {
      id: String(tm.id),
      sport: meta.sport,
      name: tm.displayName,
      short: shortName(tm),
      logo: logoOf(tm),
      leagues: [league],
    };
  });
}

// Lista gigante: une los equipos de todas las competiciones del catálogo.
export async function allTeams(): Promise<TeamOption[]> {
  const list = LEAGUES.filter((l) => l.kind !== "event" && l.kind !== "tennis");
  const results = await Promise.all(list.map((l) => teamsOf(l.id)));
  const women = new Set(list.filter((l) => l.group === "women").map((l) => l.id));
  const norm = (x: string) =>
    x
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  // Un club aparece en varias competiciones: se junta en una sola entrada (mismo deporte y mismo nombre).
  const map = new Map<string, TeamOption>();
  results.forEach((teams) => {
    for (const tm of teams ?? []) {
      const isWomen = tm.leagues.every((l) => women.has(l));
      const name = isWomen ? `${tm.name} (F)` : tm.name;
      const key = `${tm.sport}:${norm(name)}`;
      const prev = map.get(key);
      if (prev) {
        prev.leagues = Array.from(new Set([...prev.leagues, ...tm.leagues]));
        if (prev.id !== tm.id && !(prev.alt ?? []).includes(tm.id)) prev.alt = [...(prev.alt ?? []), tm.id];
        if (!prev.logo && tm.logo) prev.logo = tm.logo;
      } else map.set(key, { ...tm, name, short: isWomen && tm.short ? `${tm.short} (F)` : tm.short });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Búsqueda de jugadores (ESPN): se sigue a un jugador a través de los partidos de su equipo.
const SPORT_OF: Record<string, string> = {
  soccer: "football",
  basketball: "basketball",
  hockey: "hockey",
  football: "nfl",
  baseball: "baseball",
  rugby: "rugby",
  "australian-football": "afl",
};

export async function searchAthletes(q: string) {
  const d = await getJson<any>(
    `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(q)}&limit=25&type=player`,
    3600,
  );
  if (!d) return null;
  return (d.items ?? [])
    .map((it: any) => {
      const sport = SPORT_OF[it.sport];
      const team = it.teamRelationships?.[0];
      if (!sport) return null;
      return {
        id: String(it.id),
        name: it.displayName,
        short: it.shortName,
        sport,
        teamId: team?.id ? String(team.id) : team?.core?.id ? String(team.core.id) : undefined,
        teamName: team?.displayName ?? team?.core?.displayName ?? team?.core?.name,
        teamLogo: team?.core?.logos?.[0]?.href,
        league: it.league,
        flag: it.flag?.href,
      };
    })
    .filter(Boolean);
}

export async function eventDetail(league: string, id: string, day: string) {
  const meta = leagueMeta(league);
  if (!meta || !/^\d{8}$/.test(day)) return null;
  const d = await getJson<any>(`${SITE}/${meta.path}/scoreboard?dates=${day}`, 60);
  const ev = (d?.events ?? []).find((e: any) => String(e.id) === id);
  if (!ev) return null;
  const comps: any[] = ev.competitions ?? [];
  const athlete = (c: any) => ({
    name: c.athlete?.displayName ?? c.team?.displayName ?? "?",
    flag: typeof c.athlete?.flag === "string" ? c.athlete.flag : c.athlete?.flag?.href,
    winner: Boolean(c.winner),
    record: c.records?.[0]?.summary,
    score: typeof c.score === "object" ? c.score?.displayValue : c.score,
    order: Number(c.order),
  });
  const isFightCard = comps.length > 1 && comps.every((c) => (c.competitors ?? []).length === 2);
  return {
    name: ev.name,
    start: ev.date,
    end: ev.endDate,
    venue: comps[0]?.venue?.fullName ?? ev.circuit?.fullName,
    state: (comps[0]?.status ?? ev.status)?.type?.state ?? "pre",
    fights: isFightCard
      ? comps.map((c) => ({
          weight: c.type?.abbreviation ?? c.type?.text,
          status: c.status?.type?.state,
          detail: c.status?.type?.shortDetail,
          a: athlete(c.competitors[0]),
          b: athlete(c.competitors[1]),
        }))
      : [],
    leaderboard: !isFightCard
      ? (comps[comps.length - 1]?.competitors ?? comps[0]?.competitors ?? [])
          .map(athlete)
          .filter((x: any) => Number.isFinite(x.order))
          .sort((a: any, b: any) => a.order - b.order)
          .slice(0, 30)
      : [],
    sourceUrl: `https://www.espn.com/${meta.path.split("/")[0]}/`,
  };
}

export async function eventSummary(league: string, id: string, revalidate = 30) {
  const meta = leagueMeta(league);
  if (!meta) return null;
  return getJson<any>(`${SITE}/${meta.path}/summary?event=${encodeURIComponent(id)}`, revalidate);
}

// ---------- Tenis ----------

export async function tennisRankings(tour: string): Promise<PlayerOption[] | null> {
  const d = await getJson<any>(`${SITE}/tennis/${tour}/rankings`, 86400);
  const ranks: any[] = d?.rankings?.[0]?.ranks ?? [];
  if (!ranks.length) return null;
  return ranks.map((r) => ({
    id: String(r.athlete?.id ?? ""),
    name: r.athlete?.displayName ?? "?",
    flag: typeof r.athlete?.flag === "string" ? r.athlete.flag : r.athlete?.flag?.href,
    tour,
    rank: Number(r.current),
  }));
}

// Partidos de individuales de los torneos en curso, filtrados por jugadores favoritos.
export async function tennisMatches(
  tour: string,
  playerIds: Set<string>,
  playerNames: Set<string>,
  from: Date,
  to: Date,
  followTour = false,
): Promise<SportEvent[] | null> {
  const d = await getJson<any>(`${SITE}/tennis/${tour}/scoreboard`, 60);
  if (!d) return null;
  // Circuito seguido: partidos del top 20 del ranking y todas las rondas desde cuartos de final.
  const top = new Set<string>();
  if (followTour) (await tennisRankings(tour))?.filter((p) => (p.rank ?? 99) <= 20).forEach((p) => top.add(p.id));
  const out: SportEvent[] = [];
  for (const ev of d.events ?? []) {
    for (const g of ev.groupings ?? []) {
      const slug: string = g.grouping?.slug ?? g.grouping?.displayName ?? "";
      if (!/singles/i.test(slug)) continue;
      for (const c of g.competitions ?? []) {
        const t = new Date(c.date ?? c.startDate);
        if (isNaN(t.getTime()) || t < from || t > to) continue;
        const cs: any[] = c.competitors ?? [];
        if (cs.length < 2) continue;
        const ids = cs.map((x) => String(x.id ?? x.athlete?.id ?? ""));
        const names = cs.map((x) => x.athlete?.displayName ?? "");
        const fav = ids.some((i) => playerIds.has(i)) || names.some((n) => playerNames.has(n));
        const bigMatch = followTour && (ids.some((i) => top.has(i)) || /quarter|semi|final/i.test(c.round?.displayName ?? ""));
        if (!fav && !bigMatch) continue;
        const { status, detail } = mapStatus(c.status, "tennis");
        const side = (x: any) => ({
          id: String(x.id ?? x.athlete?.id ?? ""),
          name: x.athlete?.displayName ?? "?",
          short: x.athlete?.shortName,
          logo: typeof x.athlete?.flag === "string" ? x.athlete.flag : x.athlete?.flag?.href,
          winner: x.winner,
          sets: (x.linescores ?? []).map((l: any) => `${l.value ?? ""}${l.tiebreak !== undefined ? `⁽${l.tiebreak}⁾` : ""}`),
        });
        const [a, b] = [cs.find((x) => x.order === 1) ?? cs[0], cs.find((x) => x.order === 2) ?? cs[1]];
        out.push({
          id: `tennis-${c.id}`,
          sport: "tennis",
          competitionId: `tennis.${tour}`,
          competitionName: ev.name ?? tour.toUpperCase(),
          start: c.date ?? c.startDate,
          status,
          statusDetail: detail,
          round: c.round?.displayName,
          link: `/tennis/${tour}/${c.id}`,
          home: side(a),
          away: side(b),
          venue: c.venue?.fullName,
          source: "ESPN",
        });
      }
    }
  }
  return out;
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
