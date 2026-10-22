"use client";

import Image from "next/image";
import { useApp } from "@/lib/client/store";

// Pantalla de bienvenida: solo la primera vez.
export default function Welcome() {
  const { t, update, lang, prefs } = useApp();
  return (
    <div className="pt-safe pb-safe relative flex min-h-dvh flex-col items-center justify-between overflow-hidden px-7 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 30%, color-mix(in srgb, var(--brand) 25%, transparent), transparent 70%), radial-gradient(50% 35% at 50% 75%, color-mix(in srgb, var(--brand2) 18%, transparent), transparent 70%)",
        }}
      />
      <div className="relative flex w-full justify-end gap-1 pt-2">
        {(["fr", "es"] as const).map((l) => (
          <button
            key={l}
            onClick={() => update({ lang: l })}
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
              lang === l ? "bg-text text-bg" : "text-muted"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="relative flex flex-col items-center">
        <Image src="/logo.png" alt="Opa's Score" width={900} height={742} priority className="rise w-[78%] max-w-sm" />
        <p className="rise mt-8 max-w-sm text-xl leading-relaxed font-medium" style={{ animationDelay: "0.25s" }}>
          {t("welcome")}
        </p>
        <p className="rise mt-5 max-w-sm text-base text-muted italic" style={{ animationDelay: "0.5s" }}>
          {t("welcomeSign")}
        </p>
      </div>

      <button
        onClick={() => update({ welcomed: true, lang: prefs.lang })}
        className="rise relative mb-6 w-full max-w-sm rounded-2xl bg-brand py-4 text-lg font-extrabold text-white shadow-lg shadow-brand/30 active:scale-[0.98]"
        style={{ animationDelay: "0.8s" }}
      >
        {t("start")}
      </button>
    </div>
  );
}
