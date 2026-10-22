import type { SportId } from "./types";

// Catálogo de deportes. Solo entran deportes con fuente gratuita y fiable.
// Para agregar un deporte: añadir su entrada aquí y su adaptador en lib/server.
export interface SportMeta {
  id: SportId;
  name: { fr: string; es: string };
  color: string; // acento del deporte
  sources: string[];
}

export const SPORTS: SportMeta[] = [
  {
    id: "football",
    name: { fr: "Football", es: "Fútbol" },
    color: "#22C55E",
    sources: ["ESPN", "football-data.org"],
  },
  {
    id: "f1",
    name: { fr: "Formule 1", es: "Fórmula 1" },
    color: "#E10600",
    sources: ["Jolpica-F1", "OpenF1", "ESPN", "Open-Meteo"],
  },
];

export function sportMeta(id: SportId) {
  return SPORTS.find((s) => s.id === id)!;
}

export interface LeagueMeta {
  id: string; // slug ESPN
  fd?: string; // código football-data.org (respaldo de tablas)
  name: { fr: string; es: string };
  flag: string;
  tvFR?: string; // diffuseur en France, saison 2026-27 (vérifié oct. 2026)
  cup?: boolean; // copa: sin tabla de liga
  group: "france" | "europe" | "intl" | "world";
}

export const LEAGUES: LeagueMeta[] = [
  { id: "fra.1", fd: "FL1", name: { fr: "Ligue 1", es: "Ligue 1" }, flag: "🇫🇷", tvFR: "Ligue 1+", group: "france" },
  { id: "fra.2", name: { fr: "Ligue 2", es: "Ligue 2" }, flag: "🇫🇷", tvFR: "beIN Sports", group: "france" },
  { id: "fra.coupe_de_france", name: { fr: "Coupe de France", es: "Copa de Francia" }, flag: "🇫🇷", tvFR: "beIN Sports / France TV", cup: true, group: "france" },
  { id: "uefa.champions", fd: "CL", name: { fr: "Ligue des champions", es: "Champions League" }, flag: "🇪🇺", tvFR: "Canal+", group: "europe" },
  { id: "uefa.europa", name: { fr: "Ligue Europa", es: "Europa League" }, flag: "🇪🇺", tvFR: "Canal+", group: "europe" },
  { id: "uefa.europa.conf", name: { fr: "Ligue Conférence", es: "Conference League" }, flag: "🇪🇺", tvFR: "Canal+", group: "europe" },
  { id: "eng.1", fd: "PL", name: { fr: "Premier League", es: "Premier League" }, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", tvFR: "Canal+", group: "europe" },
  { id: "esp.1", fd: "PD", name: { fr: "Liga", es: "LaLiga" }, flag: "🇪🇸", tvFR: "DAZN / Disney+", group: "europe" },
  { id: "ita.1", fd: "SA", name: { fr: "Serie A", es: "Serie A" }, flag: "🇮🇹", tvFR: "DAZN", group: "europe" },
  { id: "ger.1", fd: "BL1", name: { fr: "Bundesliga", es: "Bundesliga" }, flag: "🇩🇪", tvFR: "beIN Sports", group: "europe" },
  { id: "por.1", fd: "PPL", name: { fr: "Liga Portugal", es: "Liga Portugal" }, flag: "🇵🇹", group: "europe" },
  { id: "ned.1", fd: "DED", name: { fr: "Eredivisie", es: "Eredivisie" }, flag: "🇳🇱", group: "europe" },
  { id: "eng.fa", name: { fr: "FA Cup", es: "FA Cup" }, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", tvFR: "beIN Sports", cup: true, group: "europe" },
  { id: "uefa.nations", name: { fr: "Ligue des nations", es: "Liga de Naciones" }, flag: "🌍", tvFR: "L'Équipe", cup: true, group: "intl" },
  { id: "bra.1", fd: "BSA", name: { fr: "Brasileirão", es: "Brasileirão" }, flag: "🇧🇷", group: "world" },
  { id: "arg.1", name: { fr: "Liga argentine", es: "Liga Profesional Argentina" }, flag: "🇦🇷", group: "world" },
  { id: "chi.1", name: { fr: "Championnat du Chili", es: "Primera División de Chile" }, flag: "🇨🇱", group: "world" },
  { id: "usa.1", name: { fr: "MLS", es: "MLS" }, flag: "🇺🇸", group: "world" },
];

export const F1_TV_FR = "Canal+";

export function leagueMeta(id: string) {
  return LEAGUES.find((l) => l.id === id);
}

// Copas en las que un equipo favorito puede jugar aunque la competición no esté seguida.
export const CUP_LEAGUES = ["uefa.champions", "uefa.europa", "uefa.europa.conf", "fra.coupe_de_france", "eng.fa"];
