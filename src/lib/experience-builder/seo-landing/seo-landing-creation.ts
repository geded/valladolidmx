/**
 * G8-R1-C+L · Paso CL3 — Creación contextual de Landings SEO (capa PURA).
 *
 * Sin red, sin base de datos, sin React y sin flags: aquí viven únicamente
 * las reglas deterministas de identidad, idempotencia y anticanibalización
 * de la familia `premium-seo-landing`.
 *
 * Invariantes:
 *  - Cero contenido inventado: los slots se llenan sólo con datos reales.
 *  - Cero publicación: el borrador nace `draft` + `noindex`.
 *  - Cero migración: el metadato editorial vive en `chrome.seo.landing`.
 */
import { SEO_LANDING_TEMPLATE_ID, SEO_LANDING_VARIANT } from "./seo-landing-template";

export const SEO_LANDING_CREATION_VERSION = "1.0.0" as const;

/** Entidades desde las que se puede crear una landing contextual. */
export type SeoLandingEntityType = "business" | "product" | "place";

export const SEO_LANDING_ENTITY_TYPES: readonly SeoLandingEntityType[] = [
  "business",
  "product",
  "place",
];

/** Roles con capacidad de crear/editar landings SEO. */
export const SEO_LANDING_EDITOR_ROLES = ["super_admin", "admin", "editor"] as const;

export function canManageSeoLandings(roles: readonly string[]): boolean {
  return roles.some((role) =>
    (SEO_LANDING_EDITOR_ROLES as readonly string[]).includes(role.trim().toLowerCase()),
  );
}

/* ------------------------------------------------------------------ *
 * Identidad determinista.
 * ------------------------------------------------------------------ */

export function buildSeoLandingEntityRef(
  entityType: SeoLandingEntityType,
  entityId: string,
): string {
  return `${entityType}:${entityId}`;
}

export function parseSeoLandingEntityRef(
  ref: string | null | undefined,
): { entityType: SeoLandingEntityType; entityId: string } | null {
  if (!ref) return null;
  const [type, id] = ref.split(":");
  if (!id || !SEO_LANDING_ENTITY_TYPES.includes(type as SeoLandingEntityType)) return null;
  return { entityType: type as SeoLandingEntityType, entityId: id };
}

export function slugifySegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Slug determinista del borrador. Estable para la misma entidad, de modo
 * que la idempotencia no depende del título ni del momento de creación.
 */
export function buildSeoLandingSlug(
  entityType: SeoLandingEntityType,
  entitySlug: string,
  entityId: string,
): string {
  const base = slugifySegment(entitySlug) || slugifySegment(entityId);
  return `landing-${entityType}-${base}`;
}

/* ------------------------------------------------------------------ *
 * SEO y anticanibalización.
 * ------------------------------------------------------------------ */

export interface SeoLandingSeoPolicy {
  /** URL canónica real de la ficha de origen (nunca inventada). */
  readonly canonicalOverride: string | null;
  readonly robotsDirective: string;
  readonly reason: string;
}

/**
 * Mientras la landing sea borrador NO compite con la ficha canónica:
 *  - `robots: noindex,nofollow` (cero indexación).
 *  - `canonical` apuntando a la ficha real cuando ésta existe.
 * Sin URL canónica conocida se mantiene `noindex` igualmente (fail-closed).
 */
export function buildSeoLandingSeoPolicy(
  canonicalEntityUrl: string | null | undefined,
): SeoLandingSeoPolicy {
  const canonical = canonicalEntityUrl?.trim() || null;
  return {
    canonicalOverride: canonical,
    robotsDirective: "noindex,nofollow",
    reason: canonical
      ? "Borrador no indexable; canonical apunta a la ficha real para evitar canibalización."
      : "Borrador no indexable; la ficha de origen aún no tiene URL pública.",
  };
}

/* ------------------------------------------------------------------ *
 * Idempotencia.
 * ------------------------------------------------------------------ */

export type SeoLandingState = "none" | "draft" | "published";

export interface ExistingSeoLandingRow {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly status: string;
  readonly published_at: string | null;
}

export interface SeoLandingResolution {
  readonly state: SeoLandingState;
  readonly composition: ExistingSeoLandingRow | null;
  /** Etiqueta del botón contextual. */
  readonly actionLabel: string;
  /** `true` si una nueva creación duplicaría la landing existente. */
  readonly wouldDuplicate: boolean;
}

export function resolveSeoLandingState(
  existing: ExistingSeoLandingRow | null | undefined,
): SeoLandingResolution {
  if (!existing) {
    return {
      state: "none",
      composition: null,
      actionLabel: "Crear Landing SEO",
      wouldDuplicate: false,
    };
  }
  const published = existing.status === "published" || Boolean(existing.published_at);
  return {
    state: published ? "published" : "draft",
    composition: existing,
    actionLabel: published ? "Administrar Landing SEO" : "Editar Landing SEO",
    wouldDuplicate: true,
  };
}

/* ------------------------------------------------------------------ *
 * Pilotos configurables (no hardcodean contenido, sólo elegibilidad).
 * ------------------------------------------------------------------ */

export interface SeoLandingPilot {
  readonly key: string;
  readonly label: string;
  readonly entityType: SeoLandingEntityType;
  /** Slug real de la entidad en el CMS. */
  readonly entitySlug: string;
  readonly enabled: boolean;
  readonly notes?: string;
}

export const SEO_LANDING_PILOTS: readonly SeoLandingPilot[] = [
  {
    key: "zazil-tunich",
    label: "Zazil Tunich",
    entityType: "business",
    entitySlug: "zazil-tunich",
    enabled: true,
    notes: "Autoridad visual acreditada de la familia.",
  },
  {
    key: "chichen-itza",
    label: "Chichén Itzá",
    entityType: "place",
    entitySlug: "chichen-itza",
    enabled: true,
    notes: "Lugar en draft; delega presentación en premium-entity-place.",
  },
  {
    key: "cenote-suytun",
    label: "Cenote Suytún",
    entityType: "place",
    entitySlug: "cenote-suytun",
    enabled: true,
  },
  {
    key: "product-generic",
    label: "Producto genérico",
    entityType: "product",
    entitySlug: "",
    enabled: true,
    notes: "Cualquier producto real sin familia especializada.",
  },
];

/* ------------------------------------------------------------------ *
 * Borradores legacy (previos a la familia canónica).
 * ------------------------------------------------------------------ */

export interface LegacySeoLandingDraft {
  readonly slug: string;
  readonly reason: string;
  /** `archive` = archivado transaccional; `keep` = conservar. */
  readonly disposition: "archive" | "keep";
}

export const LEGACY_SEO_LANDING_DRAFTS: readonly LegacySeoLandingDraft[] = [
  {
    slug: "hoteles",
    reason: "Listado ya cubierto por la vía canónica de listados (R1-B).",
    disposition: "archive",
  },
  {
    slug: "restaurantes",
    reason: "Listado ya cubierto por la vía canónica de listados (R1-B).",
    disposition: "archive",
  },
  {
    slug: "experiencias",
    reason: "Listado ya cubierto por la vía canónica de listados (R1-B).",
    disposition: "archive",
  },
  {
    slug: "oriente-maya",
    reason: "Territorio cubierto por la navegación canónica; archivado transaccional.",
    disposition: "archive",
  },
];

/** Contrato de la plantilla aplicada por la creación contextual. */
export const SEO_LANDING_CREATION_TEMPLATE = {
  templateId: SEO_LANDING_TEMPLATE_ID,
  variant: SEO_LANDING_VARIANT,
  pageKind: "landing",
  presentation: "editorial",
} as const;
