/**
 * G8-R1-C · Paso C1 — Resolutor canónico de fichas premium (8 familias).
 *
 * Capa PURA (sin red, sin base de datos, sin React, sin flags) que unifica
 * en un único punto de decisión las ocho familias de ficha individual:
 *
 *   1. hotel                 (business)
 *   2. restaurant            (business)
 *   3. vacation_rental       (business, autoAssign=false)
 *   4. event                 (event)
 *   5. experience            (product)
 *   6. tour                  (product)
 *   7. place                 (place · premium-entity-place, G8-Q2D-A/B)
 *   8. product_generic       (product sin familia especializada)
 *
 * Reglas vinculantes:
 *  - Orden de resolución: override editorial aprobado → preset de familia →
 *    superficie estándar (fail-closed). Nunca se inventa una familia.
 *  - `place` se delega íntegramente al contrato ya aprobado
 *    `premium-entity-place`; este módulo NO redefine sus variantes.
 *  - `product_generic` es la familia de última instancia para productos
 *    reales que no son experiencia ni tour: resuelve a superficie estándar
 *    salvo que exista override aprobado, para no degradar fichas.
 *  - Cero publicación, cero rutas nuevas, cero mutación de datos.
 */
import {
  ENTITY_PREMIUM_TEMPLATE_PRESETS,
  resolveEntityTemplate,
  type EntityTemplateOverride,
  type EntityTemplateResolution,
  type PremiumEntityFamily,
} from "./entity-premium-templates";
import {
  PLACE_PREMIUM_TEMPLATE_ID,
  PLACE_PREMIUM_VARIANTS,
} from "@/components/place-premium/place-premium-config";

export const CANONICAL_ENTITY_RESOLVER_VERSION = "1.0.0" as const;

/** Familias canónicas del resolutor (superset cerrado de G8-R1-C). */
export type CanonicalEntityFamily = PremiumEntityFamily | "place" | "product_generic";

export const CANONICAL_ENTITY_FAMILIES: readonly CanonicalEntityFamily[] = [
  "hotel",
  "restaurant",
  "vacation_rental",
  "event",
  "experience",
  "tour",
  "place",
  "product_generic",
] as const;

export interface CanonicalEntityResolutionInput {
  readonly entityId: string;
  /** `business` | `product` | `event` | `place`. */
  readonly entityType: string;
  readonly categorySlug?: string | null;
  readonly productType?: string | null;
  /** Slug de `place_types` cuando `entityType === "place"`. */
  readonly placeType?: string | null;
  readonly override?: EntityTemplateOverride | null;
  /**
   * G8-R1-F1L·P0 — Sólo informativo. La elegibilidad por medios jamás cambia
   * la familia; decide únicamente el modo (Editorial / Cinematográfica).
   */
  readonly premiumEligible?: boolean;
  /** Único interruptor que degrada a superficie estándar (contexto interno). */
  readonly forceStandardSurface?: boolean;
}


export interface CanonicalEntityResolution extends EntityTemplateResolution {
  readonly canonicalFamily: CanonicalEntityFamily | null;
  /** Variante cerrada dentro de la familia (sólo `place` hoy). */
  readonly variant: string | null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/_/g, "-");
}

const PLACE_ENTITY_TYPES = new Set(["place", "lugar", "point-of-interest", "poi"]);

/** `true` si el tipo de entidad pertenece a la familia Lugar y Atractivo. */
export function isPlaceEntityType(entityType: string): boolean {
  return PLACE_ENTITY_TYPES.has(normalize(entityType));
}

function resolvePlace(input: CanonicalEntityResolutionInput): CanonicalEntityResolution {
  const slug = normalize(input.placeType ?? input.categorySlug);
  const variant = PLACE_PREMIUM_VARIANTS.find((v) => v.slug === slug) ?? null;

  // G8-R1-F1L·P0 — La ausencia de medios nunca expulsa a un lugar de su familia.
  if (input.forceStandardSurface === true) {
    return {
      source: "standard",
      presetId: null,
      family: null,
      canonicalFamily: "place",
      variant: variant?.slug ?? null,
      reason: "superficie estándar solicitada explícitamente por el contexto",
      devWarning: null,
    };
  }


  if (!variant) {
    return {
      source: "standard",
      presetId: null,
      family: null,
      canonicalFamily: null,
      variant: null,
      reason: "variante de lugar no reconocida (fail-closed)",
      devWarning: `[G8-R1-C] place type no reconocido para ${input.entityId}: "${slug || "-"}"`,
    };
  }

  return {
    source: "family",
    presetId: PLACE_PREMIUM_TEMPLATE_ID,
    family: null,
    canonicalFamily: "place",
    variant: variant.slug,
    reason: "preset canónico de familia (premium-entity-place)",
    devWarning: null,
  };
}

/**
 * Punto único de decisión de plantilla premium para las ocho familias.
 * Fail-closed: ante cualquier ambigüedad devuelve superficie estándar.
 */
export function resolveCanonicalEntityTemplate(
  input: CanonicalEntityResolutionInput,
): CanonicalEntityResolution {
  if (!input.entityId.trim() || !input.entityType.trim()) {
    return {
      source: "standard",
      presetId: null,
      family: null,
      canonicalFamily: null,
      variant: null,
      reason: "entrada incompleta (fail-closed)",
      devWarning: null,
    };
  }

  if (isPlaceEntityType(input.entityType)) return resolvePlace(input);

  const base = resolveEntityTemplate({
    entityId: input.entityId,
    entityType: input.entityType,
    categorySlug: input.categorySlug ?? null,
    productType: input.productType ?? null,
    override: input.override ?? null,
    premiumEligible: input.premiumEligible,
    forceStandardSurface: input.forceStandardSurface,
  });

  if (base.family) {
    return { ...base, canonicalFamily: base.family, variant: null };
  }

  // Producto real sin familia especializada → familia genérica declarada,
  // superficie estándar (nunca se fuerza una plantilla de otra familia).
  if (normalize(input.entityType) === "product") {
    return {
      ...base,
      canonicalFamily: "product_generic",
      variant: null,
      reason: base.reason === "familia no reconocida" ? "producto genérico" : base.reason,
    };
  }

  return { ...base, canonicalFamily: null, variant: null };
}

/** Preset premium acreditado por familia canónica (null si no aplica). */
export function canonicalFamilyPresetId(family: CanonicalEntityFamily): string | null {
  if (family === "place") return PLACE_PREMIUM_TEMPLATE_ID;
  if (family === "product_generic") return null;
  return ENTITY_PREMIUM_TEMPLATE_PRESETS.find((p) => p.family === family)?.id ?? null;
}
