/**
 * G8-R1-F1C-A · Contrato determinista de elegibilidad premium.
 *
 * Capa PURA equivalente para empresa, producto, evento y lugar.
 *
 * Reglas vinculantes:
 *  - Publicación, elegibilidad premium y modo de presentación son decisiones
 *    SEPARADAS. Cumplir elegibilidad NO publica y NO activa el flag global.
 *  - Fail-closed: cualquier requisito ausente devuelve `eligible: false` con la
 *    lista exacta de faltantes; nunca se aproxima ni se rellena con demo.
 */
import { evaluateGovernedCover, type GovernedCoverFacts } from "./entity-presentation";

export const PREMIUM_ELIGIBILITY_CONTRACT_VERSION = "1.0.0" as const;

export type PremiumEligibilityKind = "business" | "product" | "event" | "place";

export interface PremiumEligibilityFacts {
  readonly kind: PremiumEligibilityKind;
  /** Estado editorial acreditado (`draft`, `in_review`, `approved`, `published`…). */
  readonly editorialState: string;
  /** Clasificación canónica resuelta (categoría, product_type o place_type). */
  readonly canonicalClassification: string | null;
  /** Ruta canónica calculada por el contrato de navegación. */
  readonly canonicalPath: string | null;
  /** Contenido real, no demo ni fixture. */
  readonly hasRealContent: boolean;
  readonly isDemoSeed: boolean;
  /** Portada gobernada G8-M1. */
  readonly cover: GovernedCoverFacts | null;
  /** Medios adicionales aprobados con ALT humano. */
  readonly approvedGalleryCount: number;
  /** Coordenadas acreditadas cuando la familia lo exige. */
  readonly hasValidLocation: boolean;
  /** Relaciones obligatorias resueltas (destino, empresa operadora…). */
  readonly hasRequiredRelations: boolean;
  /** Existe bitácora editorial de la entidad. */
  readonly hasAuditTrail: boolean;
}

/** Galería mínima por familia. */
export const MIN_GALLERY: Record<PremiumEligibilityKind, number> = {
  business: 3,
  product: 3,
  event: 1,
  place: 3,
};

/** Familias que exigen ubicación acreditada. */
const REQUIRES_LOCATION: Record<PremiumEligibilityKind, boolean> = {
  business: true,
  product: false,
  event: true,
  place: true,
};

const ACCEPTED_EDITORIAL_STATES = new Set(["approved", "published"]);

export interface PremiumEligibilityResult {
  /**
   * G8-R1-F1L·P0 — Pertenencia a la FAMILIA premium (modo Editorial base).
   * NO depende de portada ni de galería: los medios nunca expulsan.
   */
  readonly familyEligible: boolean;
  /** Requisitos de medios G8-M1 para el modo Cinematográfico. */
  readonly cinematicEligible: boolean;
  /**
   * Compatibilidad histórica: equivale a `familyEligible`. Ningún consumidor
   * puede usarlo para decidir la familia a partir de medios.
   */
  readonly eligible: boolean;
  readonly missing: readonly string[];
  /** Faltantes que sólo bloquean Cinematográfica. */
  readonly cinematicMissing: readonly string[];
  /** La elegibilidad NUNCA implica publicación ni activación de flag. */
  readonly publishes: false;
  readonly activatesFlag: false;
}

export function evaluatePremiumEligibility(
  facts: PremiumEligibilityFacts,
): PremiumEligibilityResult {
  const missing: string[] = [];

  if (!ACCEPTED_EDITORIAL_STATES.has(facts.editorialState)) missing.push("editorial_state");
  if (!facts.canonicalClassification) missing.push("canonical_classification");
  if (!facts.canonicalPath) missing.push("canonical_path");
  if (!facts.hasRealContent) missing.push("real_content");
  if (facts.isDemoSeed) missing.push("demo_content_present");
  if (REQUIRES_LOCATION[facts.kind] && !facts.hasValidLocation) missing.push("location");
  if (!facts.hasRequiredRelations) missing.push("required_relations");
  if (!facts.hasAuditTrail) missing.push("audit_trail");

  // Requisitos EXCLUSIVOS del modo Cinematográfico (medios).
  const cinematicMissing: string[] = [];
  const cover = evaluateGovernedCover(facts.cover);
  if (!cover.eligible) cinematicMissing.push(...cover.failures.map((f) => `cover:${f}`));
  if (facts.approvedGalleryCount < MIN_GALLERY[facts.kind])
    cinematicMissing.push("gallery_minimum");

  const familyEligible = missing.length === 0;

  return {
    familyEligible,
    cinematicEligible: familyEligible && cinematicMissing.length === 0,
    eligible: familyEligible,
    missing,
    cinematicMissing,
    publishes: false,
    activatesFlag: false,
  };
}
