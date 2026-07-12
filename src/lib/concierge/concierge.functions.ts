/**
 * 14.60.1 — Concierge Workspace · Fundaciones
 * Server functions sobre las RPCs SECURITY DEFINER del dominio Concierge.
 * Toda autorización vive en la base de datos.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ConciergeCaseScope = "traveler" | "concierge" | "lead" | "admin";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export interface ConciergeCase {
  id: string;
  traveler_user_id: string;
  status: string;
  priority: string;
  source: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

const ListInput = z.object({
  scope: z.enum(["traveler", "concierge", "lead", "admin"]).default("traveler"),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listConciergeCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ListInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc(
      "concierge_case_list_for_role",
      { _scope: data.scope, _limit: data.limit },
    );
    if (error) throw new Error(error.message);
    return ((rows ?? []) as unknown as ConciergeCase[]);
  });

const GetInput = z.object({ caseId: z.string().uuid() });

export const getConciergeCase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => GetInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("concierge_case_get", {
      _case_id: data.caseId,
    });
    if (error) throw new Error(error.message);
    return (row ?? null) as Json | null;
  });

/** 14.60.2 — Customer Case File compuesto. */
export const getConciergeCaseFile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => GetInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("concierge_case_file_v1", {
      _case_id: data.caseId,
    });
    if (error) throw new Error(error.message);
    return (row ?? null) as Json | null;
  });

/**
 * CV2.1 · Handoff Context — devuelve la última fotografía adjuntada al caso
 * (perfil M2, cupones activos, memoria territorial, plan snapshot).
 * RLS delegada a `concierge_case_get_handoff_context` (SECURITY DEFINER).
 */
export const getConciergeCaseHandoffContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => GetInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc(
      "concierge_case_get_handoff_context" as never,
      { _case_id: data.caseId } as never,
    );
    if (error) throw new Error((error as { message?: string }).message ?? "handoff_read_failed");
    return (row ?? null) as Json | null;
  });

const PlanItem = z.object({
  title: z.string().optional(),
  notes: z.string().optional(),
  kind: z.enum(["reservable", "non_reservable"]).optional(),
  product_id: z.string().uuid().optional().nullable(),
  business_id: z.string().uuid().optional().nullable(),
  source_ref: z.string().uuid().optional().nullable(),
});

const FromTravelPlanInput = z.object({
  travelPlanId: z.string().uuid().optional().nullable(),
  summary: z.string().min(1).max(500),
  items: z.array(PlanItem).optional().default([]),
});

export const createConciergeCaseFromTravelPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => FromTravelPlanInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: caseId, error } = await context.supabase.rpc(
      "concierge_case_from_travel_plan",
      {
        _traveler_user_id: context.userId,
        _summary: data.summary,
        _items: (data.items ?? []) as Json,
        ...(data.travelPlanId ? { _travel_plan_id: data.travelPlanId } : {}),
      },
    );
    if (error) throw new Error(error.message);
    return caseId as string;
  });

const FromProductInput = z.object({
  productId: z.string().uuid(),
  summary: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const createConciergeCaseFromProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => FromProductInput.parse(data))
  .handler(async ({ data, context }) => {
    const args = {
      _traveler_user_id: context.userId,
      _product_id: data.productId,
      _summary: data.summary ?? "",
      ...(data.notes ? { _notes: data.notes } : {}),
    };
    const { data: caseId, error } = await context.supabase.rpc(
      "concierge_case_from_marketplace_product",
      args,
    );
    if (error) throw new Error(error.message);
    return caseId as string;
  });

/* ============================================================
 * 14.60.3 — Solicitudes y Cotizaciones (Portal Empresarial)
 * ============================================================ */

const QuoteRequestInput = z.object({
  requestId: z.string().uuid(),
  businessId: z.string().uuid(),
  validForHours: z.number().int().min(1).max(720).default(72),
});

export const requestConciergeQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => QuoteRequestInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: quoteId, error } = await context.supabase.rpc(
      "concierge_quote_request",
      {
        _request_id: data.requestId,
        _business_id: data.businessId,
        _valid_for_hours: data.validForHours,
      },
    );
    if (error) throw new Error(error.message);
    return quoteId as string;
  });

