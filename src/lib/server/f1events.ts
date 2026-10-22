import "server-only";
import type { SportEvent } from "../types";
import type { F1Race, F1Session } from "./jolpica";

// Duración aproximada de cada sesión, solo para saber si está "en curso" según el horario oficial.
export const SESSION_MIN: Record<F1Session["key"], number> = {
  fp1: 60,
  fp2: 60,
  fp3: 60,
  sq: 45,
  sprint: 45,
  quali: 60,
  race: 120,
};

export function sessionStatus(s: F1Session, now = Date.now()): SportEvent["status"] {
  const start = new Date(s.start).getTime();
  const end = start + SESSION_MIN[s.key] * 60000;
  if (now < start) return "pre";
  if (now <= end) return "in";
  return "post";
}

export function f1SessionEvents(races: F1Race[], from: Date, to: Date): SportEvent[] {
  const out: SportEvent[] = [];
  for (const r of races) {
    for (const s of r.sessions) {
      const t = new Date(s.start);
      if (t < from || t > to) continue;
      out.push({
        id: `f1-${r.season}-${r.round}-${s.key}`,
        sport: "f1",
        competitionId: "f1",
        competitionName: r.name,
        start: s.start,
        status: sessionStatus(s),
        title: s.key, // el cliente traduce la clave de sesión
        venue: r.circuit,
        link: "/gp",
        source: "Jolpica-F1",
      });
    }
  }
  return out;
}
