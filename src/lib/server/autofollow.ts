import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAgenda, queryFromPrefs } from "./agenda";
import { sportMeta } from "../catalog";
import type { SportEvent } from "../types";

// Todo lo que el usuario sigue (equipos, jugadores, tenistas, F1) queda con avisos activados
// automáticamente: se crea el "seguimiento" de cada partido que empieza en los próximos 40 minutos.
const F1_KEY_SESSIONS = new Set(["race", "sprint", "quali", "sq"]);

function nameOf(e: SportEvent, lang: "fr" | "es") {
  if (e.sport === "f1") {
    const lbl: Record<string, { fr: string; es: string }> = {
      race: { fr: "Course", es: "Carrera" },
      sprint: { fr: "Sprint", es: "Sprint" },
      quali: { fr: "Qualifications", es: "Clasificación" },
      sq: { fr: "Qualifs sprint", es: "Clasificación sprint" },
    };
    return `${e.competitionName} · ${lbl[e.title ?? "race"]?.[lang] ?? ""}`;
  }
  if (e.home && e.away) return `${e.home.short ?? e.home.name} – ${e.away.short ?? e.away.name}`;
  return e.title ?? e.competitionName;
}

export async function autoFollow(db: SupabaseClient) {
  const { data: subs } = await db.from("push_subs").select("endpoint, lang, prefs").not("prefs", "is", null).limit(50);
  const now = Date.now();
  let added = 0;
  for (const s of subs ?? []) {
    const q = queryFromPrefs(s.prefs as Record<string, unknown>);
    // Solo lo propio: equipos y jugadores favoritos, tenistas y sesiones clave de F1 (no ligas completas).
    const { events } = await buildAgenda({ ...q, leagues: [] }, new Date(now - 3 * 3600000), new Date(now + 40 * 60000));
    const lang = s.lang === "es" ? "es" : "fr";
    const rows = events
      .filter((e) => e.status !== "post" && e.status !== "cancelled")
      .filter((e) => new Date(e.start).getTime() <= now + 40 * 60000)
      .filter((e) => (e.sport === "f1" ? F1_KEY_SESSIONS.has(e.title ?? "") : true))
      .map((e) => {
        const kind = sportMeta(e.sport).kind;
        const name = nameOf(e, lang);
        return {
          endpoint: s.endpoint,
          event_id: e.id,
          title: e.sport === "f1" ? `🏎️ ${e.competitionName}` : `${sportMeta(e.sport).emoji} Opa's Score`,
          body: lang === "fr" ? `Dans {min} min : ${name}` : `En {min} min: ${name}`,
          url: e.link ?? "/",
          start_at: e.start,
          league: kind === "team" || kind === "tennis" ? e.competitionId : null,
        };
      });
    if (!rows.length) continue;
    // ignoreDuplicates: no se pisa el estado de los partidos ya seguidos.
    const { error, count } = await db
      .from("reminders")
      .upsert(rows, { onConflict: "endpoint,event_id", ignoreDuplicates: true, count: "exact" });
    if (!error) added += count ?? 0;
  }
  return added;
}
