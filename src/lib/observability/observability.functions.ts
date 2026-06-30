/**
 * observability.functions.ts — Ola 4 · Etapa 7
 *
 * Server functions del módulo de Observabilidad y Hardening para el
 * panel administrativo (admin / super_admin). Todas las RPCs verifican
 * el rol server-side; ninguna usa SUPABASE_SERVICE_ROLE_KEY en flujos
 * de usuario.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type RpcFn = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

function rpc(supabase: unknown): RpcFn {
  return (supabase as { rpc: RpcFn }).rpc.bind(supabase);
}

export interface MarketplaceFunnel {
  window_days: number;
  searches: number;
  favorites: number;
  carts: number;
  payments: number;
  confirmed: number;
  leads: number;
}

export const getMarketplaceFunnel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number } | undefined) => ({
    days: Math.min(Math.max(Math.floor(input?.days ?? 30), 1), 365),
  }))
  .handler(async ({ data, context }): Promise<MarketplaceFunnel> => {
    const { data: row, error } = await rpc(context.supabase)(
      "admin_marketplace_funnel",
      { p_days: data.days },
    );
    if (error) throw new Error(`funnel_failed: ${error.message}`);
    const r = (row ?? {}) as Record<string, number>;
    return {
      window_days: Number(r.window_days ?? data.days),
      searches: Number(r.searches ?? 0),
      favorites: Number(r.favorites ?? 0),
      carts: Number(r.carts ?? 0),
      payments: Number(r.payments ?? 0),
      confirmed: Number(r.confirmed ?? 0),
      leads: Number(r.leads ?? 0),
    };
  });

export interface TopProduct {
  product_id: string;
  product_name: string;
  product_slug: string;
  business_name: string;
  metric: number;
}
export type TopProductKind = "most_added" | "most_reserved" | "most_abandoned";

export const getTopProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { kind?: TopProductKind; days?: number; limit?: number } | undefined) => ({
      kind: (input?.kind ?? "most_reserved") as TopProductKind,
      days: Math.min(Math.max(Math.floor(input?.days ?? 30), 1), 365),
      limit: Math.min(Math.max(Math.floor(input?.limit ?? 10), 1), 50),
    }),
  )
  .handler(async ({ data, context }): Promise<TopProduct[]> => {
    const { data: rows, error } = await rpc(context.supabase)(
      "admin_top_products",
      { p_kind: data.kind, p_days: data.days, p_limit: data.limit },
    );
    if (error) throw new Error(`top_products_failed: ${error.message}`);
    const list = (Array.isArray(rows) ? rows : []) as Array<Record<string, unknown>>;
    return list.map((r) => ({
      product_id: String(r.product_id),
      product_name: String(r.product_name ?? ""),
      product_slug: String(r.product_slug ?? ""),
      business_name: String(r.business_name ?? ""),
      metric: Number(r.metric ?? 0),
    }));
  });

export interface SearchMetricsSummary {
  window_days: number;
  total: number;
  zero_results: number;
  zero_results_rate: number;
  p50_ms: number;
  p95_ms: number;
  top_zero_terms: Array<{ q: string; count: number }>;
}

export const getSearchMetricsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number } | undefined) => ({
    days: Math.min(Math.max(Math.floor(input?.days ?? 7), 1), 90),
  }))
  .handler(async ({ data, context }): Promise<SearchMetricsSummary> => {
    const { data: row, error } = await rpc(context.supabase)(
      "admin_search_metrics_summary",
      { p_days: data.days },
    );
    if (error) throw new Error(`search_metrics_failed: ${error.message}`);
    const r = (row ?? {}) as Record<string, unknown>;
    const top = Array.isArray(r.top_zero_terms) ? r.top_zero_terms : [];
    return {
      window_days: Number(r.window_days ?? data.days),
      total: Number(r.total ?? 0),
      zero_results: Number(r.zero_results ?? 0),
      zero_results_rate: Number(r.zero_results_rate ?? 0),
      p50_ms: Number(r.p50_ms ?? 0),
      p95_ms: Number(r.p95_ms ?? 0),
      top_zero_terms: (top as Array<Record<string, unknown>>).map((t) => ({
        q: String(t.q ?? ""),
        count: Number(t.count ?? 0),
      })),
    };
  });

export interface SystemAlert {
  id: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved";
  message: string;
  payload: Record<string, unknown>;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

function toAlert(r: Record<string, unknown>): SystemAlert {
  return {
    id: String(r.id),
    kind: String(r.kind),
    severity: (r.severity as SystemAlert["severity"]) ?? "info",
    status: (r.status as SystemAlert["status"]) ?? "open",
    message: String(r.message ?? ""),
    payload: (r.payload as Record<string, unknown>) ?? {},
    occurrences: Number(r.occurrences ?? 1),
    first_seen_at: String(r.first_seen_at),
    last_seen_at: String(r.last_seen_at),
    acknowledged_at: r.acknowledged_at ? String(r.acknowledged_at) : null,
    resolved_at: r.resolved_at ? String(r.resolved_at) : null,
  };
}

export const listSystemAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string } | undefined) => ({
    status:
      input?.status &&
      ["open", "acknowledged", "resolved", "all"].includes(input.status)
        ? input.status
        : "open",
  }))
  .handler(async ({ data, context }): Promise<SystemAlert[]> => {
    const { data: rows, error } = await rpc(context.supabase)(
      "admin_list_system_alerts",
      { p_status: data.status, p_limit: 200 },
    );
    if (error) throw new Error(`alerts_list_failed: ${error.message}`);
    return (Array.isArray(rows) ? rows : []).map((r) =>
      toAlert(r as Record<string, unknown>),
    );
  });

export const acknowledgeSystemAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await rpc(context.supabase)(
      "admin_acknowledge_system_alert",
      { p_id: data.id },
    );
    if (error) throw new Error(`ack_failed: ${error.message}`);
    return row ? toAlert(row as Record<string, unknown>) : null;
  });

export const resolveSystemAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await rpc(context.supabase)(
      "admin_resolve_system_alert",
      { p_id: data.id },
    );
    if (error) throw new Error(`resolve_failed: ${error.message}`);
    return row ? toAlert(row as Record<string, unknown>) : null;
  });

export const evaluateFunctionalAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { windowMinutes?: number } | undefined) => ({
    windowMinutes: Math.min(
      Math.max(Math.floor(input?.windowMinutes ?? 60), 5),
      24 * 60,
    ),
  }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await rpc(context.supabase)(
      "admin_evaluate_functional_alerts",
      { p_window_minutes: data.windowMinutes },
    );
    if (error) throw new Error(`eval_alerts_failed: ${error.message}`);
    return (row ?? {}) as Record<string, unknown>;
  });
