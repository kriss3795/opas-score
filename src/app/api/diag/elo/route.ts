import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Diagnóstico temporal: ¿responde ClubElo y con qué formato?
export async function GET() {
  try {
    const res = await fetch("http://api.clubelo.com/Fixtures", { cache: "no-store" });
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    return NextResponse.json({
      status: res.status,
      lines: lines.length,
      head: lines.slice(0, 3),
      paris: lines.filter((l) => /paris|lyon/i.test(l)).slice(0, 4),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) });
  }
}
