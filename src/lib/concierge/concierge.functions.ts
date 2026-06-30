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
      _notes: data.notes ?? null,
      _terms: data.terms ?? null,
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
      _reason: data.reason ?? null,
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