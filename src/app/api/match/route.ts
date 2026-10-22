import { NextRequest, NextResponse } from "next/server";
import { matchDetail } from "@/lib/server/match";
import { eloFixtures, matchElo } from "@/lib/server/clubelo";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get("league") ?? "";
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const m = await matchDetail(league, id);
  if (!m) return NextResponse.json({ match: null });

  // Pronóstico ClubElo (solo fútbol y antes o durante el partido).
  let elo = null;
  if (m.sport === "football" && m.start && m.home && m.away && m.state !== "post") {
    const rows = await eloFixtures();
    const f = rows ? matchElo(rows, m.start, [m.home.name, m.home.short ?? ""], [m.away.name, m.away.short ?? ""]) : null;
    if (f) elo = { home: f.pHome, draw: f.pDraw, away: f.pAway };
  }
  const { raw: _raw, ...rest } = m;
  void _raw;
  return NextResponse.json(
    { match: { ...rest, elo } },
    { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } },
  );
}
