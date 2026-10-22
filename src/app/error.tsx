"use client";

import { useEffect } from "react";

// Si algo falla, en vez de una pantalla en blanco se muestra esto, con el detalle del error.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Tras publicar una versión nueva, el teléfono puede tener piezas viejas: se recarga una vez sola.
    const chunk = /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(error.message);
    try {
      if (chunk && !sessionStorage.getItem("opas-reloaded")) {
        sessionStorage.setItem("opas-reloaded", "1");
        window.location.reload();
      }
    } catch {
      /* sin almacenamiento */
    }
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="text-5xl">⚽</div>
      <h1 className="text-xl font-extrabold">Oups… / Ups…</h1>
      <p className="text-muted">Un petit problème est survenu. / Ocurrió un pequeño problema.</p>
      <div className="flex gap-3">
        <button onClick={() => reset()} className="rounded-2xl bg-card px-5 py-3 font-bold">
          Réessayer
        </button>
        <button onClick={() => window.location.reload()} className="rounded-2xl bg-brand px-5 py-3 font-bold text-white">
          Recharger
        </button>
      </div>
      <p className="mt-4 max-w-sm text-xs break-words text-muted">{error.message}
        {"\n"}
        {(error.stack ?? "").split("\n").slice(0, 4).join(" ← ")}</p>
    </div>
  );
}
