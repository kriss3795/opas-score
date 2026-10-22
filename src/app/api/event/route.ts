import { NextRequest, NextResponse } from "next/server";
import { eventDetail } from "@/lib/server/espn";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const ev = await eventDetail(q.get("league") ?? "", q.get("id") ?? "", q.get("d") ?? "");
  return NextResponse.json({ event: ev }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
