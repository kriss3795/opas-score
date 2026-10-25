"use client";

// Búsqueda del resumen en YouTube (los canales oficiales suben los videos reales de cada partido o carrera).
export default function YouTubeButton({ q, label }: { q: string; label: string }) {
  return (
    <a
      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`}
      target="_blank"
      rel="noreferrer"
      className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#FF0000] py-2.5 text-sm font-bold text-white"
    >
      ▶ {label}
    </a>
  );
}
