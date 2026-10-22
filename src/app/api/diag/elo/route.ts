import { NextResponse } from "next/server";
import { eloFixtures } from "@/lib/server/clubelo";

export const dynamic = "force-dynamic";

// Diagnóstico: partidos con probabilidades leídos de ClubElo.
export async function GET() {
  const rows = await eloFixtures();
  return NextResponse.json({ count: rows?.length ?? 0, sample: (rows ?? []).filter((r) => /paris|lyon|liverpool|arsenal|real/i.test(`${r.home} ${r.away}`)).slice(0, 8), first: rows?.slice(0, 3) });
}
