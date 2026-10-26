"use client";

import { useState } from "react";
import { useApp } from "@/lib/client/store";

export interface OfficialVideo {
  id: string;
  title: string;
  published: string;
  channel: string;
}

// Lista compacta de videos de canales oficiales (solo títulos). Al tocar uno se abre dentro de la app.
export function OfficialList({ items, limit }: { items: OfficialVideo[]; limit?: number }) {
  const { lang } = useApp();
  const fr = lang === "fr";
  const [open, setOpen] = useState<string | null>(null);
  const list = limit !== undefined ? items.slice(0, limit) : items;
  if (!list.length) return null;
  return (
    <ul className="divide-y divide-line">
      {list.map((v) => (
        <li key={v.id} className="py-1">
          <button onClick={() => setOpen(open === v.id ? null : v.id)} className="flex w-full items-center gap-2 py-2 text-left">
            <span className="text-brand">{open === v.id ? "▼" : "▶"}</span>
            <span className="min-w-0 flex-1 text-sm leading-tight font-semibold">
              {v.title}
              <span className="mt-0.5 block text-xs font-normal text-muted">
                {fr ? "Chaîne officielle" : "Canal oficial"} {v.channel}
              </span>
            </span>
          </button>
          {open === v.id && (
            <div className="mb-2">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&playsinline=1&rel=0`}
                title={v.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="aspect-video w-full rounded-xl bg-black"
              />
              <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className="mt-1 block text-center text-xs text-muted underline">
                {fr ? "Si la vidéo ne se lit pas ici, l'ouvrir sur la chaîne officielle" : "Si no se reproduce aquí, abrirlo en el canal oficial"}
              </a>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// Tarjeta completa para pantallas sin otra fuente de video (tenis, F1).
export function OfficialCard({ items, title }: { items: OfficialVideo[]; title?: string }) {
  const { lang } = useApp();
  if (!items?.length) return null;
  return (
    <section className="rounded-3xl bg-card p-4">
      <h3 className="mb-2 font-bold">🎬 {title ?? (lang === "fr" ? "Vidéos officielles" : "Videos oficiales")}</h3>
      <OfficialList items={items} />
    </section>
  );
}
