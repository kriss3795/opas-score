"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_PREFS, type Prefs } from "../types";
import { detectLang, t as tr, type Key, type Lang } from "../i18n";

const KEY = "opas-score-prefs-v1";

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    /* almacenamiento no disponible */
  }
  return DEFAULT_PREFS;
}

interface Ctx {
  prefs: Prefs;
  ready: boolean;
  update: (patch: Partial<Prefs> | ((p: Prefs) => Partial<Prefs>)) => void;
  lang: Lang;
  t: (k: Key) => string;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  const [phoneLang, setPhoneLang] = useState<Lang>("fr");

  useEffect(() => {
    setPrefs(load());
    setPhoneLang(detectLang());
    setReady(true);
  }, []);

  const update = useCallback<Ctx["update"]>((patch) => {
    setPrefs((p) => {
      const next = { ...p, ...(typeof patch === "function" ? patch(p) : patch) };
      if (next.important.length > 150) next.important = next.important.slice(-150);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* sin almacenamiento: los cambios duran la sesión */
      }
      return next;
    });
  }, []);

  const lang: Lang = prefs.lang ?? phoneLang;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.theme = prefs.theme;
  }, [lang, prefs.theme]);

  const value = useMemo<Ctx>(() => ({ prefs, ready, update, lang, t: (k) => tr(lang, k) }), [prefs, ready, update, lang]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp fuera de AppProvider");
  return c;
}
