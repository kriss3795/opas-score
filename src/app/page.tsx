"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/client/store";
import { useAgenda } from "@/lib/client/useEvents";
import { dayKey, fmtDay } from "@/lib/i18n";
import { isStandalone, platform } from "@/lib/client/push";
import EventCard from "@/components/EventCard";
import type { SportEvent } from "@/lib/types";

export default function Home() {
  const { t, lang, prefs } = useApp();
  const { events, error, failed } = useAgenda();
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    setShowInstall(!isStandalone() && platform() !== "desktop");
  }, []);

  const favIds = useMemo(() => new Set(prefs.teams.map((x) => `${x.sport ?? "football"}:${x.id}`)), [prefs.teams]);

  const groups = useMemo(() => {
    if (!events) return null;
    const live = events.filter((e) => e.status === "in");
    const now = Date.now();
    const upcoming = events.filter((e) => e.status === "pre" || (e.status === "cancelled" && new Date(e.start).getTime() > now));
    const recent = events
      .filter((e) => e.status === "post")
      .sort((a, b) => b.start.localeCompare(a.start))
      .slice(0, 20);
    const byDay: { key: string; label: string; items: SportEvent[] }[] = [];
    for (const e of upcoming) {
      const k = dayKey(e.start);
      let g = byDay.find((x) => x.key === k);
      if (!g) {
        g = { key: k, label: fmtDay(e.start, lang), items: [] };
        byDay.push(g);
      }
      g.items.push(e);
    }
    // Favoritos primero dentro de cada día, respetando la hora.
    return { live, byDay, recent };
  }, [events, lang]);

  return (
    <div className="pt-safe px-4">
      <header className="flex items-center gap-3 pt-2 pb-4">
        <Image src="/logo.png" alt="Opa's Score" width={900} height={742} className="h-12 w-auto" priority />
        <h1 className="text-2xl font-extrabold tracking-tight">{t("myProgramme")}</h1>
      </header>

      {showInstall && (
        <Link
          href="/install"
          className="mb-5 flex items-center gap-4 rounded-3xl p-4 text-white shadow-lg active:scale-[0.99]"
          style={{ background: "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand2) 85%, black))" }}
        >
          <span className="text-4xl">📲</span>
          <span className="flex-1">
            <span className="block text-lg leading-tight font-extrabold">{t("installCta")}</span>
            <span className="block text-sm opacity-90">{t("installCtaSub")}</span>
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 text-sm font-extrabold text-black">{t("installShort")}</span>
        </Link>
      )}

      {error && <Notice text={t("dataError")} />}
      {!error && failed.length > 0 && events && events.length > 0 && <Notice text={t("dataError")} small />}

      {!groups && !error && <Skeleton />}

      {groups && (
        <div className="space-y-7">
          {groups.live.length > 0 && (
            <Section title={t("live")} live>
              {groups.live.map((e) => (
                <EventCard key={e.id} e={e} favIds={favIds} />
              ))}
            </Section>
          )}

          {groups.byDay.map((g) => (
            <Section key={g.key} title={g.label}>
              {g.items.map((e) => (
                <EventCard key={e.id} e={e} favIds={favIds} />
              ))}
            </Section>
          ))}

          {groups.live.length === 0 && groups.byDay.length === 0 && (
            <p className="rounded-2xl bg-card px-5 py-8 text-center text-muted">{t("nothing")}</p>
          )}

          {groups.recent.length > 0 && (
            <Section title={t("recent")}>
              {groups.recent.map((e) => (
                <EventCard key={e.id} e={e} favIds={favIds} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, live, children }: { title: string; live?: boolean; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={`mb-2.5 flex items-center gap-2 text-sm font-bold tracking-wide uppercase ${live ? "text-live" : "text-muted"}`}>
        {live && <span className="live-dot h-2 w-2 rounded-full bg-live" />}
        {title}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Notice({ text, small }: { text: string; small?: boolean }) {
  return <p className={`mb-4 rounded-xl bg-card px-4 ${small ? "py-2 text-xs" : "py-3 text-sm"} text-muted`}>{text}</p>;
}

function Skeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
      ))}
    </div>
  );
}
