"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/client/store";
import { LEAGUES, leagueMeta, sportMeta } from "@/lib/catalog";
import type { Standings, StandingRow } from "@/lib/types";
import TeamLogo from "@/components/TeamLogo";

// Las zonas vienen en inglés desde ESPN: se traducen las más comunes.
const ZONES: [string, { fr: string; es: string }][] = [
  ["champions league qual", { fr: "Qualifs Ligue des champions", es: "Clasificación Champions" }],
  ["champions league", { fr: "Ligue des champions", es: "Champions League" }],
  ["europa league qual", { fr: "Qualifs Ligue Europa", es: "Clasificación Europa League" }],
  ["europa league", { fr: "Ligue Europa", es: "Europa League" }],
  ["conference league qual", { fr: "Qualifs Ligue Conférence", es: "Clasificación Conference League" }],
  ["conference league", { fr: "Ligue Conférence", es: "Conference League" }],
  ["relegation playoff", { fr: "Barrage de relégation", es: "Repechaje por el descenso" }],
  ["relegation", { fr: "Relégation", es: "Descenso" }],
  ["promotion playoff", { fr: "Barrages de promotion", es: "Liguilla de ascenso" }],
  ["promotion", { fr: "Promotion", es: "Ascenso" }],
  ["round of 16", { fr: "Huitièmes de finale", es: "Octavos de final" }],
  ["knockout round playoffs", { fr: "Barrages", es: "Play-offs" }],
  ["playoff", { fr: "Barrages", es: "Play-offs" }],
];
function zoneLabel(d: string, lang: "fr" | "es") {
  const low = d.toLowerCase();
  return ZONES.find(([k]) => low.includes(k))?.[1][lang] ?? d;
}

export default function TablesPage() {
  const { t, lang, prefs } = useApp();
  const options = useMemo(() => {
    const ids = new Set([...prefs.leagues, ...prefs.teams.flatMap((x) => x.leagues)]);
    const list = LEAGUES.filter(
      (l) => ids.has(l.id) && !l.cup && l.kind !== "event" && l.kind !== "tennis" && prefs.sports.includes(l.sport),
    );
    return list.length ? list : LEAGUES.filter((l) => l.id === "fra.1");
  }, [prefs.leagues, prefs.teams, prefs.sports]);
  const [sel, setSel] = useState(options[0]?.id);
  const [data, setData] = useState<Standings | null | undefined>(undefined);
  const fav = useMemo(
    () => new Set(prefs.teams.flatMap((x) => [x.id, ...(x.alt ?? [])].map((id) => `${x.sport ?? "football"}:${id}`))),
    [prefs.teams],
  );
  const sport = leagueMeta(sel ?? "")?.sport ?? "football";
  // NBA, NFL y MLB se ordenan por victorias (no hay puntos).
  const byWins = ["basketball", "nfl", "baseball"].includes(sport);
  const favNames = useMemo(() => new Set(prefs.teams.map((x) => x.name)), [prefs.teams]);

  // Si deja de seguir la liga elegida, se vuelve a la primera disponible.
  useEffect(() => {
    if (!options.some((l) => l.id === sel)) setSel(options[0]?.id);
  }, [options, sel]);

  useEffect(() => {
    if (!sel) return;
    let alive = true;
    setData(undefined);
    fetch(`/api/standings?league=${sel}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setData(d.standings ?? null);
      })
      .catch(() => {
        if (alive) setData(null);
      });
    return () => {
      alive = false;
    };
  }, [sel]);

  const notes = useMemo(() => {
    const m = new Map<string, string>();
    data?.rows.forEach((r) => r.note?.color && r.note.description && m.set(r.note.color, r.note.description));
    return Array.from(m.entries());
  }, [data]);

  return (
    <div className="pt-safe">
      <h1 className="px-4 pt-2 pb-3 text-2xl font-extrabold tracking-tight">{t("tabTables")}</h1>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-4">
        {options.map((l) => (
          <button
            key={l.id}
            onClick={() => setSel(l.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${sel === l.id ? "bg-text text-bg" : "bg-card text-muted"}`}
          >
            {sportMeta(l.sport).emoji} {l.name[lang]}
          </button>
        ))}
      </div>

      <div className="px-4">
        {data === undefined && <div className="h-96 animate-pulse rounded-2xl bg-card" />}
        {data === null && <p className="rounded-2xl bg-card px-5 py-8 text-center text-muted">{t("noTable")}</p>}
        {data && (
          <>
            <div className="overflow-hidden rounded-2xl bg-card">
              <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-[11px] font-bold text-muted uppercase">
                <span className="w-6 text-center">#</span>
                <span className="flex-1">{leagueMeta(data.competitionId)?.name[lang]}</span>
                <span className="w-7 text-center">{t("played")}</span>
                <span className="w-9 text-center">{byWins ? (lang === "fr" ? "D" : "P") : t("diff")}</span>
                <span className="w-9 text-center">{byWins ? (lang === "fr" ? "V" : "G") : t("points")}</span>
              </div>
              {data.rows.map((r, i) => {
                const isFav = (r.teamId && fav.has(`${sport}:${r.teamId}`)) || favNames.has(r.name);
                const newGroup = r.group && r.group !== data.rows[i - 1]?.group;
                return (
                  <Fragment key={`${r.group ?? ""}-${r.rank}-${r.name}`}>
                  {newGroup && <div className="bg-card2 px-3 py-1.5 text-xs font-bold text-muted uppercase">{r.group}</div>}
                  <div
                    className={`flex items-center gap-2 border-b border-line px-3 py-2.5 last:border-0 ${isFav ? "bg-brand/10" : ""}`}
                    style={{ boxShadow: r.note?.color ? `inset 3px 0 0 #${r.note.color.replace("#", "")}` : undefined }}
                  >
                    <span className="font-score w-6 text-center text-lg font-bold text-muted">{r.rank}</span>
                    <TeamLogo src={r.logo} name={r.name} size={22} />
                    <span className={`min-w-0 flex-1 leading-tight break-words ${isFav ? "font-extrabold" : "font-medium"}`}>{r.name}</span>
                    <span className="w-7 text-center text-sm text-muted">{r.played ?? ""}</span>
                    <span className="w-9 text-center text-sm text-muted">
                      {byWins ? r.lost ?? "" : r.diff === undefined ? "" : r.diff > 0 ? `+${r.diff}` : r.diff}
                    </span>
                    <span className="font-score w-9 text-center text-xl font-extrabold">{r.points}</span>
                  </div>
                  </Fragment>
                );
              })}
            </div>
            {notes.length > 0 && (
              <div className="mt-3 space-y-1.5 px-1">
                {notes.map(([c, d]) => (
                  <div key={c} className="flex items-center gap-2 text-xs text-muted">
                    <span className="h-3 w-1 rounded" style={{ background: `#${c.replace("#", "")}` }} />
                    {zoneLabel(d, lang)}
                  </div>
                ))}
              </div>
            )}
            <LeagueMath data={data} />
            <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 block px-1 text-xs text-muted underline">
              {t("source")} : {data.source}
              {data.season ? ` · ${lang === "fr" ? "saison" : "temporada"} ${data.season}` : ""}
            </a>
          </>
        )}
      </div>
    </div>
  );
}

