"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useApp } from "@/lib/client/store";
import { fmtDay, fmtTime, isInFrance, locale } from "@/lib/i18n";
import { leagueMeta } from "@/lib/catalog";
import TeamLogo from "@/components/TeamLogo";
import { EloBar, FactsCard } from "@/components/Facts";
import { IconBack, IconSofa, IconTv } from "@/components/Icons";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STAT_LABEL: Record<string, { fr: string; es: string }> = {
  possessionPct: { fr: "Possession (%)", es: "Posesión (%)" },
  totalShots: { fr: "Tirs", es: "Remates" },
  shotsOnTarget: { fr: "Tirs cadrés", es: "Remates al arco" },
  wonCorners: { fr: "Corners", es: "Córners" },
  foulsCommitted: { fr: "Fautes", es: "Faltas" },
  yellowCards: { fr: "Cartons jaunes", es: "Tarjetas amarillas" },
  redCards: { fr: "Cartons rouges", es: "Tarjetas rojas" },
  offsides: { fr: "Hors-jeu", es: "Fueras de juego" },
  saves: { fr: "Arrêts", es: "Atajadas" },
};

export default function MatchPage({ params }: { params: Promise<{ league: string; id: string }> }) {
  const { league, id } = use(params);
  const { t, lang, prefs } = useApp();
  const playersParam = (prefs.athletes ?? []).map((a) => a.name).join(",");
  const [m, setM] = useState<any>(undefined);
  const [sofa, setSofa] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const load = () =>
      fetch(`/api/match?league=${league}&id=${id}&players=${encodeURIComponent(playersParam)}`)
        .then((r) => r.json())
        .then((d) => {
          setM(d.match ?? null);
          timer = setTimeout(load, d.match?.state === "in" ? 20000 : 300000);
        })
        .catch(() => {
          setM(null);
          timer = setTimeout(load, 60000);
        });
    load();
    return () => clearTimeout(timer);
  }, [league, id, playersParam]);

  const meta = leagueMeta(league);
  const tv = isInFrance() ? meta?.tvFR : undefined;

  if (m === undefined) return <div className="pt-safe p-4"><div className="h-56 animate-pulse rounded-3xl bg-card" /></div>;
  if (m === null)
    return (
      <div className="pt-safe p-4">
        <Back />
        <p className="mt-6 rounded-2xl bg-card px-5 py-8 text-center text-muted">{t("dataError")}</p>
      </div>
    );

  const live = m.state === "in";
  const ht = m.statusName?.includes("HALFTIME");
  const status = live ? (ht ? t("halftime") : m.clock) : m.state === "post" ? t("final") : m.start ? `${fmtDay(m.start, lang)} · ${fmtTime(m.start, lang)}` : "";

  if (sofa)
    return (
      <button onClick={() => setSofa(false)} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-bg px-6">
        <div className={`text-2xl font-bold ${live ? "text-live" : "text-muted"}`}>{status}</div>
        <div className="flex w-full items-center justify-around">
          {[m.home, m.away].map((s: any, i: number) => (
            <div key={i} className="flex w-1/3 flex-col items-center gap-3">
              <TeamLogo src={s?.logo} name={s?.name ?? ""} size={88} />
              <span className="text-center text-xl font-bold">{s?.name}</span>
            </div>
          ))}
        </div>
        <div className="font-score text-[9rem] leading-none font-extrabold tracking-tight">
          {m.home?.score ?? "–"}
          <span className="mx-4 text-muted">:</span>
          {m.away?.score ?? "–"}
        </div>
        <div className="text-sm text-muted">{t("close")}</div>
      </button>
    );

  return (
    <div className="pt-safe space-y-4 px-4 pb-4">
      <div className="flex items-center justify-between pt-1">
        <Back />
        <button onClick={() => setSofa(true)} className="flex items-center gap-2 rounded-full bg-card px-3 py-2 text-sm font-semibold">
          <IconSofa className="h-5 w-5" /> {lang === "fr" ? "Mode canapé" : "Modo sofá"}
        </button>
      </div>

      <section className="rounded-3xl bg-card p-5 text-center">
        <div className="mb-4 text-xs font-bold tracking-wider text-muted uppercase">
          {meta?.flag} {meta?.name[lang]}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Team s={m.home} />
          <div className="font-score px-1 text-6xl font-extrabold whitespace-nowrap">
            {m.state === "pre" ? (
              <span className="text-4xl">{m.start ? fmtTime(m.start, lang) : ""}</span>
            ) : (
              <>
                {m.home?.score}
                <span className="mx-1.5 text-muted">-</span>
                {m.away?.score}
              </>
            )}
          </div>
          <Team s={m.away} />
        </div>
        <div className={`mt-2 flex items-center justify-center gap-2 text-sm font-bold ${live ? "text-live" : "text-muted"}`}>
          {live && <span className="live-dot h-2 w-2 rounded-full bg-live" />}
          {m.state === "pre" && m.start ? fmtDay(m.start, lang) : status}
        </div>
        {(tv || m.venue) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
            {tv && (
              <span className="flex items-center gap-1 rounded-md bg-card2 px-2 py-1 font-semibold text-text">
                <IconTv className="h-3.5 w-3.5" /> {tv}
              </span>
            )}
            {m.venue && (
              <span>
                🏟️ {m.venue}
                {m.city ? `, ${m.city}` : ""}
              </span>
            )}
          </div>
        )}
      </section>

      {m.elo && m.home && m.away && <EloBar elo={m.elo} home={m.home.name} away={m.away.name} />}
      <FactsCard facts={m.facts} />

      {m.keyEvents?.length > 0 && (
        <section className="rounded-3xl bg-card p-4">
          <h3 className="mb-3 font-bold">{t("events")}</h3>
          <ul className="space-y-2">
            {m.keyEvents.map((k: any, i: number) => {
              const isHome = k.teamId === m.home?.id;
              const icon = k.icon === "goal" ? "⚽" : k.icon === "red" ? "🟥" : "🟨";
              return (
                <li key={i} className={`flex items-center gap-2 text-sm ${isHome ? "" : "flex-row-reverse text-right"}`}>
                  <span className="font-score w-10 shrink-0 text-center font-bold text-muted">{k.clock}</span>
                  <span>{icon}</span>
                  <span className="font-semibold">
                    {k.player}
                    {k.detail === "pen" ? " (pen.)" : k.detail === "csc" ? (lang === "fr" ? " (csc)" : " (a.g.)") : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {m.stats?.length > 0 && (
        <section className="rounded-3xl bg-card p-4">
          <h3 className="mb-3 font-bold">{t("stats")}</h3>
          <ul className="space-y-3">
            {m.stats.map((s: any) => {
              const h = parseFloat(s.home) || 0;
              const a = parseFloat(s.away) || 0;
              const tot = h + a || 1;
              return (
                <li key={s.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-score text-lg font-bold">{s.home}</span>
                    <span className="text-muted">{STAT_LABEL[s.name]?.[lang] ?? s.name}</span>
                    <span className="font-score text-lg font-bold">{s.away}</span>
                  </div>
                  <div className="flex h-1.5 gap-1">
                    <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-card2">
                      <div className="rounded-full bg-brand" style={{ width: `${(h / tot) * 100}%` }} />
                    </div>
                    <div className="flex-1 overflow-hidden rounded-full bg-card2">
                      <div className="h-full rounded-full bg-brand2" style={{ width: `${(a / tot) * 100}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {m.h2h?.length > 0 && (
        <section className="rounded-3xl bg-card p-4">
          <h3 className="mb-3 font-bold">{t("h2h")}</h3>
          <ul className="space-y-2 text-sm">
            {m.h2h.map((g: any) => (
              <li key={g.date} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-muted">
                  {new Date(g.date).toLocaleDateString(locale(lang), { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="flex-1 truncate text-right">{g.home}</span>
                <span className="font-score rounded-md bg-card2 px-2 text-lg font-bold">{g.score}</span>
                <span className="flex-1 truncate">{g.away}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="block px-1 text-xs text-muted underline">
        {t("source")} : ESPN
      </a>
    </div>
  );
}

function Team({ s }: { s: any }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <TeamLogo src={s?.logo} name={s?.name ?? ""} size={56} />
      <span className="text-sm leading-tight font-bold">{s?.name}</span>
    </div>
  );
}

function Back() {
  return (
    <Link href="/" className="inline-flex items-center rounded-full bg-card p-2">
      <IconBack className="h-5 w-5" />
    </Link>
  );
}
