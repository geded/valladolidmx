/**
 * H-03 · Ola I1.a — `vmx.experience.hero`
 *
 * Contrato de Contenido del bloque (capa 2 del contrato de 3 capas):
 *  - Config editable en Studio (validado con Zod).
 *  - DTO runtime consumido por la Presentación.
 *
 * Regla de Compatibilidad Evolutiva: este bloque crece sólo por
 * `variant`, `capabilities`, `permissions` y `extensions[]`. No se
 * creará `experience.hero-pro` ni `experience.hero-v2`.
 */
import { z } from "zod";

export const EXPERIENCE_HERO_CONTRACT_VERSION = "1.1.0";

export const experienceHeroVariantSchema = z.enum([
  "immersive", // Full-bleed media, gradiente, textos sobre overlay.
  "compact",   // Media a la izquierda, texto a la derecha (desktop).
  "editorial", // Sin media dominante, tipografía protagonista.
  "cinematic", // v1.1.0 · Full-viewport, carrusel de slides, eyebrow script.
]);
export type ExperienceHeroVariant = z.infer<typeof experienceHeroVariantSchema>;

export const experienceHeroSourceSchema = z.enum([
  "manual",     // Todos los datos vienen de `config`.
  "business",   // Hidrata desde BusinessSurfaceContext (si existe).
  "product",    // Reservado (Ola I3).
  "destination",// Reservado (Ola I4).
  "event",      // Reservado (Ola I3).
]);
export type ExperienceHeroSource = z.infer<typeof experienceHeroSourceSchema>;

export const experienceHeroBadgeToneSchema = z.enum([
  "neutral",
  "primary",
  "success",
  "warning",
]);

export const experienceHeroBadgeSchema = z.object({
  label: z.string().min(1),
  tone: experienceHeroBadgeToneSchema.default("neutral"),
  /** Nombre de icono Lucide (opcional). */
  iconKey: z.string().optional(),
});
export type ExperienceHeroBadge = z.infer<typeof experienceHeroBadgeSchema>;

export const experienceHeroMetaSchema = z.object({
  iconKey: z.string().optional(),
  label: z.string().min(1),
});
export type ExperienceHeroMeta = z.infer<typeof experienceHeroMetaSchema>;

export const experienceHeroCtaSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1).optional(),
  /**
   * Acción semántica opcional. La Presentación ignora este campo; el
   * wrapper EB puede interceptarla para integrar Protected Actions
   * (favorite/contact/book) en olas futuras.
   */
  action: z.enum(["navigate", "favorite", "contact", "book", "share"]).default("navigate"),
  /**
   * Énfasis visual. Compatible con Tourism DSL. Cuando no se define,
   * el CTA primario se pinta `primary` y los siguientes `secondary`.
   */
  emphasis: z.enum(["primary", "secondary", "ghost"]).optional(),
  iconKey: z.string().optional(),
});
export type ExperienceHeroCta = z.infer<typeof experienceHeroCtaSchema>;

/**
 * v1.1.0 — Slide del carrusel cinemático. Sin animaciones más allá de
 * `crossfade`; la Presentación respeta `prefers-reduced-motion`.
 */
export const experienceHeroSlideSchema = z.object({
  url: z.string().min(1),
  alt: z.string().default(""),
  focalPoint: z.string().optional(),
});
export type ExperienceHeroSlide = z.infer<typeof experienceHeroSlideSchema>;

export const experienceHeroAlignmentSchema = z.enum(["left", "center", "right"]);
export type ExperienceHeroAlignment = z.infer<typeof experienceHeroAlignmentSchema>;

export const experienceHeroEyebrowStyleSchema = z.enum(["eyebrow", "script"]);
export type ExperienceHeroEyebrowStyle = z.infer<typeof experienceHeroEyebrowStyleSchema>;

