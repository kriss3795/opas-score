"use client";

import { useState } from "react";

// Escudo con respaldo: si la imagen no carga, muestra las iniciales.
export default function TeamLogo({ src, name, size = 28 }: { src?: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    const ini = name
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-card2 font-bold text-muted"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {ini || name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} loading="lazy" onError={() => setErr(true)} className="shrink-0 object-contain" style={{ width: size, height: size }} />
  );
}
