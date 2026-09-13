/**
 * Textos editables de la ficha Premium de empresa (`vmx.business.premium`)
 * — hoteles, restaurantes y casas de vacaciones.
 *
 * Módulo PURO (sin red, sin React, sin flags). Mismo patrón aprobado en
 * `place-premium-copy.ts` y `event-premium-copy.ts`: los encabezados que
 * hoy viven fijos en `BusinessSurface` se vuelven editables desde el
 * Experience Builder SIN crear una plantilla paralela.
 *
 * Reglas:
 *  - Fail-closed: cualquier campo ausente, vacío o no textual conserva el
 *    texto aprobado vigente.
 *  - Token único `{empresa}` → nombre real de la empresa.
 *  - No se inventa ningún texto nuevo: sólo se vuelven editables los actuales.
 */

export const BUSINESS_PREMIUM_BLOCK_TYPE = "vmx.business.premium" as const;

export interface BusinessPremiumCopy {
  readonly aluxTitle: string;
  readonly aluxDescription: string;
  readonly galleryHeading: string;
  readonly promotionsHeading: string;
  readonly reviewsHeading: string;
  readonly reviewsEmpty: string;
  readonly contactHeading: string;
  readonly relatedHeading: string;
  readonly relatedSubheading: string;
  readonly ctaTitle: string;
  readonly ctaSubtitle: string;
}

/** Textos aprobados vigentes (autoridad visual de la ficha de empresa). */
export const BUSINESS_PREMIUM_COPY_DEFAULTS: BusinessPremiumCopy = {
  aluxTitle: "Planear con {empresa}",
  aluxDescription: "Alux te ayuda a integrar esta opción en tu viaje por el Oriente Maya.",
  galleryHeading: "Conoce {empresa}",
  promotionsHeading: "Promociones vigentes",
  reviewsHeading: "Opiniones de viajeros",
  reviewsEmpty:
    "Aún no hay reseñas publicadas de esta empresa. Sé la primera persona en compartir tu experiencia.",
  contactHeading: "Contacto",
  relatedHeading: "Explora cerca de {empresa}",
  relatedSubheading: "Opciones del mismo destino para continuar tu viaje.",
  ctaTitle: "Suma {empresa} a tu viaje",
  ctaSubtitle: "Un concierge arma tu itinerario. Sin cobro en línea.",
};

/** Campo de configuración del bloque por cada texto editable. */
export const BUSINESS_PREMIUM_COPY_FIELDS: Readonly<Record<keyof BusinessPremiumCopy, string>> = {
  aluxTitle: "copy_alux_title",
  aluxDescription: "copy_alux_description",
  galleryHeading: "copy_gallery_heading",
  promotionsHeading: "copy_promotions_heading",
  reviewsHeading: "copy_reviews_heading",
  reviewsEmpty: "copy_reviews_empty",
  contactHeading: "copy_contact_heading",
  relatedHeading: "copy_related_heading",
  relatedSubheading: "copy_related_subheading",
  ctaTitle: "copy_cta_title",
  ctaSubtitle: "copy_cta_subtitle",
};

const MAX_LENGTH = 220;

function sanitize(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) return fallback;
  return trimmed.slice(0, MAX_LENGTH);
}

/** Resuelve los textos desde la configuración publicada. Fail-closed. */
export function resolveBusinessPremiumCopy(
  config: Record<string, unknown> | null | undefined,
): BusinessPremiumCopy {
  const cfg = config ?? {};
  const resolved = { ...BUSINESS_PREMIUM_COPY_DEFAULTS } as Record<
    keyof BusinessPremiumCopy,
    string
  >;
  for (const [key, field] of Object.entries(BUSINESS_PREMIUM_COPY_FIELDS) as Array<
    [keyof BusinessPremiumCopy, string]
  >) {
    resolved[key] = sanitize(cfg[field], BUSINESS_PREMIUM_COPY_DEFAULTS[key]);
  }
  return resolved as BusinessPremiumCopy;
}

/** Sustituye el token `{empresa}` por el nombre real de la empresa. */
export function fillBusinessCopy(template: string, businessName: string): string {
  return template.replaceAll("{empresa}", businessName);
}

/** Configuración inicial de textos al crear el bloque en el constructor. */
export function businessPremiumCopyDefaultConfig(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, field] of Object.entries(BUSINESS_PREMIUM_COPY_FIELDS) as Array<
    [keyof BusinessPremiumCopy, string]
  >) {
    out[field] = BUSINESS_PREMIUM_COPY_DEFAULTS[key];
  }
  return out;
}
