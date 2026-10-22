import { NextRequest, NextResponse } from "next/server";
import { buildAgenda, queryFromPrefs } from "@/lib/server/agenda";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = queryFromPrefs(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const now = new Date();
  const { events, failed } = await buildAgenda(q, new Date(now.getTime() - 2 * 86400000), new Date(now.getTime() + 10 * 86400000));
  return NextResponse.json(
    { events, failed, updated: now.toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
