import "server-only";

// Videos oficiales: solo los canales oficiales de cada liga o circuito (nada de búsquedas abiertas,
// así no aparecen copias piratas). Se leen por RSS público de YouTube (gratis, sin clave).
// Cada canal se identifica por su id; si el id fallara, se resuelve por su @nombre oficial.
export interface OfficialVideo {
  id: string; // id de YouTube
  title: string;
  published: string;
  thumb: string;
  channel: string;
}

const CHANNELS: Record<string, { name: string; handle: string; id?: string }> = {
  ligue1: { name: "Ligue 1", handle: "Ligue1", id: "UCQsH5XtIc9hONE1BQjucM0g" },
  premier: { name: "Premier League", handle: "premierleague", id: "UCG5qGWdu8nIRZqJ_GgDwQ-w" },
  laliga: { name: "LaLiga", handle: "LaLiga", id: "UCTv-XvfzLX3i4IGWAm4sbmA" },
  seriea: { name: "Serie A", handle: "SerieA", id: "UCBJeMCIeLQos7wacox4hmLQ" },
  bundesliga: { name: "Bundesliga", handle: "bundesliga", id: "UC6UL29enLNe4mqwTfAyeNuw" },
  uefa: { name: "UEFA", handle: "UEFA", id: "UCyGa1YEx9ST66rYrJTGIKOw" },
  atp: { name: "ATP Tour", handle: "ATPTour", id: "UCbcxFkd6B9xUU54InHv4Tig" },
  wta: { name: "WTA", handle: "WTA" },
  f1: { name: "Formula 1", handle: "Formula1", id: "UCB_qr75-ydFVKSF9Dmo6izg" },
  nba: { name: "NBA", handle: "NBA", id: "UCWJ2lWNubArHWmf3FIHbfcQ" },
  nhl: { name: "NHL", handle: "NHL", id: "UCqFMzb-4AUf6WAIbl132QKA" },
  mlb: { name: "MLB", handle: "MLB", id: "UCoLrcjPV5PbUrUyXq5mjc_A" },
  nfl: { name: "NFL", handle: "NFL", id: "UCDVYQ4Zhbm3S2dlz7P1GBDg" },
  ufc: { name: "UFC", handle: "ufc", id: "UCvgfXK4nTYKudb0rFR6noLA" },
};

