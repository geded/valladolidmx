/**
 * G8-R1-F1B-S1 · Server functions del modelo de procedencia y reclamación.
 *
 * Reglas:
 *  · Toda escritura pasa por `requireSupabaseAuth` (RLS aplica como usuario).
 *  · Autorización adicional server-side: staff editorial o `poi.write`.
 *  · Procedencia append-only: superseder crea fila nueva, nunca reescribe.
 *  · Estado de reclamación siempre DERIVADO (RPC), nunca almacenado.
 *  · El resumen público jamás incluye notas internas, hashes ni evidencia.
 *  · No existe importador masivo en esta fase.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  businessIdSchema,
  createClaimSnapshotSchema,
  listEntityProvenanceSchema,
  recordFieldProvenanceSchema,
  setBusinessHoursValiditySchema,
  setBusinessSourceReviewSchema,
  supersedeFieldProvenanceSchema,
  toPublicSourceSummary,
  type RecordFieldProvenanceInput,
} from "./provenance-contracts";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ctx = { supabase: any; userId: string };

const PROVENANCE_SELECT =
  "id, entity_type, entity_id, field_path, source_url, source_owner, source_kind, " +
  "observed_at, captured_at, verification_level, evidence_checksum, evidence_ref, " +
  "created_by, superseded_at, superseded_by, metadata, created_at";

async function assertEditorialStaff(context: Ctx) {
  const editorial = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (editorial.error) throw new Error(`role_check_failed: ${editorial.error.message}`);
  if (editorial.data === true) return;
  const granular = await context.supabase.rpc("has_permission", {
    _user_id: context.userId,
    _permission_key: "poi.write",
  });
  if (granular.error || granular.data !== true) throw new Error("forbidden");
}

export type ProvenanceDTO = {
  id: string;
  entity_type: string;
  entity_id: string;
  field_path: string;
  source_url: string;
  source_owner: string;
  source_kind: string;
  observed_at: string;
  captured_at: string;
  verification_level: string;
  evidence_checksum: string | null;
  evidence_ref: string | null;
  created_by: string | null;
  superseded_at: string | null;
  superseded_by: string | null;
  metadata: Record<string, string | number | boolean>;
  created_at: string;
};

function unwrap<T>(res: any): T {
  if (res?.error) throw new Error(res.error.message);
  return res?.data as T;
}

function provenanceRow(input: RecordFieldProvenanceInput, userId: string) {
  return {
    entity_type: input.entityType,
    entity_id: input.entityId,
    field_path: input.fieldPath,
    source_url: input.sourceUrl,
    source_owner: input.sourceOwner,
    source_kind: input.sourceKind,
    observed_at: input.observedAt,
    verification_level: input.verificationLevel,
    evidence_checksum: input.evidenceChecksum ?? null,
    evidence_ref: input.evidenceRef ?? null,
    metadata: input.metadata ?? {},
    created_by: userId,
  };
}

/** Registra la procedencia activa de un campo. Falla si ya existe una activa. */
export const recordFieldProvenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => recordFieldProvenanceSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertEditorialStaff(context as Ctx);
    const ctx = context as Ctx;
    return unwrap<ProvenanceDTO>(
      await ctx.supabase
        .from("entity_field_provenance")
        .insert(provenanceRow(data, ctx.userId))
        .select(PROVENANCE_SELECT)
        .single(),
    );
  });

/** Supersede: marca la fila vigente y crea la nueva. Historial preservado. */
export const supersedeFieldProvenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => supersedeFieldProvenanceSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertEditorialStaff(ctx);

    const created = unwrap<{ id: string } | null>(
      await ctx.supabase
        .from("entity_field_provenance")
        .update({ superseded_at: new Date().toISOString() })
        .eq("id", data.provenanceId)
        .is("superseded_at", null)
        .select("id")
        .single(),
    );
    if (!created) throw new Error("provenance_not_active");

    const replacement = unwrap<ProvenanceDTO>(
      await ctx.supabase
        .from("entity_field_provenance")
        .insert(provenanceRow(data.replacement, ctx.userId))
        .select(PROVENANCE_SELECT)
        .single(),
    );

    unwrap<{ id: string }>(
      await ctx.supabase
        .from("entity_field_provenance")
        .update({ superseded_by: replacement.id })
        .eq("id", data.provenanceId)
        .select("id")
        .single(),
    );

    return replacement;
  });

