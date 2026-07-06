/**
 * H-03 · Ola I2.a — `vmx.experience.products`
 *
 * Capa 2 (Contenido). Bloque oficial de listado de productos /
 * habitaciones / tours / accesos / servicios / experiencias.
 *
 * Reglas vinculantes:
 *  - Regla de Compatibilidad Evolutiva: NUNCA `-pro` / `-v2` /
 *    `-featured-v2`. La biblioteca crece por `variant` /
 *    `capabilities` / `extensions[]`.
 *  - Regla de Orquestación: el bloque no depende de `BusinessSurface`.
 *    Se hidrata declarativamente por `source` desde el contexto de la
 *    superficie (business, destination, region, category, context).
 *  - Directiva de Bloques Conscientes del Contexto (H-03): el
 *    contrato incorpora `contextRefs` y `extensions[]` para permitir
 *    incorporar más adelante Alux, Discovery Navigator, Context Engine
 *    y Capability Policy Engine sin romper compatibilidad. En I2.a
 *    esos campos NO se consumen, sólo quedan reservados.
 */
import { z } from "zod";

export const EXPERIENCE_PRODUCTS_CONTRACT_VERSION = "1.1.0";

/**
 * Family of tourism entities that the block can render with the SAME
 * `ExperienceProducts` component. Added in v1.1.0 as part of the
 * Tourism Component Library evolution — a single card family, many
 * meanings via configuration.
 */
export const experienceEntityKindSchema = z.enum([
  "product",
  "business",
  "hotel",
  "restaurant",
  "experience",
  "event",
  "destination",
  "landing",
]);
export type ExperienceEntityKind = z.infer<typeof experienceEntityKindSchema>;

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */
export const experienceProductsVariantSchema = z.enum([
  "grid",       // Grid de tarjetas — default.
  "list",       // Lista vertical (mobile-first, denso).
  "carousel",   // Scroll horizontal con snap.
  "featured",   // Uno destacado + secundarios.
]);
export type ExperienceProductsVariant = z.infer<typeof experienceProductsVariantSchema>;

export const experienceProductsSourceSchema = z.enum([
  "manual",       // Items provistos por el editor.
  "business",     // Hidrata desde `BusinessSurfaceContext` (I2.a).
  "destination",  // Reservado (I2.d+ / Ola I3).
  "region",       // Reservado.
  "category",     // Reservado.
  "context",      // Reservado — resolución vía Context Engine + Alux.
]);
export type ExperienceProductsSource = z.infer<typeof experienceProductsSourceSchema>;

export const experienceProductsGroupBySchema = z.enum(["none", "type"]);

/* ------------------------------------------------------------------ *
 * Item shape — subset seguro para render público. No incluye modelo
 * de dominio completo; sólo lo necesario para descubrir/comparar/decidir.
 * ------------------------------------------------------------------ */
export const experienceProductItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().nullable().default(null),
  productType: z.string().nullable().default(null),
  /**
   * v1.1.0 — tourism entity kind. Drives eyebrow label, iconography
   * and semantic default badges. Optional for backward compatibility.
   */
  entityKind: experienceEntityKindSchema.nullable().default(null),
  href: z.string().nullable().default(null),
  mediaUrl: z.string().nullable().default(null),
  mediaAlt: z.string().nullable().default(null),
  priceAmount: z.number().nullable().default(null),
  priceCurrency: z.string().nullable().default(null),
  /**
   * v1.1.0 — free-form price qualifier (e.g. "desde", "por noche",
   * "por persona"). Presentation only, does not affect commerce.
   */
  priceHint: z.string().nullable().default(null),
  businessId: z.string().nullable().default(null),
  businessName: z.string().nullable().default(null),
  /**
   * v1.1.0 — social proof. Answers "¿por qué vale la pena?".
   */
  rating: z
    .object({
      value: z.number().min(0).max(5),
      count: z.number().min(0).default(0),
    })
    .nullable()
    .default(null),
  /**
   * v1.1.0 — location context. Answers "¿dónde está?".
   * `distanceKm` is optional and rendered when the visitor is geolocated.
   */
  location: z
    .object({
      label: z.string().min(1),
      distanceKm: z.number().nullable().default(null),
    })
    .nullable()
    .default(null),
  /**
   * v1.1.0 — differentiators. Answers "¿qué la hace diferente?".
   * Max 4; the card renders up to 3 to preserve above-the-fold hierarchy.
   */
  highlights: z.array(z.string().min(1)).max(4).default([]),
  /**
   * v1.1.0 — date/schedule context (events, temporary experiences).
   */
  dateLabel: z.string().nullable().default(null),
  badges: z
    .array(
      z.object({
        label: z.string().min(1),
        tone: z.enum(["default", "primary", "success", "warning"]).default("default"),
      }),
    )
    .default([]),
  primaryAction: z
    .object({
      label: z.string().min(1),
      action: z.enum(["book", "buy", "contact", "external", "internal"]).default("internal"),
      href: z.string().nullable().default(null),
    })
    .nullable()
    .default(null),
  secondaryAction: z
    .object({
      label: z.string().min(1),
      action: z.enum(["contact", "external", "internal", "favorite"]).default("contact"),
      href: z.string().nullable().default(null),
    })
    .nullable()
    .default(null),
});
export type ExperienceProductItem = z.infer<typeof experienceProductItemSchema>;

