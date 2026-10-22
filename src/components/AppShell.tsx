"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/lib/client/store";
import { registerSW } from "@/lib/client/push";
import Welcome from "./Welcome";
import { sportMeta } from "@/lib/catalog";
import Onboarding from "./Onboarding";
import { IconCalendar, IconF1, IconSettings, IconTable } from "./Icons";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { prefs, ready, t } = useApp();
  const path = usePathname();

  useEffect(() => {
    registerSW();
  }, []);

  if (!ready) return <div className="min-h-dvh bg-bg" />;
  if (!prefs.welcomed) return <Welcome />;
  if (!prefs.onboarded && path !== "/install") return <Onboarding />;

  const tabs = [
    { href: "/", label: t("tabProgramme"), icon: IconCalendar, show: true },
    { href: "/tables", label: t("tabTables"), icon: IconTable, show: prefs.sports.some((x) => sportMeta(x).kind === "team") },
    { href: "/gp", label: t("tabGP"), icon: IconF1, show: prefs.sports.includes("f1") },
    { href: "/settings", label: t("tabSettings"), icon: IconSettings, show: true },
  ].filter((x) => x.show);

  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/match") || path.startsWith("/event") : path.startsWith(href));

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
                className={`flex flex-1 flex-col items-center gap-1 pt-2.5 pb-1 text-[11px] font-semibold transition-colors ${
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
