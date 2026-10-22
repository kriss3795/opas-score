import { NextRequest, NextResponse } from "next/server";
import { searchAthletes } from "@/lib/server/espn";
import { LEAGUES } from "@/lib/catalog";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
  if (q.length < 3) return NextResponse.json({ athletes: [] });
  const res = await searchAthletes(q);
  if (!res) return NextResponse.json({ athletes: [], failed: true });
  // Se traduce el código de liga de la fuente al identificador de la app.
  const athletes = res.map((a: { sport: string; league?: string }) => {
    const lg = LEAGUES.find((l) => l.sport === a.sport && (l.id === a.league || l.path.endsWith(`/${a.league}`)));
    return { ...a, league: lg?.id };
  });
  return NextResponse.json({ athletes }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
}
