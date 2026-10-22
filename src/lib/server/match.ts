import "server-only";
import { eventSummary, teamStandings, liveDetail } from "./espn";
import { leagueMeta } from "../catalog";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Ficha completa de un partido de cualquier deporte por equipos, normalizada desde ESPN.
// Todo se lee de forma defensiva: lo que la fuente no publica simplemente no aparece.

export interface TimelineItem {
  kind: string; // goal, owngoal, penalty, penmiss, yellow, red, sub, score, period, var
  clock: string;
  period?: number;
  teamId: string;
  player?: string;
  second?: string; // asistencia o jugador que sale
  detail?: string; // texto corto ya traducible (tipo de anotación)
  score?: string; // marcador tras la jugada
}

export interface PlayerLine {
  jersey?: string;
  name: string;
  pos?: string;
  posName?: string;
  place?: number;
  starter?: boolean;
  subIn?: string;
  subOut?: string;
  goals?: number;
  yellow?: boolean;
  red?: boolean;
}

export interface BoxGroup {
  title: string;
  labels: string[];
  rows: { name: string; starter?: boolean; stats: string[] }[];
  totals?: string[];
}

const text = (x: any) => String(x ?? "").toLowerCase();

function side(c: any) {
  if (!c) return null;
  return {
    id: String(c.team?.id ?? c.id ?? ""),
    name: c.team?.displayName ?? "?",
    short: c.team?.shortDisplayName ?? c.team?.abbreviation,
    logo: c.team?.logos?.[0]?.href ?? c.team?.logo,
    color: c.team?.color,
    score: c.score,
    pen: c.shootoutScore !== undefined && c.shootoutScore !== null ? String(c.shootoutScore) : undefined,
    winner: c.winner,
    record: c.record?.[0]?.summary ?? c.records?.[0]?.summary,
    linescores: (c.linescores ?? []).map((l: any) => String(l.displayValue ?? l.value ?? "")),
  };
}

function rugbyKind(t: string): string | null {
  if (t.includes("penalty try")) return "try";
  if (t.includes("try")) return "try";
  if (t.includes("conversion")) return t.includes("miss") ? null : "conversion";
  if (t.includes("drop")) return "dropgoal";
  if (t.includes("penalty goal") || (t.includes("penalty") && t.includes("kick"))) return "penaltykick";
  if (t.includes("red card")) return "red";
  if (t.includes("yellow")) return "yellow";
  if (t.includes("substitution") || t.includes("replacement")) return "sub";
  return null;
}

function soccerKind(t: string, k: any): string | null {
  if (t.includes("own goal")) return "owngoal";
  if (t.includes("penalty") && (t.includes("miss") || t.includes("saved"))) return "penmiss";
  if (t.includes("penalty") && (t.includes("scored") || k.scoringPlay)) return "penalty";
  if (k.scoringPlay || t.startsWith("goal")) return "goal";
  if (t.includes("red card") || t.includes("second yellow")) return "red";
  if (t.includes("yellow")) return "yellow";
  if (t.includes("substitution")) return "sub";
  if (t.includes("var")) return "var";
  if (t.includes("halftime") || t.includes("half time")) return "period";
  if (t.includes("try")) return "try";
  if (t.includes("conversion")) return "conversion";
  if (t.includes("drop goal")) return "dropgoal";
  return null;
}

