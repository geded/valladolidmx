/**
 * Monitor de usuarios · M2/M3/M4/M5 — Rendimiento de páginas.
 *
 * Lee `visitor_intel.events` (append-only) y recompone la lectura operativa:
 * visitas, visitantes distintos, lectura profunda, origen, dispositivo,
 * idioma y embudo turístico. No persiste métricas: recomputación total
 * (Founder Journey State Principle). No crea tablas paralelas.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  PAGE_TYPES,
  parsePageSurface,
  type DeviceClass,
  type PageType,
  type TrafficSource,
} from "./page-signals";
import { parseConsentPurpose } from "./session-signals";

export const PAGE_PERFORMANCE_CONTRACT_VERSION = "1.0.0" as const;

export interface PagePerformanceRow {
  route: string;
  page_type: PageType;
  views: number;
  visitors: number;
  engaged: number;
  /** Proporción de visitas con lectura profunda (0..1). */
  engagement_rate: number;
}

export interface PagePerformanceSnapshot {
  window_days: 7 | 30 | 90;
  computed_at: string;
  total_views: number;
  total_visitors: number;
  pages: PagePerformanceRow[];
  by_source: Record<TrafficSource, number>;
  by_device: Record<DeviceClass, number>;
  by_locale: Record<string, number>;
  funnel: {
    views: number;
    engaged: number;
    added_to_plan: number;
    plans_created: number;
    orders_paid: number;
  };
  /** A1–A3 · Avance de personas (hitos de sesión), no de páginas. */
  journey: {
    new_sessions: number;
    deep_explorers: number;
    anonymous_intents: number;
  };
  /** A5 · true cuando la muestra es menor a `MIN_SUBJECTS_FOR_READ`. */
  suppressed: boolean;
  contract_version: typeof PAGE_PERFORMANCE_CONTRACT_VERSION;
}

/** A5 · k-anonimato acreditado por el contrato CV8.1. */
export const MIN_SUBJECTS_FOR_READ = 25;

/** Devuelve la instantánea sin cifras cuando la muestra es insuficiente. */
export function suppressSmallSample(
  snapshot: PagePerformanceSnapshot,
): PagePerformanceSnapshot {
  if (snapshot.total_visitors >= MIN_SUBJECTS_FOR_READ) return snapshot;
  return {
    ...snapshot,
    total_views: 0,
    total_visitors: 0,
    pages: [],
    by_source: { campaign: 0, organic: 0, referral: 0, direct: 0 },
    by_device: { mobile: 0, tablet: 0, desktop: 0 },
    by_locale: {},
    funnel: { views: 0, engaged: 0, added_to_plan: 0, plans_created: 0, orders_paid: 0 },
    journey: { new_sessions: 0, deep_explorers: 0, anonymous_intents: 0 },
    suppressed: true,
  };
}

