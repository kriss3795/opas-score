"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/client/store";
import { fmtDay, fmtTime } from "@/lib/i18n";
import { LEAGUES, leagueMeta } from "@/lib/catalog";
import TeamLogo from "@/components/TeamLogo";
import { gpName } from "@/lib/f1names";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function LeaguePage() {
  return (
    <Suspense fallback={null}>
      <LeagueInner />
    </Suspense>
  );
}

function LeagueInner() {
  const { prefs, update, lang } = useApp();
  const fr = lang === "fr";
  const joinCode = useSearchParams().get("join")?.toUpperCase() ?? "";
  const mine = prefs.friendLeagues ?? [];
  const [active, setActive] = useState<string | null>(mine[0]?.code ?? null);
  const [mode, setMode] = useState<"view" | "create" | "join">(joinCode && !mine.some((l) => l.code === joinCode) ? "join" : mine.length ? "view" : "create");

  const addLeague = (l: { code: string; token: string; name: string }) => {
    update((p) => ({ friendLeagues: [...(p.friendLeagues ?? []).filter((x) => x.code !== l.code), l] }));
    setActive(l.code);
    setMode("view");
  };

  const current = mine.find((l) => l.code === active);

  return (
    <div className="pt-safe space-y-4 px-4 pb-4">
      <h1 className="pt-2 text-2xl font-extrabold tracking-tight">🏆 {fr ? "Ligue entre amis" : "Liga de amigos"}</h1>

      {mine.length > 0 && mode === "view" && (
        <>
          {mine.length > 1 && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {mine.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setActive(l.code)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${active === l.code ? "bg-text text-bg" : "bg-card text-muted"}`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode("create")} className="rounded-2xl bg-card py-3 text-sm font-bold">
              ➕ {fr ? "Nouvelle ligue" : "Nueva liga"}
            </button>
            <button onClick={() => setMode("join")} className="rounded-2xl bg-card py-3 text-sm font-bold">
              🔑 {fr ? "Rejoindre avec un code" : "Unirme con un código"}
            </button>
          </div>
        </>
      )}

      {mine.length > 0 && mode !== "view" && (
        <button onClick={() => setMode("view")} className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold">
          ← {fr ? "Retour à mes ligues" : "Volver a mis ligas"}
        </button>
      )}

      {mode === "create" && <CreateLeague onDone={addLeague} />}
      {mode === "join" && <JoinLeague initialCode={joinCode} onDone={addLeague} />}
      {mode === "view" && current && <LeagueView code={current.code} token={current.token} />}
      {mine.length === 0 && mode !== "join" && (
        <button onClick={() => setMode("join")} className="w-full rounded-2xl bg-card py-3 font-semibold text-muted">
          {fr ? "J'ai un code d'invitation" : "Tengo un código de invitación"}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "w-full rounded-xl bg-card2 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-brand";

function CreateLeague({ onDone }: { onDone: (l: { code: string; token: string; name: string }) => void }) {
  const { prefs, lang } = useApp();
  const fr = lang === "fr";
  const footballOptions = LEAGUES.filter((l) => l.sport === "football");
  const defaults = prefs.leagues.filter((l) => leagueMeta(l)?.sport === "football");
  const [name, setName] = useState(fr ? "La ligue de Richy" : "La liga de Richy");
  const [player, setPlayer] = useState("");
  const [comps, setComps] = useState<string[]>(defaults.length ? defaults : ["fra.1", "uefa.champions"]);
  const [f1, setF1] = useState(prefs.sports.includes("f1"));
  const [duration, setDuration] = useState<string>("30");
  const [untilDate, setUntilDate] = useState<string>("");
  // Fechas en el calendario local del teléfono (no en UTC, que en la noche ya es "mañana").
  const ymd = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const minDate = ymd(new Date(Date.now() + 86400000));
  const maxDate = ymd(new Date(Date.now() + 364 * 86400000));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/league", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        action: "create",
        name,
        player,
        comps,
        f1,
        // Fecha elegida: fin del día en la hora del teléfono.
        duration: duration === "date" ? new Date(`${untilDate}T23:59:00`).toISOString() : duration,
      }),
    });
    setBusy(false);
    if (!r.ok) return setErr(fr ? "Impossible de créer la ligue. Vérifie les champs." : "No se pudo crear la liga. Revisa los campos.");
    const d = await r.json();
    onDone({ code: d.code, token: d.token, name });
  };

  return (
    <section className="space-y-4 rounded-3xl bg-card p-4">
      <h2 className="text-lg font-extrabold">{fr ? "Créer une ligue (seul ou entre amis)" : "Crear una liga (solo o con amigos)"}</h2>
      <p className="text-sm text-muted">
        {fr
          ? "Deux jeux en un. Pronostics : score exact = 3 pts, bon résultat = 1 pt ; podium F1 = 1 pt par pilote sur le podium, +1 si la place est exacte. Paris : chacun reçoit 1000 jetons virtuels et parie sur 1-N-2 avec des cotes calculées à partir des probabilités ClubElo. Aucun argent réel."
          : "Dos juegos en uno. Pronósticos: marcador exacto = 3 pts, resultado correcto = 1 pt; podio F1 = 1 pt por piloto en el podio, +1 si el puesto es exacto. Apuestas: cada uno recibe 1000 fichas virtuales y apuesta a 1-X-2 con cuotas calculadas con las probabilidades de ClubElo. Sin dinero real."}
      </p>
      <Field label={fr ? "Nom de la ligue" : "Nombre de la liga"}>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
      </Field>
      <Field label={fr ? "Ton prénom" : "Tu nombre"}>
        <input className={inputCls} value={player} onChange={(e) => setPlayer(e.target.value)} maxLength={24} placeholder="Richy" />
      </Field>
      <Field label={fr ? "Durée de la saison" : "Duración de la temporada"}>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["7", fr ? "1 semaine" : "1 semana"],
              ["30", fr ? "1 mois (4 journées)" : "1 mes (4 jornadas)"],
              ["90", fr ? "3 mois (13 journées)" : "3 meses (13 jornadas)"],
              ["date", fr ? "Jusqu'au…" : "Hasta el…"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setDuration(v)}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${duration === v ? "bg-brand text-white" : "bg-card2 text-muted"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {duration === "date" && (
          <input
            type="date"
            value={untilDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setUntilDate(e.target.value)}
            className={`${inputCls} mt-2`}
          />
        )}
        <p className="mt-1.5 text-xs text-muted">
          {fr
            ? "Chaque semaine est une journée avec son vainqueur. À la fin, le champion est sacré."
            : "Cada semana es una jornada con su ganador. Al final se corona al campeón."}
        </p>
      </Field>
      <Field label={fr ? "Compétitions à pronostiquer" : "Competiciones para pronosticar"}>
        <div className="flex flex-wrap gap-2">
          {footballOptions.map((l) => {
            const on = comps.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setComps(on ? comps.filter((c) => c !== l.id) : [...comps, l.id])}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-brand text-white" : "bg-card2 text-muted"}`}
              >
                {l.flag} {l.name[lang]}
              </button>
            );
          })}
          <button type="button" onClick={() => setF1(!f1)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${f1 ? "bg-f1 text-white" : "bg-card2 text-muted"}`}>
            🏎️ {fr ? "Podiums F1" : "Podios F1"}
          </button>
        </div>
      </Field>
      {err && <p className="text-sm text-live">{err}</p>}
      <button disabled={busy || !player.trim() || !name.trim() || (duration === "date" && !untilDate)} onClick={submit} className="w-full rounded-2xl bg-brand py-4 text-lg font-extrabold text-white disabled:opacity-40">
        {fr ? "Créer la ligue" : "Crear la liga"}
      </button>
    </section>
  );
}

function JoinLeague({ initialCode, onDone }: { initialCode: string; onDone: (l: { code: string; token: string; name: string }) => void }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  const [code, setCode] = useState(initialCode);
  const [player, setPlayer] = useState("");
  const [err, setErr] = useState("");
  const submit = async () => {
    setErr("");
    const r = await fetch("/api/league", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join", code, player }) });
    if (r.status === 409) return setErr(fr ? "Ce prénom est déjà pris dans la ligue." : "Ese nombre ya está en la liga.");
    if (!r.ok) return setErr(fr ? "Code introuvable." : "Código no encontrado.");
    const d = await r.json();
    const info = await fetch(`/api/league?code=${d.code}&token=${d.token}`).then((x) => x.json()).catch(() => null);
    onDone({ code: d.code, token: d.token, name: info?.league?.name ?? d.code });
  };
  return (
    <section className="space-y-4 rounded-3xl bg-card p-4">
      <h2 className="text-lg font-extrabold">{fr ? "Rejoindre une ligue" : "Unirse a una liga"}</h2>
      <Field label={fr ? "Code" : "Código"}>
        <input className={`${inputCls} font-score text-2xl tracking-[0.3em] uppercase`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} />
      </Field>
      <Field label={fr ? "Ton prénom" : "Tu nombre"}>
        <input className={inputCls} value={player} onChange={(e) => setPlayer(e.target.value)} maxLength={24} />
      </Field>
      {err && <p className="text-sm text-live">{err}</p>}
      <button disabled={code.length !== 6 || !player.trim()} onClick={submit} className="w-full rounded-2xl bg-brand py-4 text-lg font-extrabold text-white disabled:opacity-40">
        {fr ? "Rejoindre" : "Unirme"}
      </button>
    </section>
  );
}

function LeagueView({ code, token }: { code: string; token: string }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  const [st, setSt] = useState<any>(undefined);
  const [tab, setTab] = useState<"predict" | "table" | "rounds" | "mine">("predict");

  const load = useCallback(() => {
    fetch(`/api/league?code=${code}&token=${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSt)
      .catch(() => setSt(null));
  }, [code, token]);
  useEffect(() => {
    setSt(undefined);
    load();
  }, [load]);

  const invite = useMemo(() => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/league?join=${code}` : "";
    const text = fr
      ? `Rejoins ma ligue de pronostics sur Opa's Score ! Code : ${code}\n${url}`
      : `¡Únete a mi liga de pronósticos en Opa's Score! Código: ${code}\n${url}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [code, fr]);

  if (st === undefined) return <div className="h-64 animate-pulse rounded-3xl bg-card" />;
  if (st === null) return <p className="rounded-2xl bg-card px-5 py-8 text-center text-muted">{fr ? "Ligue indisponible pour le moment." : "Liga no disponible por ahora."}</p>;

  const predMap = new Map<string, any>(st.myPreds.map((p: any) => [p.key, p.value]));
  const betMap = new Map<string, any>((st.myBets ?? []).map((b: any) => [b.key, b]));

  return (
    <>
      <section className="rounded-3xl p-4" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--gold) 25%, var(--card)), var(--card) 70%)" }}>
        <h2 className="text-2xl leading-tight font-extrabold">{st.league.name}</h2>
        <p className="mt-1 text-sm text-muted">
          {fr ? "Code" : "Código"} : <b className="font-score text-xl tracking-widest text-text">{st.league.code}</b>
        </p>
        <a href={invite} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 font-extrabold text-white">
          {fr ? "Inviter des amis sur WhatsApp" : "Invitar amigos por WhatsApp"}
        </a>
      </section>

      <SeasonHeader st={st} code={code} token={token} />

      {st.me && !st.season?.finished && (
        <section className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
          <span className="text-3xl">🪙</span>
          <span className="flex-1">
            <span className="font-score block text-3xl leading-none font-extrabold text-gold">{st.me.coins}</span>
            <span className="text-xs text-muted">
              {fr ? "jetons" : "fichas"} · {st.me.available} {fr ? "disponibles" : "disponibles"}
            </span>
          </span>
          <span className="max-w-36 text-right text-[11px] leading-tight text-muted">
            {fr ? "Jetons virtuels, sans argent réel. Cotes : ClubElo." : "Fichas virtuales, sin dinero real. Cuotas: ClubElo."}
          </span>
        </section>
      )}

      <div className="flex gap-1 rounded-2xl bg-card p-1.5">
        {(
          [
            ["predict", fr ? "Pronostics" : "Pronosticar"],
            ["table", fr ? "Classement" : "Tabla"],
            ["rounds", fr ? "Journées" : "Jornadas"],
            ["mine", fr ? "Mes résultats" : "Mis resultados"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${tab === k ? "bg-text text-bg" : "text-muted"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "rounds" && <Rounds st={st} />}

      {tab === "predict" && (
        <div className="space-y-2.5">
          {st.upcoming.length === 0 && (
            <p className="rounded-2xl bg-card px-5 py-8 text-center text-muted">
              {st.season?.finished
                ? fr
                  ? "La saison est terminée. Lance une nouvelle saison !"
                  : "La temporada terminó. ¡Empieza una nueva!"
                : fr
                  ? "Aucun match à pronostiquer cette semaine."
                  : "No hay partidos para pronosticar esta semana."}
            </p>
          )}
          {st.upcoming.map((e: any) =>
            e.kind === "score" ? (
              <ScorePredict key={e.key} e={e} code={code} token={token} initial={predMap.get(e.key)} bet={betMap.get(e.key)} available={st.me?.available ?? 0} onSaved={load} />
            ) : (
              <PodiumPredict key={e.key} e={e} code={code} token={token} initial={predMap.get(e.key)} drivers={st.drivers} onSaved={load} />
            ),
          )}
        </div>
      )}

      {tab === "table" && <LeagueTable rows={st.table} />}

      {tab === "mine" && (
        <div className="space-y-2">
          {st.myPreds.length === 0 && <p className="rounded-2xl bg-card px-5 py-8 text-center text-muted">{fr ? "Pas encore de pronostics." : "Todavía no hay pronósticos."}</p>}
          {st.myPreds.map((p: any) => (
            <div key={p.key} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
              <span className="flex-1">
                <span className="block leading-tight font-semibold">{p.label}</span>
                <span className="text-sm text-muted">
                  {fr ? "Mon prono" : "Mi pronóstico"} : {p.value.p ? p.value.p.map((d: string) => st.drivers.find((x: any) => x.id === d)?.code ?? d).join(" · ") : `${p.value.h}-${p.value.a}`}
                  {p.result && <> · {fr ? "Réel" : "Real"} : {p.result.p ? p.result.p.map((d: string) => st.drivers.find((x: any) => x.id === d)?.code ?? d).join(" · ") : `${p.result.h}-${p.result.a}`}</>}
                </span>
              </span>
              <span className={`font-score text-2xl font-extrabold ${p.points ? "text-football" : "text-muted"}`}>{p.voided ? (fr ? "annulé" : "anulado") : p.points === null ? "⏳" : `+${p.points}`}</span>
            </div>
          ))}
          {(st.myBets ?? []).map((b: any) => (
            <div key={`bet-${b.key}`} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
              <span className="text-2xl">🪙</span>
              <span className="flex-1">
                <span className="block leading-tight font-semibold">{b.label}</span>
                <span className="text-sm text-muted">
                  {b.stake} × {b.odds.toFixed(2)} · {b.pick === "H" ? "1" : b.pick === "D" ? "N" : "2"}
                  {b.result && ` · ${b.result.h}-${b.result.a}`}
                </span>
              </span>
              <span className={`font-score text-xl font-extrabold ${b.won ? "text-football" : b.won === false ? "text-live" : "text-muted"}`}>
                {b.voided ? (fr ? "annulé" : "anulada") : b.won === null ? "⏳" : b.won ? `+${Math.round(b.stake * b.odds) - b.stake}` : `−${b.stake}`}
              </span>
            </div>
          ))}
          <p className="px-1 text-xs text-muted">{fr ? "Résultats officiels : ESPN et Jolpica-F1." : "Resultados oficiales: ESPN y Jolpica-F1."}</p>
        </div>
      )}
    </>
  );
}

async function savePred(code: string, token: string, key: string, value: unknown) {
  const r = await fetch("/api/league", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "predict", code, token, key, value }) });
  return r.ok;
}

function ScorePredict({
  e,
  code,
  token,
  initial,
  bet,
  available,
  onSaved,
}: {
  e: any;
  code: string;
  token: string;
  initial?: any;
  bet?: any;
  available: number;
  onSaved: () => void;
}) {
  const { lang } = useApp();
  const [h, setH] = useState<number>(initial?.h ?? 0);
  const [a, setA] = useState<number>(initial?.a ?? 0);
  const [state, setState] = useState<"idle" | "saved" | "error">(initial ? "saved" : "idle");
  const step = (v: number, d: number) => Math.max(0, Math.min(20, v + d));
  const Stepper = ({ v, set }: { v: number; set: (n: number) => void }) => (
    <div className="flex items-center gap-1.5">
      <button onClick={() => (set(step(v, -1)), setState("idle"))} className="h-9 w-9 rounded-full bg-card2 text-xl font-bold">
        −
      </button>
      <span className="font-score w-7 text-center text-3xl font-extrabold">{v}</span>
      <button onClick={() => (set(step(v, 1)), setState("idle"))} className="h-9 w-9 rounded-full bg-card2 text-xl font-bold">
        +
      </button>
    </div>
  );
  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="mb-3 text-xs font-semibold text-muted">
        {leagueMeta(e.key.split("|")[1])?.name[lang] ?? e.competition} · {fmtDay(e.start, lang)} {fmtTime(e.start, lang)}
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-y-3">
        <span className="flex items-center gap-2 leading-tight font-semibold">
          <TeamLogo src={e.home?.logo} name={e.home?.name ?? ""} size={24} /> {e.home?.name}
        </span>
        <Stepper v={h} set={setH} />
        <span className="flex items-center gap-2 leading-tight font-semibold">
          <TeamLogo src={e.away?.logo} name={e.away?.name ?? ""} size={24} /> {e.away?.name}
        </span>
        <Stepper v={a} set={setA} />
      </div>
      <button
        onClick={async () => {
          const ok = await savePred(code, token, e.key, { h, a });
          setState(ok ? "saved" : "error");
          if (ok) onSaved();
        }}
        className={`mt-3 w-full rounded-xl py-2.5 font-bold ${state === "saved" ? "bg-football/20 text-football" : "bg-brand text-white"}`}
      >
        {state === "saved" ? (lang === "fr" ? "✓ Enregistré" : "✓ Guardado") : state === "error" ? (lang === "fr" ? "Trop tard ou erreur" : "Muy tarde o error") : lang === "fr" ? "Valider" : "Guardar"}
      </button>
      {e.odds && <BetPanel e={e} code={code} token={token} bet={bet} available={available} onSaved={onSaved} />}
    </div>
  );
}

function BetPanel({ e, code, token, bet, available, onSaved }: { e: any; code: string; token: string; bet?: any; available: number; onSaved: () => void }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  const [pick, setPick] = useState<"H" | "D" | "A" | null>(bet?.pick ?? null);
  const [stake, setStake] = useState<number>(bet?.stake ?? 50);
  const [msg, setMsg] = useState(bet ? (fr ? "✓ Pari placé" : "✓ Apuesta hecha") : "");
  const max = available + (bet?.stake ?? 0);
  const opts: ["H" | "D" | "A", string][] = [
    ["H", e.home?.name ?? "1"],
    ["D", fr ? "Nul" : "Empate"],
    ["A", e.away?.name ?? "2"],
  ];
  const place = async () => {
    if (!pick) return;
    const r = await fetch("/api/league", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bet", code, token, key: e.key, pick, stake }),
    });
    setMsg(r.ok ? (fr ? "✓ Pari placé" : "✓ Apuesta hecha") : fr ? "Pari refusé (solde ou match commencé)" : "Apuesta rechazada (saldo o partido empezado)");
    if (r.ok) onSaved();
  };
  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">🪙 {fr ? "Parier des jetons" : "Apostar fichas"}</div>
      <div className="grid grid-cols-3 gap-2">
        {opts.map(([k, l]) => (
          <button
            key={k}
            onClick={() => (setPick(k), setMsg(""))}
            className={`rounded-xl px-2 py-2 text-center ${pick === k ? "bg-gold text-black" : "bg-card2"}`}
          >
            <span className="block truncate text-xs font-semibold opacity-80">{l}</span>
            <span className="font-score text-xl font-extrabold">{e.odds[k].toFixed(2)}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {[10, 50, 100, 250].map((v) => (
          <button key={v} onClick={() => (setStake(Math.min(v, max)), setMsg(""))} className={`flex-1 rounded-lg py-1.5 text-sm font-bold ${stake === v ? "bg-text text-bg" : "bg-card2 text-muted"}`}>
            {v}
          </button>
        ))}
        <button onClick={() => (setStake(max), setMsg(""))} className={`flex-1 rounded-lg py-1.5 text-sm font-bold ${stake === max ? "bg-text text-bg" : "bg-card2 text-muted"}`}>
          {fr ? "Tout" : "Todo"}
        </button>
      </div>
      <button
        disabled={!pick || stake < 1 || stake > max}
        onClick={place}
        className="mt-2 w-full rounded-xl bg-gold py-2.5 font-extrabold text-black disabled:opacity-40"
      >
        {pick ? `${fr ? "Parier" : "Apostar"} ${stake} → ${fr ? "gain possible" : "ganancia posible"} ${Math.round(stake * e.odds[pick])}` : fr ? "Choisis un résultat" : "Elige un resultado"}
      </button>
      {msg && <p className="mt-1.5 text-center text-xs text-muted">{msg}</p>}
    </div>
  );
}

function LeagueTable({ rows }: { rows: any[] }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  const [by, setBy] = useState<"points" | "coins">("points");
  const sorted = [...rows].sort((a, b) => (by === "points" ? b.points - a.points || (b.accuracy ?? 0) - (a.accuracy ?? 0) : b.coins - a.coins));
  return (
    <>
      <div className="flex gap-2">
        {(
          [
            ["points", fr ? "🎯 Pronostics" : "🎯 Pronósticos"],
            ["coins", fr ? "🪙 Jetons" : "🪙 Fichas"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setBy(k)} className={`rounded-full px-4 py-1.5 text-sm font-bold ${by === k ? "bg-text text-bg" : "bg-card text-muted"}`}>
            {l}
          </button>
        ))}
      </div>
      <section className="overflow-hidden rounded-2xl bg-card">
        {sorted.map((r, i) => (
          <div key={r.name} className={`flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 ${r.isMe ? "bg-brand/10" : ""}`}>
            <span className="font-score w-7 text-center text-xl font-extrabold">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
            <span className="flex-1 leading-tight font-semibold">
              {r.name}
              {r.weekWins > 0 && <span className="ml-1.5 text-xs text-gold">🏅×{r.weekWins}</span>}
            </span>
            {by === "points" ? (
              <>
                <span className="text-xs text-muted">{r.accuracy === null ? "–" : `${Math.round(r.accuracy * 100)}% ${fr ? "réussite" : "acierto"}`}</span>
                <span className="font-score w-10 text-right text-2xl font-extrabold">{r.points}</span>
              </>
            ) : (
              <span className="font-score text-2xl font-extrabold text-gold">{r.coins}</span>
            )}
          </div>
        ))}
      </section>
      {rows.length === 1 && (
        <p className="px-1 text-sm text-muted">
          {fr ? "Tu joues seul pour l'instant : ton taux de réussite et tes jetons montrent ta progression. Invite des amis quand tu veux !" : "Por ahora juegas solo: tu porcentaje de acierto y tus fichas muestran tu progreso. ¡Invita amigos cuando quieras!"}
        </p>
      )}
    </>
  );
}

function PodiumPredict({ e, code, token, initial, drivers, onSaved }: { e: any; code: string; token: string; initial?: any; drivers: any[]; onSaved: () => void }) {
  const { lang } = useApp();
  const [p, setP] = useState<string[]>(initial?.p ?? ["", "", ""]);
  const [state, setState] = useState<"idle" | "saved" | "error">(initial ? "saved" : "idle");
  return (
    <div className="rounded-2xl bg-card p-4" style={{ borderLeft: "3px solid var(--f1)" }}>
      <div className="mb-1 text-xs font-semibold text-muted">
        🏎️ {fmtDay(e.start, lang)} {fmtTime(e.start, lang)}
      </div>
      <div className="mb-3 text-lg leading-tight font-extrabold">{gpName(e.label, lang)}</div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-2 flex items-center gap-3">
          <span className="w-8 text-2xl">{["🥇", "🥈", "🥉"][i]}</span>
          <select
            value={p[i]}
            onChange={(ev) => {
              const n = [...p];
              n[i] = ev.target.value;
              setP(n);
              setState("idle");
            }}
            className="flex-1 rounded-xl bg-card2 px-3 py-2.5 text-base"
          >
            <option value="">—</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id} disabled={p.includes(d.id) && p[i] !== d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      ))}
      <button
        disabled={p.some((x) => !x)}
        onClick={async () => {
          const ok = await savePred(code, token, e.key, { p });
          setState(ok ? "saved" : "error");
          if (ok) onSaved();
        }}
        className={`mt-1 w-full rounded-xl py-2.5 font-bold disabled:opacity-40 ${state === "saved" ? "bg-football/20 text-football" : "bg-f1 text-white"}`}
      >
        {state === "saved" ? (lang === "fr" ? "✓ Enregistré" : "✓ Guardado") : state === "error" ? (lang === "fr" ? "Trop tard ou erreur" : "Muy tarde o error") : lang === "fr" ? "Valider mon podium" : "Guardar mi podio"}
      </button>
    </div>
  );
}

function SeasonHeader({ st, code, token }: { st: any; code: string; token: string }) {
  const { lang, update } = useApp();
  const fr = lang === "fr";
  const se = st.season;
  const [busy, setBusy] = useState(false);
  if (!se) return null;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(fr ? "fr-FR" : "es-CL", { day: "numeric", month: "short" });

  if (se.finished) {
    const podium = st.table.slice(0, 3);
    return (
      <section className="rounded-3xl p-5 text-center" style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--gold) 35%, var(--card)), var(--card) 75%)" }}>
        <div className="text-5xl">🏆</div>
        <h3 className="mt-2 text-xs font-bold tracking-widest text-text/70 uppercase">{fr ? "Saison terminée" : "Temporada terminada"}</h3>
        <p className="mt-1 text-2xl leading-tight font-extrabold">
          {se.champion.length ? `${se.champion.join(" & ")} ${fr ? (se.champion.length > 1 ? "champions !" : "champion !") : se.champion.length > 1 ? "¡campeones!" : "¡campeón!"}` : fr ? "Pas de champion (aucun point)" : "Sin campeón (nadie sumó puntos)"}
        </p>
        <div className="mt-4 flex items-end justify-center gap-2">
          {[1, 0, 2].map((i) =>
            podium[i] ? (
              <div key={i} className="w-24">
                <div className="text-2xl">{["🥇", "🥈", "🥉"][i]}</div>
                <div className="truncate text-sm font-bold">{podium[i].name}</div>
                <div className="rounded-t-xl bg-card2 pt-1 font-score text-xl font-extrabold" style={{ height: [64, 48, 36][i] }}>
                  {podium[i].points}
                </div>
              </div>
            ) : null,
          )}
        </div>
        {se.coinChampion && (
          <p className="mt-3 text-sm text-muted">
            🪙 {fr ? "Roi des paris" : "Rey de las apuestas"} : <b className="text-text">{se.coinChampion}</b>
          </p>
        )}
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await fetch("/api/league", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rematch", code, token }) });
            setBusy(false);
            if (!r.ok) return;
            const d = await r.json();
            update((p) => ({ friendLeagues: [...(p.friendLeagues ?? []), { code: d.code, token: d.token, name: d.name }] }));
          }}
          className="mt-4 w-full rounded-2xl bg-brand py-3 font-extrabold text-white disabled:opacity-50"
        >
          {fr ? "Lancer une nouvelle saison" : "Empezar una nueva temporada"}
        </button>
      </section>
    );
  }

  const total = se.endsAt ? new Date(se.endsAt).getTime() - new Date(se.startsAt).getTime() : 0;
  const done = total ? Math.min(1, (Date.now() - new Date(se.startsAt).getTime()) / total) : 0;
  const daysLeft = se.endsAt ? Math.max(0, Math.ceil((new Date(se.endsAt).getTime() - Date.now()) / 86400000)) : null;
  return (
    <section className="rounded-2xl bg-card p-4">
      <div className="flex items-baseline justify-between">
        <span className="font-bold">
          {fr ? "Journée" : "Jornada"} {se.currentRound}
          {se.totalRounds ? ` / ${se.totalRounds}` : ""}
        </span>
        {daysLeft !== null && (
          <span className="text-sm text-muted">
            {fr ? `Fin dans ${daysLeft} j` : `Termina en ${daysLeft} d`} · {fmt(se.endsAt)}
          </span>
        )}
      </div>
      {total > 0 && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-card2">
          <div className="h-full rounded-full bg-gold" style={{ width: `${Math.round(done * 100)}%` }} />
        </div>
      )}
      <p className="mt-2 text-xs text-muted">
        {fr ? "Du" : "Del"} {fmt(se.startsAt)} {fr ? "au" : "al"} {se.endsAt ? fmt(se.endsAt) : "—"} ·{" "}
        {fr ? "le champion est celui qui a le plus de points à la fin." : "gana quien tenga más puntos al final."}
      </p>
    </section>
  );
}

function Rounds({ st }: { st: any }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  const rounds = [...(st.season?.rounds ?? [])].reverse();
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(fr ? "fr-FR" : "es-CL", { day: "numeric", month: "short" });
  if (!rounds.length) return null;
  return (
    <div className="space-y-2.5">
      {rounds.map((r: any) => (
        <section key={r.round} className={`rounded-2xl bg-card p-4 ${!r.done ? "border border-gold/40" : ""}`}>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-bold">
              {fr ? "Journée" : "Jornada"} {r.round} {!r.done && <span className="ml-1 text-xs text-gold">{fr ? "en cours" : "en curso"}</span>}
            </span>
            <span className="text-xs text-muted">
              {fmt(r.from)} – {fmt(r.to)}
            </span>
          </div>
          {r.done && (
            <p className="mb-2 text-sm">
              🏅 {r.winners.length ? r.winners.join(" & ") : fr ? "Pas de vainqueur" : "Sin ganador"}
            </p>
          )}
          <ol className="space-y-1 text-sm">
            {r.standings.slice(0, 5).map((x: any, i: number) => (
              <li key={x.name} className="flex justify-between">
                <span className="text-muted">
                  {i + 1}. {x.name}
                </span>
                <span className="font-score font-bold">{x.points} pts</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