export async function matchDetail(league: string, id: string) {
  const meta = leagueMeta(league);
  if (!meta) return null;
  const d = await eventSummary(league, id, 20);
  if (!d) return null;
  const sport = meta.sport;

  const comp = d.header?.competitions?.[0];
  const cs: any[] = comp?.competitors ?? [];
  const home = side(cs.find((c) => c.homeAway === "home") ?? cs[0]);
  const away = side(cs.find((c) => c.homeAway === "away") ?? cs[1]);
  const status = comp?.status ?? {};
  const type = status.type ?? {};

  // --- Cronología ---
  const timeline: TimelineItem[] = [];
  for (const k of d.keyEvents ?? []) {
    const t = text(k.type?.text ?? k.type?.type);
    const kind = sport === "rugby" ? rugbyKind(t) : soccerKind(t, k);
    if (!kind) continue;
    const parts: any[] = k.participants ?? [];
    timeline.push({
      kind: Number(k.period?.number ?? 0) >= 5 && (kind === "penalty" || kind === "penmiss" || kind === "goal") ? (kind === "penmiss" ? "soMiss" : "soGoal") : kind,
      clock: k.clock?.displayValue ?? "",
      period: k.period?.number,
      teamId: String(k.team?.id ?? ""),
      player: parts[0]?.athlete?.displayName,
      second: parts[1]?.athlete?.displayName,
    });
  }
  // Deportes con "jugadas de anotación" (NFL, hockey, béisbol…): tipo, equipo y marcador tras la jugada.
  if (!timeline.length) {
    const scoring: any[] = d.scoringPlays?.length ? d.scoringPlays : (d.plays ?? []).filter((p: any) => p.scoringPlay);
    if (sport !== "basketball")
      for (const p of scoring.slice(-40)) {
        timeline.push({
          kind: "score",
          clock: p.clock?.displayValue ?? "",
          period: p.period?.number,
          teamId: String(p.team?.id ?? ""),
          player: p.participants?.[0]?.athlete?.displayName,
          second: p.participants?.[1]?.athlete?.displayName,
          detail: p.scoringType?.displayName ?? p.type?.text,
          score: p.homeScore !== undefined ? `${p.homeScore}-${p.awayScore}` : undefined,
        });
      }
    // Hockey: también penalizaciones.
    if (sport === "hockey")
      for (const p of (d.plays ?? []).filter((x: any) => text(x.type?.text).includes("penalty")).slice(-20))
        timeline.push({
          kind: "penaltybox",
          clock: p.clock?.displayValue ?? "",
          period: p.period?.number,
          teamId: String(p.team?.id ?? ""),
          player: p.participants?.[0]?.athlete?.displayName,
        });
    timeline.sort((a, b) => (a.period ?? 0) - (b.period ?? 0));
  }

  // --- Estadísticas de equipo (todas las que publique la fuente) ---
  const teamsBox: any[] = d.boxscore?.teams ?? [];
  const flat = (tb: any) => {
    const out = new Map<string, { label: string; value: string }>();
    for (const s of tb?.statistics ?? []) {
      if (Array.isArray(s.stats)) {
        for (const x of s.stats) out.set(`${s.name}.${x.name}`, { label: x.label ?? x.displayName ?? x.name, value: String(x.displayValue ?? x.value ?? "") });
      } else out.set(s.name, { label: s.label ?? s.displayName ?? s.name, value: String(s.displayValue ?? s.value ?? "") });
    }
    return out;
  };
  const hb = flat(teamsBox.find((x) => String(x.team?.id) === home?.id) ?? teamsBox[0]);
  const ab = flat(teamsBox.find((x) => String(x.team?.id) === away?.id) ?? teamsBox[1]);
  const teamStats = Array.from(hb.entries())
    .filter(([n]) => ab.has(n))
    .map(([n, v]) => ({ name: n, label: v.label, home: v.value, away: ab.get(n)!.value }))
    .filter((s) => s.home !== "" || s.away !== "");

  // --- Alineaciones (fútbol, rugby…) ---
  const lineups = (d.rosters ?? [])
    .filter((r: any) => (r.roster ?? []).length)
    .map((r: any) => {
      const players: PlayerLine[] = (r.roster ?? []).map((p: any) => {
        const plays: any[] = p.plays ?? [];
        const stat = (n: string) => Number((p.stats ?? []).find((x: any) => x.name === n)?.value ?? 0);
        const subPlay = plays.find((x) => x.substitution);
        return {
          jersey: p.jersey,
          name: p.athlete?.displayName ?? "?",
          pos: p.position?.abbreviation,
          posName: p.position?.displayName ?? p.position?.name,
          place: p.formationPlace ? Number(p.formationPlace) : undefined,
          starter: Boolean(p.starter),
          subIn: p.subbedIn ? subPlay?.clock?.displayValue ?? "" : undefined,
          subOut: p.subbedOut ? subPlay?.clock?.displayValue ?? "" : undefined,
          goals: stat("totalGoals") || plays.filter((x) => x.didScore && !x.ownGoal).length || undefined,
          yellow: stat("yellowCards") > 0 || plays.some((x) => x.yellowCard),
          red: stat("redCards") > 0 || plays.some((x) => x.redCard),
        };
      });
      return {
        teamId: String(r.team?.id ?? ""),
        formation: r.formation,
        starters: players.filter((p) => p.starter),
        bench: players.filter((p) => !p.starter),
      };
    });

  // --- Estadísticas por jugador (básquetbol, hockey, NFL, béisbol…) ---
  const boxscore = (d.boxscore?.players ?? []).map((t: any) => ({
    teamId: String(t.team?.id ?? ""),
    groups: (t.statistics ?? [])
      .map(
        (g: any): BoxGroup => ({
          title: g.name ?? g.text ?? "",
          labels: g.labels ?? g.names ?? [],
          rows: (g.athletes ?? [])
            .filter((a: any) => !a.didNotPlay && (a.stats ?? []).length)
            .map((a: any) => ({ name: a.athlete?.shortName ?? a.athlete?.displayName ?? "?", starter: a.starter, stats: (a.stats ?? []).map(String) }))
            .slice(0, 15),
          totals: g.totals?.length ? g.totals.map(String) : undefined,
        }),
      )
      .filter((g: BoxGroup) => g.rows.length && g.labels.length),
  }));

  // --- Líderes ---
  const leaders: { teamId: string; category: string; label: string; name: string; value: string }[] = [];
  for (const blk of d.leaders ?? []) {
    const tid = String(blk.team?.id ?? "");
    for (const cat of blk.leaders ?? []) {
      const top = cat.leaders?.[0];
      if (!top?.athlete?.displayName) continue;
      leaders.push({
        teamId: tid,
        category: String(cat.name ?? ""),
        label: String(cat.displayName ?? cat.name ?? ""),
        name: top.athlete.displayName,
        value: String(top.displayValue ?? top.value ?? ""),
      });
    }
  }

  // --- Forma reciente ---
  const form: Record<string, { result: string; opp: string; score: string; date: string; home: boolean; gf?: number; ga?: number }[]> = {};
  const formSrc: any[] = [d.boxscore?.form, d.lastFiveGames, d.boxscore?.lastFiveGames].find((x: any) => Array.isArray(x) && x.length) ?? [];
  for (const b of formSrc) {
    const tid = String(b.team?.id ?? "");
    form[tid] = (b.events ?? [])
      .map((e: any) => {
        // Goles desde la perspectiva del equipo (no del local), cuando la fuente lo permite.
        const isHome = e.homeTeamId !== undefined ? String(e.homeTeamId) === tid : String(e.atVs ?? "") === "vs";
        const hs = Number(e.homeTeamScore), as = Number(e.awayTeamScore);
        const known = Number.isFinite(hs) && Number.isFinite(as);
        return {
          result: String(e.gameResult ?? "").toUpperCase(),
          opp: e.opponent?.displayName ?? e.opponent?.abbreviation ?? "",
          gf: known ? (isHome ? hs : as) : undefined,
          ga: known ? (isHome ? as : hs) : undefined,
          score: known ? `${isHome ? hs : as}-${isHome ? as : hs}` : String(e.score ?? ""),
          date: e.gameDate ?? "",
          home: isHome,
        };
      })
      .sort((x: any, y: any) => String(y.date).localeCompare(String(x.date)))
      .slice(0, 5);
  }

  // --- Enfrentamientos directos ---
  const nameById = new Map<string, string>();
  if (home) nameById.set(home.id, home.name);
  if (away) nameById.set(away.id, away.name);
  const h2hRaw: { date: string; home: string; away: string; score: string; comp?: string }[] = [];
  for (const g of d.headToHeadGames ?? []) {
    for (const e of g.events ?? []) {
      const hId = String(e.homeTeamId ?? "");
      const aId = String(e.awayTeamId ?? "");
      if (!e.gameDate || e.homeTeamScore === undefined) continue;
      h2hRaw.push({ date: e.gameDate, home: nameById.get(hId) ?? "", away: nameById.get(aId) ?? "", score: `${e.homeTeamScore}-${e.awayTeamScore}`, comp: e.leagueName });
    }
  }
  const seen = new Set<string>();
  const h2h = h2hRaw
    .filter((x) => x.home && x.away)
    .filter((x) => (seen.has(x.date) ? false : (seen.add(x.date), true)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  // --- Tabla (solo ligas) ---
  let table = null;
  if (!meta.cup && meta.kind !== "event") {
    const st = await teamStandings(league);
    if (st?.rows.length) {
      // Liga con varias zonas: solo la del local (si ambos están en ella).
      const g = st.rows.find((r) => r.teamId === String(home?.id ?? ""))?.group;
      table = g ? st.rows.filter((r) => r.group === g) : st.rows;
    }
  }

  // --- Información ---
  const gi = d.gameInfo ?? {};
  const officials = (gi.officials ?? [])
    .map((o: any) => ({ name: o.displayName ?? o.fullName ?? "", role: o.position?.displayName ?? o.position?.name ?? "" }))
    .filter((o: any) => o.name)
    .slice(0, 6);

  return {
    sport,
    league,
    id,
    start: comp?.date,
    state: type.state ?? "pre",
    statusName: type.name ?? "",
    clock: status.displayClock,
    period: status.period,
    detail: type.state === "in" ? liveDetail(status, sport) : undefined,
    home,
    away,
    timeline,
    teamStats,
    lineups,
    boxscore: boxscore.filter((b: any) => b.groups.length),
    leaders,
    form,
    h2h,
    table,
    venue: gi.venue?.fullName,
    city: gi.venue?.address?.city,
    capacity: gi.venue?.capacity,
    attendance: gi.attendance,
    officials,
    sourceUrl: `https://www.espn.com/${meta.path.split("/")[0]}/match/_/gameId/${id}`,
    raw: d,
  };
}
