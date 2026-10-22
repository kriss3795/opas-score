import "server-only";
import { getJson } from "./http";
import type { Standings } from "../types";
import { leagueMeta } from "../catalog";

// football-data.org: respaldo para las tablas si ESPN falla. Plan gratuito: 10 consultas/min.
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fdStandings(league: string): Promise<Standings | null> {
  const meta = leagueMeta(league);
  const key = process.env.FOOTBALL_DATA_KEY;
  if (!meta?.fd || !key) return null;
  const d = await getJson<any>(
    `https://api.football-data.org/v4/competitions/${meta.fd}/standings`,
    1800,
    { "X-Auth-Token": key },
  );
  const table: any[] = d?.standings?.find((s: any) => s.type === "TOTAL")?.table ?? d?.standings?.[0]?.table;
  if (!table?.length) return null;
  return {
    competitionId: league,
    competitionName: meta.name.fr,
    rows: table.map((r) => ({
      rank: r.position,
      name: r.team?.shortName ?? r.team?.name,
      logo: r.team?.crest,
      played: r.playedGames,
      won: r.won,
      drawn: r.draw,
      lost: r.lost,
      diff: r.goalDifference,
      points: r.points,
    })),
    source: "football-data.org",
    sourceUrl: "https://www.football-data.org",
  };
}
