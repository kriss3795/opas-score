"use client";

import { useApp } from "@/lib/client/store";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Cancha con la alineación: filas según el esquema (p. ej. 4-2-3-1) y puestos que publica la fuente.
// Si los datos no cuadran con el esquema, no se dibuja (queda la lista).

function depth(p: any): number {
  const a = String(p.pos ?? "").toUpperCase();
  const n = String(p.posName ?? "").toLowerCase();
  if (a === "G" || a === "GK" || n.includes("goalkeeper")) return 0;
  if (a.includes("WB") || n.includes("wing back")) return 1.5;
  if (/^(CB|CD|SW|D)(-|$)/.test(a) || n.includes("center back") || n.includes("centre back") || n === "defender") return 1;
  if (/^(RB|LB)$/.test(a) || n.includes("full back") || n.includes("right back") || n.includes("left back")) return 1.2;
  if (/^(DM|CDM)/.test(a) || n.includes("defensive mid")) return 2;
  if (/^(AM|CAM)/.test(a) || n.includes("attacking mid")) return 4;
  if (/^(RW|LW|W)(-|$)/.test(a) || n.includes("wing")) return 4.5;
  if (/^(F|FW|CF|ST|S)(-|$)/.test(a) || n.includes("forward") || n.includes("striker")) return 5;
  if (/^(M|CM|RM|LM)(-|$)/.test(a) || n.includes("midfield")) return /^(RM|LM)/.test(a) ? 3.1 : 3;
  return 3;
}

// Lateralidad: banda (LB, LW, LM…) = ±2; interior (CD-L, CM-R…) = ±1; centro = 0.
function side(p: any): number {
  const a = String(p.pos ?? "").toUpperCase();
  const n = String(p.posName ?? "").toLowerCase();
  if (/^L(B|M|W|WB)$/.test(a)) return -2;
  if (/^R(B|M|W|WB)$/.test(a)) return 2;
  if (/-L$/.test(a) || /^LCB$/.test(a)) return -1;
  if (/-R$/.test(a) || /^RCB$/.test(a)) return 1;
  if (n.startsWith("left")) return -2;
  if (n.startsWith("right")) return 2;
  return 0;
}

export function buildRows(starters: any[], formation?: string): any[][] | null {
  if (!formation || starters.length !== 11) return null;
  const counts = formation.split("-").map(Number).filter((x) => x > 0);
  if (!counts.length || counts.reduce((s, x) => s + x, 0) !== 10) return null;
  const sorted = [...starters].sort((x, y) => depth(x) - depth(y) || (x.place ?? 0) - (y.place ?? 0));
  if (depth(sorted[0]) !== 0) return null;
  const rows: any[][] = [[sorted[0]]];
  let i = 1;
  for (const c of counts) {
    rows.push(sorted.slice(i, i + c).sort((x, y) => side(x) - side(y)));
    i += c;
  }
  return rows;
}

// Apellido para la cancha; "Vinícius Júnior" o "Neymar Jr." conservan el nombre (si no, solo quedaría "Júnior").
const short = (name: string) => {
  const parts = name.split(" ");
  if (parts.length < 2) return name;
  if (/^(j[uú]nior|jr\.?|filho|neto|sobrinho)$/i.test(parts[parts.length - 1])) return parts.slice(-2).join(" ");
  return parts.slice(1).join(" ");
};

// Color de la camiseta: si es muy claro (blanco, amarillo), el número va en negro para que se lea.
function isLight(hex: string) {
  const h = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

export default function Pitch({ starters, formation, color }: { starters: any[]; formation?: string; color?: string }) {
  const { prefs, lang } = useApp();
  const rows = buildRows(starters, formation);
  if (!rows) return null;
  const followed = new Set((prefs.athletes ?? []).map((a) => a.name));
  const shirt = color ? `#${String(color).replace("#", "")}` : "var(--brand)";
  return (
    <div>
      <div
        className="relative overflow-hidden rounded-2xl px-2 py-4"
        style={{ background: "repeating-linear-gradient(0deg, #1f7a3a 0 44px, #23863f 44px 88px)" }}
      >
        {/* Líneas de la cancha */}
        <div className="pointer-events-none absolute inset-2 rounded-lg border-2 border-white/40" />
        <div className="pointer-events-none absolute top-1/2 right-2 left-2 border-t-2 border-white/40" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
        <div className="pointer-events-none absolute bottom-2 left-1/2 h-14 w-40 -translate-x-1/2 border-2 border-b-0 border-white/40" />
        <div className="pointer-events-none absolute top-2 left-1/2 h-14 w-40 -translate-x-1/2 border-2 border-t-0 border-white/40" />
        <div className="relative flex flex-col-reverse gap-5">
          {rows.map((row, ri) => (
            <div key={ri} className="flex justify-around">
              {row.map((p: any, k: number) => (
                <div key={k} className="flex w-[19%] flex-col items-center text-center">
                  <div
                    className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-sm font-extrabold text-white shadow"
                    style={{ background: ri === 0 ? "#f5c542" : shirt, color: ri === 0 || (color && isLight(String(color))) ? "#111" : undefined }}
                  >
                    {p.jersey}
                    {p.goals ? <span className="absolute -top-1.5 -right-2 text-xs">{"⚽".repeat(Math.min(p.goals, 3))}</span> : null}
                    {p.red ? (
                      <span className="absolute -top-1 -left-1.5 h-3.5 w-2.5 rounded-sm bg-red-600" />
                    ) : p.yellow ? (
                      <span className="absolute -top-1 -left-1.5 h-3.5 w-2.5 rounded-sm bg-yellow-400" />
                    ) : null}
                    {p.subOut !== undefined && <span className="absolute -right-2 -bottom-1 rounded-full bg-black/70 px-1 text-[9px] text-red-300">↓{p.subOut}</span>}
                  </div>
                  <span className={`mt-1 line-clamp-2 text-[11px] leading-tight font-semibold drop-shadow ${followed.has(p.name) ? "text-yellow-300" : "text-white"}`}>
                    {short(p.name)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        {lang === "fr"
          ? `Disposition ${formation} selon les postes publiés par ESPN.`
          : `Disposición ${formation} según los puestos que publica ESPN.`}
      </p>
    </div>
  );
}