/** Config persistida en `page_compositions` (fuente en Studio). */
export const experienceHeroConfigSchema = z.object({
  contractVersion: z.string().default(EXPERIENCE_HERO_CONTRACT_VERSION),
  source: experienceHeroSourceSchema.default("manual"),
  variant: experienceHeroVariantSchema.default("immersive"),

  eyebrow: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),

  mediaUrl: z.string().optional(),
  mediaAlt: z.string().optional(),
  /** Fuerza de la capa oscura sobre la media (0–1). */
  overlay: z.number().min(0).max(1).default(0.45),

  badges: z.array(experienceHeroBadgeSchema).default([]),
  meta: z.array(experienceHeroMetaSchema).default([]),

  ctaPrimary: experienceHeroCtaSchema.optional(),
  ctaSecondary: experienceHeroCtaSchema.optional(),

  /**
   * v1.1.0 — Lista extendida de CTAs (n≥0). Si viene poblada, sobrescribe
   * a `ctaPrimary` / `ctaSecondary` en la Presentación. Compatibilidad:
   * cuando está vacía, el motor sigue usando `ctaPrimary`/`ctaSecondary`.
   */
  ctas: z.array(experienceHeroCtaSchema).default([]),

  /** v1.1.0 — Slides para variante `cinematic`. */
  mediaSlides: z.array(experienceHeroSlideSchema).default([]),
  slideIntervalMs: z.number().int().min(2000).max(30000).default(7000),

  /** v1.1.0 — Alineación del bloque de texto. */
  alignment: experienceHeroAlignmentSchema.default("left"),
  /** v1.1.0 — Estilo tipográfico del eyebrow. */
  eyebrowStyle: experienceHeroEyebrowStyleSchema.default("eyebrow"),
  /** v1.1.0 — Compensa cabecera overlay (Home). Sólo `cinematic`. */
  overlapHeader: z.boolean().default(false),

  /**
   * Capacidades opt-in. Habilitan comportamiento sin cambiar el
   * `blockType`. Se amplían por olas futuras.
   */
  capabilities: z
    .object({
      ratingBadge: z.boolean().default(false),
      liveStatus: z.boolean().default(false),
      video: z.boolean().default(false),
      immersive360: z.boolean().default(false),
      ar: z.boolean().default(false),
      /** v1.1.0 — Carrusel automático en `cinematic`. */
      autoplaySlides: z.boolean().default(true),
    })
    .partial()
    .default({}),

  /**
   * Slot tipado para extensiones registradas por futuras olas
   * (booking widget inline, contador live, sponsor stripe, etc.).
   */
  extensions: z
    .array(
      z.object({
        kind: z.string().min(1),
        config: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .default([]),
});
export type ExperienceHeroConfig = z.infer<typeof experienceHeroConfigSchema>;

/** DTO runtime que consume la Presentación (post-hidratación). */
export const experienceHeroDtoSchema = z.object({
  variant: experienceHeroVariantSchema,
  eyebrow: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  media: z
    .object({
      url: z.string(),
      alt: z.string(),
      overlay: z.number().min(0).max(1),
    })
    .nullable(),
  /** v1.1.0 — Slides para `cinematic`. Vacío en variantes clásicas. */
  mediaSlides: z.array(experienceHeroSlideSchema).optional(),
  slideIntervalMs: z.number().int().optional(),
  alignment: experienceHeroAlignmentSchema.optional(),
  eyebrowStyle: experienceHeroEyebrowStyleSchema.optional(),
  overlapHeader: z.boolean().optional(),
  autoplaySlides: z.boolean().optional(),
  badges: z.array(experienceHeroBadgeSchema),
  meta: z.array(experienceHeroMetaSchema),
  ctaPrimary: experienceHeroCtaSchema.nullable(),
  ctaSecondary: experienceHeroCtaSchema.nullable(),
  /**
   * v1.1.0 — Lista extendida de CTAs (n≥0). Cuando viene poblada,
   * la Presentación la usa en lugar de `ctaPrimary`/`ctaSecondary`.
   */
  ctas: z.array(experienceHeroCtaSchema).optional(),
});
export type ExperienceHeroDTO = z.infer<typeof experienceHeroDtoSchema>;

/** Defaults seguros para preview neutral en Studio. */
export function buildExperienceHeroPreviewDTO(): ExperienceHeroDTO {
  return {
    variant: "immersive",
    eyebrow: "Hospedaje boutique",
    title: "Hacienda Selva Maya",
    description:
      "Refugio colonial en el corazón de Valladolid, con cenote privado y cocina yucateca de autor.",
    media: {
      url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=80",
      alt: "Hacienda colonial iluminada al atardecer",
      overlay: 0.5,
    },
    mediaSlides: [],
    slideIntervalMs: 7000,
    alignment: "left",
    eyebrowStyle: "eyebrow",
    overlapHeader: false,
    autoplaySlides: true,
    badges: [
      { label: "Verificado", tone: "primary", iconKey: "badge-check" },
      { label: "4.9 · 128 reseñas", tone: "neutral", iconKey: "star" },
    ],
    meta: [
      { iconKey: "map-pin", label: "Valladolid, Yucatán" },
      { iconKey: "clock", label: "Abierto ahora" },
    ],
    ctaPrimary: { label: "Reservar", action: "book", href: "#" },
    ctaSecondary: { label: "Contactar", action: "contact", href: "#" },
  };
}