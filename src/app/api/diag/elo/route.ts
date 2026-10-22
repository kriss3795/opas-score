import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Diagnóstico temporal: ¿qué endpoints de ClubElo siguen activos?
export async function GET() {
  const day = new Date().toISOString().slice(0, 10);
  const out: Record<string, unknown> = {};
  for (const u of [`http://api.clubelo.com/${day}`, "http://api.clubelo.com/ParisSG", "http://clubelo.com/API"]) {
    try {
      const res = await fetch(u, { cache: "no-store" });
      const text = await res.text();
      const lines = text.trim().split(/\r?\n/);
      out[u] = { status: res.status, lines: lines.length, head: lines.slice(0, 3), sample: lines.filter((l) => /paris|lyon|liverpool/i.test(l)).slice(-3) };
    } catch (e) {
      out[u] = { error: e instanceof Error ? e.message : String(e) };
    }
  }
  return NextResponse.json(out);
}
