"use client";

import BackButton from "@/components/BackButton";
import { OfficialCard } from "@/components/OfficialVideos";

import { use, useEffect, useState } from "react";
import { useApp } from "@/lib/client/store";
import { fmtDay, fmtTime } from "@/lib/i18n";

import { roundLabel } from "@/lib/tennisRound";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function TennisMatch({ params }: { params: Promise<{ tour: string; id: string }> }) {
  const { tour, id } = use(params);
  const { lang, t } = useApp();
  const fr = lang === "fr";
  const [m, setM] = useState<any>(undefined);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    setM(undefined);
    const load = () =>
      fetch(`/api/tennis/match?tour=${tour}&id=${id}`)
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          setM((p: typeof m) => d.match ?? (p ? p : null));
          timer = setTimeout(load, d.match?.state === "in" ? 20000 : 300000);
        })
        .catch(() => {
          if (!alive) return;
          setM((p: typeof m) => (p ? p : null));
          timer = setTimeout(load, 60000);
        });
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [tour, id]);

  if (m === undefined) return <div className="pt-safe p-4"><div className="h-56 animate-pulse rounded-3xl bg-card" /></div>;
  if (m === null)
    return (
      <div className="pt-safe p-4">
        <BackButton />
        <p className="mt-6 rounded-2xl bg-card px-5 py-8 text-center text-muted">{t("dataError")}</p>
      </div>
    );

  const live = m.state === "in";
  const nSets = Math.max(m.a.sets.length, m.b.sets.length);
  const Row = ({ p }: { p: any }) => (
    <div className={`flex items-center gap-3 py-2 ${m.state === "post" && !p.winner ? "text-muted" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {p.flag ? <img src={p.flag} alt="" className="h-5 w-7 rounded-sm object-cover" /> : <span className="w-7" />}
      <span className="min-w-0 flex-1">
        <span className={`block leading-tight ${p.winner ? "font-extrabold" : "font-semibold"}`}>
          {p.name} {p.winner && "✓"}
        </span>
        <span className="text-xs text-muted">
          {p.rank ? `${fr ? "Classement" : "Ranking"} ${p.rank}` : ""}
          {p.seed ? ` · ${fr ? "Tête de série" : "Preclasificado"} ${p.seed}` : ""}
        </span>
      </span>
      {Array.from({ length: nSets }, (_, i) => (
        <span key={i} className={`font-score w-7 text-center text-2xl ${p.sets[i]?.won ? "font-extrabold" : "font-semibold text-muted"}`}>
          {p.sets[i]?.v ?? ""}
          {p.sets[i]?.tb !== undefined && <sup className="text-xs">{p.sets[i].tb}</sup>}
        </span>
      ))}
    </div>
  );

  const Path = ({ name, path }: { name: string; path: any[] }) =>
    path.length ? (
      <div className="mb-3 last:mb-0">
        <div className="mb-1.5 text-sm font-semibold">{name}</div>
        <ul className="space-y-1 text-sm">
          {path.map((x, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${x.state !== "post" ? "bg-card2" : x.won ? "bg-football text-white" : "bg-live text-white"}`}>
                {x.state !== "post" ? "•" : x.won ? (fr ? "V" : "G") : fr ? "D" : "P"}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted">
                {roundLabel(x.round, lang)} · {x.opp}
              </span>
              <span className="font-score font-bold">{x.score}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className="pt-safe space-y-4 px-4 pb-4">
      <BackButton className="mt-1" />
      <section className="rounded-3xl bg-card p-5">
        <div className="text-xs font-bold tracking-wider text-muted uppercase">
          🎾 {m.tournament} · {m.tour.toUpperCase()}
        </div>
        <div className="mt-1 text-sm text-muted">
          {m.round ? roundLabel(m.round, lang) : ""}
          {m.court ? ` · ${m.court}` : ""}
        </div>
        <div className="mt-3 divide-y divide-line">
          <Row p={m.a} />
          <Row p={m.b} />
        </div>
        <div className={`mt-3 flex items-center gap-2 text-sm font-bold ${live ? "text-live" : "text-muted"}`}>
          {live && <span className="live-dot h-2 w-2 rounded-full bg-live" />}
          {live
            ? m.detail
            : m.state === "post"
              ? `${t("final")}${m.ending === "RET" ? (fr ? " (abandon)" : " (retiro)") : m.ending === "WO" ? (fr ? " (forfait)" : " (W.O.)") : ""}`
              : `${fmtDay(m.start, lang)} · ${fmtTime(m.start, lang)} (${fr ? "horaire indicatif" : "hora estimada"})`}
        </div>
      </section>
      <OfficialCard items={m.official ?? []} title={fr ? "Résumé vidéo (chaîne officielle)" : "Resumen en video (canal oficial)"} />
      {(m.pathA.length > 0 || m.pathB.length > 0) && (
        <section className="rounded-3xl bg-card p-4">
          <h3 className="mb-3 font-bold">{fr ? "Parcours dans le tournoi" : "Camino en el torneo"}</h3>
          <Path name={m.a.name} path={m.pathA} />
          <Path name={m.b.name} path={m.pathB} />
        </section>
      )}
      <p className="px-1 text-xs text-muted">{t("source")} : ESPN</p>
    </div>
  );
}