/** Lectura staff / dueño de la propia ficha (RLS decide). */
export const listEntityProvenance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => listEntityProvenanceSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    let query = ctx.supabase
      .from("entity_field_provenance")
      .select(PROVENANCE_SELECT)
      .eq("entity_type", data.entityType)
      .eq("entity_id", data.entityId)
      .order("captured_at", { ascending: false });
    if (!data.includeSuperseded) query = query.is("superseded_at", null);
    return unwrap<ProvenanceDTO[]>(await query) ?? [];
  });

/** Origen, revisión editorial y vigencia de la ficha. */
export const setBusinessSourceReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => setBusinessSourceReviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertEditorialStaff(ctx);
    const patch: Record<string, unknown> = {};
    if (data.recordOrigin) patch.record_origin = data.recordOrigin;
    if (data.sourceReviewState) patch.source_review_state = data.sourceReviewState;
    if (data.lastVerifiedAt !== undefined) patch.last_verified_at = data.lastVerifiedAt ?? null;
    if (data.verificationDueAt !== undefined)
      patch.verification_due_at = data.verificationDueAt ?? null;
    if (Object.keys(patch).length === 0) throw new Error("empty_patch");

    return unwrap<{
      id: string;
      record_origin: string;
      source_review_state: string;
      last_verified_at: string | null;
      verification_due_at: string | null;
    }>(
      await ctx.supabase
        .from("businesses")
        .update(patch)
        .eq("id", data.businessId)
        .select("id, record_origin, source_review_state, last_verified_at, verification_due_at")
        .single(),
    );
  });

/** Vigencia de horarios volátiles. Nunca inventa un horario. */
export const setBusinessHoursValidity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => setBusinessHoursValiditySchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertEditorialStaff(ctx);
    const patch: Record<string, unknown> = {};
    if (data.sourceVerifiedAt !== undefined)
      patch.source_verified_at = data.sourceVerifiedAt ?? null;
    if (data.validUntil !== undefined) patch.valid_until = data.validUntil ?? null;
    if (Object.keys(patch).length === 0) throw new Error("empty_patch");

    return unwrap<{
      id: string;
      day_of_week: number;
      source_verified_at: string | null;
      valid_until: string | null;
    }>(
      await ctx.supabase
        .from("business_hours")
        .update(patch)
        .eq("id", data.hoursId)
        .select("id, day_of_week, source_verified_at, valid_until")
        .single(),
    );
  });

/** Estado de reclamación derivado (autoridad: claims + membresías). */
export const resolveBusinessClaimState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => businessIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const res = await ctx.supabase.rpc("resolve_business_claim_state", {
      _business_id: data.businessId,
    });
    if (res.error) throw new Error(res.error.message);
    return { businessId: data.businessId, claimState: res.data as string };
  });

/** Snapshot inmutable previo a aprobar reclamación o transferencia. */
export const createBusinessClaimSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createClaimSnapshotSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const res = await ctx.supabase.rpc("create_business_claim_snapshot", {
      _business_id: data.businessId,
      _reason: data.reason,
      _claim_id: data.claimId ?? null,
    });
    if (res.error) throw new Error(res.error.message);
    return { snapshotId: res.data as string };
  });

/** Resumen público seguro. Sin bearer: se usa la clave publicable. */
export const getBusinessPublicSourceSummary = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => businessIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const res = await client.rpc("business_public_source_summary", {
      _business_id: data.businessId,
    });
    if (res.error || !res.data) return null;
    return toPublicSourceSummary(res.data as any);
  });
