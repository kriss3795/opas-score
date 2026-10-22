"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/client/store";
import { LEAGUES, leagueMeta } from "@/lib/catalog";
import type { Standings } from "@/lib/types";
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
    const list = LEAGUES.filter((l) => ids.has(l.id) && !l.cup);
    return list.length ? list : LEAGUES.filter((l) => l.id === "fra.1");
  }, [prefs.leagues, prefs.teams]);
  const [sel, setSel] = useState(options[0]?.id);
  const [data, setData] = useState<Standings | null | undefined>(undefined);
  const fav = useMemo(() => new Set(prefs.teams.map((x) => x.id)), [prefs.teams]);
  const favNames = useMemo(() => new Set(prefs.teams.map((x) => x.name)), [prefs.teams]);

  useEffect(() => {
    if (!sel) return;
    setData(undefined);
    fetch(`/api/standings?league=${sel}`)
      .then((r) => r.json())
      .then((d) => setData(d.standings ?? null))
      .catch(() => setData(null));
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
            {l.flag} {l.name[lang]}
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
                <span className="w-9 text-center">{t("diff")}</span>
                <span className="w-9 text-center">{t("points")}</span>
              </div>
              {data.rows.map((r) => {
                const isFav = (r.teamId && fav.has(r.teamId)) || favNames.has(r.name);
                return (
                  <div
                    key={`${r.rank}-${r.name}`}
                    className={`flex items-center gap-2 border-b border-line px-3 py-2.5 last:border-0 ${isFav ? "bg-brand/10" : ""}`}
                    style={{ boxShadow: r.note?.color ? `inset 3px 0 0 #${r.note.color.replace("#", "")}` : undefined }}
                  >
                    <span className="font-score w-6 text-center text-lg font-bold text-muted">{r.rank}</span>
                    <TeamLogo src={r.logo} name={r.name} size={22} />
                    <span className={`flex-1 truncate ${isFav ? "font-extrabold" : "font-medium"}`}>{r.name}</span>
                    <span className="w-7 text-center text-sm text-muted">{r.played ?? ""}</span>
                    <span className="w-9 text-center text-sm text-muted">
                      {r.diff === undefined ? "" : r.diff > 0 ? `+${r.diff}` : r.diff}
                    </span>
                    <span className="font-score w-9 text-center text-xl font-extrabold">{r.points}</span>
                  </div>
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
            <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 block px-1 text-xs text-muted underline">
              {t("source")} : {data.source}
            </a>
          </>
        )}
      </div>
    </div>
  );
}
