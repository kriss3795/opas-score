import { NextRequest, NextResponse } from "next/server";
import { supa } from "@/lib/server/push";

export const dynamic = "force-dynamic";

// Estado de los avisos de este teléfono: ¿está registrado? ¿cuándo corrió el último control del servidor?
export async function POST(req: NextRequest) {
  const db = supa();
  if (!db) return NextResponse.json({ registered: false, lastCron: null });
  const b = await req.json().catch(() => ({}));
  const endpoint = typeof b.endpoint === "string" ? b.endpoint : "";
  const [{ data: sub }, { data: beat }] = await Promise.all([
    endpoint ? db.from("push_subs").select("endpoint").eq("endpoint", endpoint).maybeSingle() : Promise.resolve({ data: null }),
    db.from("fl_results").select("value").eq("event_key", "__cron").maybeSingle(),
  ]);
  return NextResponse.json({ registered: Boolean(sub), lastCron: (beat?.value as { at?: string } | null)?.at ?? null });
}
