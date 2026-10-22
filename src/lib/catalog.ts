import type { SportId } from "./types";

// Catálogo de deportes. Solo entran deportes con fuente gratuita y fiable.
// Cada competición se comprueba cada día en /api/catalog: si la fuente no responde,
// no se ofrece en la app (nunca se muestra una liga vacía o inventada).
export interface SportMeta {
  id: SportId;
  name: { fr: string; es: string };
  color: string;
  emoji: string;
  kind: "team" | "event" | "f1" | "tennis";
}

export const SPORTS: SportMeta[] = [
  { id: "football", name: { fr: "Football", es: "Fútbol" }, color: "#22C55E", emoji: "⚽", kind: "team" },
  { id: "f1", name: { fr: "Formule 1", es: "Fórmula 1" }, color: "#E10600", emoji: "🏎️", kind: "f1" },
  { id: "rugby", name: { fr: "Rugby", es: "Rugby" }, color: "#A855F7", emoji: "🏉", kind: "team" },
  { id: "tennis", name: { fr: "Tennis", es: "Tenis" }, color: "#C6E33B", emoji: "🎾", kind: "tennis" },
  { id: "basketball", name: { fr: "Basket", es: "Básquetbol" }, color: "#F59E0B", emoji: "🏀", kind: "team" },
  { id: "hockey", name: { fr: "Hockey sur glace", es: "Hockey sobre hielo" }, color: "#38BDF8", emoji: "🏒", kind: "team" },
  { id: "nfl", name: { fr: "Football américain", es: "Fútbol americano" }, color: "#8B5A2B", emoji: "🏈", kind: "team" },
  { id: "baseball", name: { fr: "Baseball", es: "Béisbol" }, color: "#EF4444", emoji: "⚾", kind: "team" },
  { id: "afl", name: { fr: "Football australien", es: "Fútbol australiano" }, color: "#EAB308", emoji: "🦘", kind: "team" },
  { id: "golf", name: { fr: "Golf", es: "Golf" }, color: "#10B981", emoji: "⛳", kind: "event" },
  { id: "mma", name: { fr: "MMA (UFC)", es: "MMA (UFC)" }, color: "#DC2626", emoji: "🥊", kind: "event" },
  { id: "motorsport", name: { fr: "Sports mécaniques", es: "Automovilismo" }, color: "#F97316", emoji: "🏁", kind: "event" },
];

export function sportMeta(id: SportId) {
  return SPORTS.find((s) => s.id === id) ?? SPORTS[0];
}

export type Group = "france" | "europe" | "intl" | "americas" | "world" | "women";

export interface LeagueMeta {
  id: string; // identificador interno (para fútbol = slug ESPN)
  sport: SportId;
  path: string; // ruta ESPN: "soccer/fra.1", "rugby/270559", "basketball/nba"
  kind?: "team" | "event";
  fd?: string; // código football-data.org (respaldo de tablas de fútbol)
  name: { fr: string; es: string };
  flag: string;
  tvFR?: string; // diffuseur en France, saison 2026-27 (vérifié oct. 2026)
  cup?: boolean; // copa o torneo sin tabla de liga
  group: Group;
}

type Rest = Omit<LeagueMeta, "id" | "sport" | "path">;
const n = (fr: string, es = fr) => ({ fr, es });
const S = (id: string, name: { fr: string; es: string }, flag: string, group: Group, extra: Partial<Rest> = {}): LeagueMeta => ({
  id,
  sport: "football",
  path: `soccer/${id}`,
  name,
  flag,
  group,
  ...extra,
});
const R = (espn: string, name: { fr: string; es: string }, flag: string, group: Group, extra: Partial<Rest> = {}): LeagueMeta => ({
  id: `rugby.${espn}`,
  sport: "rugby",
  path: `rugby/${espn}`,
  name,
  flag,
  group,
  ...extra,
});
const T = (sport: SportId, path: string, name: { fr: string; es: string }, flag: string, extra: Partial<Rest> = {}): LeagueMeta => ({
  id: path.replace("/", "."),
  sport,
  path,
  name,
  flag,
  group: "world",
  ...extra,
});
const E = (sport: SportId, path: string, name: { fr: string; es: string }, flag: string): LeagueMeta => ({
  id: path.replace("/", "."),
  sport,
  path,
  name,
  flag,
  group: "world",
  kind: "event",
  cup: true,
});

