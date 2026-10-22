import { NextResponse } from "next/server";
import { allTeams } from "@/lib/server/espn";

// Lista completa de equipos (clubes y selecciones) de todas las competiciones cubiertas.
export async function GET() {
  const teams = await allTeams();
  return NextResponse.json(
    { teams },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } },
  );
}
