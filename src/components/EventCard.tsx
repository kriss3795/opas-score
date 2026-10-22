"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/client/store";
import { fmtTime, isInFrance, type Key } from "@/lib/i18n";
import { leagueMeta, sportMeta, F1_TV_FR } from "@/lib/catalog";
import type { SportEvent } from "@/lib/types";
import { currentSubscription, enablePush, setReminder } from "@/lib/client/push";
import TeamLogo from "./TeamLogo";
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
    const detail = e.statusDetail === "HT" ? t("halftime") : e.sport === "f1" ? t("live") : e.statusDetail ?? t("live");
    return (
      <span className="flex items-center gap-1.5 text-sm font-bold text-live">
        <span className="live-dot h-2 w-2 rounded-full bg-live" />
        {detail}
      </span>
    );
  }
  if (e.status === "post") return <span className="text-sm font-semibold text-muted">{t("final")}</span>;
  if (e.status === "cancelled") return <span className="text-sm font-semibold text-muted">{t("postponed")}</span>;
  return <span className="font-score text-xl font-bold">{fmtTime(e.start, lang)}</span>;
}

export default function EventCard({ e, favIds }: { e: SportEvent; favIds: Set<string> }) {
  const { t, lang, prefs, update } = useApp();
  const color = sportMeta(e.sport).color;
  const tv = isInFrance() ? (e.sport === "f1" ? F1_TV_FR : leagueMeta(e.competitionId)?.tvFR) : undefined;
  const important = prefs.important.includes(e.id);
  const [busy, setBusy] = useState(false);

  // Animación sutil cuando cambia el marcador.
  const prev = useRef(`${e.home?.score}-${e.away?.score}`);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const now = `${e.home?.score}-${e.away?.score}`;
    if (prev.current !== now && e.status === "in") {
      setFlash(true);
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
        const r = await enablePush(lang);
        if (r !== "ok") {
          alert(r === "denied" ? t("notifDenied") : t("notifNeedInstall"));
          return;
        }
        sub = await currentSubscription();
      }
      const name =
        e.sport === "f1"
          ? `${e.competitionName} · ${sessionLabel(e.title ?? "race", t)}`
          : `${e.home?.name} – ${e.away?.name}`;
      const body =
        lang === "fr"
          ? `Dans 15 minutes${tv ? ` sur ${tv}` : ""} : ${name}`
          : `En 15 minutos${tv ? ` por ${tv}` : ""}: ${name}`;
      const ok = await setReminder({
        on: !important,
        eventId: e.id,
        start: e.start,
        title: e.sport === "f1" ? "🏎️ Opa's Score" : "⚽ Opa's Score",
        body,
        url: e.link ?? "/",
      });
      if (ok) update((p) => ({ important: important ? p.important.filter((x) => x !== e.id) : [...p.important, e.id] }));
    } finally {
      setBusy(false);
    }
  };

  const fav = (id?: string) => (id ? favIds.has(id) : false);

  return (
    <Link
      href={e.link ?? "#"}
      className={`block rounded-2xl bg-card px-4 py-3.5 active:bg-card2 ${flash ? "goal-flash" : ""}`}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
        <span className="truncate">
          {e.sport === "f1" ? "Formule 1" : leagueMeta(e.competitionId)?.name[lang] ?? e.competitionName}
        </span>
        {tv && (
          <span className="ml-auto flex shrink-0 items-center gap-1 rounded-md bg-card2 px-1.5 py-0.5 text-[11px] text-text">
            <IconTv className="h-3 w-3" />
            {tv}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {e.sport === "f1" ? (
            <div>
              <div className="truncate text-[17px] font-bold">{sessionLabel(e.title ?? "race", t)}</div>
              <div className="truncate text-sm text-muted">{e.competitionName}</div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {[e.home, e.away].map((s, i) =>
                s ? (
                  <div key={i} className="flex items-center gap-2.5">
                    <TeamLogo src={s.logo} name={s.name} size={24} />
                    <span className={`min-w-0 truncate text-[16px] ${fav(s.id) ? "font-extrabold" : "font-medium"} ${e.status === "post" && s.winner === false ? "text-muted" : ""}`}>
                      {s.name}
                    </span>
                    {fav(s.id) && <span className="-ml-1 shrink-0 text-gold">★</span>}
                    <span className="flex-1" />
                    {s.score !== undefined && <span className="font-score w-7 text-right text-2xl font-extrabold">{s.score}</span>}
                  </div>
                ) : null,
              )}
            </div>
          )}
        </div>
        <div className="flex w-16 flex-col items-end gap-1.5">
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
    </Link>
  );
}
