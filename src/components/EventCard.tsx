"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/client/store";
import { fmtTime, isInFrance, type Key } from "@/lib/i18n";
import { leagueMeta, sportMeta, F1_TV_FR } from "@/lib/catalog";
import type { SportEvent, Side } from "@/lib/types";
import { currentSubscription, enablePush, setReminder } from "@/lib/client/push";
import TeamLogo from "./TeamLogo";
import { agendaParams } from "@/lib/client/useEvents";
import { playSound } from "@/lib/client/sounds";
import { IconBell, IconTv } from "./Icons";

const SESSION_KEY: Record<string, Key> = {
  fp1: "practice",
  fp2: "practice",
  fp3: "practice",
  sq: "sprintQuali",
  sprint: "sprint",
  quali: "qualifying",
  race: "race",
};

export function sessionLabel(key: string, t: (k: Key) => string) {
  const base = t(SESSION_KEY[key] ?? "race");
  return key.startsWith("fp") ? `${base} ${key.slice(2)}` : base;
}

export function StatusBadge({ e }: { e: SportEvent }) {
  const { t, lang } = useApp();
  if (e.status === "in") {
    const detail = e.statusDetail === "HT" ? t("halftime") : e.sport === "football" || e.sport === "rugby" ? e.statusDetail ?? t("live") : t("live");
    return (
      <span className="flex items-center gap-1.5 text-sm font-bold whitespace-nowrap text-live">
        <span className="live-dot h-2 w-2 rounded-full bg-live" />
        {detail}
      </span>
    );
  }
  if (e.status === "post") return <span className="text-sm font-semibold text-muted">{t("final")}</span>;
  if (e.status === "cancelled") return <span className="text-sm font-semibold text-muted">{t("postponed")}</span>;
  return <span className="font-score text-xl font-bold">{fmtTime(e.start, lang)}</span>;
}

function eventName(e: SportEvent, t: (k: Key) => string) {
  if (e.sport === "f1") return `${e.competitionName} · ${sessionLabel(e.title ?? "race", t)}`;
  if (e.home && e.away) return `${e.home.name} – ${e.away.name}`;
  return e.title ?? e.competitionName;
}

export default function EventCard({ e, favIds }: { e: SportEvent; favIds: Set<string> }) {
  const { t, lang, prefs, update } = useApp();
  const meta = sportMeta(e.sport);
  const league = leagueMeta(e.competitionId);
  const tv = isInFrance() ? (e.sport === "f1" ? F1_TV_FR : league?.tvFR) : undefined;
  const important = prefs.important.includes(e.id);
  const [busy, setBusy] = useState(false);

  // Animación sutil cuando cambia el marcador.
  const prev = useRef(`${e.home?.score}-${e.away?.score}`);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const now = `${e.home?.score}-${e.away?.score}`;
    if (prev.current !== now && e.status === "in") {
      setFlash(true);
      if (important || fav(e.home) || fav(e.away)) playSound(e.sport === "football" ? "goal" : "reminder");
      const id = setTimeout(() => setFlash(false), 2500);
      prev.current = now;
      return () => clearTimeout(id);
    }
    prev.current = now;
  }, [e.home?.score, e.away?.score, e.status]);

  const toggleRemind = async (ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      let sub = await currentSubscription();
      if (!sub && !important) {
        const r = await enablePush(lang, agendaParams(prefs));
        if (r !== "ok") {
          alert(r === "denied" ? t("notifDenied") : t("notifNeedInstall"));
          return;
        }
        sub = await currentSubscription();
      }
      const name = eventName(e, t);
      const body = lang === "fr" ? `Dans 15 minutes${tv ? ` sur ${tv}` : ""} : ${name}` : `En 15 minutos${tv ? ` por ${tv}` : ""}: ${name}`;
      const ok = await setReminder({ on: !important, eventId: e.id, start: e.start, title: `${meta.emoji} Opa's Score`, body, url: e.link ?? "/", league: e.home ? e.competitionId : undefined });
      if (ok) update((p) => ({ important: important ? p.important.filter((x) => x !== e.id) : [...p.important, e.id] }));
    } finally {
      setBusy(false);
    }
  };

  const fav = (s?: Side) => (s?.id ? favIds.has(`${e.sport}:${s.id}`) : false);
  const label =
    e.sport === "f1"
      ? meta.name[lang]
      : e.sport === "tennis"
        ? `${e.competitionName}${e.round ? ` · ${e.round}` : ""}`
        : league?.name[lang] ?? e.competitionName;

  const body = (
    <>
      <div className="mb-2 flex items-start gap-2 text-xs font-semibold text-muted">
        <span className="shrink-0">{meta.emoji}</span>
        <span className="leading-snug">{label}</span>
        {tv && (
          <span className="ml-auto flex shrink-0 items-center gap-1 rounded-md bg-card2 px-1.5 py-0.5 text-[11px] text-text">
            <IconTv className="h-3 w-3" />
            {tv}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {!e.home || !e.away ? (
            <div>
              <div className="text-[17px] leading-snug font-bold">{e.sport === "f1" ? sessionLabel(e.title ?? "race", t) : e.title}</div>
              {e.sport === "f1" && <div className="text-sm leading-snug text-muted">{e.competitionName}</div>}
              {e.sport !== "f1" && e.venue && <div className="text-sm leading-snug text-muted">{e.venue}</div>}
            </div>
          ) : (
            <div className="space-y-2">
              {[e.home, e.away].map((s, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {e.sport === "tennis" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    s.logo ? <img src={s.logo} alt="" className="h-4 w-6 shrink-0 rounded-sm object-cover" /> : <span className="w-6" />
                  ) : (
                    <TeamLogo src={s.logo} name={s.name} size={24} />
                  )}
                  <span
                    className={`min-w-0 flex-1 text-[16px] leading-tight break-words ${fav(s) ? "font-extrabold" : "font-medium"} ${
                      e.status === "post" && s.winner === false ? "text-muted" : ""
                    }`}
                  >
                    {e.sport === "tennis" ? s.name : s.short ?? s.name}
                    {fav(s) && <span className="ml-1 text-gold">★</span>}
                  </span>
                  {e.sport === "tennis" && s.sets?.length ? (
                    <span className="font-score flex shrink-0 gap-1.5 text-lg font-bold">
                      {s.sets.map((x, k) => (
                        <span key={k} className="w-5 text-center">
                          {x}
                        </span>
                      ))}
                    </span>
                  ) : (
                    s.score !== undefined && <span className="font-score w-9 shrink-0 text-right text-2xl font-extrabold">{s.score}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex w-16 shrink-0 flex-col items-end gap-1.5">
          <StatusBadge e={e} />
          {e.status === "pre" && (
            <button
              onClick={toggleRemind}
              aria-label={important ? t("reminded") : t("remind")}
              className={`rounded-full p-1.5 ${important ? "bg-brand/15 text-brand" : "text-muted"} ${busy ? "opacity-50" : ""}`}
            >
              <IconBell className="h-5 w-5" on={important} />
            </button>
          )}
        </div>
      </div>
    </>
  );

  const cls = `block rounded-2xl bg-card px-4 py-3.5 ${flash ? "goal-flash" : ""}`;
  const style = { borderLeft: `3px solid ${meta.color}` };
  return e.link ? (
    <Link href={e.link} className={`${cls} active:bg-card2`} style={style}>
      {body}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}
