/**
 * H-03 · Ola I3.b — `vmx.experience.related-collection`
 *
 * Capa 2 (Contenido). Bloque OFICIAL de descubrimiento contextual —
 * futuro Motor de Descubrimiento de Valladolid.mx.
 *
 * Directiva Founder (I3.b):
 *  - NO es un simple bloque de "elementos relacionados".
 *  - Es el bloque oficial de descubrimiento contextual de TODA la
 *    plataforma. Toda Experience Page deberá ofrecer caminos naturales
 *    para seguir descubriendo. El objetivo es ayudar al visitante a
 *    construir su viaje y proporcionar a Alux nuevas oportunidades
 *    para recomendar contenido relevante.
 *  - Debe soportar cualquier tipo de colección sin depender del tipo
 *    de superficie (empresas, productos, experiencias, hoteles,
 *    restaurantes, eventos, promociones, rutas, destinos, regiones)
 *    utilizando SIEMPRE el mismo bloque.
 *  - El contrato debe permitir evolucionar hacia colecciones
 *    inteligentes utilizando el Context Engine y las recomendaciones
 *    de Alux SIN romper compatibilidad (Regla Evolutiva).
 *  - Alux no deberá generar recomendaciones paralelas: siempre que
 *    sea posible deberá reutilizar la lógica de este bloque.
 *
 * Reglas vinculantes:
 *  - Regla de Compatibilidad Evolutiva: prohibido `-pro`, `-v2`,
 *    `-nearby`, `-alux`, `-smart`. Evoluciona por `variant` /
 *    `capabilities` / `source` / `extensions[]`.
 *  - Regla de Orquestación: se hidrata declarativamente por `source`;
 *    no depende de superficies concretas.
 *  - Directiva Context-Aware: contrato preparado (contextRefs, alux,
 *    grupos dinámicos) sin consumir Alux/Context Engine todavía.
 */
import { z } from "zod";

export const EXPERIENCE_RELATED_COLLECTION_CONTRACT_VERSION = "1.0.0";

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */

/** Tipos de entidad discoverable de la plataforma (universal). */
export const experienceRelatedEntityKindSchema = z.enum([
  "business",
  "product",
  "experience",
  "hotel",
  "restaurant",
  "event",
  "promotion",
  "route",
  "destination",
  "region",
  "category",
  "mixed",
]);
export type ExperienceRelatedEntityKind = z.infer<
  typeof experienceRelatedEntityKindSchema
>;

export const experienceRelatedVariantSchema = z.enum([
  "grid",       // Grid responsivo (default).
  "list",       // Lista vertical.
  "carousel",   // Scroll horizontal con snap.
  "masonry",    // Mosaico denso.
  "featured",   // Uno destacado + secundarios.
  "compact",    // Fila mini (widget lateral).
]);
export type ExperienceRelatedVariant = z.infer<
  typeof experienceRelatedVariantSchema
>;

export const experienceRelatedSourceSchema = z.enum([
  "manual",       // Items provistos por el editor.
  "destination",  // Hidrata desde DestinationSurfaceContext.
  "region",       // Reservado — RegionSurfaceContext.
  "category",     // Reservado — CategorySurfaceContext.
  "business",     // Reservado — BusinessSurfaceContext.
  "product",      // Reservado — ProductSurfaceContext.
  "context",      // Reservado — Context Engine (herencia).
  "alux",         // Reservado — Motor Alux (recomendaciones).
]);
export type ExperienceRelatedSource = z.infer<
  typeof experienceRelatedSourceSchema
>;

export const experienceRelatedSortSchema = z.enum([
  "manual",
  "recent",
  "popular",
  "nearest",
  "recommendedByAlux",
]);

/* ------------------------------------------------------------------ *
 * Context refs — reservados para inteligencia contextual futura.
 * ------------------------------------------------------------------ */
export const experienceRelatedContextRefsSchema = z
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
export type ExperienceRelatedContextRefs = z.infer<
  typeof experienceRelatedContextRefsSchema
>;

/* ------------------------------------------------------------------ *
 * Item shape — universal (todas las entidades caben aquí).
 * ------------------------------------------------------------------ */
export const experienceRelatedBadgeSchema = z.object({
  label: z.string().min(1),
  tone: z
    .enum(["default", "primary", "success", "warning", "info"])
    .default("default"),
});
export type ExperienceRelatedBadge = z.infer<typeof experienceRelatedBadgeSchema>;

export const experienceRelatedMetaSchema = z.object({
  iconKey: z.string().optional(),
  label: z.string().min(1),
});
export type ExperienceRelatedMeta = z.infer<typeof experienceRelatedMetaSchema>;

