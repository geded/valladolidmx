/**
 * CV8.1 · Journey Event Ingestion — Server Functions v1.0.
 *
 * Único canal autorizado para escribir en `visitor_intel.events`. Consume
 * exclusivamente los contratos v1.0.0 de CV8.0 (`VisitorEventSchema`).
 * Cumple:
 *  - Founder Signal Quality Principle (Regla de Eventos + Regla de Evolución).
 *  - Founder Visitor Intelligence Principle (sólo transiciones canónicas).
 *  - Founder Progressive Trust Principle (segregación por trust_level).
 *
 * IMPORTANTE (tanstack-server-functions / server-side-modern):
 *  - `client.server` se importa DENTRO del handler (module-graph safe).
 *  - `process.env` se lee dentro del handler.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  VISITOR_EVENT_SCHEMA_VERSION,
  VisitorEventSchema,
  isCanonicalTransition,
  type VisitorEvent,
} from "./events";

export interface IngestResult {
  accepted: boolean;
  reason?:
    | "invalid_schema"
    | "non_canonical_transition"
    | "trust_mismatch"
    | "duplicate"
    | "insert_failed";
  event_id?: string;
}

function validateCanonical(event: VisitorEvent): IngestResult | null {
  if (event.schema_version !== VISITOR_EVENT_SCHEMA_VERSION) {
    return { accepted: false, reason: "invalid_schema" };
  }
  if (
    event.kind === "journey.transition" &&
    !isCanonicalTransition(event.transition.id)
  ) {
    return { accepted: false, reason: "non_canonical_transition" };
  }
  return null;
}

function toRow(event: VisitorEvent) {
  return {
    event_id: event.event_id,
    occurred_at: event.occurred_at,
    schema_version: event.schema_version,
    kind: event.kind,
    subject_id: event.subject.subject_id,
    trust_level: event.subject.trust_level,
    is_authenticated: event.subject.is_authenticated,
    locale: event.subject.locale ?? null,
    destination_id: event.context.destination_id ?? null,
    surface: event.context.surface,
    route: event.context.route,
    travel_stage: event.context.travel_stage ?? null,
    live_day_phase: event.context.live_day_phase ?? null,
    // Store the full typed body so future consumers can reconstruct the event.
    payload: event,
    // `retention_bucket` is derived by BEFORE INSERT trigger; sent as placeholder.
    retention_bucket: "R_30D",
  };
}

/**
 * Ingest an authenticated visitor event.
 *
 * `trust_level` and `is_authenticated` in the payload must be consistent with
 * an authenticated context (N1..N4). Anon events must use the public fn.
 */
export const ingestVisitorEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { event: unknown }) => ({
    event: VisitorEventSchema.parse(data.event),
  }))
  .handler(async ({ data }): Promise<IngestResult> => {
    const { event } = data;

    if (!event.subject.is_authenticated || event.subject.trust_level === "N0_anonymous") {
      return { accepted: false, reason: "trust_mismatch" };
    }
    const canonicalError = validateCanonical(event);
    if (canonicalError) return canonicalError;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .schema("visitor_intel")
      .from("events")
      .upsert(toRow(event), { onConflict: "event_id", ignoreDuplicates: true });

    if (error) {
      // Idempotent duplicate → treat as accepted-no-op; anything else as failure.
      if (error.code === "23505") {
        return { accepted: true, reason: "duplicate", event_id: event.event_id };
      }
      console.error("[visitor_intel.ingest] insert failed", error);
      return { accepted: false, reason: "insert_failed" };
    }
    return { accepted: true, event_id: event.event_id };
  });

/**
 * Ingest a strictly anonymous visitor event (N0 only).
 *
 * PUBLIC endpoint. Guards:
 *  - `trust_level` must be `N0_anonymous` and `is_authenticated=false`.
 *  - Kind must be one of the 4 canonical kinds (enforced by Zod).
 *  - Idempotency by `event_id` (client-generated UUID).
 *
 * Rate limiting per subject_id + IP is delegated to the platform edge layer
 * (out of scope of CV8.1). Sub-ola CV8.2 will add server-side throttling.
 */
export const ingestAnonymousVisitorEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { event: unknown }) => ({
    event: VisitorEventSchema.parse(data.event),
  }))
  .handler(async ({ data }): Promise<IngestResult> => {
    const { event } = data;

    if (event.subject.is_authenticated || event.subject.trust_level !== "N0_anonymous") {
      return { accepted: false, reason: "trust_mismatch" };
    }
    const canonicalError = validateCanonical(event);
    if (canonicalError) return canonicalError;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .schema("visitor_intel")
      .from("events")
      .upsert(toRow(event), { onConflict: "event_id", ignoreDuplicates: true });

    if (error) {
      if (error.code === "23505") {
        return { accepted: true, reason: "duplicate", event_id: event.event_id };
      }
      console.error("[visitor_intel.ingest.anon] insert failed", error);
      return { accepted: false, reason: "insert_failed" };
    }
    return { accepted: true, event_id: event.event_id };
  });