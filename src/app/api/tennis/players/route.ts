import { NextResponse } from "next/server";
import { tennisRankings } from "@/lib/server/espn";

// Jugadores del ranking ATP y WTA para elegir favoritos.
export async function GET() {
  const [atp, wta] = await Promise.all([tennisRankings("atp"), tennisRankings("wta")]);
  return NextResponse.json(
    { players: [...(atp ?? []), ...(wta ?? [])], failed: !atp && !wta },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } },
  );
}
