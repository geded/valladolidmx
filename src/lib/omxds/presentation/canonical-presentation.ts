/**
 * G8-R1-F1L · P0 — REGLA VINCULANTE ÚNICA: familia ≠ medios.
 *
 * Capa PURA (sin red, sin base de datos, sin React, sin flags). Es el único
 * punto de decisión que combina clasificación y medios:
 *
 *   1. El TIPO/CATEGORÍA determina FAMILIA y PRESET.
 *   2. La ausencia de medios NUNCA cambia la familia ni el preset.
 *   3. Editorial es el modo base de toda familia premium.
 *   4. Cinematográfica exige portada gobernada G8-M1 aprobada y vigente.
 *   5. Sin portada ⇒ misma plantilla premium en Editorial con marcador neutral.
 *   6. Variante desconocida ⇒ fallback dentro de la familia cuando exista;
 *      superficie estándar únicamente si no hay modelo productivo real.
 *
 * Aplica a: destino, hotel, restaurante, evento, experiencia, tour y lugar.
 */
import {
  resolveCanonicalEntityTemplate,
  canonicalFamilyPresetId,
  type CanonicalEntityFamily,
  type CanonicalEntityResolutionInput,
} from "@/lib/experience-builder/canonical-entity-resolver";
import {
  evaluateGovernedCover,
  resolveEffectivePresentation,
  type GovernedCoverFacts,
  type PresentationReviewState,
} from "./entity-presentation";
import type { PremiumPresentation } from "./presentation";

export const CANONICAL_PRESENTATION_CONTRACT_VERSION = "1.0.0" as const;

/** Preset canónico de la familia Destino (autoridad visual G4). */
export const DESTINATION_PREMIUM_PRESET_ID = "vmx.destination.premium-g4" as const;

/** Familias con modelo productivo real (superset destino + fichas). */
export type CanonicalPresentationFamily = CanonicalEntityFamily | "destination";

export type CanonicalPresentationSurface = "premium" | "standard";

export interface CanonicalPresentationInput {
  readonly entityId: string;
  /** `destination` | `business` | `product` | `event` | `place`. */
  readonly entityType: string;
  readonly categorySlug?: string | null;
  readonly productType?: string | null;
  readonly placeType?: string | null;
  readonly override?: CanonicalEntityResolutionInput["override"];
  /** Portada gobernada declarada por el CMS (o `null` si no existe). */
  readonly cover?: GovernedCoverFacts | null;
  /** Modo aprobado por la autoridad `entity_presentation_modes`. */
  readonly approvedMode?: PremiumPresentation;
  readonly requestedMode?: PremiumPresentation;
  readonly reviewState?: PresentationReviewState;
  /**
   * Contexto interno que exige superficie estándar (vista previa de CMS).
   * NUNCA se deriva de medios.
   */
  readonly forceStandardSurface?: boolean;
}

export interface CanonicalPresentationDecision {
  readonly family: CanonicalPresentationFamily | null;
  readonly presetId: string | null;
  readonly variant: string | null;
  readonly surface: CanonicalPresentationSurface;
  /** Modo efectivo renderizable. Editorial es el modo base. */
  readonly presentationMode: PremiumPresentation;
  /** `true` cuando no hay portada acreditada: marcador neutral piedra/caliza. */
  readonly usesNeutralMarker: boolean;
  /** Motivo exacto del fallback (`null` cuando no hubo degradación). */
  readonly fallbackReason: string | null;
  /** Motivos por los que la portada no acredita Cinematográfica. */
  readonly coverFailures: readonly string[];
  readonly reason: string;
  readonly devWarning: string | null;
  /** Verificación explícita de la regla P0: los medios no alteran la familia. */
  readonly familyDeterminedBy: "classification";
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/_/g, "-");
}

function decide(
  family: CanonicalPresentationFamily | null,
  presetId: string | null,
  variant: string | null,
  input: CanonicalPresentationInput,
  reason: string,
  devWarning: string | null,
): CanonicalPresentationDecision {
  const surface: CanonicalPresentationSurface =
    !input.forceStandardSurface && family !== null && presetId !== null ? "premium" : "standard";

  const cover = evaluateGovernedCover(input.cover ?? null);
  const effective = resolveEffectivePresentation({
    requestedMode: input.requestedMode ?? input.approvedMode ?? "editorial",
    approvedMode: input.approvedMode ?? "editorial",
    reviewState: input.reviewState ?? "not_requested",
    coverEligible: cover.eligible,
  });

  return {
    family,
    presetId: surface === "premium" ? presetId : null,
    variant,
    surface,
    presentationMode: effective.mode,
    usesNeutralMarker: !cover.eligible,
    fallbackReason: effective.fallbackApplied
      ? (effective.reason ?? "cover_not_eligible")
      : cover.eligible
        ? null
        : "cover_not_eligible",
    coverFailures: cover.failures,
    reason,
    devWarning,
    familyDeterminedBy: "classification",
  };
}

/**
 * Decisión única de presentación. La elegibilidad de medios sólo afecta a
 * `presentationMode` / `usesNeutralMarker`; jamás a `family` ni `presetId`.
 */
export function resolveCanonicalPresentation(
  input: CanonicalPresentationInput,
): CanonicalPresentationDecision {
  const kind = normalize(input.entityType);

  // Destino: familia propia, siempre premium G4, Editorial como modo base.
  if (kind === "destination" || kind === "destino") {
    return decide(
      "destination",
      DESTINATION_PREMIUM_PRESET_ID,
      null,
      input,
      "familia Destino (autoridad G4)",
      null,
    );
  }

  const resolution = resolveCanonicalEntityTemplate({
    entityId: input.entityId,
    entityType: input.entityType,
    categorySlug: input.categorySlug ?? null,
    productType: input.productType ?? null,
    placeType: input.placeType ?? null,
    override: input.override ?? null,
    forceStandardSurface: input.forceStandardSurface,
  });

  const family = resolution.canonicalFamily;
  // Fallback DENTRO de la familia: si el resolutor reconoce la familia pero no
  // devolvió preset (variante desconocida), se usa el preset canónico de la
  // familia cuando existe. Sólo si no existe modelo productivo → estándar.
  const presetId = resolution.presetId ?? (family ? canonicalFamilyPresetId(family) : null);

  return decide(
    family,
    presetId,
    resolution.variant,
    input,
    resolution.presetId
      ? resolution.reason
      : presetId
        ? `${resolution.reason} · fallback dentro de la familia`
        : resolution.reason,
    resolution.devWarning,
  );
}
