/**
 * G8-R1-F1C-A · Autoridad única de presentación (capa PURA).
 *
 * Sin red, sin base de datos, sin React, sin flags. Define el contrato de los
 * dos modos de una misma ficha (Editorial / Cinematográfica), su precedencia,
 * su comportamiento fail-closed y la diferencia real de DOM entre modos.
 *
 * Reglas vinculantes (Autorización Founder G8-R1-F1C-A):
 *  - Editorial es el modo seguro y fallback universal.
 *  - Cinematográfica exige portada gobernada aprobada (G8-M1) vigente.
 *  - Si la portada deja de ser elegible, la superficie cae a Editorial de
 *    inmediato; el modo solicitado se conserva para una futura reaprobación.
 *  - Ambos modos cambian DOM, jerarquía, orden y densidad (no sólo clases).
 *  - Slots sin información real se omiten; nunca se inventa contenido.
 */
import type { PremiumPresentation } from "./presentation";

export const ENTITY_PRESENTATION_CONTRACT_VERSION = "1.0.0" as const;

/** Entidades con autoridad de presentación productiva. */
export const PRESENTATION_ENTITY_KINDS = ["business", "product", "event", "place"] as const;
export type PresentationEntityKind = (typeof PRESENTATION_ENTITY_KINDS)[number];

/** Familias de ficha individual con selector productivo. */
export const PRESENTATION_FAMILIES = [
  "hotel",
  "restaurant",
  "vacation_rental",
  "business_generic",
  "event",
  "experience",
  "tour",
  "product_generic",
  "place",
] as const;
export type PresentationFamily = (typeof PRESENTATION_FAMILIES)[number];

/** Superficies con composición canónica propia: nunca exponen selector. */
export const PRESENTATION_SELECTOR_EXCLUDED_SURFACES = [
  "home_premium",
  "destination_premium",
  "listing_premium",
  "seo_landing",
] as const;
export type PresentationExcludedSurface = (typeof PRESENTATION_SELECTOR_EXCLUDED_SURFACES)[number];

export function surfaceHasPresentationSelector(surface: string): boolean {
  return !PRESENTATION_SELECTOR_EXCLUDED_SURFACES.includes(surface as PresentationExcludedSurface);
}

/** Landing SEO: Editorial fail-closed (authority-editorial-zazil). */
export function surfaceForcedPresentation(surface: string): PremiumPresentation | null {
  if (surface === "seo_landing") return "editorial";
  return null;
}

export const PRESENTATION_REVIEW_STATES = [
  "not_requested",
  "pending",
  "approved",
  "rejected",
] as const;
export type PresentationReviewState = (typeof PRESENTATION_REVIEW_STATES)[number];

/** Requisitos G8-M1 de la portada que sustenta Cinematográfica. */
export interface GovernedCoverFacts {
  readonly belongsToEntity: boolean;
  readonly reviewState: string;
  readonly pipelineReady: boolean;
  readonly hasDeclaredRights: boolean;
  readonly hasCredit: boolean;
  readonly hasHumanAlt: boolean;
  readonly hasChecksum: boolean;
  readonly isSignedTemporaryUrl: boolean;
  readonly width: number;
  readonly height: number;
  readonly isDemoSeed: boolean;
}

export const COVER_MIN_WIDTH = 1600;
export const COVER_MIN_HEIGHT = 900;
export const COVER_MIN_ASPECT = 1.2;

export interface CoverEligibility {
  readonly eligible: boolean;
  readonly failures: readonly string[];
}

/** Evaluación determinista y fail-closed de la portada. */
export function evaluateGovernedCover(cover: GovernedCoverFacts | null): CoverEligibility {
  if (!cover) return { eligible: false, failures: ["cover_missing"] };
  const failures: string[] = [];
  if (!cover.belongsToEntity) failures.push("cover_not_owned");
  if (cover.reviewState !== "approved") failures.push("cover_not_approved");
  if (!cover.pipelineReady) failures.push("pipeline_not_ready");
  if (!cover.hasDeclaredRights) failures.push("rights_not_declared");
  if (!cover.hasCredit) failures.push("credit_missing");
  if (!cover.hasHumanAlt) failures.push("human_alt_missing");
  if (!cover.hasChecksum) failures.push("checksum_missing");
  if (cover.isSignedTemporaryUrl) failures.push("signed_temporary_url");
  if (cover.isDemoSeed) failures.push("demo_media");
  if (cover.width < COVER_MIN_WIDTH || cover.height < COVER_MIN_HEIGHT)
    failures.push("resolution_below_minimum");
  if (cover.height > 0 && cover.width / cover.height < COVER_MIN_ASPECT)
    failures.push("aspect_below_minimum");
  return { eligible: failures.length === 0, failures };
}

export interface PresentationAuthorityState {
  readonly requestedMode: PremiumPresentation;
  readonly approvedMode: PremiumPresentation;
  readonly reviewState: PresentationReviewState;
  readonly coverEligible: boolean;
}

export interface EffectivePresentation {
  readonly mode: PremiumPresentation;
  /** Modo que el operador desea recuperar cuando la portada vuelva a ser elegible. */
  readonly retainedRequest: PremiumPresentation;
  readonly fallbackApplied: boolean;
  readonly reason: string | null;
}

/**
 * Precedencia única: modo aprobado → verificación de portada en tiempo real →
 * Editorial fail-closed. La solicitud pendiente jamás renderiza Cinematográfica.
 */
