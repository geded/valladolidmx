/**
 * H-03 · Ola I2.c — `vmx.experience.reviews`
 *
 * Capa 2 (Contenido). Bloque OFICIAL de confianza y prueba social.
 * NO es una simple lista de reseñas: es la pieza que consolida
 * reputación agregada, reseñas destacadas, moderación, respuestas
 * del negocio y — cuando esté disponible — recomendaciones de Alux.
 *
 * Directiva Founder (I2.c):
 *  - Múltiples fuentes: Google, TripAdvisor, propias, Alux, futuras.
 *  - Sin acoplarse a una sola plataforma.
 *  - Preparado para: resumen de reputación, puntuación agregada,
 *    reseñas destacadas, respuestas del negocio, moderación,
 *    reseñas por idioma, reseñas por tipo de viajero y
 *    recomendaciones de Alux.
 *
 * Reglas vinculantes:
 *  - Regla de Compatibilidad Evolutiva: prohibido `-pro`, `-v2`,
 *    `-testimonials`, `-google`, `-tripadvisor`. Evoluciona por
 *    `variant` / `capabilities` / `extensions[]`.
 *  - Regla de Orquestación: el bloque no depende de superficies
 *    concretas; se hidrata declarativamente por `source`.
 *  - Directiva Context-Aware: contrato preparado (contextRefs,
 *    filtros por idioma / tipo de viajero) sin consumir contexto
 *    todavía.
 */
import { z } from "zod";

export const EXPERIENCE_REVIEWS_CONTRACT_VERSION = "1.0.0";

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */
export const experienceReviewsVariantSchema = z.enum([
  "summary",   // Sólo tarjeta de reputación agregada (compacta).
  "list",      // Lista vertical (default).
  "grid",      // Grid de tarjetas (2/3 col).
  "carousel",  // Scroll horizontal con snap.
  "featured",  // Una reseña hero + secundarias.
  "wall",      // Muro tipo masonry (densidad alta).
  "compact",   // Franja mini con avatar + estrellas (widget-like).
]);
export type ExperienceReviewsVariant = z.infer<typeof experienceReviewsVariantSchema>;

export const experienceReviewsSourceSchema = z.enum([
  "manual",       // Items provistos por el editor.
  "business",     // Reseñas de la ficha empresa (BusinessSurfaceContext).
  "product",      // Reservado — ficha producto.
  "destination",  // Reservado — destino.
  "region",       // Reservado.
  "category",     // Reservado.
  "context",      // Reservado — Context Engine / Alux.
  "aggregator",   // Reservado — pull server-side (Google/TripAdvisor/etc.).
]);
export type ExperienceReviewsSource = z.infer<typeof experienceReviewsSourceSchema>;

/** Plataformas soportadas por la abstracción de fuentes externas. */
export const experienceReviewsPlatformSchema = z.enum([
  "internal",
  "google",
  "tripadvisor",
  "booking",
  "facebook",
  "airbnb",
  "yelp",
  "alux",
  "other",
]);
export type ExperienceReviewsPlatform = z.infer<typeof experienceReviewsPlatformSchema>;

export const experienceReviewsGroupBySchema = z.enum([
  "none",
  "platform",
  "language",
  "travelerType",
  "rating",
]);

export const experienceReviewsSortSchema = z.enum([
  "recent",
  "highest",
  "lowest",
  "helpful",
  "recommendedByAlux",
]);

/* ------------------------------------------------------------------ *
 * Context refs — reservados para inteligencia contextual futura.
 * ------------------------------------------------------------------ */
export const experienceReviewsContextRefsSchema = z
  .object({
    destinationSlug: z.string().nullable().default(null),
    regionSlug: z.string().nullable().default(null),
    categorySlug: z.string().nullable().default(null),
    businessSlug: z.string().nullable().default(null),
    productSlug: z.string().nullable().default(null),
    locale: z.string().nullable().default(null),
    travelerType: z.string().nullable().default(null),
    aluxSessionId: z.string().nullable().default(null),
  })
  .partial()
  .default({});
export type ExperienceReviewsContextRefs = z.infer<typeof experienceReviewsContextRefsSchema>;

