/**
 * G8-R1-C · Paso C2 — Conexión de las rutas reales de ficha al resolutor
 * canónico (`canonical-entity-resolver`).
 *
 * Capa PURA (sin red, sin base de datos, sin React, sin flags) que traduce
 * los datos reales ya cargados por cada ruta pública en una decisión única
 * de presentación:
 *
 *   1. Override editorial explícito y aprobado.
 *   2. Preset premium de la familia.
 *   3. Superficie estándar fail-closed.
 *
 * Invariantes vinculantes de C2:
 *  - Cero contenido inventado: las secciones sin datos reales se omiten
 *    (`keepSectionsWithRealData`), nunca se sustituyen por fixtures.
 *  - `place` delega íntegramente en `premium-entity-place` (seis variantes
 *    aprobadas); este módulo NO redefine su diseño ni sus medios.
 *  - `vacation_rental` usa su preset aprobado y conserva semántica propia.
 *  - Cero publicación, cero migraciones, cero rutas nuevas.
 */
import {
  resolveCanonicalEntityTemplate,
  type CanonicalEntityFamily,
  type CanonicalEntityResolution,
} from "./canonical-entity-resolver";
import { resolveCanonicalPath } from "@/lib/navigation/canonical-paths";
import type { EntityTemplateOverride } from "./entity-premium-templates";

export const CANONICAL_ENTITY_BINDING_VERSION = "1.0.0" as const;

export type CanonicalSurfaceMode = "premium" | "standard";

export interface CanonicalEntityBinding {
  /** Patrón real del router (nunca inventado). */
  readonly routePattern: string;
  readonly entityType: "business" | "product" | "event" | "place";
  readonly entityId: string;
  readonly resolution: CanonicalEntityResolution;
  readonly family: CanonicalEntityFamily | null;
  readonly presetId: string | null;
  readonly variant: string | null;
  /** `premium` sólo cuando el resolutor acredita override o preset. */
  readonly surface: CanonicalSurfaceMode;
  readonly reason: string;
}

const ROUTE_BUSINESS = "/oriente-maya/{destino}/{categoria}/{empresa}";
const ROUTE_PRODUCT = "/producto/{slug}";
const ROUTE_EVENT = "/eventos/{slug}";
const ROUTE_PLACE = "/oriente-maya/{destino}/lugares/{lugar}";

/** Matriz declarativa ruta real → entidad → familia → preset → superficie. */
export const CANONICAL_ROUTE_BINDING_MATRIX = [
  {
    routePattern: ROUTE_BUSINESS,
    entityType: "business",
    families: ["hotel", "restaurant", "vacation_rental"],
    surfaceComponent: "BusinessSurface",
    notes: "vacation_rental usa el preset premium aprobado de propiedad completa.",
  },
  {
    routePattern: ROUTE_PRODUCT,
    entityType: "product",
    families: ["experience", "tour", "product_generic"],
    surfaceComponent: "ProductSurface",
    notes: "product_generic resuelve siempre a superficie estándar.",
  },
  {
    routePattern: ROUTE_EVENT,
    entityType: "event",
    families: ["event"],
    surfaceComponent: "EventSurface",
    notes: "Preset premium-entity-event acreditado.",
  },
  {
    routePattern: ROUTE_PLACE,
    entityType: "place",
    families: ["place"],
    surfaceComponent: "PlacePremiumSurface",
    notes: "Delegación íntegra en premium-entity-place (seis variantes).",
  },
] as const;

function toBinding(
  routePattern: string,
  entityType: CanonicalEntityBinding["entityType"],
  entityId: string,
  resolution: CanonicalEntityResolution,
): CanonicalEntityBinding {
  return {
    routePattern,
    entityType,
    entityId,
    resolution,
    family: resolution.canonicalFamily,
    presetId: resolution.presetId,
    variant: resolution.variant,
    surface: resolution.source === "standard" ? "standard" : "premium",
    reason: resolution.reason,
  };
}

export interface BusinessBindingInput {
  readonly businessId: string;
  readonly categorySlug: string | null | undefined;
  readonly override?: EntityTemplateOverride | null;
  /** Elegibilidad premium efectiva ya evaluada por la ruta. */
  readonly premiumEligible?: boolean;
  /** G8-R1-F1L·P0 — Único interruptor que degrada a superficie estándar. */
  readonly forceStandardSurface?: boolean;
}

/** `/oriente-maya/{destino}/{categoria}/{empresa}` → hotel · restaurante · casa de vacaciones. */
export function bindBusinessRoute(input: BusinessBindingInput): CanonicalEntityBinding {
  return toBinding(
    ROUTE_BUSINESS,
    "business",
    input.businessId,
    resolveCanonicalEntityTemplate({
      entityId: input.businessId,
      entityType: "business",
      categorySlug: input.categorySlug ?? null,
      override: input.override ?? null,
      premiumEligible: input.premiumEligible,
      forceStandardSurface: input.forceStandardSurface,
    }),
  );
}

export interface ProductBindingInput {
  readonly productId: string;
  readonly productType: string | null | undefined;
  readonly override?: EntityTemplateOverride | null;
  readonly premiumEligible?: boolean;
  /** G8-R1-F1L·P0 — Único interruptor que degrada a superficie estándar. */
  readonly forceStandardSurface?: boolean;
}

/** `/producto/{slug}` → experiencia · tour · producto genérico. */
export function bindProductRoute(input: ProductBindingInput): CanonicalEntityBinding {
  return toBinding(
    ROUTE_PRODUCT,
    "product",
    input.productId,
    resolveCanonicalEntityTemplate({
      entityId: input.productId,
      entityType: "product",
      productType: input.productType ?? null,
      override: input.override ?? null,
      premiumEligible: input.premiumEligible,
      forceStandardSurface: input.forceStandardSurface,
    }),
  );
}

