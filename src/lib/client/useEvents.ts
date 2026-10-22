"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "./store";
import type { SportEvent } from "../types";
import { leagueMeta } from "../catalog";

// Agenda personal: pide al servidor solo lo que el usuario sigue y se refresca solo.
export function useAgenda() {
  const { prefs } = useApp();
  const [events, setEvents] = useState<SportEvent[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = (() => {
    const p = new URLSearchParams();
    const on = (sp: string) => prefs.sports.includes(sp as never);
    const leagues = prefs.leagues.filter((l) => on(leagueMeta(l)?.sport ?? "football"));
    const teams = prefs.teams.filter((t) => on(t.sport ?? "football"));
    if (leagues.length) p.set("leagues", leagues.join(","));
    if (teams.length) {
      p.set("teams", teams.map((t) => `${t.sport ?? "football"}:${t.id}`).join(","));
      p.set("teamLeagues", Array.from(new Set(teams.flatMap((t) => t.leagues))).join(","));
    }
    if (on("f1")) p.set("f1", "1");
    const players = on("tennis") ? prefs.players ?? [] : [];
    if (players.length) {
      p.set("players", players.map((x) => `${x.tour}:${x.id}`).join(","));
      p.set("playerNames", players.map((x) => x.name).join(","));
    }
    return `/api/agenda?${p.toString()}`;
  })();

  const load = useCallback(async () => {
    let live = false;
    try {
      const r = await fetch(url);
      const d = await r.json();
      setEvents(d.events ?? []);
      setFailed(d.failed ?? []);
      setError(false);
      live = (d.events ?? []).some((e: SportEvent) => e.status === "in");
    } catch {
      setError(true);
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, live ? 30000 : 120000);
  }, [url]);

  useEffect(() => {
    load();
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  return { events, failed, error, reload: load };
}
