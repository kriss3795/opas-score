import { NextRequest, NextResponse } from "next/server";
import { soccerStandings } from "@/lib/server/espn";
import { fdStandings } from "@/lib/server/footballData";
import { leagueMeta } from "@/lib/catalog";

export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get("league") ?? "";
  if (!leagueMeta(league)) return NextResponse.json({ error: "unknown league" }, { status: 400 });
  // ESPN primero; football-data.org como respaldo.
  const st = (await soccerStandings(league)) ?? (await fdStandings(league));
  return NextResponse.json(
    { standings: st },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } },
  );
}
