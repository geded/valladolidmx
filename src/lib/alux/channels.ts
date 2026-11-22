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

/** Fragmento para pegar en otra página (antes de cerrar </body>). */
export function embedSnippet(origin: string, partner: string | null): string {
  const p = partner ? ` data-partner="${partner.replace(/[^a-z0-9-]/gi, "")}"` : "";
  return `<script src="${origin}/alux-embed.js" async${p}></script>`;
}
