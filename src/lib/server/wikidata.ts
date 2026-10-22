import "server-only";
import { getJson } from "./http";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Wikidata: clubes en los que jugó un futbolista (propiedad P54), con años.
// Se cachea una semana: la trayectoria de un jugador casi no cambia.
const WD = "https://www.wikidata.org/w/api.php";
const WEEK = 7 * 86400;

export interface ClubSpell {
  qid: string;
  label: string;
  from?: string;
  to?: string;
}

const STOP = new Set(["fc", "cf", "sc", "ac", "as", "afc", "club", "de", "la", "le", "the", "cd", "sd", "ud", "rc", "us", "ss", "sv", "fk", "sk", "calcio", "futbol", "football", "f", "c", "a", "s", "1"]);

export function teamTokens(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

// Coincidencia estricta (mismos términos) para no inventar relaciones entre clubes parecidos.
export function sameClub(a: string, b: string) {
  const x = teamTokens(a).sort().join(" ");
  const y = teamTokens(b).sort().join(" ");
  return x.length > 2 && x === y;
}

const year = (t?: string) => (t ? t.replace(/^\+/, "").slice(0, 4) : undefined);

export async function clubHistory(player: string): Promise<{ qid: string; clubs: ClubSpell[] } | null> {
  const search = await getJson<any>(
    `${WD}?action=wbsearchentities&search=${encodeURIComponent(player)}&language=en&uselang=en&type=item&limit=5&format=json`,
    WEEK,
  );
  const hit = (search?.search ?? []).find((r: any) => /football|soccer/i.test(r.description ?? ""));
  if (!hit?.id) return null;
  const ent = await getJson<any>(`${WD}?action=wbgetentities&ids=${hit.id}&props=claims&format=json`, WEEK);
  const claims: any[] = ent?.entities?.[hit.id]?.claims?.P54 ?? [];
  const spells = claims
    .map((c) => ({
      qid: c.mainsnak?.datavalue?.value?.id as string,
      from: year(c.qualifiers?.P580?.[0]?.datavalue?.value?.time),
      to: year(c.qualifiers?.P582?.[0]?.datavalue?.value?.time),
    }))
    .filter((c) => c.qid);
  if (!spells.length) return { qid: hit.id, clubs: [] };
  const ids = Array.from(new Set(spells.map((s) => s.qid))).slice(0, 45);
  const lab = await getJson<any>(`${WD}?action=wbgetentities&ids=${ids.join("|")}&props=labels&languages=en|fr|es&format=json`, WEEK);
  const clubs = spells.map((s) => {
    const l = lab?.entities?.[s.qid]?.labels;
    return { ...s, label: l?.en?.value ?? l?.fr?.value ?? l?.es?.value ?? "" };
  });
  return { qid: hit.id, clubs: clubs.filter((c) => c.label) };
}
