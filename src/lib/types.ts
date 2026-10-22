// Interfaz común que comparten todos los módulos de deporte.

export type SportId =
  | "football"
  | "f1"
  | "rugby"
  | "tennis"
  | "basketball"
  | "hockey"
  | "nfl"
  | "baseball"
  | "afl"
  | "golf"
  | "mma"
  | "motorsport";

export type EventStatus = "pre" | "in" | "post" | "cancelled";

export interface Side {
  id?: string;
  name: string;
  short?: string;
  logo?: string;
  score?: string;
  winner?: boolean;
  sets?: string[]; // tenis: juegos por set
  pen?: string; // tanda de penales
}

export interface SportEvent {
  id: string;
  sport: SportId;
  competitionId: string; // ej. "fra.1" o "f1"
  competitionName: string;
  start: string; // ISO UTC
  status: EventStatus;
  statusDetail?: string; // ej. "67'" o "Mi-temps"
  title?: string; // para eventos sin rivales (sesión de F1)
  home?: Side;
  away?: Side;
  venue?: string;
  round?: string; // ronda (tenis, copas)
  link?: string; // ruta interna de detalle
  allDay?: boolean; // la fuente solo da la fecha (golf): no se muestra una hora inventada
  source: string; // nombre de la fuente de datos
}

export interface StandingRow {
  rank: number;
  teamId?: string;
  name: string;
  logo?: string;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  diff?: number;
  gf?: number; // goles/puntos a favor
  ga?: number; // en contra
  points: number;
  note?: { color?: string; description?: string };
  group?: string; // conferencia o grupo (MLS, ligas con varias zonas)
}

export interface Standings {
  competitionId: string;
  competitionName: string;
  rows: StandingRow[];
  season?: string; // temporada de la tabla (p. ej. "2026-27"), para que no se confunda con una vieja
  source: string;
  sourceUrl: string;
}

export interface TeamOption {
  id: string;
  sport?: SportId; // ausente en preferencias antiguas = fútbol
  alt?: string[]; // otros ids del mismo club en la fuente
  name: string;
  short?: string;
  logo?: string;
  leagues: string[]; // competiciones en las que aparece
}

export interface DriverOption {
  id: string; // driverId de Jolpica
  name: string;
  code?: string;
  number?: string;
  nationality?: string;
  team?: string;
}

export interface PlayerOption {
  id: string;
  name: string;
  flag?: string;
  tour: string; // atp | wta
  rank?: number;
}

export interface AthleteOption {
  id: string;
  name: string;
  short?: string;
  sport: SportId;
  teamId?: string;
  teamName?: string;
  teamLogo?: string;
  league?: string;
  flag?: string;
}

export interface Prefs {
  sports: SportId[];
  leagues: string[]; // ids de competiciones de fútbol seguidas
  teams: TeamOption[];
  drivers: DriverOption[];
  players: PlayerOption[];
  athletes?: AthleteOption[]; // jugadores seguidos (fútbol, básquetbol, etc.)
  important: string[]; // ids de eventos marcados con aviso
  lang: "fr" | "es" | null; // null = idioma del teléfono
  theme: "dark" | "light";
  onboarded: boolean;
  welcomed: boolean;
  morning?: boolean; // resumen matinal (por defecto activado)
  friendLeagues?: { code: string; token: string; name: string }[];
}

export const DEFAULT_PREFS: Prefs = {
  sports: [],
  leagues: [],
  teams: [],
  drivers: [],
  players: [],
  important: [],
  lang: null,
  theme: "dark",
  onboarded: false,
  welcomed: false,
};
