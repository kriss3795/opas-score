import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Diagnóstico temporal: ¿qué canales oficiales de YouTube responden por RSS (sin clave)?
const C: Record<string, string> = {
  ligue1: "UCQsH5XtIc9hONE1BQjucM0g",
  premier: "UCG5qGWdu8nIRZqJ_GgDwQ-w",
  laliga: "UCTv-XvfzLX3i4IGWAm4sbmA",
  seriea: "UCBJeMCIeLQos7wacox4hmLQ",
  bundesliga: "UC6UL29enLNe4mqwTfAyeNuw",
  uefa: "UCyGa1YEx9ST66rYrJTGIKOw",
  atp: "UCbcxFkd6B9xUU54InHv4Tig",
  wta: "UCXCKH8BmpDvf0GIOyVRZEbA",
  f1: "UCB_qr75-ydFVKSF9Dmo6izg",
  nba: "UCWJ2lWNubArHWmf3FIHbfcQ",
  nhl: "UCqFMzb-4AUf6WAIbl132QKA",
  mlb: "UCoLrcjPV5PbUrUyXq5mjc_A",
  nfl: "UCDVYQ4Zhbm3S2dlz7P1GBDg",
  ufc: "UCvgfXK4nTYKudb0rFR6noLA",
  top14: "UCwwXF3h1xtw1u-6ALtr1Elw",
};

export async function GET() {
  const out: Record<string, unknown> = {};
  await Promise.all(
    Object.entries(C).map(async ([k, id]) => {
      try {
        const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, { cache: "no-store" });
        const x = await r.text();
        const name = x.match(/<title>([^<]*)<\/title>/)?.[1];
        const titles = Array.from(x.matchAll(/<entry>[\s\S]*?<title>([^<]*)<\/title>/g)).slice(0, 3).map((m) => m[1]);
        out[k] = { status: r.status, name, titles };
      } catch (e) {
        out[k] = { error: String(e) };
      }
    }),
  );
  return NextResponse.json(out);
}
