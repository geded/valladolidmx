/**
 * H-03 · Ola I2.b — `vmx.experience.promotions`
 *
 * Capa 2 (Contenido). Bloque oficial de oportunidades comerciales
 * (promociones, ofertas, descuentos, paquetes, campañas, cupones,
 * beneficios exclusivos). Complementa a `vmx.experience.products`
 * (catálogo) SIN depender de él — ambos son piezas independientes de
 * la capa Commerce.
 *
 * Reglas vinculantes:
 *  - Regla de Compatibilidad Evolutiva: prohibido crear `-pro`, `-v2`,
 *    `-flash`, `-deals`. La biblioteca crece por `variant` /
 *    `capabilities` / `extensions[]`.
 *  - Regla de Orquestación: el bloque no depende de `BusinessSurface`.
 *    Se hidrata declarativamente por `source` (manual, business, y
 *    reservado destination/region/category/context).
 *  - Directiva Commerce (Founder): Products y Promotions se diseñan
 *    para trabajar conjuntamente o de forma totalmente independiente.
 *  - Directiva Bloques Conscientes del Contexto (Founder): el contrato
 *    incorpora `contextRefs` y `extensions[]` reservados para consumir
 *    Alux, Discovery Navigator, Context Engine y Capability Policy
 *    Engine en futuras versiones sin romper compatibilidad.
 */
import { z } from "zod";

export const EXPERIENCE_PROMOTIONS_CONTRACT_VERSION = "1.0.0";

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */
export const experiencePromotionsVariantSchema = z.enum([
  "strip",     // Franja compacta (mobile-first).
  "grid",      // Grid de tarjetas — default.
  "list",      // Lista vertical densa.
  "carousel",  // Scroll horizontal con snap.
  "featured",  // Una destacada + secundarias.
  "banner",    // Franja hero-like (una única oportunidad).
]);
export type ExperiencePromotionsVariant = z.infer<typeof experiencePromotionsVariantSchema>;

export const experiencePromotionsSourceSchema = z.enum([
  "manual",       // Items provistos por el editor.
  "business",     // Hidrata desde `BusinessSurfaceContext` (I2.b).
  "destination",  // Reservado (Ola I2.d+).
  "region",       // Reservado.
  "category",     // Reservado.
  "context",      // Reservado — Context Engine + Alux.
  "campaign",     // Reservado — campañas activas (Marketing Ops).
]);
export type ExperiencePromotionsSource = z.infer<typeof experiencePromotionsSourceSchema>;

export const experiencePromotionsGroupBySchema = z.enum(["none", "business", "urgency"]);

/* ------------------------------------------------------------------ *
 * Context refs — reservados para inteligencia contextual futura.
 * (Duplicamos el shape localmente para no acoplar el contrato de
 *  Promotions al de Products; ambos evolucionan independientemente.)
 * ------------------------------------------------------------------ */
export const experiencePromotionsContextRefsSchema = z
  .object({
    destinationSlug: z.string().nullable().default(null),
    regionSlug: z.string().nullable().default(null),
    categorySlug: z.string().nullable().default(null),
    businessSlug: z.string().nullable().default(null),
    locale: z.string().nullable().default(null),
    tripType: z.string().nullable().default(null),
    campaignId: z.string().nullable().default(null),
    aluxSessionId: z.string().nullable().default(null),
  })
  .partial()
  .default({});
export type ExperiencePromotionsContextRefs = z.infer<typeof experiencePromotionsContextRefsSchema>;

/* ------------------------------------------------------------------ *
 * Item shape — subset seguro para render público.
 * ------------------------------------------------------------------ */