export interface EventBindingInput {
  readonly eventId: string;
  readonly override?: EntityTemplateOverride | null;
  readonly premiumEligible?: boolean;
  /** G8-R1-F1L·P0 — Único interruptor que degrada a superficie estándar. */
  readonly forceStandardSurface?: boolean;
}

/** `/eventos/{slug}` → evento. */
export function bindEventRoute(input: EventBindingInput): CanonicalEntityBinding {
  return toBinding(
    ROUTE_EVENT,
    "event",
    input.eventId,
    resolveCanonicalEntityTemplate({
      entityId: input.eventId,
      entityType: "event",
      override: input.override ?? null,
      premiumEligible: input.premiumEligible,
      forceStandardSurface: input.forceStandardSurface,
    }),
  );
}

export interface PlaceBindingInput {
  readonly placeId: string;
  readonly placeType: string | null | undefined;
  readonly premiumEligible?: boolean;
  /** G8-R1-F1L·P0 — Único interruptor que degrada a superficie estándar. */
  readonly forceStandardSurface?: boolean;
}

/**
 * `/oriente-maya/{destino}/lugares/{lugar}` → lugar y atractivo.
 * Delegación íntegra en `premium-entity-place`: el diseño, las variantes
 * y las reglas de medios pertenecen a esa familia ya aprobada.
 */
export function bindPlaceRoute(input: PlaceBindingInput): CanonicalEntityBinding {
  return toBinding(
    ROUTE_PLACE,
    "place",
    input.placeId,
    resolveCanonicalEntityTemplate({
      entityId: input.placeId,
      entityType: "place",
      placeType: input.placeType ?? null,
      premiumEligible: input.premiumEligible,
      forceStandardSurface: input.forceStandardSurface,
    }),
  );
}

/* ------------------------------------------------------------------ *
 * Cero contenido inventado — omisión de secciones sin datos reales.
 * ------------------------------------------------------------------ */

/** `true` sólo cuando el valor proviene del CMS y tiene contenido real. */
export function hasRealValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.some(hasRealValue);
  if (typeof value === "object") return Object.values(value as object).some(hasRealValue);
  return false;
}

export interface CanonicalSection<T = unknown> {
  readonly id: string;
  readonly data: T;
}

/**
 * Devuelve únicamente las secciones con datos reales. Las vacías se
 * omiten (no se renderiza hueco ni contenido demostrativo).
 */
export function keepSectionsWithRealData<T>(
  sections: readonly CanonicalSection<T>[],
): CanonicalSection<T>[] {
  return sections.filter((section) => hasRealValue(section.data));
}

/** Identificadores de las secciones omitidas por falta de datos reales. */
export function omittedSectionIds<T>(sections: readonly CanonicalSection<T>[]): string[] {
  return sections.filter((section) => !hasRealValue(section.data)).map((section) => section.id);
}

/* ------------------------------------------------------------------ *
 * G8-R1-D-R1 · DEF-R1D-003 — Fuente ÚNICA de URL canónica de ficha.
 *
 * Prohibida toda plantilla literal fuera de este módulo: cualquier
 * consumidor (Alux, Discovery, CMS) debe pedir la URL aquí. Las rutas
 * territoriales delegan en `resolveCanonicalPath` (Navigation Blueprint);
 * `place` y `event` se componen desde los patrones ROUTE_* que este
 * módulo ya declara como autoridad.
 *
 * Fail-closed: si falta cualquier ancestro obligatorio ⇒ `null`. Nunca
 * se devuelve una URL parcial ni un placeholder.
 * ------------------------------------------------------------------ */

export type CanonicalUrlInput =
  | {
      readonly entityType: "business";
      readonly slug: string | null | undefined;
      readonly destinationSlug: string | null | undefined;
      readonly categorySlug: string | null | undefined;
    }
  | {
      readonly entityType: "product";
      readonly slug: string | null | undefined;
      readonly destinationSlug: string | null | undefined;
      readonly categorySlug: string | null | undefined;
      readonly businessSlug: string | null | undefined;
    }
  | {
      readonly entityType: "event";
      readonly slug: string | null | undefined;
    }
  | {
      readonly entityType: "place";
      readonly slug: string | null | undefined;
      readonly destinationSlug: string | null | undefined;
    }
  | {
      readonly entityType: "destination";
      readonly slug: string | null | undefined;
    };

function nonEmpty(value: string | null | undefined): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return v.length > 0 ? v : null;
}

/** URL canónica pública de una ficha, o `null` si no es resoluble. */
export function buildCanonicalEntityUrl(input: CanonicalUrlInput): string | null {
  const slug = nonEmpty(input.slug);
  if (!slug) return null;

  switch (input.entityType) {
    case "destination":
      return resolveCanonicalPath({ kind: "destination", slug });
    case "business": {
      const destination = nonEmpty(input.destinationSlug);
      const category = nonEmpty(input.categorySlug);
      if (!destination || !category) return null;
      return resolveCanonicalPath({ kind: "business", slug, destination, category });
    }
    case "product": {
      const destination = nonEmpty(input.destinationSlug);
      const category = nonEmpty(input.categorySlug);
      const business = nonEmpty(input.businessSlug);
      if (!destination || !category || !business) return null;
      return resolveCanonicalPath({ kind: "product", slug, destination, category, business });
    }
    case "event":
      return ROUTE_EVENT.replace("{slug}", encodeURIComponent(slug));
    case "place": {
      const destination = nonEmpty(input.destinationSlug);
      if (!destination) return null;
      return ROUTE_PLACE.replace("{destino}", encodeURIComponent(destination)).replace(
        "{lugar}",
        encodeURIComponent(slug),
      );
    }
  }
}
