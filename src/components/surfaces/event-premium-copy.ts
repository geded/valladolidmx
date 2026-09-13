/**
 * Textos editables de la ficha Premium de evento (`vmx.event.premium`).
 *
 * Módulo PURO (sin red, sin React, sin flags). Mismo patrón aprobado en
 * `place-premium-copy.ts`: los encabezados que hoy viven fijos en
 * `EventPremiumSurface` se vuelven editables desde el Experience Builder
 * SIN crear una plantilla paralela.
 *
 * Reglas:
 *  - Fail-closed: cualquier campo ausente, vacío o no textual conserva el
 *    texto aprobado vigente.
 *  - Token único `{evento}` → título real del evento.
 *  - No se inventa ningún texto nuevo: sólo se vuelven editables los actuales.
 */

export const EVENT_PREMIUM_BLOCK_TYPE = "vmx.event.premium" as const;

export interface EventPremiumCopy {
  readonly aluxTitle: string;
  readonly aluxDescription: string;
  readonly infoHeading: string;
  readonly descriptionKicker: string;
  readonly descriptionTitle: string;
  readonly relatedHeading: string;
  readonly relatedSubheading: string;
  readonly ctaTitle: string;
  readonly ctaSubtitle: string;
}

/** Textos aprobados vigentes (autoridad visual de la ficha de evento). */
export const EVENT_PREMIUM_COPY_DEFAULTS: EventPremiumCopy = {
  aluxTitle: "Planear con {evento}",
  aluxDescription: "Alux te ayuda a integrar este evento en tu viaje por el Oriente Maya.",
  infoHeading: "Datos del evento",
  descriptionKicker: "La experiencia",
  descriptionTitle: "Qué vas a vivir",
  relatedHeading: "Explora cerca de {evento}",
  relatedSubheading: "Otros eventos del destino para continuar tu viaje por el Oriente Maya.",
  ctaTitle: "Suma {evento} a tu viaje",
  ctaSubtitle: "Un concierge arma tu itinerario incluyendo este evento. Sin cobro en línea.",
};

/** Campo de configuración del bloque por cada texto editable. */
export const EVENT_PREMIUM_COPY_FIELDS: Readonly<Record<keyof EventPremiumCopy, string>> = {
  aluxTitle: "copy_alux_title",
  aluxDescription: "copy_alux_description",
  infoHeading: "copy_info_heading",
  descriptionKicker: "copy_description_kicker",
  descriptionTitle: "copy_description_title",
  relatedHeading: "copy_related_heading",
  relatedSubheading: "copy_related_subheading",
  ctaTitle: "copy_cta_title",
  ctaSubtitle: "copy_cta_subtitle",
};

const MAX_LENGTH = 200;

function sanitize(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) return fallback;
  return trimmed.slice(0, MAX_LENGTH);
}

/** Resuelve los textos desde la configuración publicada. Fail-closed. */
export function resolveEventPremiumCopy(
  config: Record<string, unknown> | null | undefined,
): EventPremiumCopy {
  const cfg = config ?? {};
  const resolved = { ...EVENT_PREMIUM_COPY_DEFAULTS } as Record<keyof EventPremiumCopy, string>;
  for (const [key, field] of Object.entries(EVENT_PREMIUM_COPY_FIELDS) as Array<
    [keyof EventPremiumCopy, string]
  >) {
    resolved[key] = sanitize(cfg[field], EVENT_PREMIUM_COPY_DEFAULTS[key]);
  }
  return resolved as EventPremiumCopy;
}

/** Sustituye el token `{evento}` por el título real del evento. */
export function fillEventCopy(template: string, eventTitle: string): string {
  return template.replaceAll("{evento}", eventTitle);
}

/** Configuración inicial de textos al crear el bloque en el constructor. */
export function eventPremiumCopyDefaultConfig(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, field] of Object.entries(EVENT_PREMIUM_COPY_FIELDS) as Array<
    [keyof EventPremiumCopy, string]
  >) {
    out[field] = EVENT_PREMIUM_COPY_DEFAULTS[key];
  }
  return out;
}
