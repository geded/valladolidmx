/**
 * Copia breve de páginas públicas en el borde (Cache API del Worker).
 * El HTML del servidor siempre es anónimo (la sesión vive en el teléfono),
 * así que la misma página sirve a todos los visitantes. Fresca 60 s; hasta
 * 10 min se entrega al instante y se renueva en segundo plano.
 */
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
  return true;
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
