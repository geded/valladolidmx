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

export const EXPERIENCE_HERO_CONTRACT_VERSION = "1.0.0";

export const experienceHeroVariantSchema = z.enum([
  "immersive", // Full-bleed media, gradiente, textos sobre overlay.
  "compact",   // Media a la izquierda, texto a la derecha (desktop).
  "editorial", // Sin media dominante, tipografía protagonista.
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
});
export type ExperienceHeroCta = z.infer<typeof experienceHeroCtaSchema>;

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
  badges: z.array(experienceHeroBadgeSchema),
  meta: z.array(experienceHeroMetaSchema),
  ctaPrimary: experienceHeroCtaSchema.nullable(),
  ctaSecondary: experienceHeroCtaSchema.nullable(),
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