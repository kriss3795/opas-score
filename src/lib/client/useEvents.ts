"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "./store";
import type { SportEvent } from "../types";

// Agenda personal: pide al servidor solo lo que el usuario sigue y se refresca solo.
export function useAgenda() {
  const { prefs } = useApp();
  const [events, setEvents] = useState<SportEvent[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = (() => {
    const p = new URLSearchParams();
    if (prefs.sports.includes("football")) {
      p.set("leagues", prefs.leagues.join(","));
      p.set("teams", prefs.teams.map((t) => t.id).join(","));
      p.set("teamLeagues", Array.from(new Set(prefs.teams.flatMap((t) => t.leagues))).join(","));
    }
    if (prefs.sports.includes("f1")) p.set("f1", "1");
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
