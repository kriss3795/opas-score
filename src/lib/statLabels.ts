// Traducción de las estadísticas que publica la fuente. Si una no está aquí, se muestra su nombre original.
type L = { fr: string; es: string };
const M: Record<string, L> = {
  // Fútbol
  possessionPct: { fr: "Possession (%)", es: "Posesión (%)" },
  totalShots: { fr: "Tirs", es: "Remates" },
  shotsOnTarget: { fr: "Tirs cadrés", es: "Remates al arco" },
  shotPct: { fr: "Précision des tirs", es: "Precisión de remate" },
  blockedShots: { fr: "Tirs contrés", es: "Remates bloqueados" },
  wonCorners: { fr: "Corners", es: "Córners" },
  foulsCommitted: { fr: "Fautes", es: "Faltas" },
  yellowCards: { fr: "Cartons jaunes", es: "Tarjetas amarillas" },
  redCards: { fr: "Cartons rouges", es: "Tarjetas rojas" },
  offsides: { fr: "Hors-jeu", es: "Fueras de juego" },
  saves: { fr: "Arrêts", es: "Atajadas" },
  penaltyKickGoals: { fr: "Penaltys marqués", es: "Penales convertidos" },
  penaltyKickShots: { fr: "Penaltys tentés", es: "Penales ejecutados" },
  accuratePasses: { fr: "Passes réussies", es: "Pases completados" },
  totalPasses: { fr: "Passes", es: "Pases" },
  passPct: { fr: "Précision des passes", es: "Precisión de pase" },
  accurateCrosses: { fr: "Centres réussis", es: "Centros acertados" },
  totalCrosses: { fr: "Centres", es: "Centros" },
  crossPct: { fr: "Précision des centres", es: "Precisión de centros" },
  totalLongBalls: { fr: "Longs ballons", es: "Balones largos" },
  accurateLongBalls: { fr: "Longs ballons réussis", es: "Balones largos acertados" },
  longballPct: { fr: "Précision longs ballons", es: "Precisión balones largos" },
  effectiveTackles: { fr: "Tacles réussis", es: "Entradas ganadas" },
  totalTackles: { fr: "Tacles", es: "Entradas" },
  tacklePct: { fr: "Tacles réussis (%)", es: "Entradas ganadas (%)" },
  interceptions: { fr: "Interceptions", es: "Intercepciones" },
  effectiveClearance: { fr: "Dégagements réussis", es: "Despejes efectivos" },
  totalClearance: { fr: "Dégagements", es: "Despejes" },
  goalAssists: { fr: "Passes décisives", es: "Asistencias" },
  totalGoals: { fr: "Buts", es: "Goles" },
  // Básquetbol
  "fieldGoalsMade-fieldGoalsAttempted": { fr: "Tirs (réussis-tentés)", es: "Tiros de campo" },
  fieldGoalPct: { fr: "Tirs (%)", es: "Tiros de campo (%)" },
  "threePointFieldGoalsMade-threePointFieldGoalsAttempted": { fr: "Tirs à 3 points", es: "Triples" },
  threePointFieldGoalPct: { fr: "3 points (%)", es: "Triples (%)" },
  "freeThrowsMade-freeThrowsAttempted": { fr: "Lancers francs", es: "Tiros libres" },
  freeThrowPct: { fr: "Lancers francs (%)", es: "Tiros libres (%)" },
  totalRebounds: { fr: "Rebonds", es: "Rebotes" },
  offensiveRebounds: { fr: "Rebonds offensifs", es: "Rebotes ofensivos" },
  defensiveRebounds: { fr: "Rebonds défensifs", es: "Rebotes defensivos" },
  assists: { fr: "Passes décisives", es: "Asistencias" },
  steals: { fr: "Interceptions", es: "Robos" },
  blocks: { fr: "Contres", es: "Tapones" },
  turnovers: { fr: "Balles perdues", es: "Pérdidas" },
  totalTurnovers: { fr: "Balles perdues", es: "Pérdidas" },
  teamTurnovers: { fr: "Pertes d'équipe", es: "Pérdidas de equipo" },
  fouls: { fr: "Fautes", es: "Faltas" },
  technicalFouls: { fr: "Fautes techniques", es: "Faltas técnicas" },
  totalTechnicalFouls: { fr: "Fautes techniques", es: "Faltas técnicas" },
  flagrantFouls: { fr: "Fautes flagrantes", es: "Faltas flagrantes" },
  turnoverPoints: { fr: "Points sur pertes", es: "Puntos tras pérdidas" },
  fastBreakPoints: { fr: "Points en contre-attaque", es: "Puntos de contraataque" },
  pointsInPaint: { fr: "Points dans la raquette", es: "Puntos en la pintura" },
  largestLead: { fr: "Plus grand écart", es: "Mayor ventaja" },
  leadChanges: { fr: "Changements de leader", es: "Cambios de líder" },
  leadPercentage: { fr: "Temps en tête (%)", es: "Tiempo al frente (%)" },
  // Hockey
  shotsTotal: { fr: "Tirs", es: "Tiros" },
  hits: { fr: "Mises en échec", es: "Golpes" },
  takeaways: { fr: "Récupérations", es: "Recuperaciones" },
  giveaways: { fr: "Pertes de palet", es: "Pérdidas de disco" },
  powerPlayGoals: { fr: "Buts en supériorité", es: "Goles en power play" },
  powerPlayOpportunities: { fr: "Supériorités numériques", es: "Power plays" },
  powerPlayPct: { fr: "Supériorité (%)", es: "Power play (%)" },
  shortHandedGoals: { fr: "Buts en infériorité", es: "Goles en inferioridad" },
  faceoffsWon: { fr: "Mises au jeu gagnées", es: "Faceoffs ganados" },
  faceoffPercent: { fr: "Mises au jeu (%)", es: "Faceoffs (%)" },
  penalties: { fr: "Pénalités", es: "Penalizaciones" },
  penaltyMinutes: { fr: "Minutes de pénalité", es: "Minutos de castigo" },
  // NFL
  firstDowns: { fr: "Premiers essais", es: "Primeros downs" },
  thirdDownEff: { fr: "3e tentatives", es: "Conversiones en 3.ª" },
  fourthDownEff: { fr: "4e tentatives", es: "Conversiones en 4.ª" },
  totalOffensivePlays: { fr: "Jeux offensifs", es: "Jugadas ofensivas" },
  totalYards: { fr: "Yards gagnés", es: "Yardas totales" },
  yardsPerPlay: { fr: "Yards par jeu", es: "Yardas por jugada" },
  totalDrives: { fr: "Séries offensives", es: "Series ofensivas" },
  netPassingYards: { fr: "Yards à la passe", es: "Yardas por pase" },
  completionAttempts: { fr: "Passes réussies/tentées", es: "Pases completos/intentos" },
  yardsPerPass: { fr: "Yards par passe", es: "Yardas por pase" },
  sacksYardsLost: { fr: "Sacks (yards perdus)", es: "Capturas (yardas)" },
  rushingYards: { fr: "Yards à la course", es: "Yardas por tierra" },
  rushingAttempts: { fr: "Courses", es: "Acarreos" },
  yardsPerRushAttempt: { fr: "Yards par course", es: "Yardas por acarreo" },
  redZoneAttempts: { fr: "Zone rouge", es: "Zona roja" },
  totalPenaltiesYards: { fr: "Pénalités (yards)", es: "Castigos (yardas)" },
  fumblesLost: { fr: "Fumbles perdus", es: "Balones sueltos perdidos" },
  defensiveTouchdowns: { fr: "Touchdowns défensifs", es: "Touchdowns defensivos" },
  possessionTime: { fr: "Temps de possession", es: "Tiempo de posesión" },
};