const QuoteSubmitInput = z.object({
  quoteId: z.string().uuid(),
  totalAmountCents: z.number().int().min(0),
  currency: z.string().min(3).max(3).default("MXN"),
  notes: z.string().max(4000).optional().nullable(),
  terms: z.string().max(4000).optional().nullable(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const submitConciergeQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => QuoteSubmitInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("concierge_quote_submit", {
      _quote_id: data.quoteId,
      _total_amount_cents: data.totalAmountCents,
      _currency: data.currency,
      _notes: data.notes ?? undefined,
      _terms: data.terms ?? undefined,
      _payload: (data.payload ?? {}) as Json,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const QuoteWithdrawInput = z.object({
  quoteId: z.string().uuid(),
  reason: z.string().max(1000).optional().nullable(),
});

export const withdrawConciergeQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => QuoteWithdrawInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("concierge_quote_withdraw", {
      _quote_id: data.quoteId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export interface ConciergeBusinessQuote {
  quote_id: string;
  request_id: string;
  status: string;
  currency: string;
  total_amount_cents: number | null;
  valid_until: string | null;
  submitted_at: string | null;
  expired_at: string | null;
  created_at: string;
  notes: string | null;
  terms: string | null;
  request: {
    id: string;
    title: string;
    kind: string;
    product_id: string | null;
    notes: string | null;
  };
}

const BusinessQuotesInput = z.object({
  businessId: z.string().uuid(),
  scope: z.enum(["open", "submitted", "historical", "all"]).default("open"),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listBusinessConciergeQuotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => BusinessQuotesInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc(
      "concierge_quotes_list_for_business",
      {
        _business_id: data.businessId,
        _scope: data.scope,
        _limit: data.limit,
      },
    );
    if (error) throw new Error(error.message);
    return ((rows ?? []) as unknown as ConciergeBusinessQuote[]);
  });

/* ============================================================
 * 14.60.4 — Propuestas Concierge (Customer Case File ↔ Viajero)
 * ============================================================ */

const ProposalItem = z.object({
  quote_id: z.string().uuid(),
  notes: z.string().max(1000).optional().nullable(),
});

const ProposalCreateInput = z.object({
  caseId: z.string().uuid(),
  items: z.array(ProposalItem).min(1),
  summary: z.string().max(1000).optional().nullable(),
  terms: z.string().max(4000).optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  supersedesProposalId: z.string().uuid().optional().nullable(),
});

export const createConciergeProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ProposalCreateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: pid, error } = await context.supabase.rpc(
      "concierge_proposal_create",
      {
        _case_id: data.caseId,
        _items: data.items as unknown as Json,
        _summary: data.summary ?? undefined,
        _terms: data.terms ?? undefined,
        _valid_until: data.validUntil ?? undefined,
        _supersedes_proposal_id: data.supersedesProposalId ?? undefined,
      },
    );
    if (error) throw new Error(error.message);
    return pid as string;
  });

const ProposalIdInput = z.object({ proposalId: z.string().uuid() });

export const sendConciergeProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ProposalIdInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("concierge_proposal_send", {
      _proposal_id: data.proposalId,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const viewConciergeProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ProposalIdInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("concierge_proposal_view", {
      _proposal_id: data.proposalId,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const acceptConciergeProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ProposalIdInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc(
      "concierge_proposal_accept",
      { _proposal_id: data.proposalId },
    );
    if (error) throw new Error(error.message);
    return res as Json;
  });

const ProposalReasonInput = z.object({
  proposalId: z.string().uuid(),
  reason: z.string().max(1000).optional().nullable(),
});

export const rejectConciergeProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ProposalReasonInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("concierge_proposal_reject", {
      _proposal_id: data.proposalId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const withdrawConciergeProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ProposalReasonInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc(
      "concierge_proposal_withdraw",
      { _proposal_id: data.proposalId, _reason: data.reason ?? undefined },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const ProposalSupersedeInput = z.object({
  proposalId: z.string().uuid(),
  items: z.array(ProposalItem).min(1),
  summary: z.string().max(1000).optional().nullable(),
  terms: z.string().max(4000).optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
});

export const supersedeConciergeProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ProposalSupersedeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: pid, error } = await context.supabase.rpc(
      "concierge_proposal_supersede",
      {
        _proposal_id: data.proposalId,
        _new_items: data.items as unknown as Json,
        _summary: data.summary ?? undefined,
        _terms: data.terms ?? undefined,
        _valid_until: data.validUntil ?? undefined,
      },
    );
    if (error) throw new Error(error.message);
    return pid as string;
  });

/* ============================================================
 * 14.60.5 — Asignaciones, Prioridad y SLA
 * ============================================================ */

const PriorityEnum = z.enum(["low", "normal", "high", "urgent"]);
const PrioritySource = z.enum([
  "manual",
  "sla",
  "trip_date",
  "payment",
  "system",
  "alux",
  "other",
]);
const SlaStatus = z.enum(["on_time", "due_soon", "overdue"]);

const ListExtendedInput = z.object({
  scope: z
    .enum(["traveler", "concierge", "lead", "admin", "unassigned"])
    .default("traveler"),
  limit: z.number().int().min(1).max(200).default(50),
  sort: z
    .enum([
      "updated_at",
      "priority",
      "sla_status",
      "idle",
      "created_at",
      "trip_date",
      "assigned_concierge",
    ])
    .default("updated_at"),
  priority: z.array(PriorityEnum).optional(),
  slaStatus: z.array(SlaStatus).optional(),
  assignedConciergeUserId: z.string().uuid().optional().nullable(),
  minIdleMinutes: z.number().int().min(0).optional().nullable(),
});

export const listConciergeCasesExtended = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ListExtendedInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc(
      "concierge_case_list_for_role",
      {
        _scope: data.scope,
        _limit: data.limit,
        _sort: data.sort,
        _priority: data.priority ?? null,
        _sla_status: data.slaStatus ?? null,
        _assigned_concierge_user_id: data.assignedConciergeUserId ?? null,
        _min_idle_minutes: data.minIdleMinutes ?? null,
      } as never,
    );
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as Json[];
  });

const AssignInput = z.object({
  caseId: z.string().uuid(),
  conciergeUserId: z.string().uuid(),
  reason: z.string().max(1000).optional().nullable(),
});

export const assignConciergeCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => AssignInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("concierge_case_assign", {
      _case_id: data.caseId,
      _concierge_user_id: data.conciergeUserId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return id as string;
  });

export const reassignConciergeCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        caseId: z.string().uuid(),
        newConciergeUserId: z.string().uuid(),
        reason: z.string().max(1000).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc(
      "concierge_case_reassign",
      {
        _case_id: data.caseId,
        _new_concierge_user_id: data.newConciergeUserId,
        _reason: data.reason ?? undefined,
      },
    );
    if (error) throw new Error(error.message);
    return id as string;
  });

const ReleaseInput = z.object({
  caseId: z.string().uuid(),
  reason: z.string().max(1000).optional().nullable(),
});

export const releaseConciergeCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ReleaseInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("concierge_case_release", {
      _case_id: data.caseId,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const SetPriorityInput = z.object({
  caseId: z.string().uuid(),
  priority: PriorityEnum,
  source: PrioritySource.default("manual"),
  reason: z.string().max(1000).optional().nullable(),
});

export const setConciergeCasePriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SetPriorityInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc(
      "concierge_case_set_priority",
      {
        _case_id: data.caseId,
        _priority: data.priority,
        _source: data.source,
        _reason: data.reason ?? undefined,
      },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const SetTargetInput = z.object({
  caseId: z.string().uuid(),
  targetResponseAt: z.string().datetime().nullable(),
  reason: z.string().max(1000).optional().nullable(),
});

export const setConciergeCaseTargetResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SetTargetInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc(
      "concierge_case_set_target_response",
      {
        _case_id: data.caseId,
        _target_response_at: data.targetResponseAt ?? (undefined as unknown as string),
        _reason: data.reason ?? undefined,
      },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getConciergeMyWorkload = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("concierge_my_workload");
    if (error) throw new Error(error.message);
    return (data ?? null) as Json | null;
  });

export const getConciergeWorkloadForLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc(
      "concierge_workload_for_lead",
    );
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as Json[]);
  });