/* ------------------------------------------------------------------ *
 * Item shape — subset seguro para render público.
 * ------------------------------------------------------------------ */
export const experienceReviewAuthorSchema = z.object({
  displayName: z.string().min(1),
  avatarUrl: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  travelerType: z.string().nullable().default(null),
  verified: z.boolean().default(false),
});
export type ExperienceReviewAuthor = z.infer<typeof experienceReviewAuthorSchema>;

export const experienceReviewResponseSchema = z.object({
  authorName: z.string().min(1),
  authorRole: z.string().nullable().default(null),
  body: z.string().min(1),
  publishedAt: z.string().nullable().default(null),
});
export type ExperienceReviewResponse = z.infer<typeof experienceReviewResponseSchema>;

export const experienceReviewItemSchema = z.object({
  id: z.string().min(1),
  platform: experienceReviewsPlatformSchema.default("internal"),
  externalUrl: z.string().nullable().default(null),
  rating: z.number().min(0).max(5),
  ratingScale: z.number().min(1).default(5),
  title: z.string().nullable().default(null),
  body: z.string().min(1),
  language: z.string().nullable().default(null),
  publishedAt: z.string().nullable().default(null),
  author: experienceReviewAuthorSchema,
  helpfulCount: z.number().nullable().default(null),
  travelerType: z.string().nullable().default(null),
  tags: z.array(z.string().min(1)).default([]),
  /** Respuesta oficial del negocio a esta reseña. */
  response: experienceReviewResponseSchema.nullable().default(null),
  /** Estado de moderación consultable (mostrar sólo `approved` en público). */
  moderationStatus: z
    .enum(["approved", "pending", "flagged", "hidden"])
    .default("approved"),
  /** Marca de "destacada" — puede provenir del editor o de Alux. */
  featured: z.boolean().default(false),
  /** Recomendación de Alux (reservado — I3+). */
  aluxRationale: z.string().nullable().default(null),
});
export type ExperienceReviewItem = z.infer<typeof experienceReviewItemSchema>;

/* ------------------------------------------------------------------ *
 * Aggregate — reputación agregada (multi-plataforma).
 * ------------------------------------------------------------------ */
export const experienceReviewsAggregateSchema = z.object({
  average: z.number().min(0).max(5).nullable().default(null),
  count: z.number().min(0).default(0),
  distribution: z
    .object({
      5: z.number().min(0).default(0),
      4: z.number().min(0).default(0),
      3: z.number().min(0).default(0),
      2: z.number().min(0).default(0),
      1: z.number().min(0).default(0),
    })
    .default({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }),
  byPlatform: z
    .array(
      z.object({
        platform: experienceReviewsPlatformSchema,
        average: z.number().min(0).max(5),
        count: z.number().min(0),
        url: z.string().nullable().default(null),
      }),
    )
    .default([]),
});
export type ExperienceReviewsAggregate = z.infer<typeof experienceReviewsAggregateSchema>;

/* ------------------------------------------------------------------ *
 * Config (Studio) & DTO (runtime)
 * ------------------------------------------------------------------ */
