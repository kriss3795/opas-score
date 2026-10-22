// Rondas de tenis: la fuente las publica en inglés ("Round of 32", "2nd Round", "Final"…).
export function roundLabel(r: string, lang: "fr" | "es") {
  const fr = lang === "fr";
  const s = r.trim();
  if (/qualif/i.test(s)) return fr ? "Qualifications" : "Clasificación";
  if (/semi/i.test(s)) return fr ? "Demi-finale" : "Semifinal";
  if (/quarter/i.test(s)) return fr ? "Quart de finale" : "Cuartos de final";
  if (/round robin|group/i.test(s)) return fr ? "Phase de groupes" : "Fase de grupos";
  const of = s.match(/round of (\d+)/i);
  if (of) {
    const n = Number(of[1]);
    const FR: Record<number, string> = { 16: "Huitième de finale", 32: "1/16e de finale", 64: "1/32e de finale", 128: "1/64e de finale" };
    const ES: Record<number, string> = { 16: "Octavos de final", 32: "Dieciseisavos de final", 64: "Treintaidosavos de final", 128: "Ronda de 128" };
    return (fr ? FR[n] : ES[n]) ?? s;
  }
  if (/\bfinal\b/i.test(s)) return fr ? "Finale" : "Final";
  const m = s.match(/round (\d+)/i) ?? s.match(/(\d+)(?:st|nd|rd|th) round/i);
  if (m) return fr ? `${m[1]}${m[1] === "1" ? "er" : "e"} tour` : `${m[1]}.ª ronda`;
  return s;
}
