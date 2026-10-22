import "server-only";
import { fmtDate, pick, type Fact } from "./facts";
import { clubHistory, sameClub } from "./wikidata";
import type { matchDetail } from "./match";
import { leagueMeta } from "../catalog";
import { leaderLabel } from "../statLabels";

type Detail = NonNullable<Awaited<ReturnType<typeof matchDetail>>>;

// Datos curiosos "rebuscados": se calculan con datos reales y se elige lo menos obvio.
// Las rachas simples (p. ej. "5 partidos sin perder") quedan al final del ranking.
export async function matchFacts(m: Detail, followed: string[]): Promise<Fact[]> {
  const facts: Fact[] = [];
  const home = m.home!, away = m.away!;
  if (!home || !away) return [];
  const url = m.sourceUrl;
  const lg = leagueMeta(m.league);
  const lgFr = lg?.name.fr ?? "", lgEs = lg?.name.es ?? "";
  const football = m.sport === "football";
  const teams = [home, away];
  const other = (id: string) => (id === home.id ? away : home);

  // 1) Jugadores que vistieron la camiseta del rival (Wikidata).
  if (football) {
    const candidates: { name: string; teamId: string }[] = [];
    for (const l of m.lineups) for (const p of l.starters) candidates.push({ name: p.name, teamId: l.teamId });
    if (!candidates.length) for (const l of m.leaders) candidates.push({ name: l.name, teamId: l.teamId });
    const uniq = Array.from(new Map(candidates.map((c) => [c.name, c])).values());
    // Prioridad: jugadores seguidos y líderes; máximo 10 consultas.
    uniq.sort((a, b) => Number(followed.includes(b.name)) - Number(followed.includes(a.name)));
    const checks = await Promise.all(
      uniq.slice(0, 10).map(async (c) => {
        const own = teams.find((x) => x.id === c.teamId);
        // Homónimos (p. ej. dos "Vitinha"): se exige que Wikidata confirme su club actual.
        const h = own
          ? await clubHistory(c.name, (clubs) => clubs.some((s) => !s.to && sameClub(s, own.name, m.league))).catch(() => null)
          : null;
        return { c, h };
      }),
    );
    for (const { c, h } of checks) {
      if (!h) continue;
      const rival = other(c.teamId);
      // Solo etapas terminadas (con año de salida): evita errores si Wikidata no registró un traspaso reciente.
      const spell = h.clubs.find((s) => s.to && sameClub(s, rival.name, m.league));
      if (!spell) continue;
      const yFr = spell.from ? ` (${spell.to ? `${spell.from}-${spell.to}` : `depuis ${spell.from}`})` : "";
      const yEs = spell.from ? ` (${spell.to ? `${spell.from}-${spell.to}` : `desde ${spell.from}`})` : "";
      facts.push({
        fr: `${c.name} affronte un ancien club : il a joué pour ${rival.name}${yFr}.`,
        es: `${c.name} enfrenta a un ex club: jugó en ${rival.name}${yEs}.`,
        source: "Wikidata",
        url: `https://www.wikidata.org/wiki/${h.qid}`,
        type: `former-${c.name}`,
        score: followed.includes(c.name) ? 99 : 92,
      });
    }
  }
  // 2) Goleador ya en el partido (jugador seguido).
  for (const ev of m.timeline) {
    if ((ev.kind === "goal" || ev.kind === "penalty") && ev.player && followed.some((f) => ev.player!.includes(f.split(" ").pop() ?? "~"))) {
      facts.push({ fr: `${ev.player} a déjà marqué dans ce match (${ev.clock}) !`, es: `¡${ev.player} ya marcó en este partido (${ev.clock})!`, source: "ESPN", url, type: `scored-${ev.player}`, score: 100 });
    }
  }

  // 3) Peso del goleador en su equipo (goles del jugador / goles del equipo en la liga).
  const row = (id: string) => m.table?.find((r) => r.teamId === id);
  if (football && m.table) {
    for (const l of m.leaders.filter((x) => /goal/i.test(x.category))) {
      const g = Number(String(l.value).split(" ")[0]);
      const tg = row(l.teamId)?.gf;
      // El dato del jugador puede incluir otras competiciones: si supera los goles del equipo, no se usa.
      if (!g || !tg || g < 3 || g > tg) continue;
      const pct = Math.round((g / tg) * 100);
      if (pct < 30) continue;
      const t = teams.find((x) => x.id === l.teamId)!;
      facts.push({
        fr: `${l.name} a marqué ${g} des ${tg} buts de ${t.name} en ${lgFr} : ${pct} % du total.`,
        es: `${l.name} marcó ${g} de los ${tg} goles de ${t.name} en ${lgEs}: el ${pct} % del total.`,
        source: "ESPN",
        url,
        type: `share-${l.teamId}`,
        score: 80 + Math.min(15, pct - 30),
      });
    }
  }

  // 4) Récords de la liga: mejor ataque / mejor defensa / peor ataque.
  if (m.table && m.table.length >= 8) {
    const rows = m.table.filter((r) => r.gf !== undefined && r.ga !== undefined);
    if (rows.length >= 8) {
      const maxGf = Math.max(...rows.map((r) => r.gf!));
      const minGa = Math.min(...rows.map((r) => r.ga!));
      const minGf = Math.min(...rows.map((r) => r.gf!));
      const unit = football || m.sport === "hockey" ? ["buts", "goles"] : ["points", "puntos"];
      // Solo si el récord es de un único equipo (con empate, "el mejor" sería falso).
      const only = (k: "gf" | "ga", v: number) => rows.filter((x) => x[k] === v).length === 1;
      for (const t of teams) {
        const r = row(t.id);
        if (!r || r.gf === undefined || r.ga === undefined) continue;
        if (r.gf === maxGf && only("gf", maxGf))
          facts.push({ fr: `${t.name} possède la meilleure attaque de ${lgFr} : ${r.gf} ${unit[0]} en ${r.played} matchs.`, es: `${t.name} tiene el mejor ataque de ${lgEs}: ${r.gf} ${unit[1]} en ${r.played} partidos.`, source: "ESPN", url, type: `att-${t.id}`, score: 78 });
        if (r.ga === minGa && only("ga", minGa))
          facts.push({ fr: `${t.name} possède la meilleure défense de ${lgFr} : seulement ${r.ga} ${unit[0]} encaissés.`, es: `${t.name} tiene la mejor defensa de ${lgEs}: solo ${r.ga} ${unit[1]} recibidos.`, source: "ESPN", url, type: `def-${t.id}`, score: 78 });
        if (football && r.gf === minGf && only("gf", minGf))
          facts.push({ fr: `${t.name} a la pire attaque de ${lgFr} (${r.gf} buts).`, es: `${t.name} tiene el peor ataque de ${lgEs} (${r.gf} goles).`, source: "ESPN", url, type: `att-${t.id}`, score: 70 });
      }
      // 5) Qué cambia con una victoria (tabla provisional).
      if (football && m.state === "pre") {
        for (const t of teams) {
          const r = row(t.id);
          if (!r) continue;
          // Peor caso: los empatados en puntos cuentan por delante (no se conoce el desempate).
          const newPos = rows.filter((x) => x.teamId !== t.id && x.points >= r.points + 3).length + 1;
          const o = (n: number) => (n === 1 ? "1re" : `${n}e`);
          if (r.rank - newPos >= 2)
            facts.push({
              fr: `En cas de victoire, ${t.name} grimperait provisoirement de la ${o(r.rank)} place à au moins la ${o(newPos)}.`,
              es: `Si gana, ${t.name} subiría provisoriamente del ${r.rank}.º lugar al ${newPos}.º o mejor.`,
              source: "ESPN",
              url,
              type: `table-${t.id}`,
              score: 74,
            });
        }
      }
    }
  }

  // 6) Enfrentamientos directos: rachas largas y promedios.
  if (m.h2h.length >= 3) {
    for (const t of teams) {
      let n = 0;
      let lastWin: string | null = null;
      for (const g of m.h2h) {
        const [a, b] = g.score.split("-").map(Number);
        const won = (g.home === t.name && a > b) || (g.away === t.name && b > a);
        if (won) {
          lastWin = g.date;
          break;
        }
        n++;
      }
      if (n >= 3) {
        const o = other(t.id);
        facts.push({
          fr: lastWin
            ? `${t.name} n'a plus battu ${o.name} depuis le ${fmtDate(lastWin, "fr")} (${n} matchs sans victoire).`
            : `${t.name} n'a battu ${o.name} lors d'aucun des ${n} derniers face-à-face.`,
          es: lastWin
            ? `${t.name} no le gana a ${o.name} desde el ${fmtDate(lastWin, "es")} (${n} partidos sin ganarle).`
            : `${t.name} no le ganó a ${o.name} en ninguno de los últimos ${n} enfrentamientos.`,
          source: "ESPN",
          url,
          type: `h2h-run-${t.id}`,
          score: 82 + Math.min(10, n),
        });
      }
    }
    const goals = m.h2h.map((g) => g.score.split("-").map(Number)).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
    if (football && goals.length >= 4) {
      const avg = goals.reduce((s, [a, b]) => s + a + b, 0) / goals.length;
      const draws = goals.filter(([a, b]) => a === b).length;
      if (avg >= 3.2 || avg <= 1.4)
        facts.push({
          fr: `Duel ${avg >= 3.2 ? "prolifique" : "fermé"} : ${avg.toFixed(1).replace(".", ",")} buts par match en moyenne sur les ${goals.length} derniers face-à-face.`,
          es: `Duelo ${avg >= 3.2 ? "con muchos goles" : "cerrado"}: ${avg.toFixed(1).replace(".", ",")} goles por partido en promedio en los últimos ${goals.length} enfrentamientos.`,
          source: "ESPN",
          url,
          type: "h2h-goals",
          score: 76,
        });
      if (draws === 0 && goals.length >= 5)
        facts.push({ fr: `Aucun match nul lors des ${goals.length} derniers face-à-face.`, es: `Ningún empate en los últimos ${goals.length} enfrentamientos.`, source: "ESPN", url, type: "h2h-draws", score: 66 });
      const big = goals.map(([a, b], i) => ({ i, d: Math.abs(a - b) })).sort((x, y) => y.d - x.d)[0];
      if (big && big.d >= 4) {
        const g = m.h2h[big.i];
        facts.push({ fr: `Ces deux équipes ont déjà connu un ${g.home} ${g.score} ${g.away} (${fmtDate(g.date, "fr")}).`, es: `Estos equipos ya tuvieron un ${g.home} ${g.score} ${g.away} (${fmtDate(g.date, "es")}).`, source: "ESPN", url, type: "h2h-big", score: 72 });
      }
    }
  }

  // 7) Forma: goles y vallas invictas (más interesante que la racha simple).
  if (football) {
    const stats = teams.map((t) => {
      const f = m.form[t.id] ?? [];
      let gf = 0, ga = 0, clean = 0, blank = 0, valid = 0;
      for (const g of f) {
        // Solo con goles confirmados desde la perspectiva del equipo.
        if (g.gf === undefined || g.ga === undefined) continue;
        valid++;
        gf += g.gf;
        ga += g.ga;
        if (g.ga === 0) clean++;
        if (g.gf === 0) blank++;
      }
      return { t, gf, ga, clean, blank, valid };
    });
    for (const s of stats) {
      if (s.valid < 4) continue;
      if (s.clean >= 3)
        facts.push({ fr: `${s.t.name} n'a encaissé aucun but dans ${s.clean} de ses ${s.valid} derniers matchs.`, es: `${s.t.name} no recibió goles en ${s.clean} de sus últimos ${s.valid} partidos.`, source: "ESPN", url, type: `form-${s.t.id}`, score: 64 });
      if (s.blank >= 3)
        facts.push({ fr: `${s.t.name} n'a pas marqué dans ${s.blank} de ses ${s.valid} derniers matchs.`, es: `${s.t.name} no marcó en ${s.blank} de sus últimos ${s.valid} partidos.`, source: "ESPN", url, type: `form-${s.t.id}`, score: 68 });
    }
    const [a, b] = stats;
    if (a.valid >= 4 && b.valid >= 4 && Math.max(a.gf, b.gf) >= 2 * Math.max(1, Math.min(a.gf, b.gf)) && Math.max(a.gf, b.gf) >= 8) {
      const top = a.gf > b.gf ? a : b, low = top === a ? b : a;
      facts.push({ fr: `${top.t.name} a marqué ${top.gf} buts sur ses ${top.valid} derniers matchs, contre ${low.gf} pour ${low.t.name}.`, es: `${top.t.name} marcó ${top.gf} goles en sus últimos ${top.valid} partidos; ${low.t.name}, ${low.gf}.`, source: "ESPN", url, type: "form-goals", score: 62 });
    }
    // Rachas simples: solo si son largas, y con poca prioridad.
    for (const s of stats) {
      const f = m.form[s.t.id] ?? [];
      const wins = f.findIndex((g) => g.result !== "W");
      const w = wins === -1 ? f.length : wins;
      if (w >= 5) facts.push({ fr: `${s.t.name} a gagné ses ${w} derniers matchs.`, es: `${s.t.name} ganó sus últimos ${w} partidos.`, source: "ESPN", url, type: `form-${s.t.id}`, score: 40 });
    }
  }

  // 8) Otros deportes: líderes de cada equipo.
  if (!football) {
    for (const l of m.leaders.slice(0, 6)) {
      const t = teams.find((x) => x.id === l.teamId);
      if (!t) continue;
      facts.push({ fr: `${l.name} mène ${t.name} — ${leaderLabel(l.category, l.label, "fr")} : ${l.value}.`, es: `${l.name} lidera a ${t.name} — ${leaderLabel(l.category, l.label, "es")}: ${l.value}.`, source: "ESPN", url, type: `lead-${l.teamId}`, score: 50 });
    }
  }

  return pick(facts, 4);
}
