/**
 * CV1.1 · Vista Operativa "Viajes en curso"
 *
 * Server functions read-only del panel de operaciones de Travel Plans.
 * Autorización en RPC SECURITY DEFINER (super_admin/admin/concierge).
 * Cero mutaciones sobre el Travel Plan.
 *
 * Referencia: Travel Plan Contract v1.0 (mem://policies/travel-plan-contract).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- Tipos DTO ----

export interface TravelPlanOpsOverview {
  active_plans: number;
  plans_with_pending_alux: number;
  plans_with_open_concierge_case: number;
  proposals_awaiting_over_48h: number;
  proposals_acceptance_rate_30d: number | null;
  generated_at: string;
}

export type SlaRisk = "ok" | "at_risk" | "breached";
export type PriorityLevel = "critical" | "high" | "medium" | "low";
export type IntentLevel = "exploring" | "low" | "medium" | "high";
export type KpiFilter =
  | null
  | "active"
  | "pending_alux"
  | "open_case"
  | "proposals_sla"
  | "closed";

export interface TravelPlanOpsRow {
  plan_id: string;
  title: string | null;
  plan_status: string;
  start_date: string | null;
  end_date: string | null;
  party_size: number | null;
  updated_at: string;
  case_id: string | null;
  days_to_trip: number | null;
  traveler: {
    user_id: string;
    display_name: string;
    handle: string | null;
    avatar_url: string | null;
    language: string | null;
    country: string | null;
  };
  concierge: {
    status: string | null;
    priority: string | null;
    target_response_at: string | null;
    last_activity_at: string | null;
  };
  proposal: {
    id: string | null;
    status: string | null;
    sent_at: string | null;
    valid_until: string | null;
  };
  pending_alux_count: number;
  items_count: number;
  intent_level: IntentLevel;
  sla_risk: SlaRisk;
  priority: PriorityLevel;
}

export interface TravelPlanOpsList {
  rows: TravelPlanOpsRow[];
  total: number;
  limit: number;
  offset: number;
  is_admin: boolean;
}

export interface TravelPlanOpsDetail {
  plan: {
    id: string;
    title: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    party_size: number | null;
    notes: string | null;
    updated_at: string;
    created_at: string;
    case_id: string | null;
  };
  traveler: {
    user_id: string;
    display_name: string;
    handle?: string | null;
    avatar_url?: string | null;
    language?: string | null;
    country?: string | null;
    email?: string | null;
  };
  items: Array<{
    id: string;
    item_kind: string;
    target_id: string | null;
    position: number;
    day_index: number | null;
    notes: string | null;
    snapshot: unknown;
    created_at: string;
  }>;
  alux_proposals: Array<{
    id: string;
    entity_type: string | null;
    entity_id: string | null;
    title: string | null;
    subtitle: string | null;
    rationale: string | null;
    status: string;
    created_at: string;
    decided_at: string | null;
  }>;
  concierge_case: {
    id: string;
    status: string;
    priority: string | null;
    summary: string | null;
    target_response_at: string | null;
    last_activity_at: string | null;
    assignees: Array<{ user_id: string; assigned_at: string }> | null;
  } | null;
  latest_concierge_proposal: {
    id: string;
    status: string;
    version: number;
    currency: string | null;
    total_amount_cents: number | null;
    valid_until: string | null;
    sent_at: string | null;
    responded_at: string | null;
    summary: string | null;
    items: Array<{
      id: string;
      position: number;
      amount_cents: number | null;
      currency: string | null;
      notes: string | null;
    }> | null;
  } | null;
  timeline: Array<{
    event_type: string;
    severity: string | null;
    summary: string | null;
    occurred_at: string;
  }>;
  generated_at: string;
}

// ---- Validators ----

const ListInput = z.object({
  kpi_filter: z
    .enum(["active", "pending_alux", "open_case", "proposals_sla", "closed"])
    .nullable()
    .optional(),
  plan_status: z.string().nullable().optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).nullable().optional(),
  only_mine: z.boolean().optional(),
  include_closed: z.boolean().optional(),
  search: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

const DetailInput = z.object({ plan_id: z.string().uuid() });

// ---- Server functions ----

export const getTravelPlansOpsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc(
      "admin_travel_plan_overview",
    );
    if (error) throw new Error(error.message);
    return data as unknown as TravelPlanOpsOverview;
  });

export const listActiveTravelPlansForOps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ListInput.parse(data))
  .handler(async ({ data, context }) => {
    const args: Record<string, unknown> = {
      p_kpi_filter: data.kpi_filter ?? null,
      p_plan_status: data.plan_status ?? null,
      p_priority: data.priority ?? null,
      p_only_mine: data.only_mine ?? false,
      p_include_closed: data.include_closed ?? false,
      p_search: data.search ?? null,
      p_limit: data.limit ?? 25,
      p_offset: data.offset ?? 0,
    };
    const { data: res, error } = await context.supabase.rpc(
      "admin_list_active_travel_plans",
      args as never,
    );
    if (error) throw new Error(error.message);
    return res as unknown as TravelPlanOpsList;
  });

export const getTravelPlanOperationalDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DetailInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc(
      "admin_get_travel_plan_detail",
      { p_plan_id: data.plan_id },
    );
    if (error) throw new Error(error.message);
    return res as unknown as TravelPlanOpsDetail;
  });