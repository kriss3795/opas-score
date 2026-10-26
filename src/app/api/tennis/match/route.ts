import { NextRequest, NextResponse } from "next/server";
import { getJson } from "@/lib/server/http";
import { tennisRankings } from "@/lib/server/espn";
import { officialFor } from "@/lib/server/officialVideos";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Ficha de un partido de tenis: sets, ronda, cancha, ranking y el camino de cada jugador en el torneo.
export async function GET(req: NextRequest) {
  const tour = req.nextUrl.searchParams.get("tour") ?? "";
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!["atp", "wta"].includes(tour) || !/^\d+$/.test(id)) return NextResponse.json({ match: null }, { status: 400 });
  const [d, ranks] = await Promise.all([
    getJson<any>(`https://site.api.espn.com/apis/site/v2/sports/tennis/${tour}/scoreboard`, 30),
    tennisRankings(tour),
  ]);
  if (!d) return NextResponse.json({ match: null });
  const rank = new Map((ranks ?? []).map((r) => [r.id, r.rank]));
  for (const ev of d.events ?? []) {
    for (const g of ev.groupings ?? []) {
      const c = (g.competitions ?? []).find((x: any) => String(x.id) === id);
      if (!c) continue;
      const player = (x: any) => ({
        id: String(x?.id ?? x?.athlete?.id ?? ""),
        name: x?.athlete?.displayName ?? "?",
        flag: typeof x?.athlete?.flag === "string" ? x.athlete.flag : x?.athlete?.flag?.href,
        country: x?.athlete?.flag?.alt,
        seed: x?.curatedRank?.current && x.curatedRank.current < 99 ? x.curatedRank.current : undefined,
        rank: rank.get(String(x?.id ?? x?.athlete?.id ?? "")),
        winner: Boolean(x?.winner),
        sets: (x?.linescores ?? []).map((l: any) => ({ v: l.value, tb: l.tiebreak, won: l.winner })),
      });
      const cs: any[] = c.competitors ?? [];
      const a = player(cs.find((x) => x.order === 1) ?? cs[0]);
      const b = player(cs.find((x) => x.order === 2) ?? cs[1]);
      // Camino en el torneo: otros partidos de individuales de cada jugador en este evento.
      const path = (pid: string) =>
        (g.competitions ?? [])
          .filter((x: any) => String(x.id) !== id && (x.competitors ?? []).some((p: any) => String(p.id ?? p.athlete?.id) === pid))
          .map((x: any) => {
            const me = (x.competitors ?? []).find((p: any) => String(p.id ?? p.athlete?.id) === pid);
            const op = (x.competitors ?? []).find((p: any) => String(p.id ?? p.athlete?.id) !== pid);
            return {
              round: x.round?.displayName ?? "",
              date: x.date,
              state: x.status?.type?.state,
              opp: op?.athlete?.displayName ?? "?",
              won: Boolean(me?.winner),
              // Sin sets en un partido terminado: walkover (W.O.).
              score:
                (me?.linescores ?? []).map((l: any, i: number) => `${l.value}-${op?.linescores?.[i]?.value ?? ""}`).join(" ") ||
                (x.status?.type?.state === "post" ? "W.O." : ""),
            };
          })
          .filter((x: any) => !/^tbd$/i.test(x.opp))
          .sort((x: any, y: any) => String(x.date).localeCompare(String(y.date)));
      // Resumen del canal oficial del circuito (ATP / WTA), buscado por los apellidos de ambos.
      const state = c.status?.type?.state ?? "pre";
      const official =
        state !== "pre" ? await officialFor({ league: `tennis.${tour}`, start: c.date, home: { name: a.name }, away: { name: b.name }, surnames: true }).catch(() => []) : [];
      return NextResponse.json(
        {
          match: {
            official,
            tour,
            tournament: ev.name,
            grouping: g.grouping?.displayName,
            round: c.round?.displayName,
            start: c.date,
            state: c.status?.type?.state ?? "pre",
            // Abandono o walkover: el marcador queda incompleto y se indica.
            ending: /RETIRED/.test(c.status?.type?.name ?? "") ? "RET" : /WALKOVER|FORFEIT/.test(c.status?.type?.name ?? "") ? "WO" : undefined,
            detail: c.status?.type?.state === "in" && c.status?.period ? `Set ${c.status.period}` : undefined,
            court: c.venue?.court ?? c.venue?.fullName,
            a,
            b,
            pathA: path(a.id),
            pathB: path(b.id),
          },
        },
        { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" } },
      );
    }
  }
  return NextResponse.json({ match: null });
}
