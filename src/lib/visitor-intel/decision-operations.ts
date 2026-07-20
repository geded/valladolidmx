/**
 * CV8.9.2 · Decision permissions and auditable event construction.
 *
 * Pure module: maps existing system roles to the frozen Action Queue roles,
 * enforces assigned-only operations, and builds the canonical
 * `recommendation.lifecycle` envelope without IO.
 */
import {
  DecisionEventPayloadSchema,
  type DecisionActorRole,
  type DecisionEventPayload,
  type DecisionQueueProjection,
  type DecisionState,
  type ProjectedDecision,
} from "./decisions";
import {
  VISITOR_EVENT_SCHEMA_VERSION,
  VisitorEventSchema,
  type RecommendationLifecycleEvent,
} from "./events";

export const DECISION_INGESTION_CONTRACT_VERSION = "1.0.0" as const;

export const DECISION_SYSTEM_ROLES = ["super_admin", "admin", "concierge_lead", "editor"] as const;
export type DecisionSystemRole = (typeof DECISION_SYSTEM_ROLES)[number];

export interface DecisionActorAccess {
  user_id: string;
  system_role: DecisionSystemRole;
  actor_role: DecisionActorRole;
  manage_all: boolean;
}

export interface DecisionRoleFlags {
  super_admin: boolean;
  admin: boolean;
  concierge_lead: boolean;
  editor: boolean;
}

/** Founder is the functional name for the existing `super_admin` role. */
export function resolveDecisionActorAccess(
  userId: string,
  flags: DecisionRoleFlags,
): DecisionActorAccess | null {
  if (flags.super_admin) {
    return {
      user_id: userId,
      system_role: "super_admin",
      actor_role: "founder",
      manage_all: true,
    };
  }
  if (flags.admin) {
    return {
      user_id: userId,
      system_role: "admin",
      actor_role: "admin",
      manage_all: true,
    };
  }
  if (flags.concierge_lead) {
    return {
      user_id: userId,
      system_role: "concierge_lead",
      actor_role: "concierge_lead",
      manage_all: false,
    };
  }
  if (flags.editor) {
    return {
      user_id: userId,
      system_role: "editor",
      actor_role: "editor",
      manage_all: false,
    };
  }
  return null;
}

export function canViewDecision(actor: DecisionActorAccess, decision: ProjectedDecision): boolean {
  return actor.manage_all || decision.agreement?.owner_user_id === actor.user_id;
}

const ASSIGNEE_TRANSITIONS: Readonly<Partial<Record<DecisionState, readonly DecisionState[]>>> = {
  accepted: ["in_progress"],
  in_progress: ["implemented", "blocked"],
  blocked: ["in_progress"],
};

/**
 * Founder/Admin may execute every contract-valid transition. Concierge Lead
 * and Editor may only advance/block decisions assigned to themselves.
 */
export function canTransitionDecision(
  actor: DecisionActorAccess,
  decision: ProjectedDecision,
  toState: DecisionState,
): boolean {
  if (actor.manage_all) return true;
  if (!canViewDecision(actor, decision)) return false;
  return ASSIGNEE_TRANSITIONS[decision.current_state]?.includes(toState) ?? false;
}

/** Assigned roles cannot change the human agreement they received. */
export function canReplaceDecisionAgreement(actor: DecisionActorAccess): boolean {
  return actor.manage_all;
}

export function filterDecisionQueueForActor(
  projection: DecisionQueueProjection,
  actor: DecisionActorAccess,
): DecisionQueueProjection {
  if (actor.manage_all) return projection;

  const decisions = projection.decisions.filter((decision) => canViewDecision(actor, decision));
  const visibleIds = new Set(decisions.map((decision) => decision.decision_id));
  const queue_buckets = Object.fromEntries(
    Object.entries(projection.queue_buckets).map(([bucket, ids]) => [
      bucket,
      ids.filter((id) => visibleIds.has(id)),
    ]),
  ) as DecisionQueueProjection["queue_buckets"];

  return {
    ...projection,
    decisions,
    queue_buckets,
    sla_flags: projection.sla_flags.filter((entry) => visibleIds.has(entry.decision_id)),
    feedback_to_cv86: projection.feedback_to_cv86.filter((entry) =>
      visibleIds.has(entry.decision_id),
    ),
    issues: projection.issues.filter(
      (issue) => issue.decision_id !== undefined && visibleIds.has(issue.decision_id),
    ),
  };
}

export function decisionSubjectId(decisionId: string): string {
  return `decision:${decisionId}`;
}

export function buildDecisionLifecycleEvent(input: {
  event_id: string;
  payload: DecisionEventPayload;
}): RecommendationLifecycleEvent {
  const payload = DecisionEventPayloadSchema.parse(input.payload);
  return VisitorEventSchema.parse({
    event_id: input.event_id,
    occurred_at: payload.occurred_at,
    schema_version: VISITOR_EVENT_SCHEMA_VERSION,
    subject: {
      // Operational identity, never a visitor identity.
      subject_id: decisionSubjectId(payload.decision_id),
      trust_level: "N4_transactional",
      is_authenticated: true,
    },
    context: {
      surface: "cms:visitor-intel:decisions",
      route: "/cms/visitor-intel/decisions",
    },
    kind: "recommendation.lifecycle",
    subtype: "decision",
    payload,
  }) as RecommendationLifecycleEvent;
}
