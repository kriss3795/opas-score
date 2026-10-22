"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/client/store";
import { fmtDay, fmtTime } from "@/lib/i18n";
import { leagueMeta, sportMeta } from "@/lib/catalog";
import { IconBack } from "@/components/Icons";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Detalle de torneos de golf, veladas de UFC y carreras (IndyCar, NASCAR).
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
      <Link href="/" className="mt-1 inline-flex items-center rounded-full bg-card p-2">
        <IconBack className="h-5 w-5" />
      </Link>
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
              {fmtDay(ev.start, lang)} · {fmtTime(ev.start, lang)}
            </p>
            {ev.venue && <p className="text-sm text-text/70">📍 {ev.venue}</p>}
          </section>

          {ev.fights?.length > 0 && (
            <section className="rounded-3xl bg-card p-4">
              <h3 className="mb-3 font-bold">{t("fightCard")}</h3>
              <ul className="space-y-3">
                {ev.fights.map((f: any, i: number) => (
                  <li key={i} className="rounded-2xl bg-card2 p-3">
                    {f.weight && <div className="mb-1.5 text-xs font-semibold text-muted">{f.weight}</div>}
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
                    {f.status === "post" && f.detail && <div className="mt-1.5 text-xs text-muted">{f.detail}</div>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {ev.leaderboard?.length > 0 && (
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

          {!ev.fights?.length && !ev.leaderboard?.length && (
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
