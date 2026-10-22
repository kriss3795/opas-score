import { NextResponse } from "next/server";
import { f1Calendar, f1DriverStandings, f1ConstructorStandings, f1LastResults } from "@/lib/server/jolpica";
import { f1Live } from "@/lib/server/espn";
import { circuitWeather } from "@/lib/server/weather";
import { sessionStatus } from "@/lib/server/f1events";

export const dynamic = "force-dynamic";

const RACE_MAX = 25; // puntos al ganador de un Gran Premio
const SPRINT_MAX = 8; // puntos al ganador de un sprint

export async function GET() {
  const [cal, drivers, constructors, last] = await Promise.all([
    f1Calendar(),
    f1DriverStandings(),
    f1ConstructorStandings(),
    f1LastResults(),
  ]);

  const now = Date.now();
  // GP actual o próximo: el primero cuya carrera no terminó hace más de 3 h.
  const current = cal?.find((r) => new Date(r.start).getTime() + 3 * 3600000 > now) ?? null;
  const seasonOver = Boolean(cal && cal.length && !current);

  // Clima: solo si el fin de semana cae dentro del horizonte de 16 días del pronóstico.
  let weather = null;
  if (current?.lat !== undefined && current.lon !== undefined && current.sessions.length) {
    const first = new Date(current.sessions[0].start);
    const lastS = new Date(current.start);
    if (first.getTime() - now < 15 * 86400000) {
      weather = await circuitWeather(
        current.lat,
        current.lon,
        first.toISOString().slice(0, 10),
        lastS.toISOString().slice(0, 10),
      );
    }
  }

  // Tiempos en vivo (ESPN) solo durante el fin de semana de carrera.
  let live = null;
  let liveFailed = false;
  if (current) {
    const firstStart = new Date(current.sessions[0]?.start ?? current.start).getTime();
    const end = new Date(current.start).getTime() + 3 * 3600000;
    if (now > firstStart - 3600000 && now < end) {
      live = await f1Live();
      liveFailed = live === null;
    }
  }

  // Calculadora de campeonato con datos reales.
  let titleCalc = null;
  if (cal && drivers && drivers.rows.length) {
    const remaining = cal.filter((r) => r.round > drivers.round);
    const races = remaining.length;
    const sprints = remaining.filter((r) => r.hasSprint).length;
    const maxLeft = races * RACE_MAX + sprints * SPRINT_MAX;
    const leaderPts = drivers.rows[0].points;
    titleCalc = {
      afterRound: drivers.round,
      races,
      sprints,
      maxLeft,
      rows: drivers.rows.slice(0, 10).map((d) => ({
        driverId: d.driverId,
        name: d.name,
        points: d.points,
        gap: leaderPts - d.points,
        possible: leaderPts - d.points <= maxLeft,
      })),
    };
  }

  return NextResponse.json(
    {
      current: current && {
        ...current,
        sessions: current.sessions.map((s) => ({ ...s, status: sessionStatus(s) })),
      },
      seasonOver,
      weather,
      live,
      drivers,
      constructors,
      last,
      titleCalc,
      failed: { calendar: !cal, standings: !drivers, live: liveFailed },
    },
    { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" } },
  );
}
