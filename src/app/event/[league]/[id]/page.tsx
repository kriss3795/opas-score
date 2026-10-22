"use client";

import BackButton from "@/components/BackButton";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/client/store";
import { fmtDay, fmtTime } from "@/lib/i18n";
import { leagueMeta, sportMeta } from "@/lib/catalog";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Detalle de torneos de golf, veladas de UFC y carreras (IndyCar, NASCAR).
// Categorías de peso (la fuente las da en inglés; "W" = femenino).
function weightLabel(w: string, lang: "fr" | "es") {
  const fr = lang === "fr";
  const women = /^W\s|women/i.test(w);
  const base = w.replace(/^W\s+|women'?s\s*/i, "").trim().toLowerCase();
  const M: Record<string, [string, string]> = {
    strawweight: ["Poids paille", "Peso paja"],
    flyweight: ["Poids mouche", "Peso mosca"],
    bantamweight: ["Poids coq", "Peso gallo"],
    featherweight: ["Poids plume", "Peso pluma"],
    lightweight: ["Poids léger", "Peso ligero"],
    welterweight: ["Poids mi-moyen", "Peso wélter"],
    middleweight: ["Poids moyen", "Peso medio"],
    "light heavyweight": ["Poids mi-lourd", "Peso semipesado"],
    heavyweight: ["Poids lourd", "Peso pesado"],
    catchweight: ["Poids intermédiaire", "Peso pactado"],
  };
  const t = M[base]?.[fr ? 0 : 1] ?? w;
  return women && M[base] ? `${t} ${fr ? "(F)" : "(fem.)"}` : t;
}

// Resultado de un combate: la fuente lo da en inglés ("KO/TKO", "Decision - Unanimous"…).
function fightResult(d: string, lang: "fr" | "es") {
  const fr = lang === "fr";
  return d
    .replace(/^Final\s*-?\s*/i, "")
    .replace(/Decision\s*-\s*Unanimous/i, fr ? "Décision unanime" : "Decisión unánime")
    .replace(/Decision\s*-\s*Split/i, fr ? "Décision partagée" : "Decisión dividida")
    .replace(/Decision\s*-\s*Majority/i, fr ? "Décision majoritaire" : "Decisión mayoritaria")
    .replace(/Submission/i, fr ? "Soumission" : "Sumisión")
    .replace(/No Contest/i, fr ? "Sans décision" : "Sin resultado")
    .replace(/\bDraw\b/i, fr ? "Match nul" : "Empate")
    .trim();
}

export default function EventPage({ params }: { params: Promise<{ league: string; id: string }> }) {
  const { league, id } = use(params);
  const day = useSearchParams().get("d") ?? "";
  const { t, lang } = useApp();
  const [ev, setEv] = useState<any>(undefined);
  const meta = leagueMeta(league);
  const sport = meta ? sportMeta(meta.sport) : null;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    setEv(undefined);
    const load = () =>
      fetch(`/api/event?league=${league}&id=${id}&d=${day}`)
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          setEv((p: any) => d.event ?? (p ? p : null));
          timer = setTimeout(load, d.event?.state === "in" ? 30000 : 600000);
        })
        .catch(() => {
          if (!alive) return;
          // Un corte de red no borra lo que ya se ve: se reintenta en 1 minuto.
          setEv((p: any) => (p ? p : null));
          timer = setTimeout(load, 60000);
        });
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [league, id, day]);

  return (
    <div className="pt-safe space-y-4 px-4 pb-4">
      <BackButton className="mt-1" />
      {ev === undefined && <div className="h-48 animate-pulse rounded-3xl bg-card" />}
      {ev === null && <p className="rounded-2xl bg-card px-5 py-8 text-center text-muted">{t("dataError")}</p>}
      {ev && (
        <>
          <section
            className="rounded-3xl p-5"
            style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${sport?.color} 30%, var(--card)), var(--card) 70%)` }}
          >
            <div className="text-xs font-bold tracking-wider text-text/70 uppercase">
              {sport?.emoji} {meta?.name[lang]}
            </div>
            <h1 className="mt-1 text-2xl leading-tight font-extrabold">{ev.name}</h1>
            <p className="mt-1 text-text/80">
              {meta?.sport === "golf"
                ? new Date(ev.start).toLocaleDateString(lang === "fr" ? "fr-FR" : "es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
                : `${fmtDay(ev.start, lang)} · ${fmtTime(ev.start, lang)}`}
            </p>
            {ev.venue && <p className="text-sm text-text/70">📍 {ev.venue}</p>}
          </section>

          {ev.fights?.length > 0 && (
            <section className="rounded-3xl bg-card p-4">
              <h3 className="mb-3 font-bold">{t("fightCard")}</h3>
              <ul className="space-y-3">
                {/* La fuente lista de la primera pelea al combate estelar: se muestra al revés (estelar primero). */}
                {[...ev.fights].reverse().map((f: any, i: number) => (
                  <li key={i} className="rounded-2xl bg-card2 p-3">
                    {(i === 0 || f.weight) && (
                      <div className="mb-1.5 text-xs font-semibold text-muted">
                        {i === 0 ? (lang === "fr" ? "Combat principal · " : "Pelea estelar · ") : ""}
                        {f.weight ? weightLabel(f.weight, lang) : ""}
                      </div>
                    )}
                    {[f.a, f.b].map((x: any, k: number) => (
                      <div key={k} className={`flex items-center gap-2 ${f.status === "post" && !x.winner ? "text-muted" : ""}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {x.flag ? <img src={x.flag} alt="" className="h-3.5 w-5 rounded-sm object-cover" /> : <span className="w-5" />}
                        <span className={`flex-1 leading-tight ${x.winner ? "font-extrabold" : "font-medium"}`}>
                          {x.name} {x.winner && "✓"}
                        </span>
                        {x.record && <span className="text-xs text-muted">{x.record}</span>}
                      </div>
                    ))}
                    {f.status === "post" && f.detail && <div className="mt-1.5 text-xs text-muted">{fightResult(f.detail, lang)}</div>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Antes de empezar, el orden de la fuente es solo el de salida: no se muestra como clasificación. */}
          {ev.state !== "pre" && ev.leaderboard?.length > 0 && (
            <section className="rounded-3xl bg-card p-4">
              <h3 className="mb-3 font-bold">{t("leaderboard")}</h3>
              <ol>
                {ev.leaderboard.map((x: any) => (
                  <li key={`${x.order}-${x.name}`} className="flex items-center gap-3 border-b border-line py-2 last:border-0">
                    <span className="font-score w-7 text-center text-lg font-bold text-muted">{x.order}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {x.flag && <img src={x.flag} alt="" className="h-3.5 w-5 rounded-sm object-cover" />}
                    <span className="flex-1 leading-tight font-semibold">{x.name}</span>
                    {x.score && <span className="font-score text-lg font-bold">{x.score}</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {!ev.fights?.length && (ev.state === "pre" || !ev.leaderboard?.length) && (
            <p className="rounded-2xl bg-card px-5 py-6 text-center text-sm text-muted">
              {lang === "fr" ? "Le classement apparaîtra dès le début de l'événement." : "La clasificación aparecerá cuando empiece el evento."}
            </p>
          )}
          <a href={ev.sourceUrl} target="_blank" rel="noreferrer" className="block px-1 text-xs text-muted underline">
            {t("source")} : ESPN
          </a>
        </>
      )}
    </div>
  );
}
