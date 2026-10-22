import "server-only";
import { teamScoreboard, eventSummary } from "./espn";
import { leagueMeta } from "../catalog";
import type { PushPayload } from "./push";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LiveState {
  s: string; // pre | in | post
  h?: string;
  a?: string;
  ht?: boolean;
  ke?: string[]; // incidencias ya avisadas (ids de la fuente)
}

interface KeyEv {
  id: string;
  kind: "goal" | "owngoal" | "penalty" | "penmiss" | "yellow" | "red" | "secondhalf";
  clock: string;
  player: string;
  teamId: string;
}

// Incidencias del partido (goles, tarjetas, penales, segundo tiempo) tal como las publica ESPN.
function parseKeyEvents(d: any): KeyEv[] {
  const out: KeyEv[] = [];
  for (const k of d?.keyEvents ?? []) {
    const t = String(k.type?.text ?? k.type?.type ?? "").toLowerCase();
    let kind: KeyEv["kind"] | null = null;
    if (t.includes("own goal")) kind = "owngoal";
    else if (t.includes("penalty") && (t.includes("miss") || t.includes("saved"))) kind = "penmiss";
    else if (t.includes("penalty") && (t.includes("scored") || k.scoringPlay)) kind = "penalty";
    else if (k.scoringPlay || t.includes("goal")) kind = "goal";
    else if (t.includes("red card") || t.includes("second yellow")) kind = "red";
    else if (t.includes("yellow")) kind = "yellow";
    else if (t.includes("start 2nd half") || t.includes("second half begins") || t.includes("2nd half")) kind = "secondhalf";
    if (!kind) continue;
    out.push({
      id: String(k.id ?? `${t}-${k.clock?.displayValue}-${k.participants?.[0]?.athlete?.id ?? ""}`),
      kind,
      clock: k.clock?.displayValue ?? "",
      player: k.participants?.[0]?.athlete?.displayName ?? "",
      teamId: String(k.team?.id ?? ""),
    });
  }
  return out;
}

// Estado actual (real) de un partido seguido, leído de ESPN.
export async function eventState(league: string, eventId: string, start: string) {
  const meta = leagueMeta(league);
  if (!meta) return null;
  // ESPN agrupa los partidos por día de EE. UU.: se mira también el día anterior.
  const d = new Date(start);
  const evs = await teamScoreboard(league, new Date(d.getTime() - 86400000), d);
  const e = evs?.find((x) => x.id === eventId);
  if (!e) return null;
  // En fútbol se leen además las incidencias (tarjetas, penales…) del partido en curso.
  let keyEvents: KeyEv[] = [];
  if (meta.sport === "football" && e.status !== "pre") keyEvents = parseKeyEvents(await eventSummary(league, eventId, 20));
  return {
    e,
    keyEvents,
    state: { s: e.status, h: e.home?.score, a: e.away?.score, ht: e.statusDetail === "HT" } as LiveState,
  };
}

