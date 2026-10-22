import "server-only";
import { teamScoreboard } from "./espn";
import { leagueMeta } from "../catalog";
import type { PushPayload } from "./push";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LiveState {
  s: string; // pre | in | post
  h?: string;
  a?: string;
  ht?: boolean;
}

// Estado actual (real) de un partido seguido, leído de ESPN.
export async function eventState(league: string, eventId: string, start: string) {
  if (!leagueMeta(league)) return null;
  // ESPN agrupa los partidos por día de EE. UU.: se mira también el día anterior.
  const d = new Date(start);
  const evs = await teamScoreboard(league, new Date(d.getTime() - 86400000), d);
  const e = evs?.find((x) => x.id === eventId);
  if (!e) return null;
  return {
    e,
    state: { s: e.status, h: e.home?.score, a: e.away?.score, ht: e.statusDetail === "HT" } as LiveState,
  };
}

// Compara el estado anterior con el nuevo y arma los avisos (plantillas fijas, datos reales).
export function liveAlerts(prev: LiveState | null, cur: LiveState, e: any, lang: "fr" | "es", url: string): PushPayload[] {
  const fr = lang === "fr";
  const h = e.home?.short ?? e.home?.name ?? "";
  const a = e.away?.short ?? e.away?.name ?? "";
  const score = `${h} ${cur.h ?? 0}-${cur.a ?? 0} ${a}`;
  const clock = e.statusDetail && e.statusDetail !== "HT" ? ` (${e.statusDetail})` : "";
  const out: PushPayload[] = [];
  const tag = `live-${e.id}`;
  const goalWord = e.sport === "football" ? (fr ? "⚽ BUUUT !" : "⚽ ¡GOOOL!") : fr ? "🔔 Score" : "🔔 Marcador";

  const startedAgo = Date.now() - new Date(e.start).getTime();
  if ((!prev || prev.s === "pre") && cur.s === "in" && startedAgo < 20 * 60000) {
    out.push({ title: fr ? "🟢 C'est parti !" : "🟢 ¡Empezó!", body: `${h} – ${a}`, url, tag, kind: "start" });
  }
  if (prev && prev.s === "in" && cur.s === "in") {
    const ph = Number(prev.h ?? 0), pa = Number(prev.a ?? 0), ch = Number(cur.h ?? 0), ca = Number(cur.a ?? 0);
    if (ch > ph || ca > pa) {
      const who = ch > ph ? h : a;
      out.push({ title: `${goalWord} ${who}`, body: `${score}${clock}`, url, tag, kind: "goal" });
    }
    if (!prev.ht && cur.ht) out.push({ title: fr ? "⏸️ Mi-temps" : "⏸️ Entretiempo", body: score, url, tag, kind: "halftime" });
  }
  if (prev && prev.s !== "post" && cur.s === "post") {
    out.push({ title: fr ? "🏁 Terminé" : "🏁 Final", body: score, url, tag, kind: "final" });
  }
  return out;
}