export function statLabel(name: string, fallback: string, lang: "fr" | "es") {
  const key = name.includes(".") ? name.split(".").pop()! : name;
  return M[name]?.[lang] ?? M[key]?.[lang] ?? fallback;
}

// Nombre de los periodos por deporte (para la tabla de parciales).
export function periodLabels(sport: string, n: number, lang: "fr" | "es"): string[] {
  const fr = lang === "fr";
  const base = Array.from({ length: n }, (_, i) => i + 1);
  switch (sport) {
    case "basketball":
    case "nfl":
    case "afl":
      return base.map((i) => (i <= 4 ? `Q${i}` : fr ? `Prol.${i - 4}` : `TE${i - 4}`));
    case "hockey":
      return base.map((i) => (i <= 3 ? `P${i}` : i === 4 ? (fr ? "Prol." : "TE") : fr ? "TAB" : "Pen."));
    case "baseball":
      return base.map((i) => String(i));
    default:
      return base.map((i) => (i <= 2 ? (fr ? `${i}re MT` : `${i}T`) : fr ? "Prol." : "Alarg."));
  }
}

// Tipos de anotación (NFL, hockey, béisbol…).
const SCORE_TYPES: Record<string, L> = {
  touchdown: { fr: "Touchdown", es: "Touchdown" },
  "field goal": { fr: "Field goal", es: "Gol de campo" },
  safety: { fr: "Safety", es: "Safety" },
  "extra point": { fr: "Transformation", es: "Punto extra" },
  goal: { fr: "But", es: "Gol" },
  "power play": { fr: "But en supériorité", es: "Gol en power play" },
  "home run": { fr: "Home run", es: "Jonrón" },
};
export function scoreTypeLabel(t: string | undefined, lang: "fr" | "es") {
  if (!t) return "";
  const k = Object.keys(SCORE_TYPES).find((x) => t.toLowerCase().includes(x));
  return k ? SCORE_TYPES[k][lang] : t;
}

