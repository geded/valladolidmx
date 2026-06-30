/**
 * 14.50.6 — UNC · Intelligent Activity Center
 * Feed estructurado para Alux + agregaciones por rol (resúmenes y agrupación).
 * Todas las funciones consumen RPCs SECURITY DEFINER; la autorización vive
 * en la base de datos.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Scope = "admin" | "business" | "traveler";

export interface AluxFeedItem {
  event_id: string;
  event_type: string;
  category: string;
  severity: string;
  subject_type: string;
  subject_id: string;
  occurred_at: string;
  summary: string;
  payload: Record<string, unknown>;
  read_state: string;
}

export interface PeriodSummary {
  bucket_start: string;
  category: string;
  severity: string;
  event_count: number;
}

export interface SubjectGroup {
  subject_type: string;
  subject_id: string;
  event_count: number;
  last_occurred_at: string;
  last_severity: string | null;
  last_summary: string | null;
}

const clampLimit = (n: number | undefined, max = 500) =>
  Math.min(Math.max(n ?? 100, 1), max);

const normalizeScope = (s: string | undefined): Scope => {
  const v = (s ?? "traveler").toLowerCase();
  if (v === "admin" || v === "business" || v === "traveler") return v;
  throw new Error("scope inválido");
};

export const getAluxActivityFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { scope?: Scope; businessId?: string | null; sinceISO?: string | null; limit?: number } | undefined) => ({
      scope: normalizeScope(input?.scope),
      businessId: input?.businessId ?? null,
      sinceISO: input?.sinceISO ?? null,
      limit: clampLimit(input?.limit, 500),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("unc_activity_feed_for_alux", {
      _scope: data.scope,
      _business_id: data.businessId,
      _since: data.sinceISO,
      _limit: data.limit,
    });
    if (error) throw error;
    return { items: (rows ?? []) as AluxFeedItem[] };
  });

export const getActivitySummaryByPeriod = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { scope?: Scope; businessId?: string | null; sinceISO?: string | null; bucket?: "day" | "week" } | undefined) => ({
      scope: normalizeScope(input?.scope),
      businessId: input?.businessId ?? null,
      sinceISO: input?.sinceISO ?? null,
      bucket: input?.bucket === "week" ? "week" : "day",
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("unc_activity_summary_by_period", {
      _scope: data.scope,
      _business_id: data.businessId,
      _since: data.sinceISO,
      _bucket: data.bucket,
    });
    if (error) throw error;
    return { items: (rows ?? []) as PeriodSummary[] };
  });

export const getActivityGroupBySubject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { scope?: Scope; businessId?: string | null; sinceISO?: string | null; limit?: number } | undefined) => ({
      scope: normalizeScope(input?.scope),
      businessId: input?.businessId ?? null,
      sinceISO: input?.sinceISO ?? null,
      limit: clampLimit(input?.limit, 200),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("unc_activity_group_by_subject", {
      _scope: data.scope,
      _business_id: data.businessId,
      _since: data.sinceISO,
      _limit: data.limit,
    });
    if (error) throw error;
    return { items: (rows ?? []) as SubjectGroup[] };
  });
