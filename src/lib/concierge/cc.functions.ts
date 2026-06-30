/**
 * 15.10.4 Fase 2 — Ciclo "Arma tu Viaje" end-to-end.
 * Server functions del contrato público `cc_*` (Adenda 15.10.4).
 * Toda autorización vive en las RPCs SECURITY DEFINER de la base.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const PlanItem = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).optional(),
  kind: z.enum(["reservable", "non_reservable"]).optional(),
  product_id: z.string().uuid().optional().nullable(),
  business_id: z.string().uuid().optional().nullable(),
});

const CreateInput = z.object({
  summary: z.string().min(8).max(500),
  items: z.array(PlanItem).max(20).default([]),
  travelPlanId: z.string().uuid().optional().nullable(),
});

export const ccCreateCaseFromPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("cc_case_create_from_plan", {
      _summary: data.summary,
      _items: (data.items ?? []) as unknown as Json,
      _travel_plan_id: data.travelPlanId ?? undefined,
    } as never);
    if (error) throw new Error(error.message);
    return id as string;
  });

export const ccCaseAssign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        caseId: z.string().uuid(),
        conciergeUserId: z.string().uuid(),
        reason: z.string().max(1000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("cc_case_assign", {
      _case_id: data.caseId,
      _concierge_user_id: data.conciergeUserId,
      _reason: data.reason ?? undefined,
    } as never);
    if (error) throw new Error(error.message);
    return id as string;
  });

const ProposalItem = z.object({
  quote_id: z.string().uuid(),
  notes: z.string().max(1000).optional().nullable(),
});

export const ccCreateProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        caseId: z.string().uuid(),
        items: z.array(ProposalItem).min(1),
        summary: z.string().max(1000).optional().nullable(),
        terms: z.string().max(4000).optional().nullable(),
        validUntil: z.string().datetime().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: pid, error } = await context.supabase.rpc("cc_create_proposal", {
      _case_id: data.caseId,
      _items: data.items as unknown as Json,
      _summary: data.summary ?? undefined,
      _terms: data.terms ?? undefined,
      _valid_until: data.validUntil ?? undefined,
    } as never);
    if (error) throw new Error(error.message);
    return pid as string;
  });

const PropId = z.object({ proposalId: z.string().uuid() });

export const ccSendProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PropId.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cc_send_proposal", {
      _proposal_id: data.proposalId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const ccAcceptProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PropId.parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("cc_accept_proposal", {
      _proposal_id: data.proposalId,
    } as never);
    if (error) throw new Error(error.message);
    return res as Json;
  });

export const ccRejectProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        proposalId: z.string().uuid(),
        reason: z.string().max(1000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cc_reject_proposal", {
      _proposal_id: data.proposalId,
      _reason: data.reason ?? undefined,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const ccQuoteRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        requestId: z.string().uuid(),
        businessId: z.string().uuid(),
        validForHours: z.number().int().min(1).max(720).default(72),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("cc_quote_request", {
      _request_id: data.requestId,
      _business_id: data.businessId,
      _valid_for_hours: data.validForHours,
    } as never);
    if (error) throw new Error(error.message);
    return id as string;
  });

export const ccQuoteSubmit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        quoteId: z.string().uuid(),
        totalAmountCents: z.number().int().min(0),
        currency: z.string().length(3).default("MXN"),
        notes: z.string().max(4000).optional().nullable(),
        terms: z.string().max(4000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cc_quote_submit", {
      _quote_id: data.quoteId,
      _total_amount_cents: data.totalAmountCents,
      _currency: data.currency,
      _notes: data.notes ?? undefined,
      _terms: data.terms ?? undefined,
      _payload: {} as never,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const ccSetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        caseId: z.string().uuid(),
        status: z.enum([
          "new",
          "triaged",
          "in_progress",
          "awaiting_traveler",
          "awaiting_business",
          "closed_won",
          "closed_lost",
          "archived",
        ]),
        reason: z.string().max(1000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cc_case_set_status", {
      _case_id: data.caseId,
      _status: data.status,
      _reason: data.reason ?? undefined,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const ccTimelineAppend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        caseId: z.string().uuid(),
        eventType: z.string().min(1).max(80),
        summary: z.string().max(1000).optional().nullable(),
        severity: z.enum(["info", "warning", "critical"]).default("info"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("cc_timeline_append", {
      _case_id: data.caseId,
      _event_type: data.eventType,
      _summary: data.summary ?? undefined,
      _payload: {} as never,
      _severity: data.severity,
    } as never);
    if (error) throw new Error(error.message);
    return id as string;
  });

export const ccCaseEvaluate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        caseId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        nps: z.number().int().min(0).max(10).optional().nullable(),
        comment: z.string().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("cc_case_evaluate", {
      _case_id: data.caseId,
      _rating: data.rating,
      _nps: data.nps ?? undefined,
      _comment: data.comment ?? undefined,
      _payload: {} as never,
    } as never);
    if (error) throw new Error(error.message);
    return id as string;
  });

/** Lista los casos del turista autenticado (para /mi-viaje). */
export const ccListMyCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc(
      "concierge_case_list_for_role",
      { _scope: "traveler", _limit: 50 } as never,
    );
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Array<{
      id: string;
      status: string;
      priority: string;
      summary: string | null;
      created_at: string;
      updated_at: string;
    }>;
  });