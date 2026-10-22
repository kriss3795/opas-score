"use client";

import BackButton from "@/components/BackButton";

import { use, useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/client/store";
import { fmtDay, fmtTime, isInFrance, locale } from "@/lib/i18n";
import { leagueMeta, sportMeta } from "@/lib/catalog";
import { leaderLabel, periodLabels, roleLabel, scoreTypeLabel, statLabel } from "@/lib/statLabels";
import TeamLogo from "@/components/TeamLogo";
import { EloBar, FactsCard } from "@/components/Facts";
import Pitch from "@/components/Pitch";
import { IconBell, IconSofa, IconTv } from "@/components/Icons";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Tab = "summary" | "stats" | "lineups" | "players" | "preview";

export default function MatchPage({ params }: { params: Promise<{ league: string; id: string }> }) {
  const { league, id } = use(params);
  const { t, lang, prefs } = useApp();
  const fr = lang === "fr";
  const playersParam = (prefs.athletes ?? []).map((a) => a.name).join(",");
  const [m, setM] = useState<any>(undefined);
  const [facts, setFacts] = useState<any[]>([]);
  const [sofa, setSofa] = useState(false);
  const [tab, setTab] = useState<Tab>("summary");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    setM(undefined);
    const load = () =>
      fetch(`/api/match?league=${league}&id=${id}`)
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          setM((p: typeof m) => d.match ?? (p ? p : null));
          timer = setTimeout(load, d.match?.state === "in" ? 20000 : 300000);
        })
        .catch(() => {
          if (!alive) return;
          // Un corte de red durante el partido no borra la pantalla: se mantiene lo último y se reintenta.
          setM((p: typeof m) => (p ? p : null));
          timer = setTimeout(load, 60000);
        });
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [league, id]);

  // Se recalculan cuando cambia el marcador o el estado (p. ej. un gol de un jugador seguido).
  const factsKey = m ? `${m.state}-${m.home?.score}-${m.away?.score}` : "";
  useEffect(() => {
    let alive = true;
    fetch(`/api/facts?league=${league}&id=${id}&players=${encodeURIComponent(playersParam)}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setFacts(d.facts ?? []);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [league, id, playersParam, factsKey]);

  const meta = leagueMeta(league);
  const tv = isInFrance() ? meta?.tvFR : undefined;

  const tabs = useMemo(() => {
    if (!m) return [];
    const list: [Tab, string][] = [["summary", fr ? "Résumé" : "Resumen"]];
    if (m.teamStats?.length) list.push(["stats", fr ? "Stats" : "Estadísticas"]);
    if (m.lineups?.length) list.push(["lineups", fr ? "Compos" : "Alineaciones"]);
    if (m.boxscore?.length) list.push(["players", fr ? "Joueurs" : "Jugadores"]);
    if (m.h2h?.length || Object.keys(m.form ?? {}).length || m.table?.length) list.push(["preview", fr ? "Avant-match" : "Previa"]);
    return list;
  }, [m, fr]);

  if (m === undefined)
    return (
      <div className="pt-safe space-y-3 p-4">
        <div className="h-56 animate-pulse rounded-3xl bg-card" />
        <div className="h-40 animate-pulse rounded-3xl bg-card" />
      </div>
    );
  if (m === null)
    return (
      <div className="pt-safe p-4">
        <Back />
        <p className="mt-6 rounded-2xl bg-card px-5 py-8 text-center text-muted">{t("dataError")}</p>
      </div>
    );

  const sport = m.sport as string;
  const live = m.state === "in";
  const ht = m.statusName?.includes("HALFTIME") && !m.statusName?.includes("ET");
  // Aplazado o cancelado: la fuente lo marca como "terminado" con 0-0; no se muestra como resultado.
  const off = /POSTPONED|CANCELED|CANCELLED|ABANDONED/.test(m.statusName ?? "");
  const offText = /POSTPONED/.test(m.statusName ?? "") ? t("postponed") : fr ? "Annulé" : "Cancelado";
  const SPECIAL: Record<string, string> = {
    PEN: fr ? "Tirs au but" : "Penales",
    BRK: fr ? "Pause" : "Pausa",
    SUSP: fr ? "Interrompu" : "Suspendido",
  };
  const clockText = SPECIAL[m.detail] ?? (["football", "rugby"].includes(sport) ? m.clock : m.detail);
  const status = off ? offText : live ? (ht ? t("halftime") : clockText) : m.state === "post" ? `${t("final")}${m.detail === "AET" ? (fr ? (sport === "football" ? " (a.p.)" : " (prol.)") : " (prórroga)") : ""}` : m.start ? `${fmtDay(m.start, lang)} · ${fmtTime(m.start, lang)}` : "";

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
        {m.home?.pen !== undefined && m.away?.pen !== undefined && (
          <div className="font-score text-4xl font-bold text-muted">
            ({m.home.pen}-{m.away.pen} {fr ? "t.a.b." : "pen."})
          </div>
        )}
        <div className="text-sm text-muted">{t("close")}</div>
      </button>
    );

  const teamOf = (tid: string) => (tid === m.home?.id ? m.home : tid === m.away?.id ? m.away : null);

  return (
    <div className="pt-safe space-y-4 px-4 pb-4">
      <div className="flex items-center justify-between pt-1">
        <Back />
        <div className="flex items-center gap-2">
          {m.state !== "post" && !off && <MuteButton id={id} />}
          <button onClick={() => setSofa(true)} className="flex items-center gap-2 rounded-full bg-card px-3 py-2 text-sm font-semibold">
            <IconSofa className="h-5 w-5" /> {fr ? "Mode canapé" : "Modo sofá"}
          </button>
        </div>
      </div>

      {/* Marcador */}
      <section className="rounded-3xl bg-card p-5 text-center">
        <div className="mb-4 text-xs font-bold tracking-wider text-muted uppercase">
          {sportMeta(meta?.sport ?? "football").emoji} {meta?.name[lang]}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <TeamHead s={m.home} />
          <div className="font-score px-1 text-6xl font-extrabold whitespace-nowrap">
            {m.state === "pre" || off ? (
              <span className="text-4xl">{m.start ? fmtTime(m.start, lang) : ""}</span>
            ) : (
              <>
                {m.home?.score}
                <span className="mx-1.5 text-muted">-</span>
                {m.away?.score}
              </>
            )}
          </div>
          <TeamHead s={m.away} />
        </div>
        {m.home?.pen !== undefined && m.away?.pen !== undefined && (
          <div className="font-score mt-1 text-lg font-bold text-muted">
            ({m.home.pen}-{m.away.pen} {fr ? "t.a.b." : "pen."})
          </div>
        )}
        <div className={`mt-3 flex items-center justify-center gap-2 text-sm font-bold ${live ? "text-live" : "text-muted"}`}>
          {live && <span className="live-dot h-2 w-2 rounded-full bg-live" />}
          {m.state === "pre" && m.start && !off ? fmtDay(m.start, lang) : status}
        </div>
        {/* Goleadores bajo el marcador (fútbol) */}
        {m.timeline?.some((x: any) => ["goal", "penalty", "owngoal"].includes(x.kind)) && (
          <div className="mt-3 grid grid-cols-2 gap-3 text-left text-xs text-muted">
            {[m.home, m.away].map((s: any, i: number) => (
              <div key={i} className={i ? "text-right" : ""}>
                {m.timeline
                  .filter((x: any) => ["goal", "penalty", "owngoal"].includes(x.kind) && x.teamId === s?.id)
                  .map((x: any, k: number) => (
                    <div key={k}>
                      ⚽ {x.player} {x.clock}
                      {x.kind === "penalty" ? " (pen.)" : x.kind === "owngoal" ? (fr ? " (csc)" : " (e.c.)") : ""}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}
        <Linescores m={m} />
        {m.state !== "pre" && !off && m.home && m.away && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `${sportMeta(meta?.sport ?? "football").emoji} ${m.home.name} ${m.home.score}-${m.away.score} ${m.away.name}` +
                `${m.home.pen !== undefined && m.away.pen !== undefined ? ` (${m.home.pen}-${m.away.pen} ${fr ? "t.a.b." : "pen."})` : ""}` +
                ` · ${live ? status : t("final")} · ${meta?.name[lang] ?? ""}\n— Opa's Score`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="mx-auto mt-4 flex w-fit items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-1.5 text-sm font-bold text-white"
          >
            {fr ? "Partager le score" : "Compartir el marcador"}
          </a>
        )}
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

      {/* Pestañas */}
      {tabs.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          {tabs.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${tab === k ? "bg-text text-bg" : "bg-card text-muted"}`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {tab === "summary" && (
        <>
          {m.elo && m.home && m.away && <EloBar elo={m.elo} home={m.home.name} away={m.away.name} prematch={m.state !== "pre"} />}
          <FactsCard facts={facts} />
          <Timeline m={m} teamOf={teamOf} />
          {m.teamStats?.length > 0 && <StatsBars stats={m.teamStats.slice(0, 6)} sport={sport} season={m.state === "pre"} />}
          <Leaders m={m} teamOf={teamOf} />
          <Info m={m} />
        </>
      )}
      {tab === "stats" && <StatsBars stats={m.teamStats} sport={sport} all season={m.state === "pre"} />}
      {tab === "lineups" && <Lineups m={m} teamOf={teamOf} />}
      {tab === "players" && <Boxscore m={m} teamOf={teamOf} />}
      {tab === "preview" && <Preview m={m} />}

      <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="block px-1 text-xs text-muted underline">
        {t("source")} : ESPN
      </a>
    </div>
  );
}

function TeamHead({ s }: { s: any }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <TeamLogo src={s?.logo} name={s?.name ?? ""} size={56} />
      <span className="text-sm leading-tight font-bold">{s?.name}</span>
      {s?.record && <span className="text-[11px] text-muted">{s.record}</span>}
    </div>
  );
}

// Silenciar los avisos de este partido (por ejemplo, si lo estás viendo en vivo y no quieres spoilers).
function MuteButton({ id }: { id: string }) {
  const { prefs, update, lang } = useApp();
  const fr = lang === "fr";
  const muted = (prefs.muted ?? []).includes(id);
  return (
    <button
      onClick={() => update((p) => ({ muted: muted ? (p.muted ?? []).filter((x) => x !== id) : [...(p.muted ?? []), id].slice(-100) }))}
      className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold ${muted ? "bg-live/15 text-live" : "bg-card"}`}
    >
      <IconBell className="h-5 w-5" off={muted} />
      {muted ? (fr ? "Muet" : "Silenciado") : fr ? "Notifs" : "Avisos"}
    </button>
  );
}

