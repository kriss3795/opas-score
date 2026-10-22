import { NextResponse } from "next/server";
import { f1Drivers } from "@/lib/server/jolpica";

export async function GET() {
  const drivers = await f1Drivers();
  return NextResponse.json(
    { drivers: drivers ?? [] },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } },
  );
}
