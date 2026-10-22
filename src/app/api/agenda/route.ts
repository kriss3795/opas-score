import { NextRequest, NextResponse } from "next/server";
import { buildAgenda, queryFromPrefs } from "@/lib/server/agenda";

export const maxDuration = 60;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = queryFromPrefs(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const now = new Date();
  // Rango pedido por el calendario (from/to en ISO); por defecto, de ayer a 4 días más.
  // Máximo 8 días por consulta y hasta 120 días hacia atrás o adelante.
  const DAY = 86400000;
  const parse = (k: string) => {
    const v = req.nextUrl.searchParams.get(k);
    const d = v ? new Date(v) : null;
    return d && !isNaN(d.getTime()) && Math.abs(d.getTime() - now.getTime()) < 120 * DAY ? d : null;
  };
  const from = parse("from") ?? new Date(now.getTime() - DAY);
  let to = parse("to") ?? new Date(now.getTime() + 4 * DAY);
  if (to.getTime() - from.getTime() > 8 * DAY) to = new Date(from.getTime() + 8 * DAY);
  if (to <= from) to = new Date(from.getTime() + DAY);
  const { events: all, failed } = await buildAgenda(q, from, to);
  const events = all.filter((e) => {
    const t = new Date(e.start).getTime();
    // Torneos de varios días (golf) que empezaron antes siguen apareciendo mientras se juegan.
    return (t >= from.getTime() && t < to.getTime()) || (e.status === "in" && t < to.getTime());
  });
  return NextResponse.json(
    { events, failed, updated: now.toISOString() },
    { headers: { "Cache-Control": `public, s-maxage=${to.getTime() < now.getTime() ? 600 : 30}, stale-while-revalidate=120` } },
  );
}
