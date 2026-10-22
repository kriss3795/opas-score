// Interfaz común que comparten todos los módulos de deporte.

export type SportId = "football" | "f1";

export type EventStatus = "pre" | "in" | "post" | "cancelled";

export interface Side {
  id?: string;
  name: string;
  short?: string;
  logo?: string;
  score?: string;
  winner?: boolean;
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
  link?: string; // ruta interna de detalle
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
  points: number;
  note?: { color?: string; description?: string };
}

export interface Standings {
  competitionId: string;
  competitionName: string;
  rows: StandingRow[];
  source: string;
  sourceUrl: string;
}

export interface TeamOption {
  id: string;
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

export interface Prefs {
  sports: SportId[];
  leagues: string[]; // ids de competiciones de fútbol seguidas
  teams: TeamOption[];
  drivers: DriverOption[];
  important: string[]; // ids de eventos marcados con aviso
  lang: "fr" | "es" | null; // null = idioma del teléfono
  theme: "dark" | "light";
  onboarded: boolean;
  welcomed: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  sports: [],
  leagues: [],
  teams: [],
  drivers: [],
  important: [],
  lang: null,
  theme: "dark",
  onboarded: false,
  welcomed: false,
};
