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
import { loadDecisionProjection } from "./decision-projection.server";

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

const TransitionDecisionInputSchema = z
  .object({
    decision_id: z.string().uuid(),
    expected_from_state: z.enum(DECISION_STATES),
    to_state: TransitionTargetSchema,
    agreement: DecisionAgreementSchema.optional(),
    reason: z.string().trim().min(1).max(2_000).optional(),
  })
  .superRefine((input, context) => {
    if (input.to_state === "accepted" && !input.agreement) {
      context.addIssue({
        code: "custom",
        path: ["agreement"],
        message: "accepted requiere un acuerdo humano completo.",
      });
    }
    if (["deferred", "dismissed", "blocked"].includes(input.to_state) && !input.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: `${input.to_state} requiere motivo humano.`,
      });
    }
  });

const AttachEvidenceInputSchema = z
  .object({
    decision_id: z.string().uuid(),
    expected_from_state: z.literal("implemented"),
    outcome: z.enum(["validated", "rejected"]),
    evidence: DecisionEvidenceSchema,
    reason: z.string().trim().min(1).max(2_000).optional(),
  })
  .superRefine((input, context) => {
    if (input.outcome === "rejected" && !input.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "rejected requiere motivo humano.",
      });
    }
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

type DecisionAdminClient = {
  schema: (schema: string) => {
    rpc: (
      fn: string,
      args: { _event: unknown; _expected_from_state: string | null },
    ) => Promise<{
      data: string | null;
      error: { code?: string; message: string } | null;
    }>;
  };
};

export interface DecisionAssignableOwner {
  user_id: string;
  display_name: string | null;
  role: "super_admin" | "admin" | "concierge_lead" | "editor";
}

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
    const status = ["40001", "23503", "23505", "23514"].includes(error.code ?? "") ? 409 : 500;
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

/**
 * Exposes only the authenticated operator's workflow capabilities. The UI
 * uses this to hide actions that the server would reject; authorization
 * remains enforced independently in every mutation below.
 */
export const getDecisionActorAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => QueueInputSchema.parse(input))
  .handler(async ({ context }): Promise<DecisionActorAccess> => resolveActor(context));

/** Minimal owner directory: operational identity only, never email or visitor data. */
export const getDecisionAssignableOwners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => QueueInputSchema.parse(input))
  .handler(async ({ context }): Promise<DecisionAssignableOwner[]> => {
    const actor = await resolveActor(context);
    if (!actor.manage_all) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["super_admin", "admin", "concierge_lead", "editor"]);
    if (roleError) throw new Response("Owner role lookup failed", { status: 500 });

    const priority = ["super_admin", "admin", "concierge_lead", "editor"] as const;
    const roleByUser = new Map<string, DecisionAssignableOwner["role"]>();
    for (const role of priority) {
      for (const row of roleRows ?? []) {
        if (row.role === role && !roleByUser.has(row.user_id)) roleByUser.set(row.user_id, role);
      }
    }
    const userIds = [...roleByUser.keys()];
    if (userIds.length === 0) return [];

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);
    if (profileError) throw new Response("Owner profile lookup failed", { status: 500 });
    const nameByUser = new Map(
      (profiles ?? []).map((profile) => [profile.user_id, profile.display_name]),
    );

    return userIds
      .map((user_id) => ({
        user_id,
        display_name: nameByUser.get(user_id) ?? null,
        role: roleByUser.get(user_id)!,
      }))
      .sort(
        (left, right) =>
          priority.indexOf(left.role) - priority.indexOf(right.role) ||
          (left.display_name ?? left.user_id).localeCompare(right.display_name ?? right.user_id),
      );
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
