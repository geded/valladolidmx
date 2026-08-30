/**
 * G8-R1-F1B-S1 · Contratos del modelo de procedencia y reclamación.
 *
 * Capa pura (sin IO): allowlists, validación Zod y resolutores deterministas.
 * Autoridades:
 *  · Procedencia por campo  → `public.entity_field_provenance` (append-only).
 *  · Origen/revisión ficha  → `businesses.record_origin` / `source_review_state`.
 *  · Vigencia de horarios   → `business_hours.source_verified_at` / `valid_until`.
 *  · Snapshot pre-reclamo   → `public.business_claim_snapshots` (inmutable).
 *  · Reclamación            → DERIVADA de `business_users` +
 *                             `business_ownership_transfers`. Nunca almacenada.
 *  · noindex                → `seo_metadata.noindex` (única autoridad SEO).
 */
import { z } from "zod";

export const PROVENANCE_ENTITY_TYPES = [
  "business",
  "place",
  "product",
  "event",
  "destination",
] as const;
export type ProvenanceEntityType = (typeof PROVENANCE_ENTITY_TYPES)[number];

export const PROVENANCE_SOURCE_KINDS = [
  "official_site",
  "official_social",
  "tourism_registry",
  "chamber",
  "press_release",
  "owner_provided",
  "licensed_editorial",
] as const;
export type ProvenanceSourceKind = (typeof PROVENANCE_SOURCE_KINDS)[number];

export const PROVENANCE_VERIFICATION_LEVELS = [
  "unverified",
  "source_checked",
  "editorially_verified",
  "owner_confirmed",
] as const;
export type ProvenanceVerificationLevel = (typeof PROVENANCE_VERIFICATION_LEVELS)[number];

export const BUSINESS_RECORD_ORIGINS = [
  "owner_submitted",
  "public_source",
  "editorial",
  "imported",
  "demo",
] as const;
export type BusinessRecordOrigin = (typeof BUSINESS_RECORD_ORIGINS)[number];

export const BUSINESS_SOURCE_REVIEW_STATES = [
  "unreviewed",
  "in_review",
  "approved",
  "stale",
  "rejected",
] as const;
export type BusinessSourceReviewState = (typeof BUSINESS_SOURCE_REVIEW_STATES)[number];

export const CLAIM_SNAPSHOT_REASONS = [
  "claim_review",
  "claim_approval",
  "ownership_transfer",
  "editorial_rollback",
] as const;

export const DERIVED_CLAIM_STATES = [
  "unclaimed",
  "claim_pending",
  "claimed",
  "claim_revoked",
] as const;
export type DerivedClaimState = (typeof DERIVED_CLAIM_STATES)[number];

/** `entidad.campo` en snake_case; evita rutas arbitrarias o inyección. */
const FIELD_PATH_RE = /^[a-z0-9_]+\.[a-z0-9_.[\]-]+$/;
const HTTPS_URL_RE = /^https:\/\/[^\s]+$/i;
const SHA256_RE = /^[a-f0-9]{64}$/;

export const httpsSourceUrl = z
  .string()
  .min(12)
  .max(2048)
  .regex(HTTPS_URL_RE, "source_url_must_be_https");

