/**
 * CV8.9.2 · Governed Decision Ingestion — Server Functions v1.0.0.
 *
 * Authenticated, role-aware entrypoints for the Action Queue. Every mutation
 * appends one `recommendation.lifecycle` event through the atomic database RPC;
 * no current-state row or mutable snapshot exists.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  DecisionAgreementSchema,
  DecisionEvidenceSchema,
  DecisionEventPayloadSchema,
  DecisionSourceSchema,
  DECISION_STATES,
  projectDecisionQueue,
  type DecisionEventPayload,
  type DecisionQueueProjection,
  type DecisionState,
  type ProjectedDecision,
} from "./decisions";
import {
  buildDecisionLifecycleEvent,
  canReplaceDecisionAgreement,
  canTransitionDecision,
  filterDecisionQueueForActor,
  resolveDecisionActorAccess,
  type DecisionActorAccess,
  type DecisionRoleFlags,
} from "./decision-operations";
import { VisitorEventSchema } from "./events";

const ProposeDecisionInputSchema = z.object({
  source: DecisionSourceSchema,
});

const TransitionTargetSchema = z.enum([
  "accepted",
  "in_progress",
  "implemented",
  "deferred",
  "dismissed",
  "blocked",
]);

const TransitionDecisionInputSchema = z.object({
  decision_id: z.string().uuid(),
  expected_from_state: z.enum(DECISION_STATES),
  to_state: TransitionTargetSchema,
  agreement: DecisionAgreementSchema.optional(),
  reason: z.string().trim().min(1).max(2_000).optional(),
});

const AttachEvidenceInputSchema = z.object({
  decision_id: z.string().uuid(),
  expected_from_state: z.literal("implemented"),
  outcome: z.enum(["validated", "rejected"]),
  evidence: DecisionEvidenceSchema,
  reason: z.string().trim().min(1).max(2_000).optional(),
});

const SupersedeDecisionInputSchema = z.object({
  decision_id: z.string().uuid(),
  source: DecisionSourceSchema,
});

const QueueInputSchema = z.object({}).optional().default({});

type AuthContext = {
  supabase: SupabaseClient;
  userId: string;
};

type DecisionEventRow = { payload: unknown };
type DecisionEventQuery = {
  eq: (column: string, value: string) => DecisionEventQuery;
  like: (column: string, pattern: string) => DecisionEventQuery;
  order: (
    column: string,
    options: { ascending: boolean },
  ) => Promise<{
    data: DecisionEventRow[] | null;
    error: { message: string } | null;
  }>;
};
type DecisionAdminClient = {
  schema: (schema: string) => {
    from: (table: string) => {
      select: (columns: string) => DecisionEventQuery;
    };
    rpc: (
      fn: string,
      args: { _event: unknown; _expected_from_state: string | null },
    ) => Promise<{
      data: string | null;
      error: { code?: string; message: string } | null;
    }>;
  };
};

async function resolveActor(context: AuthContext): Promise<DecisionActorAccess> {
  const roleNames = ["super_admin", "admin", "concierge_lead", "editor"] as const;
  const results = await Promise.all(
    roleNames.map((role) =>
      context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: role,
      }),
    ),
  );
  const roleError = results.find((result) => result.error)?.error;
  if (roleError) {
    console.error("[visitor_intel.decisions] role lookup failed", roleError);
    throw new Response("Role lookup failed", { status: 500 });
  }

  const flags = Object.fromEntries(
    roleNames.map((role, index) => [role, Boolean(results[index]?.data)]),
  ) as unknown as DecisionRoleFlags;
  const actor = resolveDecisionActorAccess(context.userId, flags);
  if (!actor) throw new Response("Forbidden", { status: 403 });
  return actor;
}

async function loadDecisionProjection(now = new Date()): Promise<DecisionQueueProjection> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const query = (supabaseAdmin as unknown as DecisionAdminClient)
    .schema("visitor_intel")
    .from("events")
    .select("payload")
    .eq("kind", "recommendation.lifecycle")
    .like("subject_id", "decision:%");
  const { data: rows, error } = await query.order("occurred_at", {
    ascending: true,
  });
  if (error) {
    console.error("[visitor_intel.decisions] read failed", error);
    throw new Response("Read failed", { status: 500 });
  }

  const payloads: DecisionEventPayload[] = [];
  for (const row of rows ?? []) {
    const parsed = VisitorEventSchema.safeParse(row.payload);
    if (
      parsed.success &&
      parsed.data.kind === "recommendation.lifecycle" &&
      parsed.data.subtype === "decision" &&
      parsed.data.payload
    ) {
      payloads.push(parsed.data.payload);
    }
  }
  return projectDecisionQueue(payloads, { now });
}

function requireDecision(
  projection: DecisionQueueProjection,
  decisionId: string,
): ProjectedDecision {
  const decision = projection.decisions.find((candidate) => candidate.decision_id === decisionId);
  if (!decision) throw new Response("Decision not found", { status: 404 });
  if (decision.superseded_by_decision_id) {
    throw new Response("Decision has been superseded", { status: 409 });
  }
  return decision;
}

function requireExpectedState(decision: ProjectedDecision, expectedState: DecisionState): void {
  if (decision.current_state !== expectedState) {
    throw new Response("Stale decision state", { status: 409 });
  }
}

async function appendDecisionEvent(
  payload: DecisionEventPayload,
  expectedFromState: DecisionState | null,
): Promise<{ event_id: string; decision_id: string }> {
  const eventId = crypto.randomUUID();
  const event = buildDecisionLifecycleEvent({ event_id: eventId, payload });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as unknown as DecisionAdminClient)
    .schema("visitor_intel")
    .rpc("append_decision_event", {
      _event: event,
      _expected_from_state: expectedFromState,
    });
  if (error) {
    console.error("[visitor_intel.decisions] append failed", error);
    const status = error.code === "40001" || error.code === "23514" ? 409 : 500;
    throw new Response(status === 409 ? "Decision conflict" : "Append failed", {
      status,
    });
  }
  return { event_id: data ?? eventId, decision_id: payload.decision_id };
}

export const getDecisionQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => QueueInputSchema.parse(input))
  .handler(async ({ context }): Promise<DecisionQueueProjection> => {
    const actor = await resolveActor(context);
    const projection = await loadDecisionProjection();
    return filterDecisionQueueForActor(projection, actor);
  });

export const proposeDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProposeDecisionInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context);
    if (!actor.manage_all) throw new Response("Forbidden", { status: 403 });

    const decisionId = crypto.randomUUID();
    const payload = DecisionEventPayloadSchema.parse({
      decision_id: decisionId,
      from_state: null,
      to_state: "proposed",
      source: data.source,
      actor_user_id: context.userId,
      actor_role: actor.actor_role,
      occurred_at: new Date().toISOString(),
    });
    return appendDecisionEvent(payload, null);
  });

export const transitionDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TransitionDecisionInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context);
    const projection = await loadDecisionProjection();
    const decision = requireDecision(projection, data.decision_id);
    requireExpectedState(decision, data.expected_from_state);

    if (!canTransitionDecision(actor, decision, data.to_state)) {
      throw new Response("Forbidden", { status: 403 });
    }
    if (data.agreement && !canReplaceDecisionAgreement(actor)) {
      throw new Response("Forbidden", { status: 403 });
    }

    const payload = DecisionEventPayloadSchema.parse({
      decision_id: decision.decision_id,
      from_state: decision.current_state,
      to_state: data.to_state,
      agreement: data.agreement,
      reason: data.reason,
      actor_user_id: context.userId,
      actor_role: actor.actor_role,
      occurred_at: new Date().toISOString(),
    });
    return appendDecisionEvent(payload, decision.current_state);
  });

export const attachEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AttachEvidenceInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context);
    if (!actor.manage_all) throw new Response("Forbidden", { status: 403 });
    const projection = await loadDecisionProjection();
    const decision = requireDecision(projection, data.decision_id);
    requireExpectedState(decision, data.expected_from_state);

    const payload = DecisionEventPayloadSchema.parse({
      decision_id: decision.decision_id,
      from_state: decision.current_state,
      to_state: data.outcome,
      evidence: data.evidence,
      reason: data.reason,
      actor_user_id: context.userId,
      actor_role: actor.actor_role,
      occurred_at: new Date().toISOString(),
    });
    return appendDecisionEvent(payload, decision.current_state);
  });

export const supersedeDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SupersedeDecisionInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const actor = await resolveActor(context);
    if (!actor.manage_all) throw new Response("Forbidden", { status: 403 });
    const projection = await loadDecisionProjection();
    requireDecision(projection, data.decision_id);

    const decisionId = crypto.randomUUID();
    const payload = DecisionEventPayloadSchema.parse({
      decision_id: decisionId,
      from_state: null,
      to_state: "proposed",
      source: data.source,
      supersedes_decision_id: data.decision_id,
      actor_user_id: context.userId,
      actor_role: actor.actor_role,
      occurred_at: new Date().toISOString(),
    });
    return appendDecisionEvent(payload, null);
  });