export const LEAGUES: LeagueMeta[] = [
  // ---------- Fútbol: Francia ----------
  S("fra.1", n("Ligue 1"), "🇫🇷", "france", { fd: "FL1", tvFR: "Ligue 1+" }),
  S("fra.2", n("Ligue 2"), "🇫🇷", "france", { tvFR: "beIN Sports" }),
  S("fra.coupe_de_france", n("Coupe de France", "Copa de Francia"), "🇫🇷", "france", { tvFR: "beIN Sports / France TV", cup: true }),
  S("fra.w.1", n("Première Ligue (féminine)", "Première Ligue femenina"), "🇫🇷", "women", { tvFR: "Canal+" }),
  // ---------- Fútbol: Europa ----------
  S("uefa.champions", n("Ligue des champions", "Champions League"), "🇪🇺", "europe", { fd: "CL", tvFR: "Canal+" }),
  S("uefa.europa", n("Ligue Europa", "Europa League"), "🇪🇺", "europe", { tvFR: "Canal+" }),
  S("uefa.europa.conf", n("Ligue Conférence", "Conference League"), "🇪🇺", "europe", { tvFR: "Canal+" }),
  S("uefa.super_cup", n("Supercoupe d'Europe", "Supercopa de Europa"), "🇪🇺", "europe", { cup: true }),
  S("eng.1", n("Premier League"), "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "europe", { fd: "PL", tvFR: "Canal+" }),
  S("eng.2", n("Championship"), "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "europe"),
  S("eng.3", n("League One"), "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "europe"),
  S("eng.fa", n("FA Cup"), "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "europe", { tvFR: "beIN Sports", cup: true }),
  S("eng.league_cup", n("Coupe de la Ligue anglaise", "Copa de la Liga inglesa"), "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "europe", { tvFR: "beIN Sports", cup: true }),
  S("esp.1", n("Liga", "LaLiga"), "🇪🇸", "europe", { fd: "PD", tvFR: "DAZN / Disney+" }),
  S("esp.2", n("Liga 2 (Espagne)", "LaLiga Hypermotion"), "🇪🇸", "europe"),
  S("esp.copa_del_rey", n("Coupe du Roi", "Copa del Rey"), "🇪🇸", "europe", { cup: true }),
  S("ita.1", n("Serie A"), "🇮🇹", "europe", { fd: "SA", tvFR: "DAZN" }),
  S("ita.2", n("Serie B"), "🇮🇹", "europe"),
  S("ita.coppa_italia", n("Coupe d'Italie", "Copa Italia"), "🇮🇹", "europe", { cup: true }),
  S("ger.1", n("Bundesliga"), "🇩🇪", "europe", { fd: "BL1", tvFR: "beIN Sports" }),
  S("ger.2", n("2. Bundesliga"), "🇩🇪", "europe"),
  S("ger.dfb_pokal", n("Coupe d'Allemagne", "Copa de Alemania"), "🇩🇪", "europe", { tvFR: "beIN Sports", cup: true }),
  S("por.1", n("Liga Portugal"), "🇵🇹", "europe", { fd: "PPL" }),
  S("ned.1", n("Eredivisie"), "🇳🇱", "europe", { fd: "DED" }),
  S("bel.1", n("Pro League (Belgique)", "Pro League (Bélgica)"), "🇧🇪", "europe"),
  S("sco.1", n("Premiership écossaise", "Premiership escocesa"), "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "europe"),
  S("sui.1", n("Super League suisse", "Superliga suiza"), "🇨🇭", "europe"),
  S("aut.1", n("Bundesliga autrichienne", "Bundesliga austriaca"), "🇦🇹", "europe"),
  S("tur.1", n("Süper Lig"), "🇹🇷", "europe"),
  S("gre.1", n("Super League grecque", "Superliga griega"), "🇬🇷", "europe"),
  S("den.1", n("Superliga danoise", "Superliga danesa"), "🇩🇰", "europe"),
  S("swe.1", n("Allsvenskan"), "🇸🇪", "europe"),
  S("nor.1", n("Eliteserien"), "🇳🇴", "europe"),
  S("uefa.wchampions", n("Ligue des champions féminine", "Champions femenina"), "🇪🇺", "women"),
  S("eng.w.1", n("WSL (Angleterre)", "WSL (Inglaterra)"), "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "women"),
  // ---------- Fútbol: selecciones ----------
  S("uefa.nations", n("Ligue des nations", "Liga de Naciones"), "🌍", "intl", { tvFR: "L'Équipe", cup: true }),
  S("fifa.world", n("Coupe du monde", "Copa del Mundo"), "🏆", "intl", { cup: true }),
  S("uefa.euro", n("Euro"), "🇪🇺", "intl", { cup: true }),
  S("uefa.euroq", n("Qualifications Euro", "Clasificatorias Eurocopa"), "🇪🇺", "intl", { cup: true }),
  S("fifa.worldq.uefa", n("Qualifs Mondial (Europe)", "Eliminatorias Mundial (Europa)"), "🌍", "intl", { cup: true }),
  S("fifa.worldq.conmebol", n("Qualifs Mondial (Amérique du Sud)", "Eliminatorias Sudamericanas"), "🌎", "intl", { cup: true }),
  S("conmebol.america", n("Copa América"), "🌎", "intl", { cup: true }),
  S("caf.nations", n("Coupe d'Afrique des nations", "Copa Africana de Naciones"), "🌍", "intl", { tvFR: "beIN Sports", cup: true }),
  S("fifa.friendly", n("Matchs amicaux", "Amistosos internacionales"), "🌍", "intl", { cup: true }),
  S("fifa.cwc", n("Coupe du monde des clubs", "Mundial de Clubes"), "🏆", "intl", { cup: true }),
  // ---------- Fútbol: Américas ----------
  S("conmebol.libertadores", n("Copa Libertadores"), "🌎", "americas", { cup: true }),
  S("conmebol.sudamericana", n("Copa Sudamericana"), "🌎", "americas", { cup: true }),
  S("chi.1", n("Championnat du Chili", "Primera División de Chile"), "🇨🇱", "americas"),
  S("arg.1", n("Liga argentine", "Liga Profesional Argentina"), "🇦🇷", "americas"),
  S("bra.1", n("Brasileirão"), "🇧🇷", "americas", { fd: "BSA" }),
  S("mex.1", n("Liga MX"), "🇲🇽", "americas"),
  S("usa.1", n("MLS"), "🇺🇸", "americas"),
  S("col.1", n("Liga colombienne", "Liga BetPlay (Colombia)"), "🇨🇴", "americas"),
  S("uru.1", n("Championnat d'Uruguay", "Primera División de Uruguay"), "🇺🇾", "americas"),
  S("per.1", n("Liga 1 (Pérou)", "Liga 1 (Perú)"), "🇵🇪", "americas"),
  S("ecu.1", n("LigaPro (Équateur)", "LigaPro (Ecuador)"), "🇪🇨", "americas"),
  S("par.1", n("Championnat du Paraguay", "Primera División de Paraguay"), "🇵🇾", "americas"),
  S("concacaf.champions", n("Coupe des champions CONCACAF", "Copa de Campeones CONCACAF"), "🌎", "americas", { cup: true }),
  S("usa.nwsl", n("NWSL (féminine)", "NWSL (femenina)"), "🇺🇸", "women"),
  // ---------- Fútbol: resto del mundo ----------
  S("ksa.1", n("Saudi Pro League"), "🇸🇦", "world"),
  S("jpn.1", n("J1 League"), "🇯🇵", "world"),
  S("chn.1", n("Super League chinoise", "Superliga china"), "🇨🇳", "world"),
  S("aus.1", n("A-League"), "🇦🇺", "world"),
  // ---------- Rugby (ids ESPN verificados oct. 2026) ----------
  R("270559", n("Top 14"), "🇫🇷", "france", { tvFR: "Canal+" }),
  R("271937", n("Champions Cup"), "🇪🇺", "europe", { tvFR: "beIN Sports / France TV" }),
  R("272073", n("Challenge Cup"), "🇪🇺", "europe", { tvFR: "beIN Sports / France TV" }),
  R("180659", n("Tournoi des Six Nations", "Seis Naciones"), "🌍", "intl", { tvFR: "France TV / TF1" }),
  R("289234", n("Tests internationaux", "Test matches internacionales"), "🌍", "intl", { cup: true }),
  R("267979", n("Premiership anglaise", "Premiership inglesa"), "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "europe"),
  R("270557", n("United Rugby Championship"), "🇪🇺", "europe"),
  // ---------- Otros deportes por equipos ----------
  T("basketball", "basketball/nba", n("NBA"), "🇺🇸"),
  T("basketball", "basketball/wnba", n("WNBA"), "🇺🇸"),
  T("basketball", "basketball/mens-college-basketball", n("NCAA (basket universitaire)", "NCAA (básquetbol universitario)"), "🇺🇸"),
  T("hockey", "hockey/nhl", n("NHL"), "🇺🇸"),
  T("nfl", "football/nfl", n("NFL"), "🇺🇸"),
  T("nfl", "football/college-football", n("NCAA (football universitaire)", "NCAA (fútbol americano universitario)"), "🇺🇸"),
  T("baseball", "baseball/mlb", n("MLB"), "🇺🇸"),
  T("afl", "australian-football/afl", n("AFL"), "🇦🇺"),
  // ---------- Deportes por eventos ----------
  E("golf", "golf/pga", n("PGA Tour"), "🇺🇸"),
  E("golf", "golf/eur", n("DP World Tour"), "🇪🇺"),
  E("golf", "golf/lpga", n("LPGA Tour"), "🌍"),
  E("mma", "mma/ufc", n("UFC"), "🥊"),
  E("motorsport", "racing/irl", n("IndyCar"), "🇺🇸"),
  E("motorsport", "racing/nascar-premier", n("NASCAR Cup Series"), "🇺🇸"),
];

export const F1_TV_FR = "Canal+";

export function leagueMeta(id: string) {
  return LEAGUES.find((l) => l.id === id);
}

export function leaguesOf(sport: SportId) {
  return LEAGUES.filter((l) => l.sport === sport);
}

// Copas en las que un equipo favorito puede jugar aunque la competición no esté seguida.
export const CUP_LEAGUES: Record<string, string[]> = {
  football: [
    "uefa.champions",
    "uefa.europa",
    "uefa.europa.conf",
    "fra.coupe_de_france",
    "eng.fa",
    "eng.league_cup",
    "esp.copa_del_rey",
    "ita.coppa_italia",
    "ger.dfb_pokal",
    "uefa.nations",
    "fifa.friendly",
    "conmebol.libertadores",
    "conmebol.sudamericana",
  ],
  rugby: ["rugby.271937", "rugby.272073", "rugby.180659", "rugby.289234"],
};

// Tenis: circuitos de ESPN.
export const TENNIS_TOURS = ["atp", "wta"];

// Clave única de un equipo: los ids de ESPN se repiten entre deportes.
export const teamKey = (sport: string, id: string) => `${sport}:${id}`;

// Deportes que SofaScore cubre pero que no tienen una fuente gratuita y fiable hoy.
export const NOT_AVAILABLE = {
  fr: "Handball, volley, cyclisme, MotoGP, fléchettes, snooker, e-sport : aucune source gratuite et fiable pour l'instant.",
  es: "Balonmano, vóleibol, ciclismo, MotoGP, dardos, snooker, e-sports: por ahora no hay una fuente gratuita y fiable.",
};
