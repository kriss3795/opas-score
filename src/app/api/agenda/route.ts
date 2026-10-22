import { NextRequest, NextResponse } from "next/server";
import { teamScoreboard, tennisMatches } from "@/lib/server/espn";
import { f1Calendar } from "@/lib/server/jolpica";
import { f1SessionEvents } from "@/lib/server/f1events";
import { CUP_LEAGUES, leagueMeta } from "@/lib/catalog";
import type { SportEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const leagues = list(q.get("leagues")).filter((l) => leagueMeta(l));
  const teams = new Set(list(q.get("teams")).map((x) => (x.includes(":") ? x : `football:${x}`)));
  const teamLeagues = list(q.get("teamLeagues")).filter((l) => leagueMeta(l));
  const withF1 = q.get("f1") === "1";
  const players = list(q.get("players")); // "atp:12345"
  const playerNames = new Set(list(q.get("playerNames")));

  const now = new Date();
  const from = new Date(now.getTime() - 2 * 86400000);
  const to = new Date(now.getTime() + 10 * 86400000);

  const comps = new Set<string>([...leagues, ...teamLeagues]);
  const teamSports = new Set(Array.from(teams).map((k) => k.split(":")[0]));
  teamSports.forEach((s) => (CUP_LEAGUES[s] ?? []).forEach((c) => comps.add(c)));

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

  if (withF1) {
    jobs.push(
      (async () => {
        const cal = await f1Calendar();
        if (!cal) return void failed.push("f1");
        events.push(...f1SessionEvents(cal, from, to));
      })(),
    );
  }

  const tours = new Set(players.map((p) => p.split(":")[0]).filter((t) => t === "atp" || t === "wta"));
  for (const tour of tours) {
    const ids = new Set(players.filter((p) => p.startsWith(`${tour}:`)).map((p) => p.split(":")[1]));
    jobs.push(
      (async () => {
        const evs = await tennisMatches(tour, ids, playerNames, from, to);
        if (!evs) return void failed.push(tour);
        events.push(...evs);
      })(),
    );
  }

  await Promise.all(jobs);
  // Sin duplicados (un mismo partido puede venir de dos competiciones).
  const seen = new Set<string>();
  const unique = events.filter((e) => (seen.has(`${e.sport}-${e.id}`) ? false : (seen.add(`${e.sport}-${e.id}`), true)));
  unique.sort((a, b) => a.start.localeCompare(b.start));
  return NextResponse.json(
    { events: unique, failed, updated: now.toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
