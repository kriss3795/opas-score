import "server-only";
import type { CircuitWin } from "./jolpica";

// "Le saviez-vous ?": datos curiosos generados con código y plantillas a partir de datos reales.
// Nunca se redactan libremente: si falta el dato, el hecho no aparece.
// Selección inteligente: cada dato tiene un puntaje de interés y se eligen los 3 mejores, sin repetir tipo.
export interface Fact {
  fr: string;
  es: string;
  source: string;
  url: string;
  type?: string;
  score?: number;
}

export const fmtDate = (iso: string, lang: "fr" | "es") =>
  new Date(iso).toLocaleDateString(lang === "fr" ? "fr-FR" : "es-CL", { day: "numeric", month: "long", year: "numeric" });

export function pick(facts: Fact[], n = 3): Fact[] {
  const seen = new Set<string>();
  return facts
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .filter((f) => {
      const t = f.type ?? f.fr;
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    })
    .slice(0, n)
    .map((f) => ({ fr: f.fr, es: f.es, source: f.source, url: f.url }));
}

export interface H2H {
  date: string;
  home: string;
  away: string;
  score: string;
}

export interface LeaderInfo {
  team: string;
  category: string; // goals | assists | points…
  name: string;
  value: string;
}

export function footballFacts(opts: {
  home: string;
  away: string;
  h2h: H2H[];
  form: Record<string, string[]>;
  leaders: LeaderInfo[];
  followed: string[]; // jugadores seguidos por el usuario
  scorersToday: string[]; // goleadores de este partido (si ya empezó)
  url: string;
}): Fact[] {
  const facts: Fact[] = [];
  const { home, away, h2h, form, leaders, followed, scorersToday, url } = opts;
  const isFollowed = (name: string) => followed.some((f) => f && name.toLowerCase().includes(f.toLowerCase().split(" ").pop() ?? ""));

  // Jugadores: goleadores del partido y máximos goleadores/asistentes de cada equipo esta temporada.
  for (const name of scorersToday) {
    if (isFollowed(name))
      facts.push({ fr: `${name} a déjà marqué dans ce match !`, es: `¡${name} ya marcó en este partido!`, source: "ESPN", url, type: "scorer-today", score: 100 });
  }
  for (const l of leaders) {
    const cat = l.category.toLowerCase();
    const goals = cat.includes("goal");
    const assists = cat.includes("assist");
    if (!goals && !assists) continue;
    const v = Number(l.value);
    if (!Number.isFinite(v) || v < 1) continue;
    const fol = isFollowed(l.name);
    facts.push({
      fr: goals
        ? `${l.name} est le meilleur buteur de ${l.team} cette saison (${v} but${v > 1 ? "s" : ""}).`
        : `${l.name} est le meilleur passeur de ${l.team} cette saison (${v} passe${v > 1 ? "s" : ""} décisive${v > 1 ? "s" : ""}).`,
      es: goals
        ? `${l.name} es el goleador de ${l.team} esta temporada (${v} gol${v !== 1 ? "es" : ""}).`
        : `${l.name} es el máximo asistidor de ${l.team} esta temporada (${v} asistencia${v !== 1 ? "s" : ""}).`,
      source: "ESPN",
      url,
      type: `leader-${l.team}`,
      score: (fol ? 90 : 40) + Math.min(v, 20),
    });
  }

  if (h2h.length) {
    const last = h2h[0];
    const ageDays = (Date.now() - new Date(last.date).getTime()) / 86400000;
    facts.push({
      fr: `Dernier face-à-face, le ${fmtDate(last.date, "fr")} : ${last.home} ${last.score} ${last.away}.`,
      es: `Último enfrentamiento, el ${fmtDate(last.date, "es")}: ${last.home} ${last.score} ${last.away}.`,
      source: "ESPN",
      url,
      type: "last-h2h",
      score: ageDays < 365 ? 70 : 45,
    });
  }

  if (h2h.length >= 3) {
    let wH = 0,
      wA = 0,
      d = 0;
    let big: { g: H2H; diff: number } | null = null;
    for (const g of h2h) {
      const [a, b] = g.score.split("-").map(Number);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const winner = a > b ? g.home : b > a ? g.away : null;
      if (winner === home) wH++;
      else if (winner === away) wA++;
      else d++;
      const diff = Math.abs(a - b);
      if (!big || diff > big.diff) big = { g, diff };
    }
    const n = wH + wA + d;
    if (n >= 3) {
      const dominant = Math.max(wH, wA) / n;
      facts.push({
        fr: `Sur les ${n} derniers face-à-face : ${wH} victoire${wH > 1 ? "s" : ""} pour ${home}, ${d} nul${d > 1 ? "s" : ""}, ${wA} victoire${wA > 1 ? "s" : ""} pour ${away}.`,
        es: `En los últimos ${n} enfrentamientos: ${wH} victoria${wH !== 1 ? "s" : ""} de ${home}, ${d} empate${d !== 1 ? "s" : ""} y ${wA} victoria${wA !== 1 ? "s" : ""} de ${away}.`,
        source: "ESPN",
        url,
        type: "h2h-record",
        score: 50 + dominant * 30,
      });
    }
    if (big && big.diff >= 3) {
      facts.push({
        fr: `Plus large écart récent entre eux : ${big.g.home} ${big.g.score} ${big.g.away} (${fmtDate(big.g.date, "fr")}).`,
        es: `Mayor diferencia reciente entre ellos: ${big.g.home} ${big.g.score} ${big.g.away} (${fmtDate(big.g.date, "es")}).`,
        source: "ESPN",
        url,
        type: "big-win",
        score: 40 + big.diff * 5,
      });
    }
  }

  for (const team of [home, away]) {
    const res = form[team];
    if (!res?.length) continue;
    let wins = 0;
    for (const r of res) if (r === "W") wins++;
    else break;
    let unbeaten = 0;
    for (const r of res) if (r !== "L") unbeaten++;
    else break;
    let losses = 0;
    for (const r of res) if (r === "L") losses++;
    else break;
    if (wins >= 3)
      facts.push({ fr: `${team} reste sur ${wins} victoires consécutives.`, es: `${team} viene de ${wins} victorias seguidas.`, source: "ESPN", url, type: `form-${team}`, score: 55 + wins * 6 });
    else if (unbeaten >= 4)
      facts.push({ fr: `${team} est invaincu lors de ses ${unbeaten} derniers matchs.`, es: `${team} lleva ${unbeaten} partidos sin perder.`, source: "ESPN", url, type: `form-${team}`, score: 45 + unbeaten * 4 });
    else if (losses >= 3)
      facts.push({ fr: `${team} a perdu ses ${losses} derniers matchs.`, es: `${team} perdió sus últimos ${losses} partidos.`, source: "ESPN", url, type: `form-${team}`, score: 50 + losses * 5 });
  }
  return pick(facts);
}

