"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "./store";
import type { Prefs, SportEvent } from "../types";
import { leagueMeta } from "../catalog";

// Parámetros de agenda a partir de las preferencias (también se envían al servidor para el resumen matinal).
export function agendaParams(prefs: Prefs) {
  const p = new URLSearchParams();
  const on = (sp: string) => prefs.sports.includes(sp as never);
  const leagues = prefs.leagues.filter((l) => on(leagueMeta(l)?.sport ?? "football"));
  const teams = prefs.teams.filter((t) => on(t.sport ?? "football"));
  const athletes = (prefs.athletes ?? []).filter((a) => on(a.sport) && a.teamId);
  if (leagues.length) p.set("leagues", leagues.join(","));
  const teamKeys = [
    ...teams.flatMap((t) => [t.id, ...(t.alt ?? [])].map((id) => `${t.sport ?? "football"}:${id}`)),
    ...athletes.map((a) => `${a.sport}:${a.teamId}`),
  ];
  const teamLeagues = [...teams.flatMap((t) => t.leagues), ...athletes.map((a) => a.league ?? "").filter(Boolean)];
  if (teamKeys.length) {
    p.set("teams", Array.from(new Set(teamKeys)).join(","));
    p.set("teamLeagues", Array.from(new Set(teamLeagues)).join(","));
  }
  if (on("f1")) p.set("f1", "1");
  const players = on("tennis") ? prefs.players ?? [] : [];
  if (players.length) {
    p.set("players", players.map((x) => `${x.tour}:${x.id}`).join(","));
    p.set("playerNames", players.map((x) => x.name).join(","));
  }
  return p.toString();
}

// Agenda personal: pide al servidor solo lo que el usuario sigue y se refresca solo.
export function useAgenda() {
  const { prefs } = useApp();
  const [events, setEvents] = useState<SportEvent[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Generación actual: una respuesta de una petición vieja (otra pantalla, otros favoritos) se descarta
  // y no programa más refrescos, así no quedan ciclos de consultas corriendo en segundo plano.
  const gen = useRef(0);

  const url = `/api/agenda?${agendaParams(prefs)}`;

  const load = useCallback(async () => {
    const my = gen.current;
    let live = false;
    try {
      const r = await fetch(url);
      const d = await r.json();
      if (my !== gen.current) return;
      setEvents(d.events ?? []);
      setFailed(d.failed ?? []);
      setError(false);
      live = (d.events ?? []).some((e: SportEvent) => e.status === "in");
    } catch {
      if (my !== gen.current) return;
      setError(true);
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, live ? 30000 : 120000);
  }, [url]);

  useEffect(() => {
    gen.current++;
    load();
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      gen.current++;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  return { events, failed, error, reload: load };
}
