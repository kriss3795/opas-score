import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Diagnóstico temporal del formato de ClubElo.
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u") ?? "http://clubelo.com/API";
  if (!/^https?:\/\/(api\.)?clubelo\.com\//.test(u)) return NextResponse.json({ error: "url" }, { status: 400 });
  const find = new URL(req.url).searchParams.get("find");
  let off = Number(new URL(req.url).searchParams.get("off") ?? 0);
  try {
    const res = await fetch(u, { cache: "no-store" });
    const text = await res.text();
    if (find) off = Math.max(0, text.indexOf(find) + off);
    return new NextResponse(`status ${res.status} type ${res.headers.get("content-type")} len ${text.length}\n` + text.slice(off, off + 4000), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) });
  }
}
