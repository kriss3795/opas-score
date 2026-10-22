import { NextResponse } from "next/server";
import { LEAGUES } from "@/lib/catalog";
import { getJson } from "@/lib/server/http";

// Comprueba cada día qué competiciones responden en la fuente.
// La app solo ofrece las que funcionan: ninguna liga vacía ni inventada.
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function GET() {
  const checks = await Promise.all(
    LEAGUES.map(async (l) => {
      const d = await getJson<any>(`https://site.api.espn.com/apis/site/v2/sports/${l.path}/scoreboard`, 86400, {}, 6000);
      return d?.leagues?.length ? l.id : null;
    }),
  );
  const available = checks.filter(Boolean);
  return NextResponse.json(
    { available, checked: LEAGUES.length },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } },
  );
}
