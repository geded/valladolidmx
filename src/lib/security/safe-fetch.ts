/**
 * Descarga saliente de direcciones que escribe un editor (fotos de sitios web).
 * Sólo https hacia nombres públicos: rechaza localhost, direcciones IP
 * literales (privadas o no), dominios internos y puertos no estándar, y
 * revalida cada redirección.
 */
const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost", ".lan", ".home", ".corp", ".intranet"];

export function isSafePublicUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".")) return false;
  if (host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return false;
  // IPv4/IPv6 literales: nunca (evita metadatos de nube y redes internas).
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[") || host.includes(":")) return false;
  if (/^0x[0-9a-f]+$/i.test(host) || /^\d+$/.test(host)) return false;
  return true;
}

export async function safeFetch(raw: string, init: RequestInit = {}, maxRedirects = 4): Promise<Response> {
  let url = raw;
  for (let i = 0; i <= maxRedirects; i++) {
    if (!isSafePublicUrl(url)) throw new Error("blocked_url");
    const res = await fetch(url, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      url = new URL(loc, url).toString();
      continue;
    }
    return res;
  }
  throw new Error("too_many_redirects");
}