export const experienceRelatedItemSchema = z.object({
  id: z.string().min(1),
  kind: experienceRelatedEntityKindSchema,
  title: z.string().min(1),
  subtitle: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  href: z.string().nullable().default(null),
  imageUrl: z.string().nullable().default(null),
  imageAlt: z.string().nullable().default(null),
  meta: z.array(experienceRelatedMetaSchema).default([]),
  badges: z.array(experienceRelatedBadgeSchema).default([]),
  tags: z.array(z.string().min(1)).default([]),
  priceAmount: z.number().nullable().default(null),
  priceCurrency: z.string().nullable().default(null),
  /** Fecha ISO (eventos, promociones con vigencia). */
  dateStart: z.string().nullable().default(null),
  /** Fecha ISO (eventos, promociones). */
  dateEnd: z.string().nullable().default(null),
  /** Slug del destino asociado (para dedupe y filtros). */
  destinationSlug: z.string().nullable().default(null),
  /** Slug de la categoría asociada (dedupe / filtros). */
  categorySlug: z.string().nullable().default(null),
  /** Rationale explicable (Alux u otro motor). Reservado. */
  rationale: z.string().nullable().default(null),
  /** Origen del ítem (`editor`, `destination`, `alux`, `context`, …). */
  sourceHint: z.string().nullable().default(null),
  /** Peso relativo del ítem dentro de la colección (0..1). */
  score: z.number().min(0).max(1).nullable().default(null),
});
export type ExperienceRelatedItem = z.infer<typeof experienceRelatedItemSchema>;

/* ------------------------------------------------------------------ *
 * Groups — permiten combinar múltiples subcolecciones sin duplicar el
 * bloque (ej. Destino: empresas + eventos + productos). Cada grupo se
 * resuelve por `entityKind` desde la fuente activa; si la fuente es
 * `manual`, se toma su propio `items[]`.
 * ------------------------------------------------------------------ */
export const experienceRelatedGroupSchema = z.object({
  id: z.string().min(1),
  entityKind: experienceRelatedEntityKindSchema,
  heading: z.string().nullable().default(null),
  subheading: z.string().nullable().default(null),
  emptyMessage: z.string().nullable().default(null),
  maxItems: z.number().min(1).max(96).nullable().default(null),
  variant: experienceRelatedVariantSchema.nullable().default(null),
  /** Filtro adicional específico del grupo (ej. `hoteles` dentro de `business`). */
  categorySlug: z.string().nullable().default(null),
  /** Items manuales del grupo (usado cuando `source=manual`). */
  items: z.array(experienceRelatedItemSchema).default([]),
  /** CTA opcional del grupo ("Ver todos"). */
  seeAllHref: z.string().nullable().default(null),
  seeAllLabel: z.string().nullable().default(null),
});
export type ExperienceRelatedGroup = z.infer<typeof experienceRelatedGroupSchema>;

/* ------------------------------------------------------------------ *
 * Config (Studio) & DTO (runtime)
 * ------------------------------------------------------------------ */
