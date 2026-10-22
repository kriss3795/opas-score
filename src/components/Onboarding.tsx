"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/client/store";
import { LEAGUES, SPORTS } from "@/lib/catalog";
import type { DriverOption, SportId, TeamOption } from "@/lib/types";
import { IconCheck, IconSearch, SportIcon } from "./Icons";
import TeamLogo from "./TeamLogo";

type Step = "sports" | "leagues" | "teams" | "drivers";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default function Onboarding({ editing = false }: { editing?: boolean }) {
  const { prefs, update, t, lang } = useApp();
  const router = useRouter();
  const [sports, setSports] = useState<SportId[]>(prefs.sports);
  const [leagues, setLeagues] = useState<string[]>(prefs.leagues);
  const [teams, setTeams] = useState<TeamOption[]>(prefs.teams);
  const [drivers, setDrivers] = useState<DriverOption[]>(prefs.drivers);
  const [step, setStep] = useState<Step>("sports");

  const steps = useMemo<Step[]>(() => {
    const s: Step[] = ["sports"];
    if (sports.includes("football")) s.push("leagues", "teams");
    if (sports.includes("f1")) s.push("drivers");
    return s;
  }, [sports]);
  const idx = steps.indexOf(step);

  const finish = () => {
    update({ sports, leagues, teams, drivers, onboarded: true });
    if (editing) router.push("/settings");
  };
  const next = () => (idx < steps.length - 1 ? setStep(steps[idx + 1]) : finish());
  const back = () => (idx > 0 ? setStep(steps[idx - 1]) : editing ? router.push("/settings") : undefined);

  const toggle = <T,>(list: T[], item: T, eq: (a: T, b: T) => boolean) =>
    list.some((x) => eq(x, item)) ? list.filter((x) => !eq(x, item)) : [...list, item];

  return (
    <div className="pt-safe mx-auto flex min-h-dvh max-w-xl flex-col px-5">
      <div className="flex gap-1.5 pt-3">
        {steps.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${i <= idx ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>

      <div className="flex-1 pb-32">
        {step === "sports" && (
          <section>
            <Title title={t("chooseSports")} sub={t("chooseSportsSub")} />
            <div className="grid grid-cols-2 gap-3">
              {SPORTS.map((s) => {
                const on = sports.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSports(toggle(sports, s.id, (a, b) => a === b))}
                    className="relative flex aspect-[4/3] flex-col items-start justify-end rounded-3xl border-2 p-4 text-left transition-all active:scale-[0.97]"
                    style={{
                      borderColor: on ? s.color : "var(--line)",
                      background: on ? `color-mix(in srgb, ${s.color} 16%, var(--card))` : "var(--card)",
                    }}
                  >
                    <SportIcon sport={s.id} className="mb-auto h-9 w-9" />
                    <span className="text-lg font-extrabold">{s.name[lang]}</span>
                    {on && (
                      <span className="absolute top-3 right-3 rounded-full p-1 text-white" style={{ background: s.color }}>
                        <IconCheck className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-6 text-sm text-muted">
              {lang === "fr"
                ? "D'autres sports (rugby, tennis, basket, MotoGP…) arrivent bientôt."
                : "Pronto llegarán más deportes (rugby, tenis, básquetbol, MotoGP…)."}
            </p>
          </section>
        )}

        {step === "leagues" && (
          <section>
            <Title title={t("chooseLeagues")} sub={t("chooseLeaguesSub")} />
            {(["france", "europe", "intl", "world"] as const).map((g) => (
              <div key={g} className="mb-5">
                <h3 className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">{t(g)}</h3>
                <div className="overflow-hidden rounded-2xl bg-card">
                  {LEAGUES.filter((l) => l.group === g).map((l) => {
                    const on = leagues.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        onClick={() => setLeagues(toggle(leagues, l.id, (a, b) => a === b))}
                        className="flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left last:border-0"
                      >
                        <span className="text-xl">{l.flag}</span>
                        <span className="flex-1 font-semibold">{l.name[lang]}</span>
                        <Check on={on} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {step === "teams" && (
          <TeamPicker selected={teams} onToggle={(tm) => setTeams(toggle(teams, tm, (a, b) => a.id === b.id))} leagues={leagues} />
        )}

        {step === "drivers" && (
          <DriverPicker selected={drivers} onToggle={(d) => setDrivers(toggle(drivers, d, (a, b) => a.id === b.id))} />
        )}
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent pt-8">
        <div className="mx-auto flex max-w-xl gap-3 px-5 pb-3">
          {(idx > 0 || editing) && (
            <button onClick={back} className="rounded-2xl bg-card px-6 py-4 font-bold">
              {t("back")}
            </button>
          )}
          <button
            onClick={next}
            disabled={step === "sports" && sports.length === 0}
            className="flex-1 rounded-2xl bg-brand py-4 text-lg font-extrabold text-white disabled:opacity-40"
          >
            {idx === steps.length - 1 ? t("done") : t("next")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Title({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mt-8 mb-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{sub}</p>
    </div>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
        on ? "border-brand bg-brand text-white" : "border-line"
      }`}
    >
      {on && <IconCheck className="h-4 w-4" />}
    </span>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="sticky top-0 z-10 -mx-5 bg-bg px-5 pt-2 pb-3">
      <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5">
        <IconSearch className="h-5 w-5 text-muted" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-base outline-none placeholder:text-muted"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  );
}

function TeamPicker({
  selected,
  onToggle,
  leagues,
}: {
  selected: TeamOption[];
  onToggle: (t: TeamOption) => void;
  leagues: string[];
}) {
  const { t } = useApp();
  const [all, setAll] = useState<TeamOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setAll(d.teams ?? []))
      .catch(() => setFailed(true));
  }, []);

  const results = useMemo(() => {
    if (!all) return [];
    const nq = norm(q.trim());
    if (nq) return all.filter((tm) => norm(tm.name).includes(nq) || norm(tm.short ?? "").includes(nq)).slice(0, 60);
    // Sin búsqueda: equipos de las competiciones elegidas (o de Ligue 1 por defecto).
    const pool = leagues.length ? leagues : ["fra.1"];
    return all.filter((tm) => tm.leagues.some((l) => pool.includes(l))).slice(0, 80);
  }, [all, q, leagues]);

  return (
    <section>
      <Title title={t("chooseTeams")} sub={t("chooseTeamsSub")} />
      {selected.length > 0 && (
        <div className="no-scrollbar -mx-5 mb-2 flex gap-2 overflow-x-auto px-5">
          {selected.map((tm) => (
            <button key={tm.id} onClick={() => onToggle(tm)} className="flex shrink-0 items-center gap-2 rounded-full bg-brand/15 py-1.5 pr-3 pl-1.5 text-sm font-semibold text-brand">
              <TeamLogo src={tm.logo} name={tm.name} size={22} />
              {tm.short ?? tm.name} ✕
            </button>
          ))}
        </div>
      )}
      <SearchBox value={q} onChange={setQ} placeholder={t("searchTeam")} />
      {failed && <p className="py-6 text-center text-muted">{t("dataError")}</p>}
      {!all && !failed && <p className="py-6 text-center text-muted">{t("loading")}</p>}
      {all && results.length === 0 && <p className="py-6 text-center text-muted">{t("noResult")}</p>}
      <div className="overflow-hidden rounded-2xl bg-card">
        {results.map((tm) => {
          const on = selected.some((x) => x.id === tm.id);
          return (
            <button key={tm.id} onClick={() => onToggle(tm)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0">
              <TeamLogo src={tm.logo} name={tm.name} size={32} />
              <span className="flex-1 font-semibold">{tm.name}</span>
              <Check on={on} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DriverPicker({ selected, onToggle }: { selected: DriverOption[]; onToggle: (d: DriverOption) => void }) {
  const { t } = useApp();
  const [all, setAll] = useState<DriverOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    fetch("/api/f1/drivers")
      .then((r) => r.json())
      .then((d) => setAll(d.drivers ?? []))
      .catch(() => setFailed(true));
  }, []);
  const results = useMemo(() => {
    const nq = norm(q.trim());
    return (all ?? []).filter((d) => !nq || norm(`${d.name} ${d.team ?? ""} ${d.code ?? ""}`).includes(nq));
  }, [all, q]);
  return (
    <section>
      <Title title={t("chooseDrivers")} sub={t("chooseDriversSub")} />
      <SearchBox value={q} onChange={setQ} placeholder={t("searchDriver")} />
      {failed && <p className="py-6 text-center text-muted">{t("dataError")}</p>}
      {!all && !failed && <p className="py-6 text-center text-muted">{t("loading")}</p>}
      <div className="overflow-hidden rounded-2xl bg-card">
        {results.map((d) => {
          const on = selected.some((x) => x.id === d.id);
          return (
            <button key={d.id} onClick={() => onToggle(d)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0">
              <span className="font-score w-10 text-center text-2xl font-extrabold text-f1">{d.number ?? ""}</span>
              <span className="flex-1">
                <span className="block font-semibold">{d.name}</span>
                {d.team && <span className="block text-sm text-muted">{d.team}</span>}
              </span>
              <Check on={on} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