/* ------------------------------------------------------------------ *
 * Context refs — reservados para inteligencia contextual futura.
 * ------------------------------------------------------------------ */
export const experienceContextRefsSchema = z
  .object({
    destinationSlug: z.string().nullable().default(null),
    regionSlug: z.string().nullable().default(null),
    categorySlug: z.string().nullable().default(null),
    businessSlug: z.string().nullable().default(null),
    locale: z.string().nullable().default(null),
    tripType: z.string().nullable().default(null),
    aluxSessionId: z.string().nullable().default(null),
  })
  .partial()
  .default({});
export type ExperienceContextRefs = z.infer<typeof experienceContextRefsSchema>;

/* ------------------------------------------------------------------ *
 * Config (Studio) & DTO (runtime)
 * ------------------------------------------------------------------ */
export const experienceProductsConfigSchema = z.object({
  contractVersion: z.string().default(EXPERIENCE_PRODUCTS_CONTRACT_VERSION),
  source: experienceProductsSourceSchema.default("manual"),
  variant: experienceProductsVariantSchema.default("grid"),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  emptyMessage: z.string().default("Sin productos publicados."),
  columns: z.number().min(1).max(4).default(2),
  maxItems: z.number().min(1).max(48).nullable().default(null),
  groupBy: experienceProductsGroupBySchema.default("none"),
  ariaLabel: z.string().default("Productos y experiencias"),
  items: z.array(experienceProductItemSchema).default([]),
  filters: z
    .object({
      productTypes: z.array(z.string()).default([]),
      businessId: z.string().nullable().default(null),
    })
    .partial()
    .default({}),
  capabilities: z
    .object({
      showPrice: z.boolean().default(true),
      showFavorite: z.boolean().default(true),
      showActions: z.boolean().default(true),
      showBusiness: z.boolean().default(false),
      showMedia: z.boolean().default(true),
      compact: z.boolean().default(false),
      /** Reservado — futura resolución contextual (Alux, Context Engine). */
      contextAware: z.boolean().default(false),
      /** Reservado — pricing/availability en vivo (Ola I3). */
      livePricing: z.boolean().default(false),
      liveAvailability: z.boolean().default(false),
    })
    .partial()
    .default({}),
  contextRefs: experienceContextRefsSchema,
  extensions: z
    .array(
      z.object({
        kind: z.string().min(1),
        config: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .default([]),
});
export type ExperienceProductsConfig = z.infer<typeof experienceProductsConfigSchema>;

export const experienceProductsDtoSchema = z.object({
  variant: experienceProductsVariantSchema,
  heading: z.string().nullable(),
  subheading: z.string().nullable(),
  emptyMessage: z.string(),
  columns: z.number(),
  groupBy: experienceProductsGroupBySchema,
  ariaLabel: z.string(),
  items: z.array(experienceProductItemSchema),
  capabilities: z.object({
    showPrice: z.boolean(),
    showFavorite: z.boolean(),
    showActions: z.boolean(),
    showBusiness: z.boolean(),
    showMedia: z.boolean(),
    compact: z.boolean(),
    contextAware: z.boolean(),
    livePricing: z.boolean(),
    liveAvailability: z.boolean(),
  }),
  contextRefs: experienceContextRefsSchema,
});
export type ExperienceProductsDTO = z.infer<typeof experienceProductsDtoSchema>;

/* ------------------------------------------------------------------ *
 * Preview DTO — usado por Studio y por la ruta /lovable de validación.
 * ------------------------------------------------------------------ */
export function buildExperienceProductsPreviewDTO(): ExperienceProductsDTO {
  return {
    variant: "grid",
    heading: "Habitaciones y experiencias",
    subheading: null,
    emptyMessage: "Sin productos publicados.",
    columns: 2,
    groupBy: "none",
    ariaLabel: "Productos y experiencias",
    items: [
      {
        id: "prev-1",
        name: "Habitación Cenote",
        tagline: "Suite con vista al cenote privado, desayuno incluido.",
        productType: "room",
        entityKind: "hotel",
        href: null,
        mediaUrl: null,
        mediaAlt: null,
        priceAmount: 4200,
        priceCurrency: "MXN",
        priceHint: "por noche",
        businessId: null,
        businessName: "Hacienda Selva Maya",
        rating: { value: 4.8, count: 126 },
        location: { label: "Ek Balam · 25 min de Valladolid", distanceKm: 25 },
        highlights: ["Cenote privado", "Desayuno maya", "Piscina infinita"],
        dateLabel: null,
        badges: [{ label: "Popular", tone: "primary" }],
        primaryAction: { label: "Reservar", action: "book", href: null },
        secondaryAction: { label: "Contactar", action: "contact", href: null },
      },
      {
        id: "prev-2",
        name: "Cena de degustación",
        tagline: "Menú de siete tiempos con maridaje de mezcales.",
        productType: "experience",
        entityKind: "experience",
        href: null,
        mediaUrl: null,
        mediaAlt: null,
        priceAmount: 1800,
        priceCurrency: "MXN",
        priceHint: "por persona",
        businessId: null,
        businessName: "Hacienda Selva Maya",
        rating: { value: 4.9, count: 58 },
        location: { label: "Centro histórico de Valladolid", distanceKm: null },
        highlights: ["Maridaje mezcal", "Chef local", "Aforo íntimo"],
        dateLabel: "Vie · Sáb · 20:00",
        badges: [],
        primaryAction: { label: "Reservar", action: "book", href: null },
        secondaryAction: null,
      },
    ],
    capabilities: {
      showPrice: true,
      showFavorite: true,
      showActions: true,
      showBusiness: false,
      showMedia: true,
      compact: false,
      contextAware: false,
      livePricing: false,
      liveAvailability: false,
    },
    contextRefs: {},
  };
}

/* ------------------------------------------------------------------ *
 * v1.1.0 — Tourism Card Preview builder.
 *
 * Returns a DTO showcasing the SAME `experience-products` block
 * rendering six different tourism entities via `entityKind` +
 * `variant`. This is the visual proof the Founder requires before
 * approving U1.1 and is used by `/lovable/tourism-card-preview`.
 * ------------------------------------------------------------------ */
export function buildTourismCardsPreviewDTO(): ExperienceProductsDTO {
  return {
    variant: "grid",
    heading: null,
    subheading: null,
    emptyMessage: "Sin resultados.",
    columns: 3,
    groupBy: "none",
    ariaLabel: "Familia oficial de Tourism Cards",
    items: [
      {
        id: "tc-business",
        name: "Hacienda Selva Maya",
        tagline: "Refugio colonial con cenote privado y cocina yucateca de autor.",
        productType: null,
        entityKind: "business",
        href: "#",
        mediaUrl: null,
        mediaAlt: null,
        priceAmount: null,
        priceCurrency: null,
        priceHint: null,
        businessId: null,
        businessName: null,
        rating: { value: 4.9, count: 312 },
        location: { label: "Valladolid, Yucatán", distanceKm: 3 },
        highlights: ["Pueblo Mágico", "Cenote propio", "Cocina de autor"],
        dateLabel: null,
        badges: [{ label: "Verificado", tone: "success" }],
        primaryAction: { label: "Ver empresa", action: "internal", href: "#" },
        secondaryAction: { label: "Contactar", action: "contact", href: null },
      },
      {
        id: "tc-product",
        name: "Tour privado a Ek Balam",
        tagline: "Guía maya certificado, transporte y acceso preferente.",
        productType: "tour",
        entityKind: "product",
        href: "#",
        mediaUrl: null,
        mediaAlt: null,
        priceAmount: 1450,
        priceCurrency: "MXN",
        priceHint: "por persona",
        businessId: null,
        businessName: "Yúumtsil Tours",
        rating: { value: 4.7, count: 204 },
        location: { label: "Salida desde Valladolid centro", distanceKm: null },
        highlights: ["Guía maya", "Aforo reducido", "Cancelación gratis"],
        dateLabel: null,
        badges: [{ label: "Recomendado por Alux", tone: "primary" }],
        primaryAction: { label: "Reservar", action: "book", href: "#" },
        secondaryAction: { label: "Preguntar", action: "contact", href: null },
      },
      {
        id: "tc-hotel",
        name: "Casona de las Bugambilias",
        tagline: "Hotel boutique colonial a dos cuadras del Zócalo.",
        productType: null,
        entityKind: "hotel",
        href: "#",
        mediaUrl: null,
        mediaAlt: null,
        priceAmount: 2850,
        priceCurrency: "MXN",
        priceHint: "por noche",
        businessId: null,
        businessName: null,
        rating: { value: 4.8, count: 489 },
        location: { label: "Centro histórico · Valladolid", distanceKm: 0.4 },
        highlights: ["Piscina", "Desayuno incluido", "Pet friendly"],
        dateLabel: null,
        badges: [{ label: "Pueblo Mágico", tone: "primary" }],
        primaryAction: { label: "Ver disponibilidad", action: "book", href: "#" },
        secondaryAction: { label: "Contactar", action: "contact", href: null },
      },
      {
        id: "tc-restaurant",
        name: "Cocina Xok Maya",
        tagline: "Cocina tradicional yucateca reinterpretada por chef local.",
        productType: null,
        entityKind: "restaurant",
        href: "#",
        mediaUrl: null,
        mediaAlt: null,
        priceAmount: null,
        priceCurrency: null,
        priceHint: "$$ · Yucateca",
        businessId: null,
        businessName: null,
        rating: { value: 4.6, count: 731 },
        location: { label: "Calle 41 · Valladolid centro", distanceKm: 0.2 },
        highlights: ["Terraza", "Vegetariano", "Mezcalería"],
        dateLabel: "Abierto hoy · hasta 23:00",
        badges: [{ label: "Despierta en Valladolid", tone: "warning" }],
        primaryAction: { label: "Reservar mesa", action: "book", href: "#" },
        secondaryAction: { label: "Ver menú", action: "internal", href: "#" },
      },
      {
        id: "tc-experience",
        name: "Temazcal ceremonial maya",
        tagline: "Ritual guiado por chamán con cantos y plantas sagradas.",
        productType: "experience",
        entityKind: "experience",
        href: "#",
        mediaUrl: null,
        mediaAlt: null,
        priceAmount: 950,
        priceCurrency: "MXN",
        priceHint: "por persona",
        businessId: null,
        businessName: "Kuxtal Ancestral",
        rating: { value: 5.0, count: 88 },
        location: { label: "Comunidad de Xocén · 20 min", distanceKm: 12 },
        highlights: ["Chamán maya", "90 min", "Incluye traslado"],
        dateLabel: "Mar · Jue · Sáb · 18:00",
        badges: [{ label: "Auténtico", tone: "success" }],
        primaryAction: { label: "Reservar", action: "book", href: "#" },
        secondaryAction: null,
      },
      {
        id: "tc-event",
        name: "Festival de la Vaquería",
        tagline: "Fiesta tradicional yucateca con jarana, gastronomía y trajes típicos.",
        productType: null,
        entityKind: "event",
        href: "#",
        mediaUrl: null,
        mediaAlt: null,
        priceAmount: 0,
        priceCurrency: "MXN",
        priceHint: "Entrada libre",
        businessId: null,
        businessName: "Ayuntamiento de Valladolid",
        rating: null,
        location: { label: "Parque principal Francisco Cantón", distanceKm: 0.1 },
        highlights: ["Jarana yucateca", "Gastronomía", "Familiar"],
        dateLabel: "Sáb 12 jul · 19:00 – 23:00",
        badges: [{ label: "Gratis", tone: "success" }],
        primaryAction: { label: "Agregar al viaje", action: "internal", href: "#" },
        secondaryAction: { label: "Cómo llegar", action: "external", href: "#" },
      },
    ],
    capabilities: {
      showPrice: true,
      showFavorite: true,
      showActions: true,
      showBusiness: true,
      showMedia: true,
      compact: false,
      contextAware: false,
      livePricing: false,
      liveAvailability: false,
    },
    contextRefs: {},
  };
}