/**
 * G8-P2 · Automatic Premium Entity Template Resolution v1.0
 *
 * Registro único y resolutor determinista de las plantillas premium por
 * FAMILIA DE ENTIDAD (hotel, restaurante, evento, experiencia, tour y
 * casa de vacaciones).
 *
 * Reglas vinculantes:
 *  - Módulo PURO: sin red, sin base de datos, sin flags, sin React.
 *  - Una entidad publicada NO genera una composición propia: adopta el
 *    preset de su familia y renderiza con sus propios datos sobre la
 *    ruta paramétrica canónica ya existente en el router.
 *  - Fail-closed: familia no reconocida → superficie estándar canónica.
 *    Nunca se aplica un preset premium "genérico".
 *  - Orden de resolución: override editorial aprobado y compatible →
 *    preset canónico de familia → superficie estándar existente.
 *  - Sin duplicación: Tour reutiliza el motor visual aprobado de
 *    Experiencia y Casa de vacaciones el de Hotel, pero cada uno es un
 *    preset independiente con su propio contrato semántico y JSON-LD.
 */

export const ENTITY_PREMIUM_TEMPLATE_REGISTRY_VERSION = "1.0.0" as const;
export const ENTITY_PREMIUM_TEMPLATE_EFFECTIVE_DATE = "2026-08-28" as const;

/** Tipos de entidad reconocidos por el resolutor. */
export type PremiumEntityType = "business" | "product" | "event";

/** Familias de ficha individual con plantilla premium canónica. */
export type PremiumEntityFamily =
  | "hotel"
  | "restaurant"
  | "event"
  | "experience"
  | "tour"
  | "vacation_rental";

export type PremiumEntityRole = "founder" | "admin" | "editor" | "business_author";

export interface EntityPremiumTemplatePreset {
  /** Identificador estable del preset. */
  readonly id: string;
  /** Nombre visible en Studio. */
  readonly name: string;
  /** Descripción orientada al editor. */
  readonly description: string;
  /** Familia de entidad. */
  readonly family: PremiumEntityFamily;
  /** Tipo de entidad de origen. */
  readonly entityType: PremiumEntityType;
  /** Categorías compatibles (slugs normalizados y alias acreditados). */
  readonly categorySlugs: readonly string[];
  /** `product_type` compatibles cuando aplique. */
  readonly productTypes: readonly string[];
  /** Vista interna que actúa como autoridad visual aprobada. */
  readonly visualAuthorityRoute: string;
  /** Componente productivo que renderiza la ficha. */
  readonly productionComponent: string;
  /** Adaptador semántico del contrato de superficie. */
  readonly surfaceAdapter: string;
  /** Ruta pública canónica real del router (paramétrica). */
  readonly canonicalRoutePattern: string;
  /** Rutas canónicas alternativas reales (nunca inventadas). */
  readonly alternateRoutePatterns: readonly string[];
  /** Campos mínimos del schema de datos de la familia. */
  readonly dataSchema: readonly string[];
  /** @type de JSON-LD emitido por la familia. */
  readonly jsonLdType: string;
  /** Campos editables por la empresa dueña de la entidad. */
  readonly editableFields: readonly string[];
  /** Roles autorizados a modificar el preset global. */
  readonly presetRoles: readonly PremiumEntityRole[];
  /** Estrategia de fallback cuando falta contenido/medios. */
  readonly fallback: "standard_surface" | "premium_media_fallback";
  /** Versión del contrato del preset. */
  readonly version: string;
  /** Estado editorial del preset. */
  readonly status: "aprobada" | "pendiente_aceptacion_founder";
  /**
   * `false` mientras el preset espera aceptación visual Founder: el
   * resolutor NO lo asigna automáticamente a entidades públicas.
   */
  readonly autoAssign: boolean;
  /** `page_kind` compatibles en Studio (fail-closed). */
  readonly pageKinds: readonly string[];
}

const EDITABLE_COMMON = [
  "name",
  "description",
  "contact",
  "schedule",
  "media",
  "price_range",
] as const;

