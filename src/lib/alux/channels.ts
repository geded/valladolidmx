/**
 * Canales de Alux (Fase 4 del CRM) — interruptores que se apagan al instante.
 * Se guardan dentro de `alux_settings.flags` como `channel_*`; si falta un
 * valor el canal sigue encendido (nunca se apaga por omisión).
 */
export const ALUX_CHANNEL_KEYS = ["web", "whatsapp", "embed"] as const;
export type AluxChannelKey = (typeof ALUX_CHANNEL_KEYS)[number];
export type AluxChannels = Record<AluxChannelKey, boolean>;

export const ALUX_CHANNEL_FLAG: Record<AluxChannelKey, string> = {
  web: "channel_web",
  whatsapp: "channel_whatsapp",
  embed: "channel_embed",
};

export function channelsFromFlags(flags: unknown): AluxChannels {
  const f = (flags && typeof flags === "object" ? flags : {}) as Record<string, unknown>;
  const read = (k: AluxChannelKey) => f[ALUX_CHANNEL_FLAG[k]] !== false;
  return { web: read("web"), whatsapp: read("whatsapp"), embed: read("embed") };
}

/** Cambia un solo canal conservando el resto de los ajustes de Alux. */
export function withChannel(
  flags: unknown,
  key: AluxChannelKey,
  enabled: boolean,
): Record<string, unknown> {
  const f = (flags && typeof flags === "object" ? flags : {}) as Record<string, unknown>;
  return { ...f, [ALUX_CHANNEL_FLAG[key]]: enabled };
}

/** Sitios donde se puede insertar Alux: dominio sin protocolo ni ruta. */
export function normalizeEmbedHost(raw: string): string | null {
  const h = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(h) ? h : null;
}

/**
 * Qué destino y qué negocio atiende Alux en un sitio de aliado.
 * La consola manda; el código pegado solo completa lo que la consola dejó
 * vacío (por ejemplo, la empresa exacta). Se guarda en
 * `alux_settings.flags.embed_sites`, por sitio autorizado.
 */
export type EmbedSiteContext = { destination: string | null; business: string | null };
export type EmbedContextSource = "consola" | "codigo" | null;
export type ResolvedEmbedContext = EmbedSiteContext & {
  destinationFrom: EmbedContextSource;
  businessFrom: EmbedContextSource;
};

/** Identificador corto de destino o empresa (minúsculas, números y guiones). */
export function normalizeEmbedSlug(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,119}$/.test(s) ? s : null;
}

/** Sitio autorizado que corresponde a `host` (el más específico gana). */
export function matchEmbedHost(host: string | null, allowed: readonly string[]): string | null {
  if (!host) return null;
  const hits = allowed.filter((a) => host === a || host.endsWith(`.${a}`));
  return hits.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function embedSitesFromFlags(flags: unknown): Record<string, EmbedSiteContext> {
  const f = (flags && typeof flags === "object" ? flags : {}) as Record<string, unknown>;
  const raw = f["embed_sites"];
  const out: Record<string, EmbedSiteContext> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [h, v] of Object.entries(raw as Record<string, unknown>).slice(0, 50)) {
    const host = normalizeEmbedHost(h);
    if (!host || !v || typeof v !== "object") continue;
    const c = v as Record<string, unknown>;
    out[host] = {
      destination: normalizeEmbedSlug(c["destination"]),
      business: normalizeEmbedSlug(c["business"]),
    };
  }
  return out;
}

/** La consola manda; el código solo llena lo que la consola dejó vacío. */
export function resolveEmbedContext(
  fromConsole: Partial<EmbedSiteContext> | null | undefined,
  fromCode: { destination?: unknown; business?: unknown } | null | undefined,
): ResolvedEmbedContext {
  const cDest = normalizeEmbedSlug(fromConsole?.destination);
  const cBiz = normalizeEmbedSlug(fromConsole?.business);
  const hDest = normalizeEmbedSlug(fromCode?.destination);
  const hBiz = normalizeEmbedSlug(fromCode?.business);
  return {
    destination: cDest ?? hDest,
    destinationFrom: cDest ? "consola" : hDest ? "codigo" : null,
    business: cBiz ?? hBiz,
    businessFrom: cBiz ? "consola" : hBiz ? "codigo" : null,
  };
}

/** Fragmento para pegar en otra página (antes de cerrar </body>). */
export function embedSnippet(
  origin: string,
  hint?: { destination?: string | null; business?: string | null } | null,
): string {
  const d = normalizeEmbedSlug(hint?.destination);
  const b = normalizeEmbedSlug(hint?.business);
  const attrs = `${d ? ` data-destino="${d}"` : ""}${b ? ` data-empresa="${b}"` : ""}`;
  return `<script src="${origin}/alux-embed.js" async${attrs}></script>`;
}
