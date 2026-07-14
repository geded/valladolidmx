/**
 * H3·A3.b · Media Intelligence · resolveMediaAlt()
 *
 * FUENTE ÚNICA OFICIAL para obtener el texto alternativo (ALT) de
 * cualquier `media_asset` en la plataforma. Ningún componente público
 * puede leer directamente `alt_text` — todos deben pasar por aquí.
 *
 * Founder Policy (H3·A3.b, vinculante):
 *   El resolver es la única fuente oficial de:
 *     · idioma
 *     · prioridad humano/IA
 *     · fallback
 *     · traducciones
 *     · futuras reglas de negocio
 *
 * Matriz de fallback (deterministica, top-down):
 *   1. Traducción locale · humano                → alt_text
 *   2. Traducción locale · IA aprobada           → alt_text (o alt_text_ai si vacío)
 *   3. Traducción locale · IA pendiente          → alt_text_ai
 *   4. Traducción DEFAULT_LOCALE · humano        → alt_text
 *   5. Traducción DEFAULT_LOCALE · IA aprobada
 *   6. Primario · humano (media.alt_text_source='human')
 *   7. Primario · IA aprobada (review_state='approved')
 *   8. Primario · alt_text                        (cualquier origen)
 *   9. Primario · alt_text_ai                     (última red)
 *  10. media.title                                (título editable)
 *  11. fallback provisto por el llamador          (nombre de entidad)
 *  12. ""                                          (nunca undefined/null)
 *
 * El resolver JAMÁS devuelve null/undefined. Si no hay evidencia
 * suficiente, retorna el fallback o cadena vacía — así el atributo
 * `alt=""` permanece semánticamente correcto (imagen decorativa)
 * y accesible por defecto.
 */

export const SUPPORTED_LOCALES = ["es", "en", "fr", "de", "it", "pt"] as const;
export type MediaLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: MediaLocale = "es";

export type MediaTextSource = "none" | "ai_pending" | "ai" | "human";
export type MediaReviewState =
  | "unreviewed"
  | "ai_suggested"
  | "approved"
  | "needs_revision";

export interface MediaTranslationLike {
  locale: string | null;
  alt_text?: string | null;
  alt_text_ai?: string | null;
  title?: string | null;
  source?: MediaTextSource | string | null;
  review_state?: MediaReviewState | string | null;
}

export interface ResolvableMedia {
  alt_text?: string | null;
  alt_text_ai?: string | null;
  alt_text_source?: MediaTextSource | string | null;
  review_state?: MediaReviewState | string | null;
  title?: string | null;
  /** Traducciones proyectadas desde `media_asset_translations`. */
  translations?: MediaTranslationLike[] | null;
}

export interface ResolveMediaAltOptions {
  /** Idioma solicitado por el visitante o el renderizador. */
  locale?: MediaLocale | string | null;
  /** Texto de último recurso (nombre de entidad, título de producto…). */
  fallback?: string | null;
}