export const ENTITY_PREMIUM_TEMPLATE_PRESETS: readonly EntityPremiumTemplatePreset[] = [
  {
    id: "premium-entity-hotel",
    name: "Hotel Premium",
    description:
      "Ficha individual de hotel: portada, galería, servicios, habitaciones, ubicación y concierge.",
    family: "hotel",
    entityType: "business",
    categorySlugs: ["hotel", "hoteles", "hospedaje", "hospedajes", "alojamiento"],
    productTypes: [],
    visualAuthorityRoute: "/lovable/g4-hotel-premium-preview",
    productionComponent: "BusinessSurface",
    surfaceAdapter: "adaptHotelSurfaceContract",
    canonicalRoutePattern: "/oriente-maya/{destino}/{categoria}/{empresa}",
    alternateRoutePatterns: [],
    dataSchema: [
      "name",
      "description",
      "category",
      "destination",
      "location",
      "contact",
      "schedule",
      "amenities",
      "rooms",
      "price_range",
      "cover",
      "gallery",
      "reservation",
      "seo",
    ],
    jsonLdType: "Hotel",
    editableFields: [...EDITABLE_COMMON, "amenities", "rooms", "reservation"],
    presetRoles: ["founder", "admin"],
    fallback: "premium_media_fallback",
    version: "1.0.0",
    status: "aprobada",
    autoAssign: true,
    pageKinds: ["hotel", "business"],
  },
  {
    id: "premium-entity-restaurant",
    name: "Restaurante Premium",
    description:
      "Ficha individual de restaurante: cocina, especialidades, horarios, menú, ubicación y reserva.",
    family: "restaurant",
    entityType: "business",
    categorySlugs: [
      "restaurante",
      "restaurantes",
      "restaurant",
      "restaurants",
      "cafeteria",
      "cafeterias",
    ],
    productTypes: [],
    visualAuthorityRoute: "/lovable/g4-restaurant-premium-preview",
    productionComponent: "BusinessSurface",
    surfaceAdapter: "adaptRestaurantSurfaceContract",
    canonicalRoutePattern: "/oriente-maya/{destino}/{categoria}/{empresa}",
    alternateRoutePatterns: [],
    dataSchema: [
      "cuisine",
      "specialties",
      "schedule",
      "price_range",
      "reservation",
      "contact",
      "menu",
      "location",
      "cover",
      "gallery",
      "seo",
    ],
    jsonLdType: "Restaurant",
    editableFields: [...EDITABLE_COMMON, "cuisine", "specialties", "menu", "reservation"],
    presetRoles: ["founder", "admin"],
    fallback: "premium_media_fallback",
    version: "1.0.0",
    status: "aprobada",
    autoAssign: true,
    pageKinds: ["restaurant", "business"],
  },
  {
    id: "premium-entity-vacation-rental",
    name: "Casa de vacaciones Premium",
    description:
      "Ficha individual de casa de vacaciones: propiedad completa, capacidad, amenidades, estancia mínima y solicitud de reserva.",
    family: "vacation_rental",
    entityType: "business",
    categorySlugs: [
      "casa-de-vacaciones",
      "casas-de-vacaciones",
      "vacation-rental",
      "vacation-rentals",
      "renta-vacacional",
      "rentas-vacacionales",
    ],
    productTypes: [],
    visualAuthorityRoute: "/lovable/g8p2-vacation-rental-premium-preview",
    productionComponent: "BusinessSurface",
    surfaceAdapter: "adaptVacationRentalSurfaceContract",
    canonicalRoutePattern: "/oriente-maya/{destino}/{categoria}/{empresa}",
    alternateRoutePatterns: [],
    dataSchema: [
      "whole_property",
      "capacity",
      "bedrooms",
      "beds",
      "bathrooms",
      "amenities",
      "kitchen",
      "pool",
      "minimum_stay",
      "check_in",
      "check_out",
      "house_rules",
      "availability",
      "nightly_price",
      "request_cta",
      "approximate_location",
      "cover",
      "gallery",
      "seo",
    ],
    jsonLdType: "VacationRental",
    editableFields: [
      ...EDITABLE_COMMON,
      "capacity",
      "bedrooms",
      "beds",
      "bathrooms",
      "amenities",
      "minimum_stay",
      "house_rules",
      "availability",
      "nightly_price",
    ],
    presetRoles: ["founder", "admin"],
    fallback: "standard_surface",
    version: "1.0.0",
    // Pendiente de aceptación visual Founder (preview interna noindex).
    status: "pendiente_aceptacion_founder",
    autoAssign: false,
    pageKinds: ["business"],
  },
  {
    id: "premium-entity-event",
    name: "Evento Premium",
    description:
      "Ficha individual de evento: fecha, lugar, organizador, disponibilidad y llamada a la acción.",
    family: "event",
    entityType: "event",
    categorySlugs: [],
    productTypes: [],
    visualAuthorityRoute: "/lovable/g4-event-premium-preview",
    productionComponent: "EventSurface",
    surfaceAdapter: "createEventSurfaceContract",
    canonicalRoutePattern: "/eventos/{slug}",
    alternateRoutePatterns: [],
    dataSchema: [
      "starts_at",
      "ends_at",
      "venue",
      "organizer",
      "availability",
      "price",
      "cta",
      "cover",
      "description",
      "seo",
    ],
    jsonLdType: "Event",
    editableFields: ["name", "description", "starts_at", "venue", "organizer", "cta", "media"],
    presetRoles: ["founder", "admin"],
    fallback: "premium_media_fallback",
    version: "1.0.0",
    status: "aprobada",
    autoAssign: true,
    pageKinds: ["event"],
  },
  {
    id: "premium-entity-experience",
    name: "Experiencia Premium",
    description:
      "Ficha individual de experiencia: proveedor, duración, precio, incluye/no incluye, capacidad y concierge.",
    family: "experience",
    entityType: "product",
    categorySlugs: [],
    productTypes: ["experiencia", "experiencias", "experience"],
    visualAuthorityRoute: "/lovable/g4-experience-premium-preview",
    productionComponent: "ProductSurface",
    surfaceAdapter: "adaptExperienceSurfaceContract",
    canonicalRoutePattern: "/producto/{slug}",
    alternateRoutePatterns: ["/oriente-maya/{destino}/{categoria}/{empresa}/{producto}"],
    dataSchema: [
      "provider",
      "duration",
      "price",
      "includes",
      "excludes",
      "capacity",
      "location",
      "cta",
      "gallery",
      "faqs",
      "seo",
    ],
    jsonLdType: "Product",
    editableFields: [
      "name",
      "description",
      "duration",
      "price",
      "includes",
      "excludes",
      "capacity",
      "media",
      "faqs",
    ],
    presetRoles: ["founder", "admin"],
    fallback: "premium_media_fallback",
    version: "1.0.0",
    status: "aprobada",
    autoAssign: true,
    pageKinds: ["experience", "product"],
  },
  {
    id: "premium-entity-tour",
    name: "Tour Premium",
    description:
      "Ficha individual de tour: itinerario, paradas, punto de salida, transporte, idiomas y política de cancelación.",
    family: "tour",
    entityType: "product",
    categorySlugs: [],
    productTypes: ["tour", "tours", "recorrido", "recorridos"],
    // Reutiliza el motor visual aprobado de Experiencia (sin rediseño propio).
    visualAuthorityRoute: "/lovable/g8p2-tour-premium-preview",
    productionComponent: "ProductSurface",
    surfaceAdapter: "adaptTourSurfaceContract",
    canonicalRoutePattern: "/producto/{slug}",
    alternateRoutePatterns: ["/oriente-maya/{destino}/{categoria}/{empresa}/{producto}"],
    dataSchema: [
      "itinerary",
      "stops",
      "duration",
      "departure_point",
      "languages",
      "transport",
      "includes",
      "excludes",
      "difficulty",
      "accessibility",
      "capacity",
      "cancellation_policy",
      "gallery",
      "seo",
    ],
    jsonLdType: "TouristTrip",
    editableFields: [
      "name",
      "description",
      "itinerary",
      "stops",
      "duration",
      "departure_point",
      "languages",
      "transport",
      "includes",
      "excludes",
      "capacity",
      "media",
    ],
    presetRoles: ["founder", "admin"],
    fallback: "premium_media_fallback",
    version: "1.0.0",
    status: "aprobada",
    autoAssign: true,
    pageKinds: ["experience", "product"],
  },
];

