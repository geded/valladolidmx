/**
 * Catálogo Central de Planes (US-R3 · Sub-ola 2.2)
 *
 * DIRECTIVA DE ARQUITECTURA (Founder, 15.10.4d):
 * Los planes comerciales NO deben codificarse dentro del Experience
 * Builder ni de las plantillas oficiales. Este catálogo es la única
 * fuente de verdad de las capacidades y límites por plan; la plantilla
 * Business (y cualquier futura plantilla) consulta este módulo para
 * habilitar o bloquear bloques, sin conocer la lógica comercial.
 *
 * Reglas:
 *  - Modificar planes NO debe requerir cambios en plantillas.
 *  - Añadir capacidades futuras = añadir una `PlanCapability` aquí y
 *    consultarla desde el bloque; nunca constantes dispersas.
 *  - Los límites (fotos, promociones, videos, FAQs, formularios,
 *    campañas, micrositios) viven aquí y sólo aquí.
 *
 * En esta sub-ola el plan de una empresa se lee de
 * `businesses.metadata.plan` con default `"free"`. Cuando exista una
 * tabla comercial (`business_subscriptions` o similar), sólo cambia
 * `resolveBusinessPlanTier`; el catálogo y su API no cambian.
 */

export type PlanTier = "free" | "starter" | "pro" | "premium";

/**
 * Capacidades declarables por plan. Añadir una capacidad futura sólo
 * requiere extender esta unión y publicar el valor en cada plan.
 */
export type PlanCapability =
  | "gallery"
  | "promotions"
  | "videos"
  | "faqs"
  | "forms"
  | "custom_cta"
  | "campaigns"
  | "microsite"
  | "menu"           // Restaurantes / cafés
  | "rooms"          // Hoteles / hospedaje
  | "tours"          // Agencias / operadores
  | "inventory";     // Tiendas

export interface PlanLimits {
  /** Fotografías de portada / galería. `Infinity` = sin tope. */
  readonly photos: number;
  readonly videos: number;
  readonly promotions: number;
  readonly faqs: number;
  readonly forms: number;
  readonly menuItems: number;
  readonly rooms: number;
  readonly tours: number;
  readonly campaigns: number;
}

export interface PlanDefinition {
  readonly tier: PlanTier;
  readonly label: string;
  readonly capabilities: ReadonlySet<PlanCapability>;
  readonly limits: PlanLimits;
}

/* ------------------------------------------------------------------ *
 * Catálogo oficial. Editar aquí = editar la oferta comercial.
 * ------------------------------------------------------------------ */

const FREE: PlanDefinition = {
  tier: "free",
  label: "Gratis",
  capabilities: new Set<PlanCapability>(["gallery"]),
  limits: {
    photos: 3, videos: 0, promotions: 0, faqs: 3, forms: 0,
    menuItems: 0, rooms: 0, tours: 0, campaigns: 0,
  },
};

const STARTER: PlanDefinition = {
  tier: "starter",
  label: "Starter",
  capabilities: new Set<PlanCapability>([
    "gallery", "promotions", "faqs", "menu", "rooms", "tours", "inventory",
  ]),
  limits: {
    photos: 10, videos: 1, promotions: 2, faqs: 10, forms: 1,
    menuItems: 20, rooms: 5, tours: 5, campaigns: 0,
  },
};

const PRO: PlanDefinition = {
  tier: "pro",
  label: "Pro",
  capabilities: new Set<PlanCapability>([
    "gallery", "promotions", "videos", "faqs", "forms", "custom_cta",
    "menu", "rooms", "tours", "inventory",
  ]),
  limits: {
    photos: 30, videos: 5, promotions: 10, faqs: 30, forms: 3,
    menuItems: 100, rooms: 30, tours: 30, campaigns: 2,
  },
};

const PREMIUM: PlanDefinition = {
  tier: "premium",
  label: "Premium",
  capabilities: new Set<PlanCapability>([
    "gallery", "promotions", "videos", "faqs", "forms", "custom_cta",
    "campaigns", "microsite", "menu", "rooms", "tours", "inventory",
  ]),
  limits: {
    photos: Number.POSITIVE_INFINITY, videos: Number.POSITIVE_INFINITY,
    promotions: Number.POSITIVE_INFINITY, faqs: Number.POSITIVE_INFINITY,
    forms: Number.POSITIVE_INFINITY, menuItems: Number.POSITIVE_INFINITY,
    rooms: Number.POSITIVE_INFINITY, tours: Number.POSITIVE_INFINITY,
    campaigns: Number.POSITIVE_INFINITY,
  },
};

export const PLANS_CATALOG: Readonly<Record<PlanTier, PlanDefinition>> = {
  free: FREE, starter: STARTER, pro: PRO, premium: PREMIUM,
};

/** Devuelve la definición del plan; fallback a `free` si es desconocido. */
export function getPlanDefinition(tier: PlanTier | string | null | undefined): PlanDefinition {
  const t = (tier ?? "free") as PlanTier;
  return PLANS_CATALOG[t] ?? FREE;
}

/** ¿El plan habilita esta capacidad? */
export function planAllows(tier: PlanTier | string | null | undefined, cap: PlanCapability): boolean {
  return getPlanDefinition(tier).capabilities.has(cap);
}

/** Límite numérico por capacidad. Devuelve `0` si la capacidad no aplica. */
export function planLimit(tier: PlanTier | string | null | undefined, key: keyof PlanLimits): number {
  return getPlanDefinition(tier).limits[key];
}

/**
 * Resuelve el plan comercial de un negocio a partir de su metadata.
 * Placeholder mientras no exista la tabla `business_subscriptions`;
 * cuando exista, sólo cambia esta función y el resto del sistema no
 * necesita moverse (arquitectura desacoplada).
 */
export function resolveBusinessPlanTier(
  metadata: Record<string, unknown> | null | undefined,
): PlanTier {
  const raw = metadata && typeof metadata === "object"
    ? (metadata as Record<string, unknown>).plan
    : null;
  const tier = typeof raw === "string" ? (raw as PlanTier) : "free";
  return (["free","starter","pro","premium"] as const).includes(tier) ? tier : "free";
}