const InputSchema = z.object({
  window_days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  page_type: z.enum(PAGE_TYPES).optional(),
  route_prefix: z.string().min(1).max(200).optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

interface EventRow {
  subject_id: string;
  surface: string;
  route: string;
  locale: string | null;
  payload: unknown;
}

function emptySources(): Record<TrafficSource, number> {
  return { campaign: 0, organic: 0, referral: 0, direct: 0 };
}

function emptyDevices(): Record<DeviceClass, number> {
  return { mobile: 0, tablet: 0, desktop: 0 };
}

function actionOf(payload: unknown): string | null {
  const intent = (payload as { intent?: { action?: unknown } } | null)?.intent;
  return typeof intent?.action === "string" ? intent.action : null;
}

/** Núcleo puro: agrega filas ya filtradas. Reutilizado por admin y portal. */
export function aggregatePageRows(
  rows: EventRow[],
  windowDays: 7 | 30 | 90,
  limit: number,
  extra: { plans_created: number; orders_paid: number; new_sessions?: number },
): PagePerformanceSnapshot {
  const pages = new Map<
    string,
    { page_type: PageType; views: number; engaged: number; visitors: Set<string> }
  >();
  const bySource = emptySources();
  const byDevice = emptyDevices();
  const byLocale: Record<string, number> = {};
  const visitors = new Set<string>();
  let totalViews = 0;
  let totalEngaged = 0;
  let addedToPlan = 0;
  let deepExplorers = 0;

  for (const row of rows) {
    // A4 · sólo se agrega lo declarado con propósito de medición.
    const purpose = parseConsentPurpose(row.surface);
    if (purpose && purpose !== "measurement") continue;
    const action = actionOf(row.payload);
    if (action === "add_to_plan" || action === "favorite") {
      addedToPlan += 1;
      visitors.add(row.subject_id);
      continue;
    }
    if (action === "exploration_deepened") {
      deepExplorers += 1;
      visitors.add(row.subject_id);
      continue;
    }
    if (action !== "page_view" && action !== "page_engaged") continue;
    const parsed = parsePageSurface(row.surface);
    if (!parsed) continue;

    visitors.add(row.subject_id);
    const entry = pages.get(row.route) ?? {
      page_type: parsed.pageType,
      views: 0,
      engaged: 0,
      visitors: new Set<string>(),
    };
    entry.visitors.add(row.subject_id);
    if (action === "page_view") {
      entry.views += 1;
      totalViews += 1;
      bySource[parsed.source] += 1;
      byDevice[parsed.device] += 1;
      const locale = row.locale ?? "sin idioma";
      byLocale[locale] = (byLocale[locale] ?? 0) + 1;
    } else {
      entry.engaged += 1;
      totalEngaged += 1;
    }
    pages.set(row.route, entry);
  }

  const list: PagePerformanceRow[] = Array.from(pages.entries())
    .map(([route, value]) => ({
      route,
      page_type: value.page_type,
      views: value.views,
      visitors: value.visitors.size,
      engaged: value.engaged,
      engagement_rate: value.views > 0 ? Math.min(1, value.engaged / value.views) : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);

  return {
    window_days: windowDays,
    computed_at: new Date().toISOString(),
    total_views: totalViews,
    total_visitors: visitors.size,
    pages: list,
    by_source: bySource,
    by_device: byDevice,
    by_locale: byLocale,
    funnel: {
      views: totalViews,
      engaged: totalEngaged,
      added_to_plan: addedToPlan,
      plans_created: extra.plans_created,
      orders_paid: extra.orders_paid,
    },
    journey: {
      new_sessions: extra.new_sessions ?? 0,
      deep_explorers: deepExplorers,
      anonymous_intents: addedToPlan,
    },
    suppressed: false,
    contract_version: PAGE_PERFORMANCE_CONTRACT_VERSION,
  };
}

async function readEvents(
  since: string,
  filters: { route_prefix?: string },
): Promise<EventRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (supabaseAdmin as any)
    .schema("visitor_intel")
    .from("events")
    .select("subject_id, surface, route, locale, payload")
    .eq("kind", "intent.signal")
    .gte("occurred_at", since)
    .limit(20_000);
  if (filters.route_prefix) {
    query = query.like("route", `${filters.route_prefix}%`);
  }
  const { data, error } = (await query) as { data: EventRow[] | null; error: unknown };
  if (error) {
    console.error("[visitor_intel.page-performance] read failed", error);
    throw new Response("Read failed", { status: 500 });
  }
  return data ?? [];
}

async function readFunnelExtras(since: string): Promise<{
  plans_created: number;
  orders_paid: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [plans, orders] = await Promise.all([
    supabaseAdmin
      .from("travel_plans")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    supabaseAdmin
      .from("concierge_orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .not("paid_at", "is", null),
  ]);
  return {
    plans_created: plans.count ?? 0,
    orders_paid: orders.count ?? 0,
  };
}

/** Lectura administrativa (admin | super_admin). */
export const aggregatePagePerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<PagePerformanceSnapshot> => {
    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    if (!isAdmin && !isSuper) throw new Response("Forbidden", { status: 403 });

    const since = new Date(Date.now() - data.window_days * 86_400_000).toISOString();
    const [rows, extras] = await Promise.all([
      readEvents(since, { route_prefix: data.route_prefix }),
      readFunnelExtras(since),
    ]);
    const filtered = data.page_type
      ? rows.filter((row) => parsePageSurface(row.surface)?.pageType === data.page_type)
      : rows;
    return aggregatePageRows(filtered, data.window_days, data.limit, extras);
  });

const BusinessInputSchema = z.object({
  business_id: z.string().uuid(),
  window_days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});

/** Lectura para el empresario: sólo las páginas de su empresa. */
export const getBusinessPagePerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => BusinessInputSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<PagePerformanceSnapshot> => {
    const { data: membership } = await context.supabase
      .from("business_users")
      .select("business_id")
      .eq("business_id", data.business_id)
      .eq("status", "active")
      .maybeSingle();

    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    if (!membership && !isAdmin && !isSuper) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("slug")
      .eq("id", data.business_id)
      .maybeSingle();
    const slug = business?.slug;
    if (!slug) throw new Response("Not found", { status: 404 });

    const since = new Date(Date.now() - data.window_days * 86_400_000).toISOString();
    const rows = await readEvents(since, {});
    const own = rows.filter((row) => row.route.includes(slug));
    return aggregatePageRows(own, data.window_days, 25, { plans_created: 0, orders_paid: 0 });
  });