export const experiencePromotionItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().default(null),
  href: z.string().nullable().default(null),
  mediaUrl: z.string().nullable().default(null),
  mediaAlt: z.string().nullable().default(null),
  /** Descuento en % (0-100). Excluyente con `discountLabel`. */
  discountPercent: z.number().min(0).max(100).nullable().default(null),
  /** Etiqueta libre para descuentos no porcentuales ("2x1", "-500 MXN"). */
  discountLabel: z.string().nullable().default(null),
  /** Precio original / precio con descuento (opcional, para show). */
  priceOriginal: z.number().nullable().default(null),
  pricePromo: z.number().nullable().default(null),
  priceCurrency: z.string().nullable().default(null),
  /** Ventana temporal (ISO). El bloque calcula urgencia y "expira pronto". */
  startsAt: z.string().nullable().default(null),
  endsAt: z.string().nullable().default(null),
  /** Cupón / código promocional a mostrar (copiable). */
  couponCode: z.string().nullable().default(null),
  /** Negocio propietario (para mixed sources en destino/región). */
  businessId: z.string().nullable().default(null),
  businessName: z.string().nullable().default(null),
  businessSlug: z.string().nullable().default(null),
  /** Producto vinculado (permite convivir con `vmx.experience.products` sin acoplarse). */
  productId: z.string().nullable().default(null),
  productSlug: z.string().nullable().default(null),
  badges: z
    .array(
      z.object({
        label: z.string().min(1),
        tone: z.enum(["default", "primary", "success", "warning", "danger"]).default("default"),
      }),
    )
    .default([]),
  primaryAction: z
    .object({
      label: z.string().min(1),
      action: z.enum(["redeem", "book", "buy", "contact", "external", "internal"]).default("internal"),
      href: z.string().nullable().default(null),
    })
    .nullable()
    .default(null),
  secondaryAction: z
    .object({
      label: z.string().min(1),
      action: z.enum(["contact", "external", "internal", "favorite", "share"]).default("favorite"),
      href: z.string().nullable().default(null),
    })
    .nullable()
    .default(null),
});
export type ExperiencePromotionItem = z.infer<typeof experiencePromotionItemSchema>;

/* ------------------------------------------------------------------ *
 * Config (Studio) & DTO (runtime)
 * ------------------------------------------------------------------ */
