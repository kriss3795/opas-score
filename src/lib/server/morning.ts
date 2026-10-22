import "server-only";
import { buildAgenda, queryFromPrefs } from "./agenda";
import type { SportEvent } from "../types";

// Resumen matinal: qué pasó ayer y qué hay hoy, con datos reales y plantillas fijas.
const SESSION: Record<string, { fr: string; es: string }> = {
  fp1: { fr: "EL1", es: "PL1" },
  fp2: { fr: "EL2", es: "PL2" },
  fp3: { fr: "EL3", es: "PL3" },
  sq: { fr: "Qualifs sprint", es: "Clasif. sprint" },
  sprint: { fr: "Sprint", es: "Sprint" },
  quali: { fr: "Qualifs", es: "Clasificación" },
  race: { fr: "Course", es: "Carrera" },
};

function localParts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false });
  const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

export function isMorning(tz: string, now = new Date()) {
  try {
    return localParts(now, tz).hour === 8;
  } catch {
    return false;
  }
}

export function localDate(tz: string, now = new Date()) {
  try {
    return localParts(now, tz).date;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function label(e: SportEvent, lang: "fr" | "es", withScore: boolean) {
  if (e.sport === "f1") return `🏎️ ${SESSION[e.title ?? "race"]?.[lang] ?? ""}`.trim();
  if (e.home && e.away) {
    const h = e.home.short ?? e.home.name;
    const a = e.away.short ?? e.away.name;
    if (withScore && e.home.score !== undefined) return `${h} ${e.home.score}-${e.away.score} ${a}`;
    if (withScore && e.home.sets?.length) return `${h} ${e.home.sets.map((s, i) => `${s}-${e.away?.sets?.[i] ?? ""}`).join(" ")} ${a}`;
    return `${h} – ${a}`;
  }
  return e.title ?? e.competitionName;
}

export async function morningSummary(prefs: Record<string, unknown>, lang: "fr" | "es", tz: string) {
  const now = new Date();
  const { events } = await buildAgenda(queryFromPrefs(prefs), new Date(now.getTime() - 36 * 3600000), new Date(now.getTime() + 24 * 3600000));
  const today = localDate(tz, now);
  const yesterday = localDate(tz, new Date(now.getTime() - 86400000));
  const day = (e: SportEvent) => localDate(tz, new Date(e.start));
  const time = (e: SportEvent) => new Date(e.start).toLocaleTimeString(lang === "fr" ? "fr-FR" : "es-CL", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });

  const past = events.filter((e) => e.status === "post" && day(e) === yesterday).slice(0, 4);
  const next = events.filter((e) => e.status !== "post" && e.status !== "cancelled" && day(e) === today).slice(0, 4);
  if (!past.length && !next.length) return null;

  const parts: string[] = [];
  if (past.length) parts.push(`${lang === "fr" ? "Hier" : "Ayer"} : ${past.map((e) => label(e, lang, true)).join(" · ")}`);
  if (next.length) parts.push(`${lang === "fr" ? "Aujourd'hui" : "Hoy"} : ${next.map((e) => `${label(e, lang, false)} ${time(e)}`).join(" · ")}`);
  return {
    title: lang === "fr" ? "☀️ Ton résumé du matin" : "☀️ Tu resumen matinal",
    body: parts.join("\n").slice(0, 300),
  };
}