// Categorías de líderes y cargos de árbitros.
const LEAD: Record<string, L> = {
  goals: { fr: "Buts", es: "Goles" },
  goalsLeaders: { fr: "Buts", es: "Goles" },
  assists: { fr: "Passes décisives", es: "Asistencias" },
  assistsLeaders: { fr: "Passes décisives", es: "Asistencias" },
  points: { fr: "Points", es: "Puntos" },
  pointsPerGame: { fr: "Points par match", es: "Puntos por partido" },
  rebounds: { fr: "Rebonds", es: "Rebotes" },
  reboundsPerGame: { fr: "Rebonds par match", es: "Rebotes por partido" },
  assistsPerGame: { fr: "Passes par match", es: "Asistencias por partido" },
  passingYards: { fr: "Yards à la passe", es: "Yardas por pase" },
  rushingYards: { fr: "Yards à la course", es: "Yardas por tierra" },
  receivingYards: { fr: "Yards en réception", es: "Yardas por recepción" },
  saves: { fr: "Arrêts", es: "Atajadas" },
  shots: { fr: "Tirs", es: "Tiros" },
  totalShots: { fr: "Tirs", es: "Remates" },
  accuratePasses: { fr: "Passes réussies", es: "Pases completados" },
  sacks: { fr: "Sacks", es: "Capturas (sacks)" },
  totalTackles: { fr: "Plaquages", es: "Tackleadas" },
  steals: { fr: "Interceptions", es: "Robos" },
  blocks: { fr: "Contres", es: "Tapones" },
  hits: { fr: "Coups sûrs", es: "Hits" },
  strikeouts: { fr: "Retraits sur prises", es: "Ponches" },
  wins: { fr: "Victoires", es: "Victorias" },
  battingAverage: { fr: "Moyenne au bâton", es: "Promedio de bateo" },
  homeRuns: { fr: "Home runs", es: "Jonrones" },
  RBIs: { fr: "Points produits", es: "Carreras impulsadas" },
  ERA: { fr: "Moyenne de points mérités", es: "Efectividad (ERA)" },
};
export function leaderLabel(category: string, fallback: string, lang: "fr" | "es") {
  return LEAD[category]?.[lang] ?? fallback;
}
const ROLE: [RegExp, L][] = [
  [/assistant/i, { fr: "Arbitre assistant", es: "Árbitro asistente" }],
  [/fourth|4th/i, { fr: "Quatrième arbitre", es: "Cuarto árbitro" }],
  [/var|video/i, { fr: "Arbitre vidéo (VAR)", es: "VAR" }],
  [/umpire/i, { fr: "Arbitre", es: "Árbitro" }],
  [/referee|official/i, { fr: "Arbitre", es: "Árbitro" }],
];
export function roleLabel(r: string, lang: "fr" | "es") {
  return ROLE.find(([re]) => re.test(r))?.[1][lang] ?? r;
}
