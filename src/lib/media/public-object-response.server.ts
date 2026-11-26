/**
 * Entrega bytes de un objeto ya autorizado sin revelar la URL firmada de
 * Storage al navegador. Reutiliza la firma LRU/single-flight oficial.
 */

const CACHE_CONTROL = "public, max-age=300, s-maxage=300";

export async function publicMediaObjectResponse(input: {
  bucket: "studio-media" | "media-derived";
  path: string;
  request: Request;
}): Promise<Response> {
  const { unsafeGetSignedUrl } = await import("./sign.server");
  const signed = await unsafeGetSignedUrl({ bucket: input.bucket, path: input.path });
  if (!signed.ok) return new Response("Not found", { status: 404 });

  const forwarded = new Headers();
  for (const name of ["if-none-match", "if-modified-since", "range"]) {
    const value = input.request.headers.get(name);
    if (value) forwarded.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(signed.url, {
      method: "GET",
      headers: forwarded,
      redirect: "manual",
      signal: input.request.signal,
    });
  } catch (error) {
    if (input.request.signal.aborted) return new Response(null, { status: 499 });
    console.error("[public-media] storage fetch failed", error);
    return new Response("Media unavailable", { status: 502 });
  }

  if (upstream.status === 304) {
    return new Response(null, {
      status: 304,
      headers: { "Cache-Control": CACHE_CONTROL, ETag: upstream.headers.get("ETag") ?? "" },
    });
  }
  if (upstream.status >= 300 && upstream.status < 400) {
    // Nunca propagar Location: el host firmado permanece en el servidor.
    return new Response("Media unavailable", { status: 502 });
  }
  if (!upstream.ok) {
    return new Response(upstream.status === 404 ? "Not found" : "Media unavailable", {
      status: upstream.status === 404 ? 404 : 502,
    });
  }
  if (!upstream.body) return new Response("Media unavailable", { status: 502 });

  const contentType = upstream.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
  if (!contentType?.startsWith("image/")) {
    return new Response("Unsupported media", { status: 502 });
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of [
    "ETag",
    "Last-Modified",
    "Content-Length",
    "Content-Range",
    "Accept-Ranges",
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
