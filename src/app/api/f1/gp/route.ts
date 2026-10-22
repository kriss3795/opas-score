import { NextResponse } from "next/server";
import { f1Calendar, f1DriverStandings, f1ConstructorStandings, f1LastResults, f1CircuitWinners } from "@/lib/server/jolpica";
import { f1Facts } from "@/lib/server/facts";
import { f1Live } from "@/lib/server/espn";
import { circuitWeather } from "@/lib/server/weather";
import { sessionStatus } from "@/lib/server/f1events";

export const maxDuration = 60;

export const dynamic = "force-dynamic";

const RACE_MAX = 25; // puntos al ganador de un Gran Premio
const SPRINT_MAX = 8; // puntos al ganador de un sprint

export async function GET(req: Request) {
  const favDrivers = (new URL(req.url).searchParams.get("drivers") ?? "").split(",").filter(Boolean).slice(0, 10);
  const [cal, drivers, constructors, last] = await Promise.all([
    f1Calendar(),
    f1DriverStandings(),
    f1ConstructorStandings(),
    f1LastResults(),
  ]);

  // Equipo actual de cada piloto: el de la última carrera (un piloto que cambió de equipo
  // a mitad de temporada aparece en la clasificación con más de una escudería).
  if (drivers && last?.rows?.length) {
    const teamNow = new Map<string, string>(last.rows.map((r: { driverId: string; team: string }) => [r.driverId, r.team]));
    drivers.rows.forEach((r) => {
      const t = teamNow.get(r.driverId);
      if (t) r.team = t;
    });
  }

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
      // Fechas locales del circuito (la hora UTC de Las Vegas o Singapur cae en otro día).
      // Se aproxima el huso por la longitud: suficiente para elegir el día correcto.
      const off = Math.round(current.lon / 15) * 3600000;
      const localDay = (d: Date) => new Date(d.getTime() + off).toISOString().slice(0, 10);
      weather = await circuitWeather(current.lat, current.lon, localDay(first), localDay(lastS));
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

  // Datos curiosos del circuito (ganadores históricos reales).
  let facts: ReturnType<typeof f1Facts> = [];
  if (current?.circuitId) {
    const winners = await f1CircuitWinners(current.circuitId);
    if (winners) facts = f1Facts(winners, current.circuit, current.url ?? `https://api.jolpi.ca/ergast/f1/circuits/${current.circuitId}/results/1.json`, favDrivers);
  }

  // Calculadora de campeonato con datos reales.
  let titleCalc = null;
  if (cal && drivers && drivers.rows.length) {
    // Carreras que aún no suman a la clasificación: posteriores a la última ronda contada
    // o que todavía no terminan (la clasificación puede actualizarse tras el sprint del sábado).
    const remaining = cal.filter((r) => r.round > drivers.round || new Date(r.start).getTime() + 3 * 3600000 > now);
    const races = remaining.length;
    // Un sprint ya disputado y contado no se vuelve a sumar.
    const sprints = remaining.filter((r) => {
      const sp = r.sessions.find((x) => x.key === "sprint");
      return sp && (r.round > drivers.round || new Date(sp.start).getTime() + 3600000 > now);
    }).length;
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
      facts,
      failed: { calendar: !cal, standings: !drivers, live: liveFailed },
    },
    { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" } },
  );
}