/* ------------------------------------------------------------------ *
 * Normalización de slugs (trim + lowercase + alias acreditados).
 * ------------------------------------------------------------------ */

export function normalizeEntitySlug(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_]+/g, "-");
}

/* ------------------------------------------------------------------ *
 * Resolutor determinista.
 * ------------------------------------------------------------------ */

/**
 * Resuelve el preset premium de familia. Devuelve `null` (fail-closed)
 * cuando la familia no está reconocida: la entidad conserva su
 * superficie estándar canónica.
 */
export function resolveEntityPremiumTemplate(
  entityType: string,
  categorySlug?: string | null,
  productType?: string | null,
): EntityPremiumTemplatePreset | null {
  const type = normalizeEntitySlug(entityType);
  const category = normalizeEntitySlug(categorySlug);
  const product = normalizeEntitySlug(productType);

  if (type === "event") {
    return ENTITY_PREMIUM_TEMPLATE_PRESETS.find((p) => p.family === "event") ?? null;
  }

  if (type === "business") {
    if (!category) return null;
    return (
      ENTITY_PREMIUM_TEMPLATE_PRESETS.find(
        (p) => p.entityType === "business" && p.categorySlugs.includes(category),
      ) ?? null
    );
  }

  if (type === "product") {
    if (!product) return null;
    return (
      ENTITY_PREMIUM_TEMPLATE_PRESETS.find(
        (p) => p.entityType === "product" && p.productTypes.includes(product),
      ) ?? null
    );
  }

  return null;
}

export interface EntityTemplateOverride {
  /** Preset premium solicitado por el override editorial. */
  readonly presetId: string;
  /** Entidad a la que pertenece el override. */
  readonly entityId: string;
  /** Estado de aprobación editorial. */
  readonly approved: boolean;
}

