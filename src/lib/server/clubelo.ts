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

export async function eloFixtures(): Promise<EloFixture[] | null> {
  if (cache && Date.now() - cache.at < 3 * 3600000) return cache.rows;
  try {
    const res = await fetch("http://api.clubelo.com/Fixtures", { next: { revalidate: 10800 } });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    const head = lines[0].split(",");
    const iDate = head.indexOf("Date");
    const iHome = head.indexOf("Home");
    const iAway = head.indexOf("Away");
    if (iDate < 0 || iHome < 0 || iAway < 0) return null;
    const cols = head
      .map((h, i) => {
        const m = h.match(/^GD([<>=])(-?\d+)$/);
        if (!m) return null;
        const v = Number(m[2]);
        const sign = m[1] === "<" ? -1 : m[1] === ">" ? 1 : Math.sign(v);
        return { i, sign };
      })
      .filter((x): x is { i: number; sign: number } => x !== null);
    if (cols.length < 5) return null;
    const rows: EloFixture[] = [];
    for (const line of lines.slice(1)) {
      const c = line.split(",");
      let h = 0,
        d = 0,
        a = 0;
      for (const { i, sign } of cols) {
        const p = Number(c[i]) || 0;
        if (sign > 0) h += p;
        else if (sign < 0) a += p;
        else d += p;
      }
      const tot = h + d + a;
      if (tot <= 0) continue;
      rows.push({ date: c[iDate], home: c[iHome], away: c[iAway], pHome: h / tot, pDraw: d / tot, pAway: a / tot });
    }
    cache = { at: Date.now(), rows };
    return rows;
  } catch {
    return null;
  }
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
  const near = (d: string) => Math.abs(new Date(`${d}T12:00:00Z`).getTime() - t) < 36 * 3600000;
  const hn = new Set(home.filter(Boolean).map(norm));
  const an = new Set(away.filter(Boolean).map(norm));
  const fits = (eloName: string, names: Set<string>) => {
    const e = norm(eloName);
    if (names.has(e)) return true;
    return (ALIAS[e] ?? []).some((a) => names.has(a));
  };
  return rows.find((r) => near(r.date) && fits(r.home, hn) && fits(r.away, an)) ?? null;
}
