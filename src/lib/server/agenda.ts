import "server-only";
import { teamScoreboard, tennisMatches } from "./espn";
import { f1Calendar } from "./jolpica";
import { f1SessionEvents } from "./f1events";
import { CUP_LEAGUES, leagueMeta } from "../catalog";
import type { SportEvent } from "../types";

export interface AgendaQuery {
  leagues: string[];
  teams: string[]; // "deporte:id"
  teamLeagues: string[];
  f1: boolean;
  players: string[]; // "atp:id"
  playerNames: string[];
}

// Agenda personal: une todas las fuentes según los favoritos.
export async function buildAgenda(q: AgendaQuery, from: Date, to: Date) {
  const leagues = q.leagues.filter((l) => leagueMeta(l));
  const teams = new Set(q.teams.map((x) => (x.includes(":") ? x : `football:${x}`)));
  const teamLeagues = q.teamLeagues.filter((l) => leagueMeta(l));
  const playerNames = new Set(q.playerNames);

  const tennisTours = leagues.filter((l) => leagueMeta(l)?.kind === "tennis").map((l) => l.split(".")[1]);
  const comps = new Set<string>([...leagues.filter((l) => leagueMeta(l)?.kind !== "tennis"), ...teamLeagues]);
  // Copas: solo las del país de los equipos favoritos y las europeas/internacionales de su deporte.
  const DOMESTIC_CUPS: Record<string, string[]> = {
    fra: ["fra.coupe_de_france"],
    eng: ["eng.fa", "eng.league_cup"],
    esp: ["esp.copa_del_rey"],
    ita: ["ita.coppa_italia"],
    ger: ["ger.dfb_pokal"],
  };
  const countries = new Set(teamLeagues.map((l) => l.split(".")[0]));
  countries.forEach((c) => (DOMESTIC_CUPS[c] ?? []).forEach((x) => comps.add(x)));
  const teamSports = new Set(Array.from(teams).map((k) => k.split(":")[0]));
  teamSports.forEach((s) =>
    (CUP_LEAGUES[s] ?? []).filter((c) => !Object.values(DOMESTIC_CUPS).flat().includes(c)).forEach((c) => comps.add(c)),
  );

  const followed = new Set(leagues);
  const failed: string[] = [];
  const events: SportEvent[] = [];

  const jobs: Promise<void>[] = Array.from(comps).map(async (c) => {
    const evs = await teamScoreboard(c, from, to);
    if (!evs) {
      failed.push(c);
      return;
    }
    for (const e of evs) {
      const isFav = teams.has(`${e.sport}:${e.home?.id}`) || teams.has(`${e.sport}:${e.away?.id}`);
      if (followed.has(c) || isFav) events.push(e);
    }
  });

  if (q.f1) {
    jobs.push(
      (async () => {
        const cal = await f1Calendar();
        if (!cal) return void failed.push("f1");
        events.push(...f1SessionEvents(cal, from, to));
      })(),
    );
  }

  const tours = new Set([...q.players.map((p) => p.split(":")[0]), ...tennisTours].filter((t) => t === "atp" || t === "wta"));
  for (const tour of tours) {
    const ids = new Set(q.players.filter((p) => p.startsWith(`${tour}:`)).map((p) => p.split(":")[1]));
    jobs.push(
      (async () => {
        const evs = await tennisMatches(tour, ids, playerNames, from, to, tennisTours.includes(tour));
        if (!evs) return void failed.push(tour);
        events.push(...evs);
      })(),
    );
  }

  await Promise.all(jobs);
  const seen = new Set<string>();
  const unique = events.filter((e) => (seen.has(`${e.sport}-${e.id}`) ? false : (seen.add(`${e.sport}-${e.id}`), true)));
  unique.sort((a, b) => a.start.localeCompare(b.start));
  return { events: unique, failed };
}

const list = (v: unknown) => (typeof v === "string" ? v.split(",").filter(Boolean) : Array.isArray(v) ? v.map(String) : []);

// Convierte preferencias guardadas (o parámetros de URL) en una consulta de agenda.
export function queryFromPrefs(p: Record<string, unknown>): AgendaQuery {
  return {
    leagues: list(p.leagues),
    teams: list(p.teams),
    teamLeagues: list(p.teamLeagues),
    f1: p.f1 === "1" || p.f1 === true,
    players: list(p.players),
    playerNames: list(p.playerNames),
  };
}
