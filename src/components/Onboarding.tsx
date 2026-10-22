"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/client/store";
import { LEAGUES, SPORTS, sportMeta, type Group } from "@/lib/catalog";
import type { AthleteOption, DriverOption, PlayerOption, SportId, TeamOption } from "@/lib/types";
import { IconCheck, IconSearch } from "./Icons";
import TeamLogo from "./TeamLogo";

type Step = "sports" | "leagues" | "teams" | "athletes" | "players" | "drivers";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const GROUPS: Group[] = ["france", "europe", "intl", "americas", "world", "women"];

export default function Onboarding({ editing = false }: { editing?: boolean }) {
  const { prefs, update, t, lang } = useApp();
  const router = useRouter();
  const [sports, setSports] = useState<SportId[]>(prefs.sports);
  const [leagues, setLeagues] = useState<string[]>(prefs.leagues);
  const [teams, setTeams] = useState<TeamOption[]>(prefs.teams);
  const [drivers, setDrivers] = useState<DriverOption[]>(prefs.drivers);
  const [players, setPlayers] = useState<PlayerOption[]>(prefs.players ?? []);
  const [athletes, setAthletes] = useState<AthleteOption[]>(prefs.athletes ?? []);
  const [step, setStep] = useState<Step>("sports");
  const [available, setAvailable] = useState<Set<string> | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => setAvailable(d.available?.length ? new Set(d.available) : null))
      .catch(() => setAvailable(null));
  }, []);

  const leagueSports = sports.filter((s) => ["team", "event", "tennis"].includes(sportMeta(s).kind));
  const teamSports = sports.filter((s) => sportMeta(s).kind === "team");

  const steps = useMemo<Step[]>(() => {
    const s: Step[] = ["sports"];
    if (leagueSports.length) s.push("leagues");
    if (teamSports.length) s.push("teams", "athletes");
    if (sports.includes("tennis")) s.push("players");
    if (sports.includes("f1")) s.push("drivers");
    return s;
  }, [sports, leagueSports.length, teamSports.length]);
  const idx = steps.indexOf(step);

  const finish = () => {
    const keepSport = (sp?: SportId) => sports.includes(sp ?? "football");
    update({
      sports,
      leagues: leagues.filter((l) => keepSport(LEAGUES.find((x) => x.id === l)?.sport)),
      teams: teams.filter((tm) => keepSport(tm.sport)),
      drivers: sports.includes("f1") ? drivers : [],
      players: sports.includes("tennis") ? players : [],
      athletes: athletes.filter((a) => sports.includes(a.sport)),
      onboarded: true,
    });
    if (editing) router.push("/settings");
  };
  const next = () => (idx < steps.length - 1 ? setStep(steps[idx + 1]) : finish());
  const back = () => (idx > 0 ? setStep(steps[idx - 1]) : editing ? router.push("/settings") : undefined);

  // En Chrome reciente scrollTo devuelve una promesa: no debe usarse como función de limpieza.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

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
                    className="relative flex min-h-28 flex-col items-start justify-between gap-3 rounded-3xl border-2 p-4 text-left transition-all active:scale-[0.97]"
                    style={{
                      borderColor: on ? s.color : "var(--line)",
                      background: on ? `color-mix(in srgb, ${s.color} 16%, var(--card))` : "var(--card)",
                    }}
                  >
                    <span className="text-4xl leading-none">{s.emoji}</span>
                    <span className="text-[17px] leading-tight font-extrabold">{s.name[lang]}</span>
                    {on && (
                      <span className="absolute top-3 right-3 rounded-full p-1 text-white" style={{ background: s.color }}>
                        <IconCheck className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === "leagues" && (
          <section>
            <Title title={t("chooseLeagues")} sub={t("chooseLeaguesSub")} />
            {leagueSports.map((sp) => {
              const meta = sportMeta(sp);
              const list = LEAGUES.filter((l) => l.sport === sp && (!available || available.has(l.id)));
              if (!list.length) return null;
              return (
                <div key={sp} className="mb-8">
                  <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold" style={{ color: meta.color }}>
                    <span>{meta.emoji}</span> {meta.name[lang]}
                  </h2>
                  {GROUPS.map((g) => {
                    const items = list.filter((l) => l.group === g);
                    if (!items.length) return null;
                    return (
                      <div key={g} className="mb-4">
                        {sp === "football" || sp === "rugby" ? (
                          <h3 className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">{t(g)}</h3>
                        ) : null}
                        <div className="overflow-hidden rounded-2xl bg-card">
                          {items.map((l) => {
                            const on = leagues.includes(l.id);
                            return (
                              <button
                                key={l.id}
                                onClick={() => setLeagues(toggle(leagues, l.id, (a, b) => a === b))}
                                className="flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left last:border-0"
                              >
                                <span className="text-xl">{l.flag}</span>
                                <span className="flex-1 leading-snug font-semibold">{l.name[lang]}</span>
                                <Check on={on} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>
        )}

        {step === "teams" && (
          <TeamPicker
            selected={teams}
            onToggle={(tm) => setTeams(toggle(teams, tm, (a, b) => a.id === b.id && (a.sport ?? "football") === (b.sport ?? "football")))}
            leagues={leagues}
            sports={teamSports}
          />
        )}

        {step === "athletes" && (
          <AthletePicker selected={athletes} sports={teamSports} onToggle={(a) => setAthletes(toggle(athletes, a, (x, y) => x.id === y.id))} />
        )}

        {step === "players" && (
          <PlayerPicker selected={players} onToggle={(p) => setPlayers(toggle(players, p, (a, b) => a.id === b.id && a.tour === b.tour))} />
        )}

        {step === "drivers" && (
          <DriverPicker selected={drivers} onToggle={(d) => setDrivers(toggle(drivers, d, (a, b) => a.id === b.id))} />
        )}
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg via-bg to-transparent pt-8">
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
      <h1 className="text-3xl leading-tight font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{sub}</p>
    </div>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
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
        <IconSearch className="h-5 w-5 shrink-0 text-muted" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-base outline-none placeholder:text-muted"
          autoCorrect="off"
          autoCapitalize="off"
        />
        {value && (
          <button onClick={() => onChange("")} className="text-muted">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function SelectedChips<T>({ items, label, onRemove }: { items: T[]; label: (x: T) => React.ReactNode; onRemove: (x: T) => void }) {
  if (!items.length) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {items.map((x, i) => (
        <button key={i} onClick={() => onRemove(x)} className="flex items-center gap-2 rounded-full bg-brand/15 py-1.5 pr-3 pl-1.5 text-sm font-semibold text-brand">
          {label(x)} ✕
        </button>
      ))}
    </div>
  );
}

function TeamPicker({
  selected,
  onToggle,
  leagues,
  sports,
}: {
  selected: TeamOption[];
  onToggle: (t: TeamOption) => void;
  leagues: string[];
  sports: SportId[];
}) {
  const { t, lang } = useApp();
  const [all, setAll] = useState<TeamOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [sp, setSp] = useState<SportId | "all">("all");

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setAll(d.teams ?? []))
      .catch(() => setFailed(true));
  }, []);

  const pool = useMemo(
    () => (all ?? []).filter((tm) => sports.includes(tm.sport ?? "football") && (sp === "all" || (tm.sport ?? "football") === sp)),
    [all, sports, sp],
  );

  const results = useMemo(() => {
    const nq = norm(q.trim());
    if (nq) return pool.filter((tm) => norm(tm.name).includes(nq) || norm(tm.short ?? "").includes(nq)).slice(0, 80);
    // Sin búsqueda: equipos de las competiciones elegidas en cada deporte; si en un deporte no eligió ninguna, todos los de ese deporte.
    const fromChosen = pool.filter((tm) => {
      const sp = tm.sport ?? "football";
      const chosenHere = leagues.filter((l) => LEAGUES.find((x) => x.id === l)?.sport === sp);
      return chosenHere.length ? tm.leagues.some((l) => chosenHere.includes(l)) : true;
    });
    // Hasta 80 por deporte, para que ningún deporte quede fuera de la lista.
    const perSport = new Map<string, number>();
    return fromChosen.filter((tm) => {
      const sp = tm.sport ?? "football";
      const c = perSport.get(sp) ?? 0;
      perSport.set(sp, c + 1);
      return c < 80;
    });
  }, [pool, q, leagues]);

  const isOn = (tm: TeamOption) => selected.some((x) => x.id === tm.id && (x.sport ?? "football") === (tm.sport ?? "football"));

  return (
    <section>
      <Title title={t("chooseTeams")} sub={t("chooseTeamsSub")} />
      <SelectedChips
        items={selected}
        onRemove={onToggle}
        label={(tm) => (
          <>
            <TeamLogo src={tm.logo} name={tm.name} size={22} />
            {tm.short ?? tm.name}
          </>
        )}
      />
      <SearchBox value={q} onChange={setQ} placeholder={t("searchTeam")} />
      {sports.length > 1 && (
        <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
          {(["all", ...sports] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSp(s)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ${sp === s ? "bg-text text-bg" : "bg-card text-muted"}`}
            >
              {s === "all" ? (lang === "fr" ? "Tous" : "Todos") : `${sportMeta(s).emoji} ${sportMeta(s).name[lang]}`}
            </button>
          ))}
        </div>
      )}
      {failed && <p className="py-6 text-center text-muted">{t("dataError")}</p>}
      {!all && !failed && <p className="py-6 text-center text-muted">{t("loading")}</p>}
      {all && results.length === 0 && <p className="py-6 text-center text-muted">{t("noResult")}</p>}
      <div className="overflow-hidden rounded-2xl bg-card">
        {results.map((tm) => (
          <button
            key={`${tm.sport}:${tm.id}`}
            onClick={() => onToggle(tm)}
            className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0"
          >
            <TeamLogo src={tm.logo} name={tm.name} size={32} />
            <span className="flex-1">
              <span className="block leading-snug font-semibold">{tm.name}</span>
              {sports.length > 1 && <span className="text-xs text-muted">{sportMeta(tm.sport ?? "football").emoji} {sportMeta(tm.sport ?? "football").name[lang]}</span>}
            </span>
            <Check on={isOn(tm)} />
          </button>
        ))}
      </div>
    </section>
  );
}

function PlayerPicker({ selected, onToggle }: { selected: PlayerOption[]; onToggle: (p: PlayerOption) => void }) {
  const { t } = useApp();
  const [all, setAll] = useState<PlayerOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [tour, setTour] = useState("atp");
  useEffect(() => {
    fetch("/api/tennis/players")
      .then((r) => r.json())
      .then((d) => (d.failed ? setFailed(true) : setAll(d.players ?? [])))
      .catch(() => setFailed(true));
  }, []);
  const results = useMemo(() => {
    const nq = norm(q.trim());
    return (all ?? []).filter((p) => (nq ? norm(p.name).includes(nq) : p.tour === tour));
  }, [all, q, tour]);
  return (
    <section>
      <Title title={t("choosePlayers")} sub={t("choosePlayersSub")} />
      <SelectedChips items={selected} onRemove={onToggle} label={(p) => <>🎾 {p.name}</>} />
      <SearchBox value={q} onChange={setQ} placeholder={t("searchPlayer")} />
      {!q && (
        <div className="mb-3 flex gap-2">
          {["atp", "wta"].map((x) => (
            <button key={x} onClick={() => setTour(x)} className={`rounded-full px-4 py-1.5 text-sm font-bold uppercase ${tour === x ? "bg-text text-bg" : "bg-card text-muted"}`}>
              {x}
            </button>
          ))}
        </div>
      )}
      {failed && <p className="py-6 text-center text-muted">{t("dataError")}</p>}
      {!all && !failed && <p className="py-6 text-center text-muted">{t("loading")}</p>}
      <div className="overflow-hidden rounded-2xl bg-card">
        {results.map((p) => (
          <button key={`${p.tour}:${p.id}`} onClick={() => onToggle(p)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0">
            <span className="font-score w-8 text-center text-lg font-bold text-muted">{p.rank}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.flag ? <img src={p.flag} alt="" className="h-4 w-6 rounded-sm object-cover" /> : <span className="w-6" />}
            <span className="flex-1 leading-snug font-semibold">{p.name}</span>
            <span className="text-xs font-bold text-muted uppercase">{p.tour}</span>
            <Check on={selected.some((x) => x.id === p.id && x.tour === p.tour)} />
          </button>
        ))}
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
        {results.map((d) => (
          <button key={d.id} onClick={() => onToggle(d)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0">
            <span className="font-score w-10 text-center text-2xl font-extrabold text-f1">{d.number ?? ""}</span>
            <span className="flex-1">
              <span className="block leading-snug font-semibold">{d.name}</span>
              {d.team && <span className="block text-sm text-muted">{d.team}</span>}
            </span>
            <Check on={selected.some((x) => x.id === d.id)} />
          </button>
        ))}
      </div>
    </section>
  );
}

function AthletePicker({ selected, sports, onToggle }: { selected: AthleteOption[]; sports: SportId[]; onToggle: (a: AthleteOption) => void }) {
  const { lang, t } = useApp();
  const fr = lang === "fr";
  const [q, setQ] = useState("");
  const [res, setRes] = useState<AthleteOption[] | null>(null);
  const [busy, setBusy] = useState(false);
  const sportsKey = sports.join(",");

  useEffect(() => {
    const allowed = sportsKey.split(",");
    const query = q.trim();
    if (query.length < 3) {
      setRes(null);
      setBusy(false);
      return;
    }
    setBusy(true);
    // Una respuesta de una búsqueda anterior (más lenta) no pisa la de lo último que escribió.
    let alive = true;
    const id = setTimeout(() => {
      fetch(`/api/athletes?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => {
          if (alive) setRes((d.athletes ?? []).filter((a: AthleteOption) => allowed.includes(a.sport)));
        })
        .catch(() => {
          if (alive) setRes([]);
        })
        .finally(() => {
          if (alive) setBusy(false);
        });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(id);
    };
    // sportsKey (texto) en vez del arreglo: evita repetir la búsqueda en cada render.
  }, [q, sportsKey]);

  return (
    <section>
      <Title
        title={fr ? "Tes joueurs" : "Tus jugadores"}
        sub={fr ? "Suis des joueurs (Mbappé, Alexis Sánchez…) : tu verras tous les matchs de leur équipe." : "Sigue jugadores (Mbappé, Alexis Sánchez…): verás todos los partidos de su equipo."}
      />
      <SelectedChips items={selected} onRemove={onToggle} label={(a) => <>👤 {a.short ?? a.name}</>} />
      <SearchBox value={q} onChange={setQ} placeholder={fr ? "Nom du joueur (3 lettres min.)" : "Nombre del jugador (mín. 3 letras)"} />
      {busy && <p className="py-4 text-center text-muted">{t("loading")}</p>}
      {res && !busy && res.length === 0 && <p className="py-4 text-center text-muted">{t("noResult")}</p>}
      {!q && <p className="py-2 text-sm text-muted">{fr ? "Étape facultative : tu peux passer." : "Paso opcional: puedes saltarlo."}</p>}
      <div className="overflow-hidden rounded-2xl bg-card">
        {(res ?? []).map((a) => (
          <button key={a.id} onClick={() => onToggle(a)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0">
            <TeamLogo src={a.teamLogo} name={a.teamName ?? a.name} size={30} />
            <span className="flex-1">
              <span className="block leading-snug font-semibold">{a.name}</span>
              <span className="block text-xs text-muted">
                {sportMeta(a.sport).emoji} {a.teamName ?? ""}
              </span>
            </span>
            <Check on={selected.some((x) => x.id === a.id)} />
          </button>
        ))}
      </div>
    </section>
  );
}
