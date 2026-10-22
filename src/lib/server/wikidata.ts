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
  desc?: string;
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

// País de cada liga (para distinguir clubes homónimos: Barcelona de España / Barcelona SC de Ecuador).
const COUNTRY: Record<string, RegExp> = {
  fra: /france|french/i, eng: /england|english/i, esp: /spain|spanish/i, ita: /italy|italian/i, ger: /germany|german/i,
  por: /portugal|portuguese/i, ned: /netherlands|dutch/i, bel: /belgium|belgian/i, sco: /scotland|scottish/i, tur: /turkey|türkiye|turkish/i,
  gre: /greece|greek/i, sui: /switzerland|swiss/i, aut: /austria|austrian/i, den: /denmark|danish/i, swe: /sweden|swedish/i, nor: /norway|norwegian/i,
  bra: /brazil/i, arg: /argentin/i, chi: /chile/i, mex: /mexic/i, usa: /united states|american/i, col: /colombia/i, uru: /uruguay/i,
  per: /peru/i, ecu: /ecuador/i, par: /paraguay/i, ksa: /saudi/i, jpn: /japan/i, chn: /china|chinese/i, aus: /australia/i,
};

// Coincidencia estricta: mismos términos y, si el nombre es de una sola palabra, mismo país que la liga.
// Ante la duda no se publica el dato (mejor omitir que inventar).
export function sameClub(club: ClubSpell, rival: string, league: string) {
  const x = teamTokens(club.label).sort();
  const y = teamTokens(rival).sort();
  if (!x.length || x.join(" ") !== y.join(" ") || x.join("").length < 3) return false;
  if (/\b(B|II|U-?\d{2}|reserves?|youth|academy|women|femen)/i.test(club.label)) return false;
  if (x.length >= 2) return true;
  const re = COUNTRY[league.split(".")[0]];
  return Boolean(re && club.desc && re.test(club.desc));
}

const year = (t?: string) => (t ? t.replace(/^\+/, "").slice(0, 4) : undefined);

async function clubsOf(qid: string): Promise<ClubSpell[]> {
  const ent = await getJson<any>(`${WD}?action=wbgetentities&ids=${qid}&props=claims&format=json`, WEEK);
  const claims: any[] = ent?.entities?.[qid]?.claims?.P54 ?? [];
  const spells = claims
    .map((c) => ({
      qid: c.mainsnak?.datavalue?.value?.id as string,
      from: year(c.qualifiers?.P580?.[0]?.datavalue?.value?.time),
      to: year(c.qualifiers?.P582?.[0]?.datavalue?.value?.time),
    }))
    .filter((c) => c.qid);
  if (!spells.length) return [];
  const ids = Array.from(new Set(spells.map((s) => s.qid))).slice(0, 45);
  const lab = await getJson<any>(`${WD}?action=wbgetentities&ids=${ids.join("|")}&props=labels|descriptions&languages=en|fr|es&format=json`, WEEK);
  return spells
    .map((s) => {
      const e = lab?.entities?.[s.qid];
      const l = e?.labels;
      return { ...s, label: l?.en?.value ?? l?.fr?.value ?? l?.es?.value ?? "", desc: e?.descriptions?.en?.value ?? "" };
    })
    .filter((c) => c.label);
}

// Busca al futbolista y, entre homónimos, elige el que la condición `accept` confirma (su club actual).
export async function clubHistory(player: string, accept: (clubs: ClubSpell[]) => boolean): Promise<{ qid: string; clubs: ClubSpell[] } | null> {
  const search = await getJson<any>(
    `${WD}?action=wbsearchentities&search=${encodeURIComponent(player)}&language=en&uselang=en&type=item&limit=7&format=json`,
    WEEK,
  );
  const hits = (search?.search ?? []).filter((r: any) => /football|soccer/i.test(r.description ?? "")).slice(0, 3);
  for (const hit of hits) {
    const clubs = await clubsOf(hit.id);
    if (accept(clubs)) return { qid: hit.id, clubs };
  }
  return null;
}
