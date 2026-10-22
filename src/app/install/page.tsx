"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/client/store";
import { isStandalone, platform, type Platform } from "@/lib/client/push";
import { IconShare } from "@/components/Icons";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

// Instalación guiada: detecta el teléfono y muestra los pasos correctos.
export default function InstallPage() {
  const { t, prefs, lang } = useApp();
  const [p, setP] = useState<Platform>("desktop");
  const [installed, setInstalled] = useState(false);
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [iosOld, setIosOld] = useState(false);

  useEffect(() => {
    setP(platform());
    setInstalled(isStandalone());
    const m = navigator.userAgent.match(/OS (\d+)_(\d+)/);
    if (m) setIosOld(Number(m[1]) < 16 || (Number(m[1]) === 16 && Number(m[2]) < 4));
    const h = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const steps =
    p === "ios"
      ? [t("iosStep1"), t("iosStep2"), t("iosStep3"), t("iosStep4")]
      : p === "android"
        ? [t("andStep1"), t("andStep2"), t("andStep3")]
        : [t("desktop")];

  return (
    <div className="pt-safe mx-auto max-w-xl px-5 pb-10">
      <div className="flex justify-center pt-4">
        <Image src="/logo.png" alt="Opa's Score" width={900} height={742} className="w-44" />
      </div>
      <h1 className="mt-4 text-center text-2xl font-extrabold">{t("installTitle")}</h1>
      {!prefs.onboarded && !installed && (
        <p className="mt-3 text-center text-muted">
          {lang === "fr"
            ? "Installe-la d'abord : tu choisiras ensuite tes sports directement dans l'app installée."
            : "Instálala primero: después eliges tus deportes directamente en la app instalada."}
        </p>
      )}

      {installed ? (
        <p className="mt-8 rounded-2xl bg-football/15 px-5 py-6 text-center font-bold text-football">{t("installedOk")}</p>
      ) : (
        <>
          <ol className="mt-8 space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-4 rounded-2xl bg-card p-4">
                <span className="font-score flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-extrabold text-white">
                  {i + 1}
                </span>
                <span className="pt-1.5 text-[17px] leading-snug font-medium">
                  {s}
                  {p === "ios" && i === 1 && <IconShare className="ml-2 inline h-5 w-5 text-brand2" />}
                </span>
              </li>
            ))}
          </ol>
          {p === "android" && bip && (
            <button
              onClick={async () => {
                await bip.prompt();
                const c = await bip.userChoice;
                if (c.outcome === "accepted") setInstalled(true);
              }}
              className="mt-6 w-full rounded-2xl bg-brand py-4 text-lg font-extrabold text-white"
            >
              {t("installNow")}
            </button>
          )}
          {p === "ios" && <p className={`mt-5 text-center text-sm ${iosOld ? "font-bold text-live" : "text-muted"}`}>{t("iosVersion")}</p>}
        </>
      )}

      <Link href="/" className="mt-8 block text-center font-semibold text-muted">
        {installed ? "OK" : prefs.onboarded ? t("later") : lang === "fr" ? "Continuer sans installer" : "Continuar sin instalar"}
      </Link>
    </div>
  );
}
