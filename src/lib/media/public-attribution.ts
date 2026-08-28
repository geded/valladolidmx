/**
 * G8-F1D · DEF-G8F-02 — Contrato público de atribución de medios.
 *
 * Fuente única para propagar ALT, caption, crédito y naturaleza
 * (documental / conceptual / IA) desde `media_assets` hasta la
 * superficie pública. Módulo puro y client-safe: no hace fetching,
 * no firma URLs y no lee la base de datos.
 *
 * Reglas Founder (vinculantes):
 *  - Nunca sustituir un ALT acreditado por un genérico ("… — foto N").
 *  - Nunca inventar caption ni crédito.
 *  - Si `aiGenerated=true` y no hay crédito explícito, se expone el
 *    crédito conceptual oficial; jamás se atribuye a fotografía real.
 */

export const AI_CONCEPTUAL_CREDIT = "Imagen conceptual generada con IA para Valladolid.mx";

export interface PublicMediaAttribution {
  /** Identidad estable del activo (auditoría y deduplicación). */
  mediaAssetId: string | null;
  /** URL estable o firmada. Nunca se sustituye por el consumidor. */
  url: string;
  role: string | null;
  sortOrder: number | null;
  /** ALT acreditado ya resuelto por el pipeline oficial. */
  alt: string | null;
  caption: string | null;
  credit: string | null;
  aiGenerated: boolean;
  conceptual: boolean;
  documentary: boolean;
  temporary: boolean;
}

export function emptyAttribution(url: string): PublicMediaAttribution {
  return {
    mediaAssetId: null,
    url,
    role: null,
    sortOrder: null,
    alt: null,
    caption: null,
    credit: null,
    aiGenerated: false,
    conceptual: false,
    documentary: false,
    temporary: false,
  };
}

/**
 * Un nombre de archivo (`IMG_6663.jpeg`) no es un ALT accesible: no
 * describe la imagen. Se descarta para no degradar la accesibilidad.
 */
export function isFilenameLike(value: string): boolean {
  return /^[\w .()-]+\.(jpe?g|png|webp|avif|gif|heic|tiff?)$/i.test(value.trim());
}

const clean = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
};

/**
 * ALT público con la prioridad autorizada:
 *   1. override específico del slot;
 *   2. ALT acreditado del medio (relación + `media_assets`);
 *   3. fallback genérico, sólo cuando no existe metadata.
 */
export function resolveAttributedAlt(
  attribution: PublicMediaAttribution | null | undefined,
  options: { slotOverride?: string | null; fallback?: string | null } = {},
): string {
  return clean(options.slotOverride) ?? clean(attribution?.alt) ?? clean(options.fallback) ?? "";
}

/**
 * Crédito público mostrable. Devuelve `null` cuando no existe crédito
 * acreditado — está prohibido inventarlo.
 */
export function resolveAttributedCredit(
  attribution: PublicMediaAttribution | null | undefined,
): string | null {
  if (!attribution) return null;
  const explicit = clean(attribution.credit);
  if (explicit) return explicit;
  if (attribution.aiGenerated) return AI_CONCEPTUAL_CREDIT;
  return null;
}

/** Caption público. Nunca se inventa. */
export function resolveAttributedCaption(
  attribution: PublicMediaAttribution | null | undefined,
): string | null {
  return clean(attribution?.caption);
}

/** Naturaleza declarada, para etiquetado accesible del crédito. */
export function attributionNatureLabel(
  attribution: PublicMediaAttribution | null | undefined,
): string | null {
  if (!attribution) return null;
  if (attribution.aiGenerated || attribution.conceptual) return "Imagen conceptual";
  if (attribution.documentary) return "Fotografía documental";
  return null;
}