// Compara el estado anterior con el nuevo y arma los avisos (plantillas fijas, datos reales).
export function liveAlerts(prev: LiveState | null, cur: LiveState, e: any, keyEvents: KeyEv[], lang: "fr" | "es", url: string): PushPayload[] {
  const fr = lang === "fr";
  const h = e.home?.short ?? e.home?.name ?? "";
  const a = e.away?.short ?? e.away?.name ?? "";
  const score = `${h} ${cur.h ?? 0}-${cur.a ?? 0} ${a}`;
  const clock = e.statusDetail && e.statusDetail !== "HT" ? ` (${e.statusDetail})` : "";
  const out: PushPayload[] = [];
  const tag = `live-${e.id}`;
  const teamName = (id: string) => (id === e.home?.id ? h : id === e.away?.id ? a : "");
  const goalWord = e.sport === "football" ? (fr ? "⚽ BUUUT !" : "⚽ ¡GOOOL!") : fr ? "🔔 Score" : "🔔 Marcador";

  const startedAgo = Date.now() - new Date(e.start).getTime();
  if ((!prev || prev.s === "pre") && cur.s === "in" && startedAgo < 20 * 60000) {
    out.push({ title: fr ? "🟢 Coup d'envoi !" : "🟢 ¡Pitazo inicial!", body: `${h} – ${a}`, url, tag, kind: "start" });
  }

  // Incidencias nuevas desde el último aviso (la primera vez solo se registran, no se avisan en bloque).
  const known = new Set(prev?.ke ?? []);
  const fresh = prev ? keyEvents.filter((k) => !known.has(k.id)) : [];
  cur.ke = Array.from(new Set([...(prev?.ke ?? []), ...keyEvents.map((k) => k.id)])).slice(-80);
  const goalsFromEvents = fresh.some((k) => k.kind === "goal" || k.kind === "penalty" || k.kind === "owngoal");

  for (const k of fresh) {
    const who = k.player ? `${k.player} (${teamName(k.teamId)})` : teamName(k.teamId);
    const at = k.clock ? ` ${k.clock}` : "";
    if (k.kind === "goal" || k.kind === "owngoal")
      out.push({
        title: `${goalWord} ${teamName(k.teamId)}`,
        body: `${k.player ? `${k.player}${k.kind === "owngoal" ? (fr ? " (csc)" : " (en contra)") : ""}${at} · ` : ""}${score}`,
        url,
        tag,
        kind: "goal",
      });
    else if (k.kind === "penalty")
      out.push({ title: fr ? `⚽ But sur penalty ! ${teamName(k.teamId)}` : `⚽ ¡Gol de penal! ${teamName(k.teamId)}`, body: `${k.player}${at} · ${score}`, url, tag, kind: "goal" });
    else if (k.kind === "penmiss")
      out.push({ title: fr ? "❌ Penalty manqué" : "❌ Penal fallado", body: `${who}${at}`, url, tag, kind: "penalty" });
    else if (k.kind === "red")
      out.push({ title: fr ? "🟥 Carton rouge !" : "🟥 ¡Tarjeta roja!", body: `${who}${at}`, url, tag, kind: "red" });
    else if (k.kind === "yellow")
      out.push({ title: fr ? "🟨 Carton jaune" : "🟨 Tarjeta amarilla", body: `${who}${at}`, url, tag, kind: "yellow" });
    else if (k.kind === "secondhalf")
      out.push({ title: fr ? "▶️ Reprise de la 2e mi-temps" : "▶️ Empieza el segundo tiempo", body: score, url, tag, kind: "secondhalf" });
  }

  if (prev && prev.s === "in" && cur.s === "in") {
    const ph = Number(prev.h ?? 0), pa = Number(prev.a ?? 0), ch = Number(cur.h ?? 0), ca = Number(cur.a ?? 0);
    // Respaldo: si la fuente no publicó la incidencia, el cambio de marcador basta.
    if (!goalsFromEvents && (ch > ph || ca > pa)) {
      const who = ch > ph ? h : a;
      out.push({ title: `${goalWord} ${who}`, body: `${score}${clock}`, url, tag, kind: "goal" });
    }
    if (!prev.ht && cur.ht) out.push({ title: fr ? "⏸️ Mi-temps" : "⏸️ Entretiempo", body: score, url, tag, kind: "halftime" });
    if (prev.ht && !cur.ht && !fresh.some((k) => k.kind === "secondhalf"))
      out.push({ title: fr ? "▶️ Reprise de la 2e mi-temps" : "▶️ Empieza el segundo tiempo", body: score, url, tag, kind: "secondhalf" });
  }
  if (prev && prev.s !== "post" && cur.s === "post") {
    out.push({ title: fr ? "🏁 Coup de sifflet final" : "🏁 Pitazo final", body: score, url, tag, kind: "final" });
  }
  return out;
}

// F1: aviso al apagarse los semáforos y con el ganador (resultado oficial de Jolpica).
export function f1Alerts(prevState: any, sessionKey: string, start: string, raceName: string, winner: string | null, lang: "fr" | "es", url: string) {
  const fr = lang === "fr";
  const out: PushPayload[] = [];
  const state = { ...(prevState ?? {}) };
  const now = Date.now();
  const t0 = new Date(start).getTime();
  const label: Record<string, { fr: string; es: string }> = {
    race: { fr: "Course", es: "Carrera" },
    sprint: { fr: "Sprint", es: "Sprint" },
    quali: { fr: "Qualifications", es: "Clasificación" },
    sq: { fr: "Qualifs sprint", es: "Clasificación sprint" },
    fp1: { fr: "Essais libres 1", es: "Práctica libre 1" },
    fp2: { fr: "Essais libres 2", es: "Práctica libre 2" },
    fp3: { fr: "Essais libres 3", es: "Práctica libre 3" },
  };
  const name = label[sessionKey]?.[lang] ?? "";
  if (!state.go && now >= t0 && now - t0 < 15 * 60000) {
    state.go = true;
    out.push({
      title: sessionKey === "race" || sessionKey === "sprint" ? (fr ? "🚦 Extinction des feux !" : "🚦 ¡Se apagan los semáforos!") : `🏎️ ${name}`,
      body: `${raceName} · ${name}`,
      url,
      tag: `f1-${raceName}-${sessionKey}`,
      kind: "lights",
    });
  }
  if (!state.done && winner && (sessionKey === "race" || sessionKey === "sprint")) {
    state.done = true;
    out.push({
      title: fr ? `🏆 ${winner} remporte la ${sessionKey === "race" ? "course" : "sprint"} !` : `🏆 ¡${winner} gana la ${sessionKey === "race" ? "carrera" : "sprint"}!`,
      body: raceName,
      url,
      tag: `f1-${raceName}-${sessionKey}-end`,
      kind: "checkered",
    });
  }
  if (now - t0 > 4 * 3600000) state.done = true;
  return { alerts: out, state };
}
