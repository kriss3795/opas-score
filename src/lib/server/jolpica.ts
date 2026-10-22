import "server-only";
import { getJson } from "./http";
import type { DriverOption } from "../types";

// Jolpica-F1 (sucesor de Ergast). Sin clave; ~4 consultas/s y 500/h, por eso todo va con caché.
const BASE = "https://api.jolpi.ca/ergast/f1";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface F1Session {
  key: "fp1" | "fp2" | "fp3" | "sq" | "sprint" | "quali" | "race";
  start: string; // ISO UTC
}

export interface F1Race {
  season: string;
  round: number;
  name: string;
  circuit: string;
  locality?: string;
  country?: string;
  lat?: number;
  lon?: number;
  start: string;
  sessions: F1Session[];
  hasSprint: boolean;
  url?: string;
}

function iso(o: any): string | null {
  if (!o?.date) return null;
  return `${o.date}T${o.time ?? "00:00:00Z"}`;
}

function parseRace(r: any): F1Race {
  const sessions: F1Session[] = [];
  const push = (key: F1Session["key"], o: any) => {
    const s = iso(o);
    if (s) sessions.push({ key, start: s });
  };
  push("fp1", r.FirstPractice);
  push("fp2", r.SecondPractice);
  push("fp3", r.ThirdPractice);
  push("sq", r.SprintQualifying ?? r.SprintShootout);
  push("sprint", r.Sprint);
  push("quali", r.Qualifying);
  push("race", r);
  sessions.sort((a, b) => a.start.localeCompare(b.start));
  return {
    season: r.season,
    round: Number(r.round),
    name: r.raceName,
    circuit: r.Circuit?.circuitName,
    locality: r.Circuit?.Location?.locality,
    country: r.Circuit?.Location?.country,
    lat: r.Circuit?.Location?.lat ? Number(r.Circuit.Location.lat) : undefined,
    lon: r.Circuit?.Location?.long ? Number(r.Circuit.Location.long) : undefined,
    start: iso(r) ?? r.date,
    sessions,
    hasSprint: Boolean(r.Sprint),
    url: r.url,
  };
}

export async function f1Calendar(season = "current"): Promise<F1Race[] | null> {
  const data = await getJson<any>(`${BASE}/${season}.json?limit=100`, 3600);
  if (!data) return null;
  return (data.MRData?.RaceTable?.Races ?? []).map(parseRace);
}

export interface DriverStanding {
  pos: number;
  points: number;
  wins: number;
  driverId: string;
  name: string;
  code?: string;
  nationality?: string;
  team?: string;
}

export async function f1DriverStandings(): Promise<{ round: number; season: string; rows: DriverStanding[] } | null> {
  const data = await getJson<any>(`${BASE}/current/driverStandings.json?limit=100`, 900);
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0];
  if (!list) return null;
  return {
    round: Number(list.round),
    season: list.season,
    rows: (list.DriverStandings ?? []).map((d: any) => ({
      pos: Number(d.position ?? d.positionText),
      points: Number(d.points),
      wins: Number(d.wins),
      driverId: d.Driver?.driverId,
      name: `${d.Driver?.givenName ?? ""} ${d.Driver?.familyName ?? ""}`.trim(),
      code: d.Driver?.code,
      nationality: d.Driver?.nationality,
      team: d.Constructors?.[d.Constructors.length - 1]?.name,
    })),
  };
}

export async function f1ConstructorStandings() {
  const data = await getJson<any>(`${BASE}/current/constructorStandings.json?limit=100`, 900);
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0];
  if (!list) return null;
  return (list.ConstructorStandings ?? []).map((c: any) => ({
    pos: Number(c.position ?? c.positionText),
    points: Number(c.points),
    wins: Number(c.wins),
    name: c.Constructor?.name as string,
  }));
}

export async function f1LastResults() {
  const data = await getJson<any>(`${BASE}/current/last/results.json`, 900);
  const race = data?.MRData?.RaceTable?.Races?.[0];
  if (!race) return null;
  return {
    name: race.raceName as string,
    round: Number(race.round),
    date: iso(race) ?? race.date,
    rows: (race.Results ?? []).map((r: any) => ({
      pos: Number(r.position),
      name: `${r.Driver?.givenName ?? ""} ${r.Driver?.familyName ?? ""}`.trim(),
      driverId: r.Driver?.driverId as string,
      team: r.Constructor?.name as string,
      time: (r.Time?.time as string | undefined) ?? (r.status as string),
      points: Number(r.points),
    })),
  };
}

export async function f1Drivers(): Promise<DriverOption[] | null> {
  const [data, st] = await Promise.all([
    getJson<any>(`${BASE}/current/drivers.json?limit=100`, 86400),
    f1DriverStandings(),
  ]);
  if (!data) return null;
  const teamOf = new Map(st?.rows.map((r) => [r.driverId, r.team]) ?? []);
  return (data.MRData?.DriverTable?.Drivers ?? []).map((d: any) => ({
    id: d.driverId,
    name: `${d.givenName} ${d.familyName}`,
    code: d.code,
    number: d.permanentNumber,
    nationality: d.nationality,
    team: teamOf.get(d.driverId),
  }));
}
