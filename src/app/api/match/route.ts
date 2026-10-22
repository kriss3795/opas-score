import { NextRequest, NextResponse } from "next/server";
import { eventSummary } from "@/lib/server/espn";
import { leagueMeta } from "@/lib/catalog";
import { footballFacts } from "@/lib/server/facts";
import { eloFixtures, matchElo } from "@/lib/server/clubelo";

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

  // Forma reciente (últimos resultados) tal como la publica la fuente.
  const form: Record<string, string[]> = {};
  const formBlocks: any[] = d.boxscore?.form ?? d.lastFiveGames ?? d.boxscore?.lastFiveGames ?? [];
  for (const b of formBlocks) {
    const tid = String(b.team?.id ?? "");
    const name = tid === home?.id ? home?.name : tid === away?.id ? away?.name : undefined;
    if (!name) continue;
    const evs: any[] = (b.events ?? []).slice().sort((x: any, y: any) => String(y.gameDate ?? "").localeCompare(String(x.gameDate ?? "")));
    form[name] = evs.map((e) => String(e.gameResult ?? "").toUpperCase()).filter((r) => ["W", "D", "L"].includes(r));
  }

  const meta = leagueMeta(league)!;
  const sourceUrl = `https://www.espn.com/${meta.path.split("/")[0]}/match/_/gameId/${id}`;
  // Líderes de la temporada de cada equipo (goles, asistencias), tal como los publica la fuente.
  const leaders: { team: string; category: string; name: string; value: string }[] = [];
  for (const blk of d.leaders ?? []) {
    const tid = String(blk.team?.id ?? "");
    const tname = tid === home?.id ? home?.name : tid === away?.id ? away?.name : blk.team?.displayName;
    for (const cat of blk.leaders ?? []) {
      const top = cat.leaders?.[0];
      const name = top?.athlete?.displayName;
      if (!tname || !name) continue;
      leaders.push({ team: tname, category: String(cat.name ?? cat.displayName ?? ""), name, value: String(top.displayValue ?? top.value ?? "").split(" ")[0] });
    }
  }
  const followed = (req.nextUrl.searchParams.get("players") ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20);
  const scorersToday = keyEvents.filter((k: any) => k.icon === "goal" && k.player).map((k: any) => k.player as string);
  const facts =
    home && away
      ? footballFacts({ home: home.name, away: away.name, h2h: h2hUnique, form, leaders, followed, scorersToday, url: sourceUrl })
      : [];

  // Pronóstico ClubElo (solo fútbol, solo si el partido coincide sin ambigüedad).
  let elo = null;
  if (meta.sport === "football" && comp?.date && home && away && type.state !== "post") {
    const rows = await eloFixtures();
    const names = (c: any) => [c?.team?.displayName, c?.team?.shortDisplayName, c?.team?.name, c?.team?.location, c?.team?.abbreviation];
    const hc = cs.find((c) => c.homeAway === "home") ?? cs[0];
    const ac = cs.find((c) => c.homeAway === "away") ?? cs[1];
    const f = rows ? matchElo(rows, comp.date, names(hc), names(ac)) : null;
    if (f) elo = { home: f.pHome, draw: f.pDraw, away: f.pAway };
  }

  return NextResponse.json(
    {
      match: {
        facts,
        elo,
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
