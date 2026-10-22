import { NextRequest, NextResponse } from "next/server";
import { matchDetail } from "@/lib/server/match";
import { matchFacts } from "@/lib/server/matchfacts";

export const maxDuration = 60;

// Datos curiosos aparte: pueden tardar más (Wikidata) y no deben frenar la ficha del partido.
export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get("league") ?? "";
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const followed = (req.nextUrl.searchParams.get("players") ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20);
  if (!/^\d+$/.test(id)) return NextResponse.json({ facts: [] });
  const m = await matchDetail(league, id);
  let error: string | undefined;
  const facts = m
    ? await matchFacts(m, followed).catch((e) => {
        error = e instanceof Error ? e.message : String(e);
        console.error("[facts]", error);
        return [];
      })
    : [];
  if (req.nextUrl.searchParams.get("debug") === "1")
    return NextResponse.json({ facts, error, hasMatch: Boolean(m), table: m?.table?.length ?? 0, leaders: m?.leaders?.length ?? 0, form: Object.keys(m?.form ?? {}).length, h2h: m?.h2h?.length ?? 0 });
  // En vivo se renuevan seguido (goles del partido); antes o después, cada 10 minutos.
  const ttl = m?.state === "in" ? 60 : 600;
  return NextResponse.json({ facts }, { headers: { "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 3}` } });
}