// Calculadora con datos reales: quién puede ser campeón y quién está descendido o salvado.
// Solo para ligas de fútbol a doble vuelta (3 puntos por victoria), donde el cálculo es exacto.
const MATH_LEAGUES = new Set(["fra.1", "fra.2", "eng.1", "eng.2", "esp.1", "ita.1", "ger.1", "ger.2", "por.1", "ned.1", "tur.1", "chi.1", "bra.1", "ita.2", "esp.2"]);

function LeagueMath({ data }: { data: Standings }) {
  const { lang } = useApp();
  if (!MATH_LEAGUES.has(data.competitionId) || data.rows.some((r) => r.group)) return null;
  const rows = data.rows;
  const n = rows.length;
  const G = 2 * (n - 1);
  if (n < 6 || rows.some((r) => r.played === undefined || r.played > G)) return null;
  const maxOf = (r: StandingRow) => r.points + 3 * (G - (r.played ?? 0));
  const leader = rows[0];
  const contenders = rows.filter((r) => maxOf(r) >= leader.points);
  const champion = contenders.length === 1;
  const relIdx = rows.findIndex((r) => /relegat/i.test(r.note?.description ?? ""));
  const safePlaces = relIdx > 0 ? relIdx : -1;
  // "Relegados" solo en zona de descenso directo (no en la de repechaje).
  const directIdx = rows.findIndex((r) => /relegat/i.test(r.note?.description ?? "") && !/play-?off/i.test(r.note?.description ?? ""));
  const relegated =
    safePlaces > 0 && directIdx > 0 ? rows.filter((r, i) => i >= directIdx && maxOf(r) < rows[directIdx - 1].points) : [];
  const safe =
    safePlaces > 0 ? rows.filter((r) => rows.filter((o) => o !== r && maxOf(o) >= r.points).length < safePlaces) : [];
  const left = G - Math.min(...rows.map((r) => r.played ?? 0));
  if (left <= 0 && !champion) return null;
  const fr = lang === "fr";
  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <h3 className="font-bold">{fr ? "Qui peut encore être champion ?" : "¿Quién puede ser campeón todavía?"}</h3>
      {champion ? (
        <p className="mt-2 text-lg font-extrabold text-gold">🏆 {leader.name}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {contenders.slice(0, 6).map((r) => (
            <li key={r.name} className="flex items-center gap-2 text-sm">
              <TeamLogo src={r.logo} name={r.name} size={18} />
              <span className="flex-1 leading-tight font-semibold">{r.name}</span>
              <span className="text-muted">
                {r === leader ? (fr ? "leader" : "líder") : `−${leader.points - r.points} pts`}
              </span>
            </li>
          ))}
          {contenders.length > 6 && (
            <li className="text-sm text-muted">
              {fr ? `+ ${contenders.length - 6} autres équipes` : `+ ${contenders.length - 6} equipos más`}
            </li>
          )}
        </ul>
      )}
      {safePlaces > 0 && (
        <p className="mt-4 text-sm text-muted">
          {fr ? "Maintien assuré" : "Salvados matemáticamente"} : <b className="text-text">{safe.length}</b>
          {relegated.length > 0 && (
            <>
              {" · "}
              {fr ? "Relégués" : "Descendidos"} : <b className="text-live">{relegated.map((r) => r.name).join(", ")}</b>
            </>
          )}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        {fr
          ? `Calcul : 3 pts par victoire, ${G} journées au total ; on compare les points maximum possibles de chaque équipe.`
          : `Cálculo: 3 pts por victoria, ${G} fechas en total; se comparan los puntos máximos posibles de cada equipo.`}
      </p>
    </section>
  );
}