// Competición de la app → canal oficial.
export const CHANNEL_OF: Record<string, string> = {
  "fra.1": "ligue1",
  "eng.1": "premier",
  "esp.1": "laliga",
  "ita.1": "seriea",
  "ger.1": "bundesliga",
  "uefa.champions": "uefa",
  "uefa.europa": "uefa",
  "uefa.europa.conf": "uefa",
  "uefa.nations": "uefa",
  "tennis.atp": "atp",
  "tennis.wta": "wta",
  f1: "f1",
  "basketball.nba": "nba",
  "hockey.nhl": "nhl",
  "baseball.mlb": "mlb",
  "football.nfl": "nfl",
  "mma.ufc": "ufc",
};

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function parseFeed(id: string, channel: string): Promise<OfficialVideo[] | null> {
  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, { next: { revalidate: 1800 } });
    if (!r.ok) return null;
    const x = await r.text();
    return Array.from(x.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).map((m) => {
      const e = m[1];
      const vid = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? "";
      return {
        id: vid,
        title: decode(e.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""),
        published: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? "",
        thumb: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`,
        channel,
      };
    }).filter((v) => v.id && v.title);
  } catch {
    return null;
  }
}

// Resuelve el id del canal desde su @nombre (respaldo si el id guardado deja de funcionar).
async function idFromHandle(handle: string): Promise<string | null> {
  try {
    const r = await fetch(`https://www.youtube.com/@${handle}`, { next: { revalidate: 86400 } });
    if (!r.ok) return null;
    const html = await r.text();
    return html.match(/"(?:externalId|channelId)":"(UC[\w-]{22})"/)?.[1] ?? html.match(/channel\/(UC[\w-]{22})/)?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function channelVideos(key: string): Promise<OfficialVideo[]> {
  const c = CHANNELS[key];
  if (!c) return [];
  let list = c.id ? await parseFeed(c.id, c.name) : null;
  if (!list?.length) {
    const id = await idFromHandle(c.handle);
    if (id) list = await parseFeed(id, c.name);
  }
  return list ?? [];
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ");
const STOP = new Set(["fc", "cf", "sc", "ac", "as", "afc", "club", "de", "la", "le", "the", "cd", "ud", "rc", "us", "ss", "sv", "fk", "real", "city", "united", "olympique", "stade", "sporting", "athletic", "atletico", "1", "04", "05", "saint", "san", "santa", "st", "borussia", "union", "racing", "sport", "deportivo", "inter", "paris", "new", "los", "angeles"]);
// Nombres con que los canales oficiales suelen titular (abreviaturas habituales).
const EXTRA: Record<string, string[]> = {
  "paris saint germain": ["psg", "paris sg", "paris saint germain"],
  "paris fc": ["paris fc"],
  "inter miami cf": ["inter miami"],
  "manchester united": ["man utd", "man united"],
  "manchester city": ["man city"],
  "tottenham hotspur": ["spurs", "tottenham"],
  "wolverhampton wanderers": ["wolves"],
  "internazionale": ["inter"],
  "bayern munich": ["bayern"],
  "borussia dortmund": ["dortmund", "bvb"],
  "bayer leverkusen": ["leverkusen"],
  "atletico madrid": ["atletico", "atleti"],
  "real madrid": ["real madrid"],
  "olympique de marseille": ["marseille", "om"],
  "olympique lyonnais": ["lyon", "ol"],
};

// Palabras que identifican a un equipo o jugador en un título.
function keys(name: string, short?: string): string[] {
  const n = norm(name).trim();
  const out = new Set<string>([...(EXTRA[n] ?? [])]);
  // Con abreviatura conocida (PSG…) no se usan palabras sueltas, para no confundir "Paris" con el Paris FC.
  if (EXTRA[n]) return Array.from(out);
  for (const s of [name, short ?? ""]) {
    const toks = norm(s).split(/\s+/).filter((t) => t.length >= 3 && !STOP.has(t));
    toks.forEach((t) => out.add(t));
    if (norm(s).trim()) out.add(norm(s).trim());
  }
  return Array.from(out).filter(Boolean);
}
const has = (title: string, ks: string[]) => {
  const t = ` ${norm(title)} `;
  return ks.some((k) => t.includes(` ${k} `));
};
const BAD = /preview|press conference|conf[ée]rence|avant[- ]match|previa|trailer|live stream|en direct|watch live|reaction|interview|podcast/i;
const GOOD = /highlight|r[ée]sum[ée]|resumen|key moments|all goals|goals|buts|extended|temps forts/i;

// Videos oficiales de un partido entre dos equipos o jugadores, publicados desde el inicio hasta 4 días después.
export async function officialFor(opts: { league: string; start: string; home: { name: string; short?: string }; away: { name: string; short?: string }; surnames?: boolean }) {
  const key = CHANNEL_OF[opts.league];
  if (!key) return [];
  const vids = await channelVideos(key);
  const t0 = new Date(opts.start).getTime();
  const pick = (s: { name: string; short?: string }) => (opts.surnames ? [norm(s.name).trim().split(/\s+/).pop() ?? ""] : keys(s.name, s.short));
  const kh = pick(opts.home).filter(Boolean);
  const ka = pick(opts.away).filter(Boolean);
  return vids
    .filter((v) => {
      const p = new Date(v.published).getTime();
      return p >= t0 - 2 * 3600000 && p <= t0 + 4 * 86400000 && !BAD.test(v.title) && has(v.title, kh) && has(v.title, ka);
    })
    .sort((a, b) => Number(GOOD.test(b.title)) - Number(GOOD.test(a.title)));
}

// F1: videos oficiales de un Gran Premio (por el nombre del país o ciudad en el título).
export async function officialF1(raceName: string, start: string) {
  const vids = await channelVideos("f1");
  const t0 = new Date(start).getTime();
  const place = norm(raceName.replace(/grand prix/i, "")).trim();
  if (!place) return [];
  return vids.filter((v) => {
    const p = new Date(v.published).getTime();
    return p >= t0 - 4 * 86400000 && p <= t0 + 4 * 86400000 && !BAD.test(v.title) && ` ${norm(v.title)} `.includes(` ${place} `);
  });
}
