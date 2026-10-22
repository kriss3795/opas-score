import "server-only";

// ClubElo: probabilidades por partido calculadas con ratings Elo (clubelo.com).
// Formato CSV con columnas GD<-5 … GD=0 … GD>5 (diferencia de goles local − visitante).
export interface EloFixture {
  date: string;
  home: string;
  away: string;
  pHome: number;
  pDraw: number;
  pAway: number;
}

let cache: { at: number; rows: EloFixture[] } | null = null;

// La API CSV de partidos de ClubElo fue desactivada ("Fixtures API deactivated").
// La misma tabla de partidos con probabilidades 1 / X / 2 está en clubelo.com/API (HTML): se lee de ahí.
// Cada partido ocupa dos filas: local (con % de 1 y de X) y visita (con % de 2).
export async function eloPage(path: string): Promise<EloFixture[]> {
  try {
    const res = await fetch(`http://clubelo.com/${path}`, { next: { revalidate: 10800 } });
    if (!res.ok) return [];
    const html = await res.text();
    const rows = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)).map((m) =>
      Array.from(m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((c) => ({
        raw: c[1],
        t: c[1].replace(/<[^>]+>/g, "|").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").replace(/\|+/g, "|").trim(),
      })),
    );
    const pct = (t: string) => {
      const m = t.match(/^\|?\s*(\d+(?:\.\d+)?)\s*\|[^|]*\|\s*%/);
      return m ? Number(m[1]) / 100 : null;
    };
    // Fila de un club: celda con enlace y nombre; luego "partidos jugados" y los porcentajes.
    const parse = (cells: { raw: string; t: string }[]) => {
      const ci = cells.findIndex((c) => /href=/.test(c.raw) && /[A-Za-z]{3,}/.test(c.t));
      if (ci < 0) return null;
      const name = c2name(cells[ci].t);
      const ps: number[] = [];
      for (let k = ci + 2; k < cells.length; k++) {
        const v = pct(cells[k].t);
        if (v === null) break;
        ps.push(v);
      }
      return name ? { name, ps } : null;
    };
    const c2name = (t: string) => t.split("|").map((x) => x.trim()).filter((x) => x && !/^\d+$/.test(x)).pop() ?? "";
    const out: EloFixture[] = [];
    for (let i = 0; i < rows.length - 1; i++) {
      const a = parse(rows[i]);
      if (!a || a.ps.length !== 2) continue;
      const b = parse(rows[i + 1]);
      if (!b || b.ps.length !== 1) continue;
      const [h, d] = a.ps;
      const w = b.ps[0];
      const tot = h + d + w;
      if (tot < 0.9 || tot > 1.1) continue; // fila mal leída: se descarta
      out.push({ date: "", home: a.name, away: b.name, pHome: h / tot, pDraw: d / tot, pAway: w / tot });
      i++;
    }
    return out;
  } catch {
    return [];
  }
}

// Página general + la de cada país (cada una muestra los próximos partidos de su liga).
const PAGES = ["API", "ENG", "ESP", "GER", "ITA", "FRA", "POR", "NED", "BEL", "SCO", "TUR", "AUT", "SUI", "GRE", "DEN"];

export async function eloFixtures(): Promise<EloFixture[] | null> {
  if (cache && Date.now() - cache.at < 3 * 3600000) return cache.rows;
  const all = (await Promise.all(PAGES.map(eloPage))).flat();
  const seen = new Set<string>();
  const rows = all.filter((r) => (seen.has(`${r.home}|${r.away}`) ? false : (seen.add(`${r.home}|${r.away}`), true)));
  if (!rows.length) return null;
  cache = { at: Date.now(), rows };
  return rows;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Nombres de ClubElo que no coinciden con los de ESPN.
const ALIAS: Record<string, string[]> = {
  parissg: ["parissaintgermain", "psg"],
  mancity: ["manchestercity"],
  manunited: ["manchesterunited"],
  inter: ["internazionale", "intermilan"],
  atletico: ["atleticomadrid", "atletidemadrid"],
  bayern: ["bayernmunich", "fcbayernmunich", "bayernmunchen"],
  gladbach: ["borussiamonchengladbach", "monchengladbach"],
  leverkusen: ["bayerleverkusen"],
  dortmund: ["borussiadortmund"],
  frankfurt: ["eintrachtfrankfurt"],
  sporting: ["sportingcp", "sportinglisbon"],
  psv: ["psveindhoven"],
  forest: ["nottinghamforest"],
  spurs: ["tottenham", "tottenhamhotspur"],
  saintetienne: ["asssaintetienne", "stetienne"],
  lens: ["rclens"],
  rennes: ["staderennais"],
  brest: ["stadebrestois", "stadebrestois29"],
  monaco: ["asmonaco"],
  lyon: ["olympiquelyonnais"],
  marseille: ["olympiquedemarseille"],
  lille: ["losclille", "lilleosc"],
  nice: ["ogcnice"],
  reims: ["stadedereims"],
  sociedad: ["realsociedad"],
  betis: ["realbetis"],
  bilbao: ["athleticclub", "athleticbilbao"],
  celta: ["celtavigo"],
  roma: ["asroma"],
  lazio: ["sslazio"],
  napoli: ["sscnapoli"],
  milan: ["acmilan"],
  juventus: ["juve"],
};

export function matchElo(rows: EloFixture[], date: string, home: string[], away: string[]): EloFixture | null {
  const t = new Date(date).getTime();
  // La tabla web no trae la fecha: se aceptan partidos próximos (solo hay uno por par de equipos).
  const near = (d: string) => !d || Math.abs(new Date(`${d}T12:00:00Z`).getTime() - t) < 36 * 3600000;
  const hn = new Set(home.filter(Boolean).map(norm));
  const an = new Set(away.filter(Boolean).map(norm));
  const fits = (eloName: string, names: Set<string>) => {
    const e = norm(eloName);
    if (names.has(e)) return true;
    return (ALIAS[e] ?? []).some((a) => names.has(a));
  };
  return rows.find((r) => near(r.date) && fits(r.home, hn) && fits(r.away, an)) ?? null;
}