export function f1Facts(winners: CircuitWin[], circuit: string, url: string, favDrivers: string[] = []): Fact[] {
  const facts: Fact[] = [];
  if (!winners.length) return facts;
  const first = winners[0];
  const last = winners[winners.length - 1];
  facts.push({
    fr: `Dernier vainqueur sur ce circuit : ${last.name}${last.team ? ` (${last.team})` : ""} en ${last.season}.`,
    es: `Último ganador en este circuito: ${last.name}${last.team ? ` (${last.team})` : ""} en ${last.season}.`,
    source: "Jolpica-F1",
    url,
    type: "last-winner",
    score: 60,
  });
  const count = new Map<string, number>();
  winners.forEach((w) => count.set(w.name, (count.get(w.name) ?? 0) + 1));
  const top = Array.from(count.entries()).sort((a, b) => b[1] - a[1]);
  if (top.length && top[0][1] >= 2) {
    const tied = top.filter((x) => x[1] === top[0][1]).map((x) => x[0]);
    facts.push({
      fr: `Record de victoires ici : ${tied.join(", ")} avec ${top[0][1]} succès.`,
      es: `Récord de victorias aquí: ${tied.join(", ")} con ${top[0][1]} triunfos.`,
      source: "Jolpica-F1",
      url,
      type: "record",
      score: 55,
    });
  }
  // Pilotos favoritos: cuántas veces ganaron aquí.
  for (const fav of favDrivers) {
    const n = count.get(fav) ?? 0;
    if (n > 0) {
      const lastWin = winners.filter((w) => w.name === fav).pop()!;
      facts.push({
        fr: `${fav} a déjà gagné ${n} fois ici (dernière victoire en ${lastWin.season}).`,
        es: `${fav} ya ganó ${n} ${n > 1 ? "veces" : "vez"} aquí (última en ${lastWin.season}).`,
        source: "Jolpica-F1",
        url,
        type: `fav-${fav}`,
        score: 95,
      });
    }
  }
  const team = new Map<string, number>();
  winners.forEach((w) => w.team && team.set(w.team, (team.get(w.team) ?? 0) + 1));
  const topTeam = Array.from(team.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topTeam && topTeam[1] >= 3)
    facts.push({
      fr: `${topTeam[0]} est l'écurie la plus titrée ici avec ${topTeam[1]} victoires.`,
      es: `${topTeam[0]} es el equipo con más victorias aquí: ${topTeam[1]}.`,
      source: "Jolpica-F1",
      url,
      type: "team-record",
      score: 45,
    });
  const french = winners.filter((w) => w.nationality === "French");
  if (french.length) {
    const f = french[french.length - 1];
    facts.push({
      fr: `Dernier Français vainqueur ici : ${f.name} en ${f.season}.`,
      es: `Último francés en ganar aquí: ${f.name} en ${f.season}.`,
      source: "Jolpica-F1",
      url,
      type: "french",
      score: 65,
    });
  } else {
    facts.push({
      fr: `Aucun pilote français n'a encore gagné sur ${circuit} (${winners.length} Grands Prix depuis ${first.season}).`,
      es: `Ningún piloto francés ha ganado todavía en ${circuit} (${winners.length} Grandes Premios desde ${first.season}).`,
      source: "Jolpica-F1",
      url,
      type: "french",
      score: 62,
    });
  }
  return pick(facts);
}
