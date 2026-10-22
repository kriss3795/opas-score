import "server-only";
import type { CircuitWin } from "./jolpica";

// "Le saviez-vous ?": datos curiosos generados con código y plantillas a partir de datos reales.
// Nunca se redactan libremente: si falta el dato, el hecho simplemente no aparece.
export interface Fact {
  fr: string;
  es: string;
  source: string;
  url: string;
}

const fmtDate = (iso: string, lang: "fr" | "es") =>
  new Date(iso).toLocaleDateString(lang === "fr" ? "fr-FR" : "es-CL", { day: "numeric", month: "long", year: "numeric" });

export interface H2H {
  date: string;
  home: string;
  away: string;
  score: string;
}

export function footballFacts(opts: {
  home: string;
  away: string;
  h2h: H2H[];
  form: Record<string, string[]>; // nombre de equipo → resultados recientes (W/D/L), del más reciente al más antiguo
  url: string;
}): Fact[] {
  const facts: Fact[] = [];
  const { home, away, h2h, form, url } = opts;

  if (h2h.length) {
    const last = h2h[0];
    facts.push({
      fr: `Dernier face-à-face, le ${fmtDate(last.date, "fr")} : ${last.home} ${last.score} ${last.away}.`,
      es: `Último enfrentamiento, el ${fmtDate(last.date, "es")}: ${last.home} ${last.score} ${last.away}.`,
      source: "ESPN",
      url,
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
      facts.push({
        fr: `Sur les ${n} derniers face-à-face : ${wH} victoire${wH > 1 ? "s" : ""} pour ${home}, ${d} nul${d > 1 ? "s" : ""}, ${wA} victoire${wA > 1 ? "s" : ""} pour ${away}.`,
        es: `En los últimos ${n} enfrentamientos: ${wH} victoria${wH !== 1 ? "s" : ""} de ${home}, ${d} empate${d !== 1 ? "s" : ""} y ${wA} victoria${wA !== 1 ? "s" : ""} de ${away}.`,
        source: "ESPN",
        url,
      });
    }
    if (big && big.diff >= 3) {
      facts.push({
        fr: `Plus large écart récent entre eux : ${big.g.home} ${big.g.score} ${big.g.away} (${fmtDate(big.g.date, "fr")}).`,
        es: `Mayor diferencia reciente entre ellos: ${big.g.home} ${big.g.score} ${big.g.away} (${fmtDate(big.g.date, "es")}).`,
        source: "ESPN",
        url,
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
    if (wins >= 3) {
      facts.push({
        fr: `${team} reste sur ${wins} victoires consécutives.`,
        es: `${team} viene de ${wins} victorias seguidas.`,
        source: "ESPN",
        url,
      });
    } else if (unbeaten >= 4) {
      facts.push({
        fr: `${team} est invaincu lors de ses ${unbeaten} derniers matchs.`,
        es: `${team} lleva ${unbeaten} partidos sin perder.`,
        source: "ESPN",
        url,
      });
    } else if (res.slice(0, 3).every((r) => r === "L")) {
      facts.push({
        fr: `${team} a perdu ses 3 derniers matchs.`,
        es: `${team} perdió sus últimos 3 partidos.`,
        source: "ESPN",
        url,
      });
    }
  }
  return facts.slice(0, 3);
}

export function f1Facts(winners: CircuitWin[], circuit: string, url: string): Fact[] {
  const facts: Fact[] = [];
  if (!winners.length) return facts;
  const first = winners[0];
  const last = winners[winners.length - 1];
  facts.push({
    fr: `Dernier vainqueur sur ce circuit : ${last.name}${last.team ? ` (${last.team})` : ""} en ${last.season}.`,
    es: `Último ganador en este circuito: ${last.name}${last.team ? ` (${last.team})` : ""} en ${last.season}.`,
    source: "Jolpica-F1",
    url,
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
    });
  }
  const french = winners.filter((w) => w.nationality === "French");
  if (french.length) {
    const f = french[french.length - 1];
    facts.push({
      fr: `Dernier Français vainqueur ici : ${f.name} en ${f.season}.`,
      es: `Último francés en ganar aquí: ${f.name} en ${f.season}.`,
      source: "Jolpica-F1",
      url,
    });
  } else {
    facts.push({
      fr: `Aucun pilote français n'a encore gagné sur ${circuit} (${winners.length} Grands Prix depuis ${first.season}).`,
      es: `Ningún piloto francés ha ganado todavía en ${circuit} (${winners.length} Grandes Premios desde ${first.season}).`,
      source: "Jolpica-F1",
      url,
    });
  }
  return facts.slice(0, 3);
}