function pick(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLocale(locale: unknown): MediaLocale {
  if (typeof locale === "string") {
    const short = locale.toLowerCase().slice(0, 2) as MediaLocale;
    if ((SUPPORTED_LOCALES as readonly string[]).includes(short)) return short;
  }
  return DEFAULT_LOCALE;
}

function findTranslation(
  media: ResolvableMedia,
  locale: MediaLocale,
): MediaTranslationLike | null {
  const list = media.translations ?? [];
  for (const t of list) {
    if (!t?.locale) continue;
    if (String(t.locale).toLowerCase().slice(0, 2) === locale) return t;
  }
  return null;
}

/**
 * Resolve the ALT text for a media asset following the Founder
 * fallback matrix. Always returns a string (never null/undefined).
 */
export function resolveMediaAlt(
  media: ResolvableMedia | null | undefined,
  options: ResolveMediaAltOptions = {},
): string {
  const locale = normalizeLocale(options.locale);
  const fallback = pick(options.fallback) ?? "";
  if (!media) return fallback;

  // 1-3. Requested locale translation
  const t = findTranslation(media, locale);
  if (t) {
    if (t.source === "human") {
      const v = pick(t.alt_text);
      if (v) return v;
    }
    if (t.review_state === "approved") {
      const v = pick(t.alt_text) ?? pick(t.alt_text_ai);
      if (v) return v;
    }
    const pending = pick(t.alt_text_ai);
    if (pending) return pending;
  }

  // 4-5. Default locale translation (skip if we asked for default)
  if (locale !== DEFAULT_LOCALE) {
    const def = findTranslation(media, DEFAULT_LOCALE);
    if (def) {
      if (def.source === "human") {
        const v = pick(def.alt_text);
        if (v) return v;
      }
      if (def.review_state === "approved") {
        const v = pick(def.alt_text) ?? pick(def.alt_text_ai);
        if (v) return v;
      }
    }
  }

  // 6. Primary human
  if (media.alt_text_source === "human") {
    const v = pick(media.alt_text);
    if (v) return v;
  }
  // 7. Primary AI approved
  if (media.review_state === "approved") {
    const v = pick(media.alt_text) ?? pick(media.alt_text_ai);
    if (v) return v;
  }
  // 8-9. Primary raw
  const raw = pick(media.alt_text) ?? pick(media.alt_text_ai);
  if (raw) return raw;

  // 10. Title
  const title = pick(media.title);
  if (title) return title;

  // 11-12. Caller-provided fallback / empty
  return fallback;
}

/** True when the resolver produced text from real evidence, not fallback. */
export function hasMeaningfulAlt(
  media: ResolvableMedia | null | undefined,
  locale?: MediaLocale | string,
): boolean {
  const empty = resolveMediaAlt(media, { locale, fallback: "" });
  return empty.length > 0;
}

/** Grado de confianza de la resolución (para dashboards/auditorías). */
export type ResolutionQuality =
  | "human_locale"
  | "ai_locale_approved"
  | "ai_locale_pending"
  | "human_default"
  | "ai_default"
  | "human_primary"
  | "ai_primary"
  | "raw_primary"
  | "title"
  | "fallback"
  | "empty";

export function inspectMediaAlt(
  media: ResolvableMedia | null | undefined,
  options: ResolveMediaAltOptions = {},
): { alt: string; source: ResolutionQuality; locale: MediaLocale } {
  const locale = normalizeLocale(options.locale);
  const fallback = pick(options.fallback) ?? "";
  if (!media) return { alt: fallback, source: fallback ? "fallback" : "empty", locale };

  const t = findTranslation(media, locale);
  if (t) {
    if (t.source === "human") {
      const v = pick(t.alt_text);
      if (v) return { alt: v, source: "human_locale", locale };
    }
    if (t.review_state === "approved") {
      const v = pick(t.alt_text) ?? pick(t.alt_text_ai);
      if (v) return { alt: v, source: "ai_locale_approved", locale };
    }
    const pending = pick(t.alt_text_ai);
    if (pending) return { alt: pending, source: "ai_locale_pending", locale };
  }
  if (locale !== DEFAULT_LOCALE) {
    const def = findTranslation(media, DEFAULT_LOCALE);
    if (def) {
      if (def.source === "human") {
        const v = pick(def.alt_text);
        if (v) return { alt: v, source: "human_default", locale };
      }
      if (def.review_state === "approved") {
        const v = pick(def.alt_text) ?? pick(def.alt_text_ai);
        if (v) return { alt: v, source: "ai_default", locale };
      }
    }
  }
  if (media.alt_text_source === "human") {
    const v = pick(media.alt_text);
    if (v) return { alt: v, source: "human_primary", locale };
  }
  if (media.review_state === "approved") {
    const v = pick(media.alt_text) ?? pick(media.alt_text_ai);
    if (v) return { alt: v, source: "ai_primary", locale };
  }
  const raw = pick(media.alt_text) ?? pick(media.alt_text_ai);
  if (raw) return { alt: raw, source: "raw_primary", locale };
  const title = pick(media.title);
  if (title) return { alt: title, source: "title", locale };
  return { alt: fallback, source: fallback ? "fallback" : "empty", locale };
}