import { NextRequest, NextResponse } from "next/server";
import { soccerScoreboard } from "@/lib/server/espn";
import { f1Calendar } from "@/lib/server/jolpica";
import { f1SessionEvents } from "@/lib/server/f1events";
import { CUP_LEAGUES, LEAGUES } from "@/lib/catalog";
import type { SportEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);
const known = new Set(LEAGUES.map((l) => l.id));

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const leagues = list(q.get("leagues")).filter((l) => known.has(l));
  const teams = new Set(list(q.get("teams")));
  const teamLeagues = list(q.get("teamLeagues")).filter((l) => known.has(l));
  const withF1 = q.get("f1") === "1";

  const now = new Date();
  const from = new Date(now.getTime() - 2 * 86400000);
  const to = new Date(now.getTime() + 10 * 86400000);

  const comps = new Set<string>([...leagues, ...teamLeagues]);
  if (teams.size) CUP_LEAGUES.forEach((c) => comps.add(c));

  const followed = new Set(leagues);
  const failed: string[] = [];
  const events: SportEvent[] = [];

  const jobs: Promise<void>[] = Array.from(comps).map(async (c) => {
    const evs = await soccerScoreboard(c, from, to);
    if (!evs) {
      failed.push(c);
      return;
    }
    for (const e of evs) {
      if (followed.has(c) || teams.has(e.home?.id ?? "") || teams.has(e.away?.id ?? "")) events.push(e);
    }
  });

  if (withF1) {
    jobs.push(
      (async () => {
        const cal = await f1Calendar();
        if (!cal) {
          failed.push("f1");
          return;
        }
        events.push(...f1SessionEvents(cal, from, to));
      })(),
    );
  }

  await Promise.all(jobs);
  events.sort((a, b) => a.start.localeCompare(b.start));
  return NextResponse.json(
    { events, failed, updated: now.toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
