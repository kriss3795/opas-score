import "server-only";

// Llamada con caché de Next (revalidate en segundos) y tiempo límite.
// Si la fuente falla, devuelve null: la app degrada con elegancia en vez de romperse.
export async function getJson<T = unknown>(
  url: string,
  revalidate: number,
  headers: Record<string, string> = {},
  timeoutMs = 8000,
): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "OpasScore/1.0 (personal app)", ...headers },
      next: { revalidate },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[data] ${res.status} ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`[data] error ${url}`, e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function ymd(d: Date) {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}