export function resolveEffectivePresentation(
  state: PresentationAuthorityState,
): EffectivePresentation {
  if (state.approvedMode === "cinematic" && state.reviewState === "approved") {
    if (state.coverEligible) {
      return {
        mode: "cinematic",
        retainedRequest: state.requestedMode,
        fallbackApplied: false,
        reason: null,
      };
    }
    return {
      mode: "editorial",
      retainedRequest: "cinematic",
      fallbackApplied: true,
      reason: "cover_not_eligible",
    };
  }
  return {
    mode: "editorial",
    retainedRequest: state.requestedMode,
    fallbackApplied: state.requestedMode === "cinematic",
    reason: state.reviewState === "pending" ? "pending_review" : null,
  };
}

/**
 * Precedencia entre la autoridad nueva y el contrato histórico de Lugares.
 * `entity_presentation_modes` gana siempre; `metadata.presentation_mode` sólo
 * se lee cuando no existe fila, y jamás se reinterpreta ni se publica.
 */
export function resolvePresentationSource(
  hasAuthorityRow: boolean,
  legacyPlaceMode: string | null | undefined,
): "entity_presentation_modes" | "legacy_place_metadata" | "default" {
  if (hasAuthorityRow) return "entity_presentation_modes";
  if (legacyPlaceMode === "editorial" || legacyPlaceMode === "cinematic")
    return "legacy_place_metadata";
  return "default";
}

/* ---------------------------------------------------------------------- */
/* Diferencia real de DOM entre modos                                      */
/* ---------------------------------------------------------------------- */

export const PRESENTATION_SLOTS = [
  "cover",
  "identity",
  "essentials",
  "narrative",
  "gallery",
  "map",
  "practical",
  "related",
  "actions",
] as const;
export type PresentationSlot = (typeof PRESENTATION_SLOTS)[number];

export interface PresentationLayout {
  /** Orden real de nodos del DOM (no sólo estilos). */
  readonly order: readonly PresentationSlot[];
  /** Nivel jerárquico del título principal dentro de la ficha. */
  readonly headingLevel: 1;
  /** Densidad de la retícula: editorial es lectura, cinematográfica es inmersión. */
  readonly density: "comfortable" | "immersive";
  /** La portada ocupa viewport completo sólo en cinematográfica. */
  readonly coverIsViewportHeight: boolean;
  /** Identidad y datos prácticos sobre la portada (cinematográfica). */
  readonly identityOverlaysCover: boolean;
}

const EDITORIAL_LAYOUT: PresentationLayout = {
  order: [
    "identity",
    "essentials",
    "cover",
    "narrative",
    "practical",
    "gallery",
    "map",
    "related",
    "actions",
  ],
  headingLevel: 1,
  density: "comfortable",
  coverIsViewportHeight: false,
  identityOverlaysCover: false,
};

const CINEMATIC_LAYOUT: PresentationLayout = {
  order: [
    "cover",
    "identity",
    "narrative",
    "gallery",
    "essentials",
    "map",
    "practical",
    "related",
    "actions",
  ],
  headingLevel: 1,
  density: "immersive",
  coverIsViewportHeight: true,
  identityOverlaysCover: true,
};

export function presentationLayout(mode: PremiumPresentation): PresentationLayout {
  return mode === "cinematic" ? CINEMATIC_LAYOUT : EDITORIAL_LAYOUT;
}

/** Los dos modos deben producir DOM distinto: contrato verificable. */
export function layoutsDifferMaterially(): boolean {
  const a = presentationLayout("editorial");
  const b = presentationLayout("cinematic");
  return (
    a.order.join(">") !== b.order.join(">") &&
    a.density !== b.density &&
    a.coverIsViewportHeight !== b.coverIsViewportHeight
  );
}

/**
 * Omite slots sin información real y evita huecos.
 * `available` declara qué slots tienen contenido acreditado del CMS.
 */
export function renderableSlots(
  mode: PremiumPresentation,
  available: Partial<Record<PresentationSlot, boolean>>,
): readonly PresentationSlot[] {
  return presentationLayout(mode).order.filter((slot) => available[slot] === true);
}

/** Copy oficial del control, sin nombres técnicos de presets ni contratos. */
export const PRESENTATION_CONTROL_COPY = {
  legend: "Presentación",
  editorial: {
    label: "Editorial",
    help: "Lectura clara y contenido práctico.",
  },
  cinematic: {
    label: "Cinematográfica",
    help: "Portada inmersiva; requiere fotografía aprobada.",
  },
  pending: "Solicitud enviada. Un revisor de la plataforma la aprobará o la devolverá.",
  rejected: "La solicitud fue devuelta a Editorial.",
  blocked: "Cinematográfica está bloqueada hasta contar con una portada aprobada.",
  fallback:
    "El modo cinematográfico requiere una portada aprobada; se muestra Editorial temporalmente.",
} as const;

/** Facultades por rol (Portal Empresa vs Administración). */
export interface PresentationCapabilities {
  readonly canChooseEditorial: boolean;
  readonly canRequestCinematic: boolean;
  readonly canApprove: boolean;
  readonly canChangeFamily: false;
  readonly canPublish: false;
}

export type PresentationActorRole =
  | "anon"
  | "traveler"
  | "owner"
  | "manager"
  | "business_editor"
  | "editor"
  | "admin"
  | "super_admin";

const BUSINESS_ROLES: readonly PresentationActorRole[] = ["owner", "manager", "business_editor"];
const STAFF_ROLES: readonly PresentationActorRole[] = ["editor", "admin", "super_admin"];

export function presentationCapabilities(
  role: PresentationActorRole,
  ownsEntity: boolean,
): PresentationCapabilities {
  const staff = STAFF_ROLES.includes(role);
  const team = BUSINESS_ROLES.includes(role) && ownsEntity;
  return {
    canChooseEditorial: staff || team,
    canRequestCinematic: staff || team,
    canApprove: staff,
    canChangeFamily: false,
    canPublish: false,
  };
}
