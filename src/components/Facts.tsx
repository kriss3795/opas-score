"use client";

import { useApp } from "@/lib/client/store";

export interface FactItem {
  fr: string;
  es: string;
  source: string;
  url: string;
}

// Tarjeta "Le saviez-vous ?": cada dato con su fuente y un botón para compartir por WhatsApp.
export function FactsCard({ facts }: { facts: FactItem[] }) {
  const { lang } = useApp();
  if (!facts?.length) return null;
  return (
    <section className="rounded-3xl border border-gold/30 bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-extrabold text-gold">💡 {lang === "fr" ? "Le saviez-vous ?" : "¿Sabías que…?"}</h3>
      <ul className="space-y-3">
        {facts.map((f, i) => {
          const text = f[lang];
          const share = `https://wa.me/?text=${encodeURIComponent(`${lang === "fr" ? "Le saviez-vous ?" : "¿Sabías que…?"} ${text}\n— Opa's Score (${f.source})`)}`;
          return (
            <li key={i} className="rounded-2xl bg-card2 p-3">
              <p className="leading-snug">{text}</p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <a href={f.url} target="_blank" rel="noreferrer" className="text-muted underline">
                  {lang === "fr" ? "Source" : "Fuente"} : {f.source}
                </a>
                <a href={share} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1 font-bold text-white">
                  WhatsApp
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Probabilidades de ClubElo para un partido de fútbol.
export function EloBar({ elo, home, away }: { elo: { home: number; draw: number; away: number }; home: string; away: string }) {
  const { lang } = useApp();
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return (
    <section className="rounded-3xl bg-card p-4">
      <h3 className="mb-3 font-bold">{lang === "fr" ? "Probabilités de victoire" : "Probabilidades de victoria"}</h3>
      <div className="flex h-3 overflow-hidden rounded-full">
        <div className="bg-brand" style={{ width: pct(elo.home) }} />
        <div className="bg-muted/40" style={{ width: pct(elo.draw) }} />
        <div className="bg-brand2" style={{ width: pct(elo.away) }} />
      </div>
      <div className="mt-2 grid grid-cols-3 text-sm">
        <span>
          <b className="font-score text-xl text-brand">{pct(elo.home)}</b>
          <span className="block leading-tight text-muted">{home}</span>
        </span>
        <span className="text-center">
          <b className="font-score text-xl">{pct(elo.draw)}</b>
          <span className="block text-muted">{lang === "fr" ? "Nul" : "Empate"}</span>
        </span>
        <span className="text-right">
          <b className="font-score text-xl text-brand2">{pct(elo.away)}</b>
          <span className="block leading-tight text-muted">{away}</span>
        </span>
      </div>
      <a href="http://clubelo.com" target="_blank" rel="noreferrer" className="mt-3 block text-xs text-muted underline">
        {lang === "fr" ? "Source : ClubElo (classement Elo des clubs)" : "Fuente: ClubElo (ranking Elo de clubes)"}
      </a>
    </section>
  );
}
