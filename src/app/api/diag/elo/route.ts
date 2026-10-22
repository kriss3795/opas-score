import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Diagnóstico temporal: filas de la tabla de partidos de clubelo.com/API como texto.
export async function GET() {
  const res = await fetch("http://clubelo.com/API", { cache: "no-store" });
  const html = await res.text();
  const rows = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)).map((m) =>
    Array.from(m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)).map((c) => ({
      t: c[1].replace(/<[^>]+>/g, "|").replace(/\s+/g, " ").replace(/\|+/g, "|").trim(),
      href: (c[1].match(/href="([^"]+)"/) ?? [])[1],
    })),
  );
  return NextResponse.json({ n: rows.length, rows: rows.slice(0, 14), tail: rows.slice(-3) });
}
