"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/client/store";
import { useAgenda } from "@/lib/client/useEvents";
import { dayKey, fmtDay, locale } from "@/lib/i18n";
import { leagueMeta, sportMeta } from "@/lib/catalog";
import { gpName } from "@/lib/f1names";
import { isStandalone, platform } from "@/lib/client/push";
import EventCard from "@/components/EventCard";
import type { SportEvent } from "@/lib/types";

// Fecha local "AAAA-MM-DD" y medianoche local de una fecha así.
const ymdLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const midnight = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export default function Home() {
  const { t, lang, prefs } = useApp();
  // null = "Mi programa" (lo próximo); una fecha = todo lo de ese día (resultados o programa).
  const [day, setDayState] = useState<string | null>(null);
  // El día elegido se recuerda al entrar a un partido y volver.
  useEffect(() => {
    try {
      // Solo si fue hace poco (volver de un partido); al abrir la app otro día, se parte en "Lo próximo".
      const [d, at] = (sessionStorage.getItem("opas-day") ?? "").split("|");
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && Date.now() - Number(at) < 30 * 60000) setDayState(d);
    } catch {
      /* sin almacenamiento */
    }
  }, []);
  const setDay = (d: string | null) => {
    setDayState(d);
    try {
      if (d) sessionStorage.setItem("opas-day", `${d}|${Date.now()}`);
      else sessionStorage.removeItem("opas-day");
    } catch {
      /* sin almacenamiento */
    }
  };
  const range = useMemo(() => {
    if (!day) return undefined;
    const from = midnight(day);
    const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
    return { from, to };
  }, [day]);
  const { events, error, failed, updated, reload } = useAgenda(range);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    setShowInstall(!isStandalone() && platform() !== "desktop");
  }, []);

  const favIds = useMemo(
    () => new Set(prefs.teams.flatMap((x) => [x.id, ...(x.alt ?? [])].map((id) => `${x.sport ?? "football"}:${id}`))),
    [prefs.teams],
  );

  const groups = useMemo(() => {
    if (!events) return null;
    const live = events.filter((e) => e.status === "in");
    const now = Date.now();
    const upcoming = events.filter((e) => e.status === "pre" || (e.status === "cancelled" && new Date(e.start).getTime() > now));
    // Hoy se muestra completo en orden de hora: lo terminado (con su resultado), lo aplazado y lo que viene.
    // (Antes los partidos terminados hoy se iban al final de la pantalla y parecía que no tenían resultado.)
    const todayKey = dayKey(new Date().toISOString());
    const isTodayEv = (e: SportEvent) => dayKey(e.start) === todayKey;
    const todayDone = events.filter((e) => isTodayEv(e) && (e.status === "post" || e.status === "cancelled"));
    const recent = events
      .filter((e) => e.status === "post" && !isTodayEv(e))
      .sort((a, b) => b.start.localeCompare(a.start))
      .slice(0, 20);
    const byDay: { key: string; label: string; items: SportEvent[] }[] = [];
    const seenToday = new Set<string>();
    for (const e of [...todayDone, ...upcoming].filter((x) => (seenToday.has(`${x.sport}:${x.id}`) ? false : (seenToday.add(`${x.sport}:${x.id}`), true))).sort((a, b) => a.start.localeCompare(b.start))) {
      const k = dayKey(e.start);
      let g = byDay.find((x) => x.key === k);
      if (!g) {
        g = { key: k, label: fmtDay(e.start, lang), items: [] };
        byDay.push(g);
      }
      g.items.push(e);
    }
    // Favoritos primero dentro de cada día, respetando la hora.
    const isFollowed = (e: SportEvent) => prefs.important.includes(`${e.sport}:${e.id}`) || prefs.important.includes(e.id);
    const followed = events.filter((e) => isFollowed(e) && e.status !== "post" && e.status !== "cancelled");
    const fset = new Set(followed.map((e) => `${e.sport}:${e.id}`));
    // Próximo partido de un favorito (o seguido), para la cuenta regresiva.
    const isFav = (e: SportEvent) =>
      favIds.has(`${e.sport}:${e.home?.id}`) || favIds.has(`${e.sport}:${e.away?.id}`) || isFollowed(e) || (prefs.athletes ?? []).some((a) => a.teamId && (a.teamId === e.home?.id || a.teamId === e.away?.id));
    const next = upcoming.filter((e) => e.status === "pre" && !e.allDay).find(isFav) ?? null;
    return { next, followed, live: live.filter((e) => !fset.has(`${e.sport}:${e.id}`)), byDay: byDay.map((g) => ({ ...g, items: g.items.filter((e) => !fset.has(`${e.sport}:${e.id}`)) })).filter((g) => g.items.length), recent };
  }, [events, lang, prefs.important, prefs.athletes, favIds]);

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

      <DateStrip day={day} onChange={setDay} />

      {/* Solo se avisa del fallo si no hay nada que mostrar; si algo cargó, se muestra y se reintenta solo. */}
      {error && !events && <Notice text={t("dataError")} />}
      {!error && failed.length > 0 && events && events.length > 0 && <Notice text={lang === "fr" ? "Une source ne répond pas pour le moment : nouvel essai automatique." : "Una fuente no responde por ahora: se reintenta sola."} small />}

      {!events && !error && <Skeleton />}

      {events && updated && (
        <button onClick={() => reload()} className="-mt-2 mb-3 flex items-center gap-1.5 text-xs text-muted">
          ↻ {lang === "fr" ? "Mis à jour à" : "Actualizado a las"}{" "}
          {updated.toLocaleTimeString(locale(lang), { hour: "2-digit", minute: "2-digit", hour12: false })}
        </button>
      )}

      {!day && groups?.next && <NextUp e={groups.next} />}

      {day && events && <DayView events={events} favIds={favIds} day={day} />}

      {!day && groups && (
        <div className="space-y-7">
          {groups.followed.length > 0 && (
            <Section title={`⭐ ${t("followed")}`}>
              {groups.followed.map((e) => (
                <EventCard key={`f-${e.sport}-${e.id}`} e={e} favIds={favIds} />
              ))}
            </Section>
          )}

          {groups.live.length > 0 && (
            <Section title={t("live")} live>
              {groups.live.map((e) => (
                <EventCard key={`${e.sport}-${e.id}`} e={e} favIds={favIds} />
              ))}
            </Section>
          )}

          {groups.byDay.map((g) => (
            <Section key={g.key} title={g.label}>
              {g.items.map((e) => (
                <EventCard key={`${e.sport}-${e.id}`} e={e} favIds={favIds} />
              ))}
            </Section>
          ))}

          {groups.followed.length === 0 && groups.live.length === 0 && groups.byDay.length === 0 && groups.recent.length === 0 && (
            <p className="rounded-2xl bg-card px-5 py-8 text-center text-muted">{t("nothing")}</p>
          )}

          {groups.recent.length > 0 && (
            <Section title={lang === "fr" ? "Résultats d'hier" : "Resultados de ayer"}>
              {groups.recent.map((e) => (
                <EventCard key={`${e.sport}-${e.id}`} e={e} favIds={favIds} />
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


// Tira de días: "Mi programa" y cada fecha (30 días atrás y 30 adelante), más un selector para cualquier día.
function DateStrip({ day, onChange }: { day: string | null; onChange: (d: string | null) => void }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  const ref = useRef<HTMLDivElement>(null);
  const today = ymdLocal(new Date());
  // Se recalcula si cambia el día (app abierta pasada la medianoche).
  const days = useMemo(() => {
    const base = midnight(today);
    return Array.from({ length: 61 }, (_, i) => ymdLocal(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i - 30)));
  }, [today]);
  // Centra el día elegido (o hoy) en la tira.
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-day="${day ?? today}"]`);
    if (el && ref.current) ref.current.scrollLeft = el.offsetLeft - ref.current.clientWidth / 2 + el.clientWidth / 2;
  }, [day, today]);
  const max = ymdLocal(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 90));
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(null)}
          className={`shrink-0 rounded-2xl px-3 py-2 text-sm font-extrabold ${day === null ? "bg-brand text-white" : "bg-card text-muted"}`}
        >
          ⭐ {fr ? "À venir" : "Lo próximo"}
        </button>
        <label className="relative shrink-0 rounded-2xl bg-card px-3 py-2 text-sm font-bold text-muted">
          📅 {fr ? "Date" : "Fecha"}
          <input
            type="date"
            min={ymdLocal(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 110))}
            max={max}
            value={day ?? today}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="absolute inset-0 opacity-0"
            aria-label={fr ? "Choisir une date" : "Elegir una fecha"}
          />
        </label>
      </div>
      <div ref={ref} className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4">
        {days.map((d) => {
          const dt = midnight(d);
          const on = d === day;
          const isToday = d === today;
          return (
            <button
              key={d}
              data-day={d}
              onClick={() => onChange(d)}
              className={`flex w-12 shrink-0 flex-col items-center rounded-2xl py-1.5 ${on ? "bg-text text-bg" : isToday ? "bg-card text-brand" : "bg-card text-muted"}`}
            >
              <span className="text-[10px] font-bold uppercase">{isToday ? (fr ? "auj." : "hoy") : dt.toLocaleDateString(locale(lang), { weekday: "short" }).replace(".", "")}</span>
              <span className="font-score text-xl leading-none font-extrabold">{dt.getDate()}</span>
              <span className="text-[10px]">{dt.toLocaleDateString(locale(lang), { month: "short" }).replace(".", "")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Un día del calendario: todo lo de tus deportes ese día, agrupado por competición.
function DayView({ events, favIds, day }: { events: SportEvent[]; favIds: Set<string>; day: string }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  const groups = useMemo(() => {
    const m = new Map<string, { title: string; items: SportEvent[] }>();
    const isToday = day === ymdLocal(new Date());
    for (const e of events) {
      // Seguridad extra: solo lo que cae en ese día (hora del teléfono); un torneo en curso, solo en "hoy".
      const sameDay = ymdLocal(new Date(e.start)) === day;
      if (!sameDay && !(isToday && e.allDay && e.status === "in")) continue;
      const k = e.competitionId;
      const meta = sportMeta(e.sport);
      const title = `${meta.emoji} ${e.sport === "f1" ? meta.name[lang] : leagueMeta(k)?.name[lang] ?? e.competitionName}`;
      if (!m.has(k)) m.set(k, { title, items: [] });
      m.get(k)!.items.push(e);
    }
    // Primero las competiciones con partidos de tus favoritos.
    const fav = (e: SportEvent) => favIds.has(`${e.sport}:${e.home?.id}`) || favIds.has(`${e.sport}:${e.away?.id}`);
    return Array.from(m.values()).sort((a, b) => Number(b.items.some(fav)) - Number(a.items.some(fav)));
  }, [events, favIds, lang, day]);
  const label = fmtDay(midnight(day).toISOString(), lang);
  if (!groups.length)
    return (
      <p className="rounded-2xl bg-card px-5 py-8 text-center text-muted">
        {label} : {fr ? "rien pour tes sports et favoris ce jour-là." : "nada de tus deportes y favoritos ese día."}
      </p>
    );
  return (
    <div className="space-y-7">
      <h2 className="text-lg font-extrabold capitalize">{label}</h2>
      {groups.map((g) => (
        <Section key={g.title} title={g.title}>
          {g.items.map((e) => (
            <EventCard key={`${e.sport}-${e.id}`} e={e} favIds={favIds} />
          ))}
        </Section>
      ))}
    </div>
  );
}


// Cuenta regresiva hasta el próximo partido de tus favoritos.
function NextUp({ e }: { e: SportEvent }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const ms = new Date(e.start).getTime() - now;
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const left = d > 0 ? `${d} ${fr ? "j" : "d"} ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
  const name =
    e.sport === "f1" ? gpName(e.competitionName, lang) : e.home && e.away ? `${e.home.short ?? e.home.name} – ${e.away.short ?? e.away.name}` : e.title ?? e.competitionName;
  return (
    <Link href={e.link ?? "/"} className="mb-5 flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
      <span className="text-2xl">{sportMeta(e.sport).emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold tracking-wide text-muted uppercase">{fr ? "Prochain match" : "Próximo partido"}</span>
        <span className="block leading-tight font-bold">{name}</span>
      </span>
      <span className="text-right">
        <span className="block text-[11px] text-muted">{fr ? "dans" : "en"}</span>
        <span className="font-score text-xl font-extrabold whitespace-nowrap text-brand">{left}</span>
      </span>
    </Link>
  );
}
