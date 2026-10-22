import { NextResponse } from "next/server";
import { LEAGUES } from "@/lib/catalog";

export const maxDuration = 60;

// Comprueba qué competiciones existen en la fuente. Solo se ocultan las que la fuente
// rechaza explícitamente (dirección inválida); un fallo de red momentáneo no oculta nada.
async function exists(path: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`, {
      next: { revalidate: 21600 },
      signal: ctrl.signal,
    });
    if (res.status === 400 || res.status === 404) return false;
    if (!res.ok) return true;
    const d = (await res.json()) as { leagues?: unknown[] };
    return Array.isArray(d.leagues) ? d.leagues.length > 0 : true;
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const checks = await Promise.all(LEAGUES.map(async (l) => ((await exists(l.path)) ? l.id : null)));
  const available = checks.filter(Boolean);
  return NextResponse.json(
    { available, checked: LEAGUES.length },
    { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } },
  );
}