export const recordFieldProvenanceSchema = z.object({
  entityType: z.enum(PROVENANCE_ENTITY_TYPES),
  entityId: z.string().uuid(),
  fieldPath: z.string().regex(FIELD_PATH_RE, "invalid_field_path"),
  sourceUrl: httpsSourceUrl,
  sourceOwner: z.string().min(2).max(200),
  sourceKind: z.enum(PROVENANCE_SOURCE_KINDS),
  observedAt: z.string().datetime(),
  verificationLevel: z.enum(PROVENANCE_VERIFICATION_LEVELS).default("unverified"),
  /** Huella mínima suficiente de la evidencia. Nunca copia de la página. */
  evidenceChecksum: z.string().regex(SHA256_RE, "invalid_checksum").nullish(),
  evidenceRef: z.string().max(500).nullish(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});
export type RecordFieldProvenanceInput = z.infer<typeof recordFieldProvenanceSchema>;

export const supersedeFieldProvenanceSchema = z.object({
  provenanceId: z.string().uuid(),
  replacement: recordFieldProvenanceSchema,
});

export const listEntityProvenanceSchema = z.object({
  entityType: z.enum(PROVENANCE_ENTITY_TYPES),
  entityId: z.string().uuid(),
  includeSuperseded: z.boolean().default(false),
});

export const setBusinessSourceReviewSchema = z.object({
  businessId: z.string().uuid(),
  recordOrigin: z.enum(BUSINESS_RECORD_ORIGINS).optional(),
  sourceReviewState: z.enum(BUSINESS_SOURCE_REVIEW_STATES).optional(),
  lastVerifiedAt: z.string().datetime().nullish(),
  verificationDueAt: z.string().datetime().nullish(),
});

export const setBusinessHoursValiditySchema = z.object({
  hoursId: z.string().uuid(),
  sourceVerifiedAt: z.string().datetime().nullish(),
  validUntil: z.string().datetime().nullish(),
});

export const createClaimSnapshotSchema = z.object({
  businessId: z.string().uuid(),
  reason: z.enum(CLAIM_SNAPSHOT_REASONS),
  claimId: z.string().uuid().nullish(),
});

export const businessIdSchema = z.object({ businessId: z.string().uuid() });

/* ---------------------------------------------------------------------- */
/* Resolutores puros                                                       */
/* ---------------------------------------------------------------------- */

export type ClaimSourceRows = {
  members: Array<{ role: string; status: string }>;
  transfers: Array<{ status: string; expiresAt: string | null }>;
};

/**
 * Estado de reclamación derivado. Espejo exacto de
 * `public.resolve_business_claim_state`: cero divergencia permitida.
 * Vender un producto o tener relación comercial NO acredita propiedad.
 */
export function resolveClaimState(rows: ClaimSourceRows, now = new Date()): DerivedClaimState {
  const hasActiveOwner = rows.members.some((m) => m.role === "owner" && m.status === "active");
  if (hasActiveOwner) return "claimed";

  const hasPending = rows.transfers.some(
    (t) => t.status === "pending" && (!t.expiresAt || new Date(t.expiresAt) > now),
  );
  if (hasPending) return "claim_pending";

  const revoked =
    rows.members.some(
      (m) => m.role === "owner" && (m.status === "suspended" || m.status === "removed"),
    ) || rows.transfers.some((t) => t.status === "rejected" || t.status === "cancelled");
  if (revoked) return "claim_revoked";

  return "unclaimed";
}

/** Un horario vencido nunca se presenta como vigente. */
export function hoursValidity(
  input: { sourceVerifiedAt?: string | null; validUntil?: string | null },
  now = new Date(),
): "current" | "pending_confirmation" | "expired" {
  if (!input.sourceVerifiedAt) return "pending_confirmation";
  if (input.validUntil && new Date(input.validUntil) <= now) return "expired";
  return "current";
}

export type PublicReadinessInput = {
  status: string;
  deletedAt: string | null;
  sourceReviewState: BusinessSourceReviewState;
  hasCanonicalRoute: boolean;
  hasDestination: boolean;
  hasCoordinates: boolean;
  verificationDueAt: string | null;
  seoReviewed: boolean;
  minimumEditorialFieldsComplete: boolean;
};

/** Lectura pública fail-closed: toda condición ausente ⇒ no público. */
export function canBePublic(input: PublicReadinessInput, now = new Date()): boolean {
  return (
    input.status === "published" &&
    input.deletedAt === null &&
    input.sourceReviewState === "approved" &&
    input.hasCanonicalRoute &&
    input.hasDestination &&
    input.hasCoordinates &&
    (input.verificationDueAt === null || new Date(input.verificationDueAt) > now) &&
    input.seoReviewed &&
    input.minimumEditorialFieldsComplete
  );
}

export type PublicSourceSummary = {
  businessId: string;
  isPublicSource: boolean;
  claimState: DerivedClaimState;
  lastVerifiedAt: string | null;
  sourceIsCurrent: boolean;
  sourceOwners: string[];
  notice: string | null;
  actions: Array<"claim_business" | "report_incorrect_information">;
};

export const PUBLIC_SOURCE_NOTICE = "Información recopilada de fuentes públicas";

/**
 * Proyección pública segura. Nunca expone notas internas, hashes,
 * historial técnico, IDs de procedencia ni URLs de evidencia.
 */
export function toPublicSourceSummary(raw: {
  business_id: string;
  is_public_source?: boolean;
  claim_state?: string;
  last_verified_at?: string | null;
  source_is_current?: boolean;
  source_owners?: unknown;
}): PublicSourceSummary {
  const claimState = (DERIVED_CLAIM_STATES as readonly string[]).includes(raw.claim_state ?? "")
    ? (raw.claim_state as DerivedClaimState)
    : "unclaimed";
  const owners = Array.isArray(raw.source_owners)
    ? raw.source_owners.filter((o): o is string => typeof o === "string")
    : [];
  const isPublicSource = raw.is_public_source === true;
  return {
    businessId: raw.business_id,
    isPublicSource,
    claimState,
    lastVerifiedAt: raw.last_verified_at ?? null,
    sourceIsCurrent: raw.source_is_current !== false,
    sourceOwners: owners,
    notice: isPublicSource ? PUBLIC_SOURCE_NOTICE : null,
    actions:
      claimState === "unclaimed" || claimState === "claim_revoked"
        ? ["claim_business", "report_incorrect_information"]
        : ["report_incorrect_information"],
  };
}

// ---------------------------------------------------------------------------
// ADDENDUM UX · RECLAMACIÓN DISCRETA (2026-08-29)
//
// Una ficha aprobada editorialmente NO pierde credibilidad por no estar
// reclamada. Prohibido: badges, alertas, cintas o textos prominentes de
// "ficha no reclamada", y cualquier presencia en tarjetas o listados.
// La reclamación existe únicamente como enlace secundario al final de la ficha.
// ---------------------------------------------------------------------------

/** Superficies donde puede evaluarse la afordancia de reclamación. */
export const CLAIM_AFFORDANCE_SURFACES = ["detail_footer", "card", "listing", "hero"] as const;
export type ClaimAffordanceSurface = (typeof CLAIM_AFFORDANCE_SURFACES)[number];

/** Única superficie autorizada. */
export const CLAIM_AFFORDANCE_SURFACE: ClaimAffordanceSurface = "detail_footer";

export const CLAIM_AFFORDANCE_QUESTION = "¿Representas a este establecimiento?";
export const CLAIM_AFFORDANCE_ACTION = "Administra esta ficha";

export type ClaimAffordance = {
  visible: boolean;
  surface: ClaimAffordanceSurface;
  /** Nunca "badge" ni "alert": la afordancia es siempre un enlace secundario. */
  emphasis: "secondary_link";
  question: string;
  action: string;
};

const HIDDEN_CLAIM_AFFORDANCE: ClaimAffordance = {
  visible: false,
  surface: CLAIM_AFFORDANCE_SURFACE,
  emphasis: "secondary_link",
  question: CLAIM_AFFORDANCE_QUESTION,
  action: CLAIM_AFFORDANCE_ACTION,
};

/**
 * Resuelve la afordancia de reclamación.
 * Sólo es visible en el pie de la ficha de detalle y sólo cuando la empresa
 * aún no tiene operador acreditado. Jamás en tarjetas, listados ni hero, y
 * jamás compitiendo con CTA turísticos o comerciales.
 */
export function resolveClaimAffordance(input: {
  claimState: DerivedClaimState;
  surface: ClaimAffordanceSurface;
}): ClaimAffordance {
  if (input.surface !== CLAIM_AFFORDANCE_SURFACE) return HIDDEN_CLAIM_AFFORDANCE;
  const claimable = input.claimState === "unclaimed" || input.claimState === "claim_revoked";
  return claimable ? { ...HIDDEN_CLAIM_AFFORDANCE, visible: true } : HIDDEN_CLAIM_AFFORDANCE;
}

/**
 * "Establecimiento verificado" exige AMBAS condiciones:
 * operador acreditado (reclamación aprobada) + aprobación administrativa.
 * No basta la aprobación editorial de la ficha ni la fuente pública vigente.
 */
export function canShowVerifiedEstablishmentBadge(input: {
  claimState: DerivedClaimState;
  administrativelyVerified: boolean;
}): boolean {
  return input.claimState === "claimed" && input.administrativelyVerified === true;
}

/**
 * Guarda de credibilidad: ninguna superficie pública puede degradar
 * visualmente una ficha por su estado interno de reclamación.
 */
export function claimStateAffectsCredibility(): false {
  return false;
}

/**
 * Reconciliación documental demo_seed ⇄ record_origin.
 * No ejecuta backfill: sólo declara la correspondencia esperada.
 */
export function expectedRecordOriginForLegacy(row: {
  is_demo_seed?: boolean | null;
}): BusinessRecordOrigin | null {
  return row.is_demo_seed === true ? "demo" : null;
}