export interface EntityTemplateResolutionInput {
  readonly entityId: string;
  readonly entityType: string;
  readonly categorySlug?: string | null;
  readonly productType?: string | null;
  /** Override editorial individual (opcional). */
  readonly override?: EntityTemplateOverride | null;
  /**
   * G8-R1-F1L·P0 — DEPRECADO como criterio de familia.
   *
   * La elegibilidad premium (medios, portada, galería) NUNCA cambia la
   * familia ni el preset: sólo decide el MODO (Editorial vs Cinematográfica).
   * Este campo se conserva por compatibilidad y ya no degrada a estándar.
   */
  readonly premiumEligible?: boolean;
  /**
   * Contexto que exige explícitamente superficie estándar (por ejemplo una
   * vista previa interna de CMS). Único interruptor que degrada la familia.
   */
  readonly forceStandardSurface?: boolean;
}


export type EntityTemplateResolutionSource = "override" | "family" | "standard";

export interface EntityTemplateResolution {
  readonly source: EntityTemplateResolutionSource;
  readonly presetId: string | null;
  readonly family: PremiumEntityFamily | null;
  readonly reason: string;
  /** Warning emitido sólo en desarrollo (familia no reconocida). */
  readonly devWarning: string | null;
}

const STANDARD = (reason: string, devWarning: string | null = null): EntityTemplateResolution => ({
  source: "standard",
  presetId: null,
  family: null,
  reason,
  devWarning,
});

/**
 * Orden de resolución vinculante:
 *  1. Override editorial individual aprobado y compatible.
 *  2. Preset canónico de familia.
 *  3. Superficie estándar existente (fail-closed).
 */
export function resolveEntityTemplate(
  input: EntityTemplateResolutionInput,
): EntityTemplateResolution {
  const familyPreset = resolveEntityPremiumTemplate(
    input.entityType,
    input.categorySlug,
    input.productType,
  );

  // 1 · Override editorial individual.
  const override = input.override ?? null;
  if (override) {
    const candidate =
      ENTITY_PREMIUM_TEMPLATE_PRESETS.find((p) => p.id === override.presetId) ?? null;
    const compatible =
      !!candidate &&
      override.approved &&
      override.entityId === input.entityId &&
      candidate.entityType === normalizeEntitySlug(input.entityType) &&
      (!familyPreset || candidate.family === familyPreset.family);
    if (compatible && candidate) {
      return {
        source: "override",
        presetId: candidate.id,
        family: candidate.family,
        reason: "override editorial aprobado y compatible",
        devWarning: null,
      };
    }
    if (!familyPreset) {
      return STANDARD(
        "override incompatible y familia no reconocida",
        `[G8-P2] override incompatible para ${input.entityId}`,
      );
    }
  }

  // 2 · Preset canónico de familia.
  if (!familyPreset) {
    return STANDARD(
      "familia no reconocida",
      `[G8-P2] familia no reconocida para ${input.entityId} (${input.entityType}/${input.categorySlug ?? "-"}/${input.productType ?? "-"})`,
    );
  }
  // G8-R1-F1L·P0 — La falta de medios NO expulsa a la entidad de su familia.
  // Sólo un contexto que pide explícitamente superficie estándar degrada.
  if (input.forceStandardSurface === true) {
    return STANDARD("superficie estándar solicitada explícitamente por el contexto");
  }

  if (!familyPreset.autoAssign) {
    return STANDARD(`preset ${familyPreset.id} pendiente de aceptación visual Founder`);
  }
  return {
    source: "family",
    presetId: familyPreset.id,
    family: familyPreset.family,
    reason: "preset canónico de familia",
    devWarning: null,
  };
}

/* ------------------------------------------------------------------ *
 * Utilidades de registro.
 * ------------------------------------------------------------------ */

export function getEntityPremiumTemplatePreset(id: string): EntityPremiumTemplatePreset | null {
  return ENTITY_PREMIUM_TEMPLATE_PRESETS.find((p) => p.id === id) ?? null;
}

/** Presets visibles en Studio para un `page_kind` (fail-closed). */
export function listEntityPremiumTemplatePresetsForKind(
  pageKind: string,
): EntityPremiumTemplatePreset[] {
  const kind = normalizeEntitySlug(pageKind);
  if (!kind) return [];
  return ENTITY_PREMIUM_TEMPLATE_PRESETS.filter((p) => p.pageKinds.includes(kind));
}

/** JSON-LD @type canónico por familia. */
export function entityFamilyJsonLdType(family: PremiumEntityFamily): string {
  return ENTITY_PREMIUM_TEMPLATE_PRESETS.find((p) => p.family === family)?.jsonLdType ?? "Thing";
}
