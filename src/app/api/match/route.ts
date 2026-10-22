import { NextRequest, NextResponse } from "next/server";
import { eventSummary } from "@/lib/server/espn";
import { leagueMeta } from "@/lib/catalog";

/* eslint-disable @typescript-eslint/no-explicit-any */

const WANTED_STATS = ["possessionPct", "totalShots", "shotsOnTarget", "wonCorners", "foulsCommitted", "yellowCards", "redCards", "offsides", "saves"];

export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get("league") ?? "";
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!leagueMeta(league) || !/^\d+$/.test(id)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const d = await eventSummary(league, id);
  if (!d) return NextResponse.json({ match: null });

  const comp = d.header?.competitions?.[0];
  const cs: any[] = comp?.competitors ?? [];
  const side = (c: any) =>
    c && {
      id: String(c.team?.id ?? c.id ?? ""),
      name: c.team?.displayName ?? "?",
      logo: c.team?.logos?.[0]?.href ?? c.team?.logo,
      score: c.score,
      winner: c.winner,
    };
  const home = side(cs.find((c) => c.homeAway === "home") ?? cs[0]);
  const away = side(cs.find((c) => c.homeAway === "away") ?? cs[1]);
  const type = comp?.status?.type ?? {};

  const keyEvents = (d.keyEvents ?? [])
    .map((k: any) => {
      const kind: string = (k.type?.type ?? k.type?.text ?? "").toLowerCase();
      let icon = "";
      if (k.scoringPlay || kind.includes("goal")) icon = "goal";
      else if (kind.includes("red")) icon = "red";
      else if (kind.includes("yellow")) icon = "yellow";
      else if (kind.includes("substitution")) icon = "sub";
      else return null;
      return {
        icon,
        clock: k.clock?.displayValue ?? "",
        teamId: String(k.team?.id ?? ""),
        player: k.participants?.[0]?.athlete?.displayName ?? "",
        detail: kind.includes("penalty") ? "pen" : kind.includes("own") ? "csc" : "",
      };
    })
    .filter(Boolean)
    .filter((k: any) => k.icon !== "sub");

  const teamsBox: any[] = d.boxscore?.teams ?? [];
  const statFor = (teamId: string) => {
    const tb = teamsBox.find((x) => String(x.team?.id) === teamId);
    const map: Record<string, string> = {};
    for (const s of tb?.statistics ?? []) map[s.name] = s.displayValue;
    return map;
  };
  const hs = home ? statFor(home.id) : {};
  const as = away ? statFor(away.id) : {};
  const stats = WANTED_STATS.filter((n) => hs[n] !== undefined && as[n] !== undefined).map((n) => ({
    name: n,
    home: hs[n],
    away: as[n],
  }));

  // Enfrentamientos previos reales, tal como los publica la fuente.
  const h2h: { date: string; home: string; away: string; score: string }[] = [];
  const nameById = new Map<string, string>();
  if (home) nameById.set(home.id, home.name);
  if (away) nameById.set(away.id, away.name);
  for (const g of d.headToHeadGames ?? []) {
    for (const e of g.events ?? []) {
      const hId = String(e.homeTeamId ?? "");
      const aId = String(e.awayTeamId ?? "");
      if (!e.gameDate || e.homeTeamScore === undefined) continue;
      h2h.push({
        date: e.gameDate,
        home: nameById.get(hId) ?? "",
        away: nameById.get(aId) ?? "",
        score: `${e.homeTeamScore}-${e.awayTeamScore}`,
      });
    }
  }
  const seen = new Set<string>();
  const h2hUnique = h2h
    .filter((x) => x.home && x.away)
    .filter((x) => (seen.has(x.date) ? false : (seen.add(x.date), true)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return NextResponse.json(
    {
      match: {
        league,
        id,
        start: comp?.date,
        state: type.state ?? "pre",
        statusName: type.name ?? "",
        clock: comp?.status?.displayClock,
        detail: type.shortDetail,
        home,
        away,
        keyEvents,
        stats,
        h2h: h2hUnique,
        venue: d.gameInfo?.venue?.fullName,
        city: d.gameInfo?.venue?.address?.city,
        sourceUrl: `https://www.espn.com/${leagueMeta(league)!.path.split("/")[0]}/match/_/gameId/${id}`,
        sport: leagueMeta(league)!.sport,
      },
    },
    { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" } },
  );
}