export const experiencePromotionsConfigSchema = z.object({
  contractVersion: z.string().default(EXPERIENCE_PROMOTIONS_CONTRACT_VERSION),
  source: experiencePromotionsSourceSchema.default("manual"),
  variant: experiencePromotionsVariantSchema.default("grid"),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  emptyMessage: z.string().default("Sin promociones vigentes por ahora."),
  columns: z.number().min(1).max(4).default(2),
  maxItems: z.number().min(1).max(48).nullable().default(null),
  groupBy: experiencePromotionsGroupBySchema.default("none"),
  ariaLabel: z.string().default("Promociones y oportunidades"),
  items: z.array(experiencePromotionItemSchema).default([]),
  filters: z
    .object({
      businessId: z.string().nullable().default(null),
      minDiscountPercent: z.number().nullable().default(null),
      onlyActive: z.boolean().default(true),
    })
    .partial()
    .default({}),
  capabilities: z
    .object({
      showDiscount: z.boolean().default(true),
      showExpiry: z.boolean().default(true),
      showFavorite: z.boolean().default(true),
      showActions: z.boolean().default(true),
      showBusiness: z.boolean().default(false),
      showMedia: z.boolean().default(true),
      showCouponCode: z.boolean().default(true),
      /** Marca visualmente urgencia si `endsAt` está próximo. */
      urgencyAware: z.boolean().default(true),
      compact: z.boolean().default(false),
      /** Reservado — resolución contextual (Alux, Context Engine). */
      contextAware: z.boolean().default(false),
      /** Reservado — descuento en vivo por audiencia / campaña (I3+). */
      liveDiscount: z.boolean().default(false),
      /** Reservado — geo-fencing / condicionales por tipo de viaje. */
      audienceAware: z.boolean().default(false),
    })
    .partial()
    .default({}),
  contextRefs: experiencePromotionsContextRefsSchema,
  extensions: z
    .array(
      z.object({
        kind: z.string().min(1),
        config: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .default([]),
});
export type ExperiencePromotionsConfig = z.infer<typeof experiencePromotionsConfigSchema>;

export const experiencePromotionsDtoSchema = z.object({
  variant: experiencePromotionsVariantSchema,
  heading: z.string().nullable(),
  subheading: z.string().nullable(),
  emptyMessage: z.string(),
  columns: z.number(),
  groupBy: experiencePromotionsGroupBySchema,
  ariaLabel: z.string(),
  items: z.array(experiencePromotionItemSchema),
  capabilities: z.object({
    showDiscount: z.boolean(),
    showExpiry: z.boolean(),
    showFavorite: z.boolean(),
    showActions: z.boolean(),
    showBusiness: z.boolean(),
    showMedia: z.boolean(),
    showCouponCode: z.boolean(),
    urgencyAware: z.boolean(),
    compact: z.boolean(),
    contextAware: z.boolean(),
    liveDiscount: z.boolean(),
    audienceAware: z.boolean(),
  }),
  contextRefs: experiencePromotionsContextRefsSchema,
});
export type ExperiencePromotionsDTO = z.infer<typeof experiencePromotionsDtoSchema>;

/* ------------------------------------------------------------------ *
 * Preview DTO — usado por Studio y por la ruta /lovable de validación.
 * ------------------------------------------------------------------ */
export function buildExperiencePromotionsPreviewDTO(): ExperiencePromotionsDTO {
  const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const in21days = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
  return {
    variant: "grid",
    heading: "Promociones vigentes",
    subheading: null,
    emptyMessage: "Sin promociones vigentes por ahora.",
    columns: 2,
    groupBy: "none",
    ariaLabel: "Promociones y oportunidades",
    items: [
      {
        id: "prev-1",
        title: "2 noches por 1 en Suite Cenote",
        description: "Reserva entre semana y llévate una noche adicional sin costo.",
        href: null,
        mediaUrl: null,
        mediaAlt: null,
        discountPercent: 50,
        discountLabel: null,
        priceOriginal: 8400,
        pricePromo: 4200,
        priceCurrency: "MXN",
        startsAt: null,
        endsAt: in3days,
        couponCode: "SELVA2X1",
        businessId: null,
        businessName: "Hacienda Selva Maya",
        businessSlug: null,
        productId: null,
        productSlug: null,
        badges: [{ label: "Expira pronto", tone: "warning" }],
        primaryAction: { label: "Aprovechar", action: "redeem", href: null },
        secondaryAction: { label: "Guardar", action: "favorite", href: null },
      },
      {
        id: "prev-2",
        title: "−20% en cena de degustación",
        description: "Menú de 7 tiempos con maridaje de mezcales, sujeto a disponibilidad.",
        href: null,
        mediaUrl: null,
        mediaAlt: null,
        discountPercent: 20,
        discountLabel: null,
        priceOriginal: 1800,
        pricePromo: 1440,
        priceCurrency: "MXN",
        startsAt: null,
        endsAt: in21days,
        couponCode: null,
        businessId: null,
        businessName: "Hacienda Selva Maya",
        businessSlug: null,
        productId: null,
        productSlug: null,
        badges: [],
        primaryAction: { label: "Reservar", action: "book", href: null },
        secondaryAction: null,
      },
    ],
    capabilities: {
      showDiscount: true,
      showExpiry: true,
      showFavorite: true,
      showActions: true,
      showBusiness: false,
      showMedia: true,
      showCouponCode: true,
      urgencyAware: true,
      compact: false,
      contextAware: false,
      liveDiscount: false,
      audienceAware: false,
    },
    contextRefs: {},
  };
}

/* ------------------------------------------------------------------ *
 * Helpers puros (usados por Presentación y Comportamiento).
 * ------------------------------------------------------------------ */
export function computeUrgencyDays(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const t = Date.parse(endsAt);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000));
}