export const experienceRelatedCollectionConfigSchema = z.object({
  contractVersion: z
    .string()
    .default(EXPERIENCE_RELATED_COLLECTION_CONTRACT_VERSION),
  source: experienceRelatedSourceSchema.default("manual"),
  entityKind: experienceRelatedEntityKindSchema.default("mixed"),
  variant: experienceRelatedVariantSchema.default("grid"),
  columns: z.number().min(1).max(4).default(2),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  emptyMessage: z.string().default("Aún no hay contenido para descubrir aquí."),
  ariaLabel: z.string().default("Sigue descubriendo"),
  maxItems: z.number().min(1).max(96).nullable().default(null),
  sortBy: experienceRelatedSortSchema.default("manual"),
  /** Items manuales cuando `source=manual` y no se usan `groups`. */
  items: z.array(experienceRelatedItemSchema).default([]),
  /** Composición multi-grupo (empresas + eventos + productos, etc). */
  groups: z.array(experienceRelatedGroupSchema).default([]),
  capabilities: z
    .object({
      showImage: z.boolean().default(true),
      showMeta: z.boolean().default(true),
      showBadges: z.boolean().default(true),
      showTags: z.boolean().default(false),
      showPrice: z.boolean().default(true),
      showDate: z.boolean().default(true),
      showRationale: z.boolean().default(false),
      showKindBadge: z.boolean().default(true),
      /** Deduplica ítems por `id` cuando varios grupos comparten origen. */
      dedupe: z.boolean().default(true),
      compact: z.boolean().default(false),
      /** Reservado — resolución contextual (Context Engine). */
      contextAware: z.boolean().default(false),
      /** Reservado — priorización por Alux. */
      aluxRecommended: z.boolean().default(false),
      /** Reservado — dejar que Alux inyecte grupos adicionales dinámicos. */
      aluxDynamicGroups: z.boolean().default(false),
    })
    .partial()
    .default({}),
  contextRefs: experienceRelatedContextRefsSchema,
  extensions: z
    .array(
      z.object({
        kind: z.string().min(1),
        config: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .default([]),
});
export type ExperienceRelatedCollectionConfig = z.infer<
  typeof experienceRelatedCollectionConfigSchema
>;

export const experienceRelatedCollectionDtoSchema = z.object({
  variant: experienceRelatedVariantSchema,
  entityKind: experienceRelatedEntityKindSchema,
  columns: z.number(),
  heading: z.string().nullable(),
  subheading: z.string().nullable(),
  emptyMessage: z.string(),
  ariaLabel: z.string(),
  groups: z.array(
    z.object({
      id: z.string(),
      entityKind: experienceRelatedEntityKindSchema,
      heading: z.string().nullable(),
      subheading: z.string().nullable(),
      emptyMessage: z.string().nullable(),
      variant: experienceRelatedVariantSchema.nullable(),
      items: z.array(experienceRelatedItemSchema),
      seeAllHref: z.string().nullable(),
      seeAllLabel: z.string().nullable(),
    }),
  ),
  capabilities: z.object({
    showImage: z.boolean(),
    showMeta: z.boolean(),
    showBadges: z.boolean(),
    showTags: z.boolean(),
    showPrice: z.boolean(),
    showDate: z.boolean(),
    showRationale: z.boolean(),
    showKindBadge: z.boolean(),
    dedupe: z.boolean(),
    compact: z.boolean(),
    contextAware: z.boolean(),
    aluxRecommended: z.boolean(),
    aluxDynamicGroups: z.boolean(),
  }),
  contextRefs: experienceRelatedContextRefsSchema,
});
export type ExperienceRelatedCollectionDTO = z.infer<
  typeof experienceRelatedCollectionDtoSchema
>;

/* ------------------------------------------------------------------ *
 * Helpers puros
 * ------------------------------------------------------------------ */
export function kindLabel(kind: ExperienceRelatedEntityKind): string {
  switch (kind) {
    case "business": return "Empresa";
    case "product": return "Producto";
    case "experience": return "Experiencia";
    case "hotel": return "Hotel";
    case "restaurant": return "Restaurante";
    case "event": return "Evento";
    case "promotion": return "Promoción";
    case "route": return "Ruta";
    case "destination": return "Destino";
    case "region": return "Región";
    case "category": return "Categoría";
    case "mixed": return "Descubrir";
  }
}

export function dedupeItems(
  items: ExperienceRelatedItem[],
): ExperienceRelatedItem[] {
  const seen = new Set<string>();
  const out: ExperienceRelatedItem[] = [];
  for (const it of items) {
    const key = `${it.kind}:${it.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Preview DTO — usado por Studio y por la ruta /lovable de validación.
 * ------------------------------------------------------------------ */
export function buildExperienceRelatedCollectionPreviewDTO(): ExperienceRelatedCollectionDTO {
  const businesses: ExperienceRelatedItem[] = [
    {
      id: "b1",
      kind: "hotel",
      title: "Hacienda Selva Maya",
      subtitle: "Hotel boutique",
      description: "Refugio con cenote privado y desayuno maya.",
      href: "/marketplace/hacienda-selva-maya",
      imageUrl: null,
      imageAlt: null,
      meta: [{ iconKey: "map-pin", label: "Valladolid" }],
      badges: [{ label: "Verificado", tone: "primary" }],
      tags: [],
      priceAmount: null,
      priceCurrency: null,
      dateStart: null,
      dateEnd: null,
      destinationSlug: "valladolid",
      categorySlug: "hoteles",
      rationale: null,
      sourceHint: "destination",
      score: null,
    },
  ];
  const events: ExperienceRelatedItem[] = [
    {
      id: "e1",
      kind: "event",
      title: "Festival Sac-Bé",
      subtitle: "Música y danza maya",
      description: null,
      href: "/eventos/festival-sac-be",
      imageUrl: null,
      imageAlt: null,
      meta: [{ iconKey: "calendar", label: "15 Nov" }],
      badges: [],
      tags: [],
      priceAmount: null,
      priceCurrency: null,
      dateStart: new Date(Date.now() + 20 * 864e5).toISOString(),
      dateEnd: null,
      destinationSlug: "valladolid",
      categorySlug: null,
      rationale: null,
      sourceHint: "destination",
      score: null,
    },
  ];
  return {
    variant: "grid",
    entityKind: "mixed",
    columns: 2,
    heading: "Sigue descubriendo",
    subheading:
      "Empresas, eventos y experiencias para continuar construyendo tu viaje.",
    emptyMessage: "Aún no hay contenido para descubrir aquí.",
    ariaLabel: "Sigue descubriendo",
    groups: [
      {
        id: "empresas",
        entityKind: "business",
        heading: "Empresas del destino",
        subheading: null,
        emptyMessage: null,
        variant: null,
        items: businesses,
        seeAllHref: "/marketplace?destino=valladolid",
        seeAllLabel: "Ver todas",
      },
      {
        id: "eventos",
        entityKind: "event",
        heading: "Próximos eventos",
        subheading: null,
        emptyMessage: null,
        variant: null,
        items: events,
        seeAllHref: "/eventos",
        seeAllLabel: "Ver agenda",
      },
    ],
    capabilities: {
      showImage: true,
      showMeta: true,
      showBadges: true,
      showTags: false,
      showPrice: true,
      showDate: true,
      showRationale: false,
      showKindBadge: true,
      dedupe: true,
      compact: false,
      contextAware: false,
      aluxRecommended: false,
      aluxDynamicGroups: false,
    },
    contextRefs: { destinationSlug: "valladolid" },
  };
}