export const experienceReviewsConfigSchema = z.object({
  contractVersion: z.string().default(EXPERIENCE_REVIEWS_CONTRACT_VERSION),
  source: experienceReviewsSourceSchema.default("manual"),
  variant: experienceReviewsVariantSchema.default("list"),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  emptyMessage: z.string().default("Aún no hay reseñas publicadas."),
  columns: z.number().min(1).max(4).default(2),
  maxItems: z.number().min(1).max(96).nullable().default(null),
  groupBy: experienceReviewsGroupBySchema.default("none"),
  sortBy: experienceReviewsSortSchema.default("recent"),
  ariaLabel: z.string().default("Opiniones y reseñas"),
  items: z.array(experienceReviewItemSchema).default([]),
  aggregate: experienceReviewsAggregateSchema.nullable().default(null),
  filters: z
    .object({
      platforms: z.array(experienceReviewsPlatformSchema).default([]),
      minRating: z.number().min(0).max(5).nullable().default(null),
      languages: z.array(z.string().min(1)).default([]),
      travelerTypes: z.array(z.string().min(1)).default([]),
      onlyFeatured: z.boolean().default(false),
    })
    .partial()
    .default({}),
  capabilities: z
    .object({
      showAggregate: z.boolean().default(true),
      showAggregateDistribution: z.boolean().default(true),
      showByPlatform: z.boolean().default(true),
      showBusinessResponse: z.boolean().default(true),
      showTravelerType: z.boolean().default(true),
      showLanguage: z.boolean().default(false),
      showHelpful: z.boolean().default(true),
      showTags: z.boolean().default(true),
      showPlatformBadge: z.boolean().default(true),
      showExternalLink: z.boolean().default(true),
      moderationAware: z.boolean().default(true),
      sourceMixed: z.boolean().default(true),
      /** Emite JSON-LD `AggregateRating` (SEO). */
      seoJsonLd: z.boolean().default(true),
      compact: z.boolean().default(false),
      /** Reservado — resolución contextual (Alux, Context Engine). */
      contextAware: z.boolean().default(false),
      /** Reservado — priorización por Alux (helpful / relevancia). */
      aluxRecommended: z.boolean().default(false),
      /** Reservado — traducción bajo demanda (I3+). */
      translateOnDemand: z.boolean().default(false),
    })
    .partial()
    .default({}),
  contextRefs: experienceReviewsContextRefsSchema,
  extensions: z
    .array(
      z.object({
        kind: z.string().min(1),
        config: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .default([]),
});
export type ExperienceReviewsConfig = z.infer<typeof experienceReviewsConfigSchema>;

export const experienceReviewsDtoSchema = z.object({
  variant: experienceReviewsVariantSchema,
  heading: z.string().nullable(),
  subheading: z.string().nullable(),
  emptyMessage: z.string(),
  columns: z.number(),
  groupBy: experienceReviewsGroupBySchema,
  sortBy: experienceReviewsSortSchema,
  ariaLabel: z.string(),
  items: z.array(experienceReviewItemSchema),
  aggregate: experienceReviewsAggregateSchema.nullable(),
  capabilities: z.object({
    showAggregate: z.boolean(),
    showAggregateDistribution: z.boolean(),
    showByPlatform: z.boolean(),
    showBusinessResponse: z.boolean(),
    showTravelerType: z.boolean(),
    showLanguage: z.boolean(),
    showHelpful: z.boolean(),
    showTags: z.boolean(),
    showPlatformBadge: z.boolean(),
    showExternalLink: z.boolean(),
    moderationAware: z.boolean(),
    sourceMixed: z.boolean(),
    seoJsonLd: z.boolean(),
    compact: z.boolean(),
    contextAware: z.boolean(),
    aluxRecommended: z.boolean(),
    translateOnDemand: z.boolean(),
  }),
  contextRefs: experienceReviewsContextRefsSchema,
});
export type ExperienceReviewsDTO = z.infer<typeof experienceReviewsDtoSchema>;

/* ------------------------------------------------------------------ *
 * Helpers puros (usados por Presentación y Comportamiento).
 * ------------------------------------------------------------------ */
export function clampRating(rating: number, scale = 5): number {
  const normalized = (rating / (scale || 5)) * 5;
  return Math.max(0, Math.min(5, Math.round(normalized)));
}

export function ratingLabel(avg: number | null): string {
  if (avg == null) return "Sin valoraciones";
  if (avg >= 4.7) return "Excelente";
  if (avg >= 4.2) return "Muy bueno";
  if (avg >= 3.5) return "Bueno";
  if (avg >= 2.5) return "Aceptable";
  return "Mejorable";
}

export function computeAggregateFromItems(
  items: ExperienceReviewItem[],
): ExperienceReviewsAggregate {
  if (items.length === 0) {
    return {
      average: null,
      count: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      byPlatform: [],
    };
  }
  let sum = 0;
  const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const platforms = new Map<
    ExperienceReviewsPlatform,
    { sum: number; count: number }
  >();
  for (const it of items) {
    const norm = (it.rating / (it.ratingScale || 5)) * 5;
    sum += norm;
    const bucket = Math.max(1, Math.min(5, Math.round(norm))) as 1 | 2 | 3 | 4 | 5;
    dist[bucket] += 1;
    const p = platforms.get(it.platform) ?? { sum: 0, count: 0 };
    p.sum += norm;
    p.count += 1;
    platforms.set(it.platform, p);
  }
  return {
    average: Number((sum / items.length).toFixed(2)),
    count: items.length,
    distribution: dist,
    byPlatform: Array.from(platforms.entries()).map(([platform, v]) => ({
      platform,
      average: Number((v.sum / v.count).toFixed(2)),
      count: v.count,
      url: null,
    })),
  };
}

/* ------------------------------------------------------------------ *
 * Preview DTO — usado por Studio y por la ruta /lovable de validación.
 * ------------------------------------------------------------------ */
export function buildExperienceReviewsPreviewDTO(): ExperienceReviewsDTO {
  const items: ExperienceReviewItem[] = [
    {
      id: "prev-1",
      platform: "google",
      externalUrl: null,
      rating: 5,
      ratingScale: 5,
      title: "Un refugio inolvidable",
      body: "La atención del equipo fue impecable y el cenote privado es una experiencia única. Volveremos sin duda.",
      language: "es",
      publishedAt: new Date(Date.now() - 4 * 864e5).toISOString(),
      author: {
        displayName: "Ana G.",
        avatarUrl: null,
        location: "CDMX, MX",
        travelerType: "Pareja",
        verified: true,
      },
      helpfulCount: 12,
      travelerType: "Pareja",
      tags: ["cenote", "servicio"],
      response: {
        authorName: "Hacienda Selva Maya",
        authorRole: "Anfitriona",
        body: "¡Gracias, Ana! Nos hace muy felices leer esto. Los esperamos pronto.",
        publishedAt: new Date(Date.now() - 3 * 864e5).toISOString(),
      },
      moderationStatus: "approved",
      featured: true,
      aluxRationale: null,
    },
    {
      id: "prev-2",
      platform: "tripadvisor",
      externalUrl: "https://tripadvisor.com/example",
      rating: 4,
      ratingScale: 5,
      title: "Muy recomendable",
      body: "Excelente ubicación y desayuno delicioso. Solo mejoraría el wifi en las habitaciones más alejadas.",
      language: "es",
      publishedAt: new Date(Date.now() - 14 * 864e5).toISOString(),
      author: {
        displayName: "Marco P.",
        avatarUrl: null,
        location: "Roma, IT",
        travelerType: "Familia",
        verified: false,
      },
      helpfulCount: 5,
      travelerType: "Familia",
      tags: ["desayuno", "ubicación"],
      response: null,
      moderationStatus: "approved",
      featured: false,
      aluxRationale: null,
    },
    {
      id: "prev-3",
      platform: "internal",
      externalUrl: null,
      rating: 5,
      ratingScale: 5,
      title: null,
      body: "Un lugar mágico para desconectar. Los tours a cenotes cercanos fueron el highlight del viaje.",
      language: "es",
      publishedAt: new Date(Date.now() - 30 * 864e5).toISOString(),
      author: {
        displayName: "Laura H.",
        avatarUrl: null,
        location: "Guadalajara, MX",
        travelerType: "Solo",
        verified: true,
      },
      helpfulCount: 3,
      travelerType: "Solo",
      tags: ["tours", "naturaleza"],
      response: null,
      moderationStatus: "approved",
      featured: false,
      aluxRationale: null,
    },
  ];
  return {
    variant: "list",
    heading: "Opiniones de viajeros",
    subheading: null,
    emptyMessage: "Aún no hay reseñas publicadas.",
    columns: 2,
    groupBy: "none",
    sortBy: "recent",
    ariaLabel: "Opiniones y reseñas",
    items,
    aggregate: computeAggregateFromItems(items),
    capabilities: {
      showAggregate: true,
      showAggregateDistribution: true,
      showByPlatform: true,
      showBusinessResponse: true,
      showTravelerType: true,
      showLanguage: false,
      showHelpful: true,
      showTags: true,
      showPlatformBadge: true,
      showExternalLink: true,
      moderationAware: true,
      sourceMixed: true,
      seoJsonLd: true,
      compact: false,
      contextAware: false,
      aluxRecommended: false,
      translateOnDemand: false,
    },
    contextRefs: {},
  };
}