function Back() {
  return <BackButton />;
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-card p-4">
      {title && <h3 className="mb-3 font-bold">{title}</h3>}
      {children}
    </section>
  );
}

// Parciales por periodo (cuartos, tiempos, entradas…).
function Linescores({ m }: { m: any }) {
  const { lang } = useApp();
  const n = Math.max(m.home?.linescores?.length ?? 0, m.away?.linescores?.length ?? 0);
  if (n < 2 || m.sport === "football") return null;
  const labels = periodLabels(m.sport, n, lang);
  return (
    <div className="no-scrollbar mt-4 overflow-x-auto">
      <table className="w-full text-center text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th className="text-left font-semibold"></th>
            {labels.map((l) => (
              <th key={l} className="px-1.5 font-semibold">
                {l}
              </th>
            ))}
            <th className="px-1.5 font-semibold">T</th>
          </tr>
        </thead>
        <tbody>
          {[m.home, m.away].map((s: any, i: number) => (
            <tr key={i}>
              <td className="py-1 text-left font-semibold">{s?.short ?? s?.name}</td>
              {Array.from({ length: n }, (_, k) => (
                <td key={k} className="font-score px-1.5 text-base">
                  {s?.linescores?.[k] ?? ""}
                </td>
              ))}
              <td className="font-score px-1.5 text-base font-extrabold">{s?.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ICON: Record<string, string> = {
  goal: "⚽",
  penalty: "⚽",
  owngoal: "⚽",
  penmiss: "❌",
  yellow: "🟨",
  red: "🟥",
  sub: "🔄",
  var: "📺",
  try: "🏉",
  conversion: "🎯",
  dropgoal: "🦶",
  score: "🔥",
  penaltybox: "⏱️",
  penaltykick: "🎯",
  soGoal: "✅",
  soMiss: "❌",
};

function Timeline({ m, teamOf }: { m: any; teamOf: (id: string) => any }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  const items = (m.timeline ?? []).filter((x: any) => x.kind !== "period");
  if (!items.length) return null;
  const label = (x: any) => {
    switch (x.kind) {
      case "penalty":
        return fr ? "Penalty" : "Penal";
      case "owngoal":
        return fr ? "Contre son camp" : "En contra";
      case "penmiss":
        return fr ? "Penalty manqué" : "Penal fallado";
      case "var":
        return "VAR";
      case "try":
        return fr ? "Essai" : "Try";
      case "conversion":
        return fr ? "Transformation" : "Conversión";
      case "dropgoal":
        return "Drop";
      case "penaltybox":
        return fr ? "Pénalité" : "Penalización";
      case "penaltykick":
        return fr ? "Pénalité réussie" : "Penal convertido";
      case "soGoal":
        return fr ? "Tir au but réussi" : "Penal convertido (tanda)";
      case "soMiss":
        return fr ? "Tir au but manqué" : "Penal fallado (tanda)";
      case "score":
        return scoreTypeLabel(x.detail, lang);
      default:
        return "";
    }
  };
  return (
    <Card title={fr ? "Faits de match" : "Incidencias"}>
      <ul className="space-y-2.5">
        {items.map((x: any, i: number) => {
          const isHome = x.teamId === m.home?.id;
          const team = teamOf(x.teamId);
          return (
            <li key={i} className={`flex items-start gap-2 text-sm ${isHome ? "" : "flex-row-reverse text-right"}`}>
              <span className="font-score w-11 shrink-0 text-center font-bold text-muted">
                {x.clock}
                {x.period && m.sport !== "football" ? <span className="block text-[10px]">P{x.period}</span> : null}
              </span>
              <span className="shrink-0">{ICON[x.kind] ?? "•"}</span>
              <span className="min-w-0 leading-snug">
                {x.kind === "sub" ? (
                  <>
                    <span className="font-semibold text-football">↑ {x.player}</span>
                    {x.second && <span className="block text-muted">↓ {x.second}</span>}
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{x.player ?? team?.short ?? team?.name}</span>
                    {label(x) && <span className="text-muted"> · {label(x)}</span>}
                    {x.kind === "goal" && x.second && <span className="block text-xs text-muted">{fr ? "Passe" : "Asist."} : {x.second}</span>}
                    {x.score && <span className="font-score block text-base font-bold">{x.score}</span>}
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function StatsBars({ stats, sport, all, season }: { stats: any[]; sport: string; all?: boolean; season?: boolean }) {
  const { lang } = useApp();
  if (!stats?.length) return null;
  const num = (v: string) => {
    // "31:20" (tiempo de posesión) se compara en segundos.
    const t = String(v).match(/^(\d+):(\d{2})$/);
    if (t) return Number(t[1]) * 60 + Number(t[2]);
    const x = parseFloat(String(v).replace("%", "").replace(",", "."));
    return Number.isFinite(x) ? x : 0;
  };
  // En faltas, tarjetas o pérdidas, tener menos es lo mejor: se resalta al que tiene menos.
  const lowerBetter = (name: string) => /foul|yellow|red|turnover|offside|penalt(y|ies)Yards|interceptionsThrown|sacksAllowed|giveaway|error/i.test(name);
  return (
    <Card
      title={
        season
          ? lang === "fr"
            ? "Statistiques de la saison"
            : "Estadísticas de la temporada"
          : all
            ? undefined
            : lang === "fr"
              ? "Statistiques"
              : "Estadísticas"
      }
    >
      <ul className="space-y-3">
        {stats.map((s: any) => {
          const h = num(s.home);
          const a = num(s.away);
          const tot = h + a || 1;
          const homeBest = lowerBetter(s.name) ? h <= a : h >= a;
          const awayBest = lowerBetter(s.name) ? a <= h : a >= h;
          const pair = /-/.test(String(s.home)) && sport !== "football";
          return (
            <li key={s.name}>
              <div className="mb-1 flex justify-between gap-2 text-sm">
                <span className="font-score text-lg font-bold">{s.home}</span>
                <span className="text-center leading-tight text-muted">{statLabel(s.name, s.label, lang)}</span>
                <span className="font-score text-lg font-bold">{s.away}</span>
              </div>
              {!pair && (
                <div className="flex h-1.5 gap-1">
                  <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-card2">
                    <div className={`rounded-full ${homeBest ? "bg-brand" : "bg-brand/40"}`} style={{ width: `${(h / tot) * 100}%` }} />
                  </div>
                  <div className="flex-1 overflow-hidden rounded-full bg-card2">
                    <div className={`h-full rounded-full ${awayBest ? "bg-brand2" : "bg-brand2/40"}`} style={{ width: `${(a / tot) * 100}%` }} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Lineups({ m, teamOf }: { m: any; teamOf: (id: string) => any }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  return (
    <div className="space-y-3">
      {m.lineups.map((l: any) => {
        const team = teamOf(l.teamId);
        return (
          <Card key={l.teamId}>
            <div className="mb-3 flex items-center gap-2">
              <TeamLogo src={team?.logo} name={team?.name ?? ""} size={24} />
              <span className="flex-1 font-bold">{team?.name}</span>
              {l.formation && <span className="font-score rounded-md bg-card2 px-2 py-0.5 text-sm font-bold">{l.formation}</span>}
            </div>
            <Pitch starters={l.starters} formation={l.formation} color={team?.color} />
            <h4 className="mt-4 mb-2 text-xs font-bold tracking-wider text-muted uppercase">{fr ? "Titulaires" : "Titulares"}</h4>
            <PlayerList players={l.starters} />
            {l.bench.length > 0 && (
              <>
                <h4 className="mt-4 mb-2 text-xs font-bold tracking-wider text-muted uppercase">{fr ? "Remplaçants" : "Suplentes"}</h4>
                <PlayerList players={l.bench} muted />
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function PlayerList({ players, muted }: { players: any[]; muted?: boolean }) {
  const { prefs } = useApp();
  const followed = new Set((prefs.athletes ?? []).map((a) => a.name));
  return (
    <ul className="space-y-1.5">
      {players.map((p: any, i: number) => (
        <li key={i} className={`flex items-center gap-2 text-sm ${muted && p.subIn === undefined ? "text-muted" : ""}`}>
          <span className="font-score w-7 text-center font-bold text-muted">{p.jersey}</span>
          <span className={`min-w-0 flex-1 leading-tight ${followed.has(p.name) ? "font-extrabold text-gold" : "font-medium"}`}>
            {p.name}
            {p.goals ? <span className="ml-1">{"⚽".repeat(Math.min(p.goals, 4))}</span> : null}
            {p.yellow && <span className="ml-1">🟨</span>}
            {p.red && <span className="ml-1">🟥</span>}
          </span>
          {p.subOut !== undefined && <span className="text-xs text-live">↓ {p.subOut}</span>}
          {p.subIn !== undefined && <span className="text-xs text-football">↑ {p.subIn}</span>}
          <span className="w-9 text-right text-xs text-muted">{p.pos}</span>
        </li>
      ))}
    </ul>
  );
}

// Abreviaturas de la planilla (la fuente las da en inglés).
const BOX: Record<string, [string, string]> = {
  MIN: ["MIN", "MIN"],
  PTS: ["PTS", "PTS"],
  REB: ["REB", "REB"],
  AST: ["PD", "AST"],
  TO: ["BP", "PER"],
  STL: ["INT", "ROB"],
  BLK: ["CTR", "TAP"],
  PF: ["F", "FP"],
  OREB: ["RO", "RO"],
  DREB: ["RD", "RD"],
  FG: ["TIRS", "TC"],
  "3PT": ["3PTS", "TRIPLES"],
  FT: ["LF", "TL"],
  G: ["B", "G"],
  A: ["PD", "A"],
  SOG: ["TC", "TA"],
  PIM: ["PÉN", "PEN"],
  SV: ["ARR", "ATJ"],
};
const boxLabel = (l: string, lang: "fr" | "es") => BOX[l]?.[lang === "fr" ? 0 : 1] ?? l;
// Grupos de la planilla (NFL, béisbol, hockey).
const GROUPS: Record<string, [string, string]> = {
  passing: ["Passes", "Pases"],
  rushing: ["Courses", "Carreras"],
  receiving: ["Réceptions", "Recepciones"],
  fumbles: ["Fumbles", "Balones sueltos"],
  defensive: ["Défense", "Defensa"],
  interceptions: ["Interceptions", "Intercepciones"],
  kickreturns: ["Retours de coup d'envoi", "Devoluciones de patada"],
  puntreturns: ["Retours de punt", "Devoluciones de despeje"],
  kicking: ["Coups de pied", "Pateo"],
  punting: ["Punts", "Despejes"],
  batting: ["Frappe", "Bateo"],
  pitching: ["Lanceurs", "Pitcheo"],
  forwards: ["Attaquants", "Delanteros"],
  defenses: ["Défenseurs", "Defensas"],
  goalies: ["Gardiens", "Porteros"],
};
const groupLabel = (g: string, lang: "fr" | "es") => GROUPS[g.toLowerCase()]?.[lang === "fr" ? 0 : 1] ?? g.charAt(0).toUpperCase() + g.slice(1);

function Boxscore({ m, teamOf }: { m: any; teamOf: (id: string) => any }) {
  const { lang } = useApp();
  const [team, setTeam] = useState(0);
  const b = m.boxscore[team];
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {m.boxscore.map((x: any, i: number) => (
          <button key={x.teamId} onClick={() => setTeam(i)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold ${team === i ? "bg-text text-bg" : "bg-card text-muted"}`}>
            <TeamLogo src={teamOf(x.teamId)?.logo} name={teamOf(x.teamId)?.name ?? ""} size={18} />
            {teamOf(x.teamId)?.short ?? teamOf(x.teamId)?.name}
          </button>
        ))}
      </div>
      {b?.groups.map((g: any, gi: number) => (
        <Card key={gi} title={g.title ? groupLabel(g.title, lang) : undefined}>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="sticky left-0 bg-card py-1 pr-3 text-left font-semibold"></th>
                  {g.labels.map((l: string, i: number) => (
                    <th key={i} className="px-2 text-center font-semibold">
                      {boxLabel(l, lang)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r: any, i: number) => (
                  <tr key={i} className="border-t border-line">
                    <td className={`sticky left-0 bg-card py-1.5 pr-3 ${r.starter ? "font-semibold" : "text-muted"}`}>{r.name}</td>
                    {r.stats.map((v: string, k: number) => (
                      <td key={k} className="font-score px-2 text-center text-base">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
                {g.totals && (
                  <tr className="border-t-2 border-line font-bold">
                    <td className="sticky left-0 bg-card py-1.5 pr-3">Total</td>
                    {g.totals.map((v: string, k: number) => (
                      <td key={k} className="font-score px-2 text-center text-base">
                        {v}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Leaders({ m, teamOf }: { m: any; teamOf: (id: string) => any }) {
  const { lang } = useApp();
  if (!m.leaders?.length) return null;
  return (
    <Card title={lang === "fr" ? "Meilleurs joueurs" : "Figuras"}>
      <ul className="space-y-2">
        {m.leaders.slice(0, 8).map((l: any, i: number) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <TeamLogo src={teamOf(l.teamId)?.logo} name={teamOf(l.teamId)?.name ?? ""} size={20} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="font-semibold">{l.name}</span>
              <span className="block text-xs text-muted">
                {leaderLabel(l.category, l.label, lang)}
                {l.matches ? ` · ${l.matches} ${lang === "fr" ? "matchs" : "partidos"}` : ""}
              </span>
            </span>
            <span className="font-score text-lg font-bold">{l.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Info({ m }: { m: any }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  const rows: [string, string][] = [];
  if (m.start) rows.push([fr ? "Date" : "Fecha", `${fmtDay(m.start, lang)} · ${fmtTime(m.start, lang)}`]);
  if (m.venue) rows.push([fr ? "Stade" : "Estadio", `${m.venue}${m.city ? `, ${m.city}` : ""}`]);
  if (m.capacity) rows.push([fr ? "Capacité" : "Capacidad", Number(m.capacity).toLocaleString(locale(lang))]);
  if (m.attendance) rows.push([fr ? "Affluence" : "Asistencia", Number(m.attendance).toLocaleString(locale(lang))]);
  for (const o of m.officials ?? []) rows.push([roleLabel(o.role || "referee", lang), o.name]);
  if (!rows.length) return null;
  return (
    <Card title={fr ? "Infos du match" : "Datos del partido"}>
      <dl className="space-y-1.5 text-sm">
        {rows.map(([k, v], i) => (
          <div key={i} className="flex justify-between gap-3">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Preview({ m }: { m: any }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  const ids = [m.home?.id, m.away?.id];
  const color = (r: string) => (r === "W" ? "bg-football text-white" : r === "L" ? "bg-live text-white" : "bg-muted/40 text-text");
  const letter = (r: string) => (r === "W" ? (fr ? "V" : "G") : r === "L" ? (fr ? "D" : "P") : fr ? "N" : "E");
  const table = m.table as any[] | null;
  const idx = table ? table.map((r, i) => (ids.includes(r.teamId) ? i : -1)).filter((i) => i >= 0) : [];
  const shown = table ? table.filter((_, i) => i < 3 || idx.some((j) => Math.abs(j - i) <= 1)) : [];
  return (
    <div className="space-y-3">
      {Object.keys(m.form ?? {}).length > 0 && (
        <Card title={fr ? "Forme récente" : "Forma reciente"}>
          {[m.home, m.away].map((s: any) =>
            m.form[s?.id]?.length ? (
              <div key={s.id} className="mb-3 last:mb-0">
                <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                  <TeamLogo src={s.logo} name={s.name} size={18} /> {s.name}
                </div>
                <ul className="space-y-1 text-sm">
                  {m.form[s.id].map((g: any, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${color(g.result)}`}>{letter(g.result)}</span>
                      <span className="min-w-0 flex-1 truncate text-muted">
                        {fr ? "contre" : "vs"} {g.opp} · {g.home ? (fr ? "domicile" : "local") : fr ? "extérieur" : "visita"}
                      </span>
                      <span className="font-score font-bold">{g.score}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </Card>
      )}
      {m.h2h?.length > 0 && (
        <Card title={fr ? "Face-à-face" : "Enfrentamientos directos"}>
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
        </Card>
      )}
      {shown.length > 0 && (
        <Card title={fr ? "Classement" : "Tabla"}>
          <ul className="text-sm">
            {shown.map((r: any) => (
              <li key={r.rank + r.name} className={`flex items-center gap-2 border-b border-line py-1.5 last:border-0 ${ids.includes(r.teamId) ? "font-extrabold text-brand" : ""}`}>
                <span className="font-score w-6 text-center text-muted">{r.rank}</span>
                <TeamLogo src={r.logo} name={r.name} size={18} />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="w-8 text-center text-xs text-muted">{r.played}</span>
                <span className="font-score w-8 text-center text-base font-bold">{r.points}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
