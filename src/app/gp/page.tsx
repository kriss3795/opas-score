"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/client/store";
import { fmtDay, fmtTime, isInFrance, locale } from "@/lib/i18n";
import { F1_TV_FR } from "@/lib/catalog";
import { sessionLabel } from "@/components/EventCard";
import { IconTv } from "@/components/Icons";
import { FactsCard } from "@/components/Facts";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Códigos WMO de Open-Meteo → ícono simple.
function wIcon(code: number) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67 || (code >= 80 && code <= 82)) return "🌧️";
  if (code <= 77 || code === 85 || code === 86) return "🌨️";
  return "⛈️";
}

const SESSION_ESPN: Record<string, string> = { fp1: "FP1", fp2: "FP2", fp3: "FP3", sq: "SS", sprint: "SR", quali: "Qual", race: "Race" };

export default function GPPage() {
  const { t, lang, prefs } = useApp();
  const [d, setD] = useState<any>(undefined);
  const favDrivers = new Set(prefs.drivers.map((x) => x.id));
  const favNames = new Set(prefs.drivers.map((x) => x.name));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const load = () =>
      fetch("/api/f1/gp")
        .then((r) => r.json())
        .then((x) => {
          setD(x);
          const live = x?.current?.sessions?.some((s: any) => s.status === "in");
          timer = setTimeout(load, live ? 20000 : 300000);
        })
        .catch(() => {
          setD(null);
          timer = setTimeout(load, 60000);
        });
    load();
    return () => clearTimeout(timer);
  }, []);

  if (!prefs.sports.includes("f1"))
    return <p className="pt-safe m-4 mt-12 rounded-2xl bg-card px-5 py-8 text-center text-muted">{t("noF1")}</p>;

  if (d === undefined)
    return (
      <div className="pt-safe space-y-3 p-4">
        <div className="h-40 animate-pulse rounded-3xl bg-card" />
        <div className="h-64 animate-pulse rounded-3xl bg-card" />
      </div>
    );
  if (d === null) return <p className="pt-safe m-4 mt-12 rounded-2xl bg-card px-5 py-8 text-center text-muted">{t("dataError")}</p>;

  const cur = d.current;
  const liveSession = cur?.sessions?.find((s: any) => s.status === "in");
  const liveData = liveSession
    ? d.live?.find((x: any) => x.status === "in") ?? d.live?.find((x: any) => x.name === SESSION_ESPN[liveSession.key])
    : null;
  const tv = isInFrance() ? F1_TV_FR : null;

  return (
    <div className="pt-safe space-y-5 px-4 pb-4">
      <h1 className="pt-2 text-2xl font-extrabold tracking-tight">{t("tabGP")}</h1>

      {d.seasonOver && <p className="rounded-2xl bg-card px-5 py-5 text-muted">{t("seasonOver")}</p>}

      {cur && (
        <section
          className="relative overflow-hidden rounded-3xl p-5"
          style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--f1) 35%, var(--card)), var(--card) 70%)" }}
        >
          <div className="text-xs font-bold tracking-wider text-text/70 uppercase">
            {t("round")} {cur.round} · {cur.season}
          </div>
          <h2 className="mt-1 text-3xl leading-tight font-extrabold">{cur.name}</h2>
          <p className="mt-1 text-text/80">
            {cur.circuit}
            {cur.locality ? ` · ${cur.locality}` : ""}
          </p>
          {tv && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-black/25 px-2.5 py-1 text-sm font-semibold">
              <IconTv className="h-4 w-4" /> {tv}
            </span>
          )}
        </section>
      )}

      {liveSession && (
        <section className="rounded-3xl bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-live">
            <span className="live-dot h-2.5 w-2.5 rounded-full bg-live" />
            {t("liveTiming")} · {sessionLabel(liveSession.key, t)}
          </h3>
          {liveData?.rows?.length ? (
            <ol className="space-y-1">
              {liveData.rows.slice(0, 20).map((r: any) => (
                <li key={r.pos} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${favNames.has(r.name) ? "bg-f1/15" : ""}`}>
                  <span className="font-score w-7 text-xl font-extrabold">{r.pos}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.flag && <img src={r.flag} alt="" className="h-3.5 w-5 rounded-sm object-cover" />}
                  <span className={`flex-1 ${favNames.has(r.name) ? "font-extrabold" : "font-medium"}`}>{r.name}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">{d.failed?.live ? t("dataError") : t("updatedAfter")}</p>
          )}
          <p className="mt-3 text-xs text-muted">
            {t("source")} : ESPN · {t("updatedAfter")}
          </p>
        </section>
      )}

      {cur && (
        <section className="rounded-3xl bg-card p-4">
          <h3 className="mb-3 font-bold">{t("sessions")}</h3>
          <ul className="space-y-1">
            {cur.sessions.map((s: any) => (
              <li
                key={s.key}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${s.key === "race" ? "bg-f1/15" : ""} ${s.status === "post" ? "opacity-50" : ""}`}
              >
                <span className="flex-1 font-semibold">{sessionLabel(s.key, t)}</span>
                <span className="text-sm text-muted">{fmtDay(s.start, lang)}</span>
                {s.status === "in" ? (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-live">
                    <span className="live-dot h-2 w-2 rounded-full bg-live" />
                    {t("live")}
                  </span>
                ) : (
                  <span className="font-score w-14 text-right text-xl font-bold">{fmtTime(s.start, lang)}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.weather?.length > 0 && (
        <section className="rounded-3xl bg-card p-4">
          <h3 className="mb-3 font-bold">{t("weather")}</h3>
          <div className="grid grid-cols-3 gap-2">
            {d.weather.map((w: any) => (
              <div key={w.date} className="rounded-2xl bg-card2 p-3 text-center">
                <div className="text-xs font-semibold text-muted capitalize">
                  {new Date(`${w.date}T12:00:00`).toLocaleDateString(locale(lang), { weekday: "short" })}
                </div>
                <div className="my-1 text-3xl">{wIcon(w.code)}</div>
                <div className="font-score text-lg font-bold">
                  {Math.round(w.tMax)}° <span className="text-muted">{Math.round(w.tMin)}°</span>
                </div>
                {w.rain !== null && (
                  <div className="text-xs text-brand2">
                    💧 {w.rain}% {t("rainChance")}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">{t("source")} : Open-Meteo</p>
        </section>
      )}

      <FactsCard facts={d.facts} />

      {d.titleCalc && d.titleCalc.races > 0 && (
        <section className="rounded-3xl bg-card p-4">
          <h3 className="font-bold">{t("titleCalc")}</h3>
          <p className="mt-1 mb-3 text-sm text-muted">
            <span className="font-score text-xl font-extrabold text-text">{d.titleCalc.maxLeft}</span> {t("pointsLeft")} ·{" "}
            {d.titleCalc.races} GP{d.titleCalc.sprints ? ` + ${d.titleCalc.sprints} sprint` : ""}
          </p>
          <ul className="space-y-1">
            {d.titleCalc.rows
              .filter((r: any, i: number) => i === 0 || r.possible || favDrivers.has(r.driverId))
              .map((r: any, i: number) => (
                <li key={r.driverId} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${favDrivers.has(r.driverId) ? "bg-f1/15" : ""}`}>
                  <span className="flex-1 font-semibold">{r.name}</span>
                  <span className="text-sm text-muted">{i === 0 ? t("leader") : `−${r.gap} ${t("pts")}`}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.possible ? "bg-football/20 text-football" : "bg-card2 text-muted"}`}>
                    {i === 0 ? "👑" : r.possible ? t("stillPossible") : t("eliminated")}
                  </span>
                </li>
              ))}
          </ul>
          <p className="mt-3 text-xs text-muted">{t("titleCalcExplain")}</p>
        </section>
      )}

      {d.drivers?.rows?.length > 0 && (
        <section className="rounded-3xl bg-card p-4">
          <h3 className="mb-3 font-bold">{t("driversStandings")}</h3>
          <ol>
            {d.drivers.rows.map((r: any) => (
              <li key={r.driverId} className={`flex items-center gap-3 border-b border-line px-1 py-2 last:border-0 ${favDrivers.has(r.driverId) ? "bg-f1/10" : ""}`}>
                <span className="font-score w-7 text-center text-lg font-bold text-muted">{r.pos}</span>
                <span className="flex-1">
                  <span className={`block ${favDrivers.has(r.driverId) ? "font-extrabold" : "font-semibold"}`}>{r.name}</span>
                  <span className="block text-xs text-muted">{r.team}</span>
                </span>
                <span className="font-score text-xl font-extrabold">{r.points}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">
            {t("source")} : Jolpica-F1 · {t("round")} {d.drivers.round}
          </p>
        </section>
      )}

      {d.constructors?.length > 0 && (
        <section className="rounded-3xl bg-card p-4">
          <h3 className="mb-3 font-bold">{t("teamsStandings")}</h3>
          <ol>
            {d.constructors.map((r: any) => (
              <li key={r.name} className="flex items-center gap-3 border-b border-line px-1 py-2 last:border-0">
                <span className="font-score w-7 text-center text-lg font-bold text-muted">{r.pos}</span>
                <span className="flex-1 font-semibold">{r.name}</span>
                <span className="font-score text-xl font-extrabold">{r.points}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {d.last?.rows?.length > 0 && (
        <section className="rounded-3xl bg-card p-4">
          <h3 className="font-bold">{t("lastRace")}</h3>
          <p className="mb-3 text-sm text-muted">{d.last.name}</p>
          <ol>
            {d.last.rows.slice(0, 10).map((r: any) => (
              <li key={r.driverId} className={`flex items-center gap-3 border-b border-line px-1 py-2 last:border-0 ${favDrivers.has(r.driverId) ? "bg-f1/10" : ""}`}>
                <span className="font-score w-7 text-center text-lg font-bold">{r.pos <= 3 ? ["🥇", "🥈", "🥉"][r.pos - 1] : r.pos}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{r.name}</span>
                  <span className="block text-xs text-muted">{r.team}</span>
                </span>
                <span className="text-sm text-muted">{r.time}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">{t("source")} : Jolpica-F1</p>
        </section>
      )}
    </div>
  );
}
