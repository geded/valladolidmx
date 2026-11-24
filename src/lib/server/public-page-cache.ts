/**
 * Copia breve de páginas públicas en el borde (Cache API del Worker).
 * El HTML del servidor siempre es anónimo (la sesión vive en el teléfono),
 * así que la misma página sirve a todos los visitantes. Fresca 60 s; hasta
 * 10 min se entrega al instante y se renueva en segundo plano.
 */
import { publicReadMemo } from "../cache/public-read-memo";
import { Buffer } from "node:buffer";

const FRESH_MS = 60_000;
const STALE_MS = 10 * 60_000;
const STAMP = "x-vmx-cached-at";
const PRIVATE_PREFIX =
  /^\/(?:~oauth|api|_serverFn|auth|cms|portal|admin|cuenta|concierge|empresa|insertar|lovable|checkout|pago)(?:\/|$)/;

type Ctx = { waitUntil?: (p: Promise<unknown>) => void } | undefined;

export function isCacheablePageRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  if (!(request.headers.get("accept") ?? "").includes("text/html")) return false;
  const url = new URL(request.url);
  if (PRIVATE_PREFIX.test(url.pathname)) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return false;
  if (/(?:^|&)(?:preview|draft|nocache|sw)=/.test(url.search.slice(1))) return false;
  if (request.headers.has("authorization")) return false;
  if (request.headers.has("cookie")) return false;
  return true;
}

/** Inicio, Oriente Maya, cada destino, sus listados y los listados generales. */
const SHARED_HTML_PATH =
  /^\/(?:|oriente-maya(?:\/[a-z0-9-]+(?:\/[a-z0-9-]+(?:\/[a-z0-9-]+)?)?)?|hoteles|restaurantes|experiencias|casas-de-vacaciones|eventos|sitios-de-interes)\/?$/;
export function isSharedHtmlPath(pathname: string): boolean {
  return SHARED_HTML_PATH.test(pathname);
}

/** Piloto acotado: ninguna búsqueda, presentación editorial o sesión compartida. */
export function isSharedHtmlRequest(request: Request): boolean {
  const url = new URL(request.url);
  return isCacheablePageRequest(request) && !url.search &&
    isSharedHtmlPath(url.pathname) &&
    !/no-cache|no-store|max-age=0/i.test(request.headers.get("cache-control") ?? "") &&
    request.headers.get("pragma") !== "no-cache";
}

type HtmlCopy = { bodyGzipBase64: string; headers: [string, string][] };
class UncacheableHtml extends Error {
  constructor(readonly response: Response) { super("Uncacheable public response"); }
}

export async function serveSharedHtml(request: Request, render: () => Promise<Response>): Promise<Response> {
  const started = performance.now();
  // Se reutiliza la tabla y el invalidado CMS existentes; no hay otro almacén.
  const build = String(import.meta.env["VMX_HTML_BUILD_ID"] ?? "dev");
  const key = `public-html:gzip:${build}:${request.url}:${request.headers.get("accept-language") ?? ""}`;
  let rendered = false;
  try {
    const copy = await publicReadMemo<HtmlCopy>(key, async () => {
      rendered = true;
      const response = await render();
      const vary = (response.headers.get("vary") ?? "").toLowerCase();
      if (!isStorableResponse(response) || (vary && vary !== "accept-encoding") ||
          response.headers.has("content-encoding")) throw new UncacheableHtml(response);
      // Sólo dos documentos públicos, con tamaño acotado. No comprime respuestas.
      const body = await response.clone().text();
      if (new TextEncoder().encode(body).length > 1_000_000) throw new UncacheableHtml(response);
      const headers = Array.from(response.headers.entries()).filter(([name]) =>
        !["content-length", "transfer-encoding", "connection", "date"].includes(name.toLowerCase()),
      );
      // Compact only the stored data, NEVER the HTTP response. JSONB rejects NUL.
      const packed = await new Response(
        new Blob([body]).stream().pipeThrough(new CompressionStream("gzip")),
      ).arrayBuffer();
      return { bodyGzipBase64: Buffer.from(packed).toString("base64"), headers };
    }, { maxAgeMs: FRESH_MS, staleWhileRevalidate: false });
    const lookupMs = performance.now() - started;
    const bytes = Uint8Array.from(Buffer.from(copy.bodyGzipBase64, "base64"));
    const body = await new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).text();
    const out = new Response(body, { headers: copy.headers });
    // No sumar otra vida en CDN/navegador: CMS invalida la única copia compartida.
    out.headers.set("cache-control", "no-store");
    out.headers.set("x-vmx-html", rendered ? "MISS" : "HIT");
    out.headers.append("server-timing", `vmx_html;dur=${lookupMs.toFixed(1)}, vmx_unpack;dur=${(performance.now() - started - lookupMs).toFixed(1)}`);
    return out;
  } catch (error) {
    if (error instanceof UncacheableHtml) return error.response;
    throw error;
  }
}

export function isStorableResponse(response: Response): boolean {
  return (
    response.status === 200 &&
    (response.headers.get("content-type") ?? "").includes("text/html") &&
    !response.headers.has("set-cookie") &&
    !/no-store|private/.test(response.headers.get("cache-control") ?? "")
  );
}

function edgeCache(): Cache | null {
  const c = (globalThis as { caches?: { default?: Cache } }).caches;
  return c?.default ?? null;
}

function cacheKey(request: Request): Request {
  return new Request(new URL(request.url).toString(), { method: "GET" });
}

async function store(cache: Cache, key: Request, response: Response) {
  const copy = new Response(response.body, response);
  copy.headers.set(STAMP, String(Date.now()));
  copy.headers.set("cache-control", `public, max-age=${Math.round(STALE_MS / 1000)}`);
  await cache.put(key, copy);
}

export async function servePublicPage(
  request: Request,
  ctx: Ctx,
  render: () => Promise<Response>,
): Promise<Response> {
  // El middleware Start cubre también el preview. No apilar la copia del borde.
  if (isSharedHtmlPath(new URL(request.url).pathname)) return render();
  const cache = edgeCache();
  if (!cache || !isCacheablePageRequest(request)) return render();
  const key = cacheKey(request);
  let hit: Response | undefined;
  try {
    hit = await cache.match(key);
  } catch {
    hit = undefined;
  }
  const refresh = async () => {
    const fresh = await render();
    if (isStorableResponse(fresh)) await store(cache, key, fresh.clone()).catch(() => {});
    return fresh;
  };
  if (hit) {
    const age = Date.now() - Number(hit.headers.get(STAMP) ?? 0);
    if (age < STALE_MS) {
      if (age >= FRESH_MS && ctx?.waitUntil) ctx.waitUntil(refresh().catch(() => {}));
      const out = new Response(hit.body, hit);
      out.headers.set("cache-control", "public, max-age=0, must-revalidate");
      out.headers.set("x-vmx-edge", age < FRESH_MS ? "HIT" : "STALE");
      out.headers.delete(STAMP);
      return out;
    }
  }
  const fresh = await refresh();
  const out = new Response(fresh.body, fresh);
  out.headers.set("x-vmx-edge", "MISS");
  return out;
}
