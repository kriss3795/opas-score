"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/lib/client/store";
import { healPush, registerSW, syncPrefs } from "@/lib/client/push";
import { pushParams } from "@/lib/client/useEvents";
import { playSound, unlockAudio } from "@/lib/client/sounds";
import Welcome from "./Welcome";
import { sportMeta } from "@/lib/catalog";
import Onboarding from "./Onboarding";
import { IconCalendar, IconF1, IconSettings, IconTable, IconTrophy } from "./Icons";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { prefs, ready, t, lang } = useApp();
  const path = usePathname();

  useEffect(() => {
    registerSW();
    // Sonidos: se desbloquean con el primer toque y suenan cuando llega un aviso con la app abierta.
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === "opas-sound") playSound(ev.data.kind);
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener("message", onMsg);
  }, []);

  // Mantiene al servidor al día con los favoritos (para el resumen matinal).
  const q = pushParams(prefs);
  const morning = prefs.morning !== false;
  useEffect(() => {
    if (!ready || !prefs.onboarded) return;
    const id = setTimeout(() => syncPrefs(q, lang, morning), 1500);
    return () => clearTimeout(id);
  }, [q, lang, morning, ready, prefs.onboarded]);

  // Auto-reparación de los avisos cada vez que se abre la app.
  useEffect(() => {
    if (!ready || !prefs.onboarded) return;
    const run = () => healPush(lang, q);
    const id = setTimeout(run, 2500);
    const onVis = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(id);
      document.removeEventListener("visibilitychange", onVis);
    };
    // Solo al abrir (o volver a) la app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, prefs.onboarded]);

  if (!ready) return <div className="min-h-dvh bg-bg" />;
  // Los amigos que llegan con un enlace de invitación entran directo a la liga.
  if (!prefs.welcomed && path.startsWith("/league")) return <div className="mx-auto min-h-dvh max-w-xl">{children}</div>;
  if (!prefs.welcomed && path !== "/install") return <Welcome />;
  if (!prefs.onboarded && path !== "/install") return <Onboarding />;
  if (path === "/install" && !prefs.onboarded) return <div className="mx-auto min-h-dvh max-w-xl">{children}</div>;

  const tabs = [
    { href: "/", label: t("tabProgramme"), icon: IconCalendar, show: true },
    { href: "/tables", label: t("tabTables"), icon: IconTable, show: prefs.sports.some((x) => sportMeta(x).kind === "team") },
    { href: "/gp", label: t("tabGP"), icon: IconF1, show: prefs.sports.includes("f1") },
    { href: "/league", label: lang === "fr" ? "Ligue" : "Liga", icon: IconTrophy, show: true },
    { href: "/settings", label: t("tabSettings"), icon: IconSettings, show: true },
  ].filter((x) => x.show);

  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/match") || path.startsWith("/event") || path.startsWith("/tennis") : path.startsWith(href));

  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      <main className="pb-28">{children}</main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl">
          {tabs.map(({ href, label, icon: Icon }) => {
            const on = active(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 pt-2.5 pb-1 text-[10.5px] leading-tight font-semibold transition-colors ${
                  on ? "text-brand" : "text-muted"
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
