/**
 * visibility-performance.functions.ts
 *
 * Rendimiento de la visibilidad contratada: cuántas veces se mostró cada
 * ficha, dónde apareció y cuántos clics recibió. Dos lecturas:
 *
 *  - Administración: por contrato de visibilidad (todas las empresas).
 *  - Empresa: sus propias apariciones por sección y tipo de espacio.
 *
 * No crea fuentes nuevas: lee `business_view_events`, la misma tabla que
 * alimenta el reporte de presencia (Ola 7.7).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlacementKind = "contratado" | "fijado" | "editorial" | "organico";

export interface SurfaceBreakdown {
  surface: string;
  impressions: number;
  clicks: number;
}

export interface AdminVisibilityPerformanceRow {
  grant_id: string;
  business_id: string;
  business_name: string | null;
  business_slug: string | null;
  plan_slug: string | null;
  plan_name: string | null;
  status: string;
  starts_at: string;
  expires_at: string | null;
  impressions: number;
  clicks: number;
  last_seen: string | null;
  surfaces: SurfaceBreakdown[];
}

export const getAdminVisibilityPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { windowDays?: number }) => input ?? {})
  .handler(async ({ data, context }): Promise<AdminVisibilityPerformanceRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supa: any = context.supabase;
    const windowDays = Math.min(Math.max(data?.windowDays ?? 30, 1), 365);
    const { data: rows, error } = await supa.rpc("admin_visibility_performance", {
      _window_days: windowDays,
    });
    if (error) {
      throw new Error(
        /forbidden/i.test(error.message ?? "") ? "forbidden" : (error.message ?? "error"),
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((rows ?? []) as any[]).map((r) => ({
      grant_id: r.grant_id,
      business_id: r.business_id,
      business_name: r.business_name ?? null,
      business_slug: r.business_slug ?? null,
      plan_slug: r.plan_slug ?? null,
      plan_name: r.plan_name ?? null,
      status: r.status,
      starts_at: r.starts_at,
      expires_at: r.expires_at ?? null,
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
      last_seen: r.last_seen ?? null,
      surfaces: Array.isArray(r.surfaces)
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r.surfaces as any[]).map((s) => ({
            surface: String(s.surface ?? "sin-superficie"),
            impressions: Number(s.impressions ?? 0),
            clicks: Number(s.clicks ?? 0),
          }))
        : [],
    }));
  });

export interface BusinessPlacementRow {
  surface: string;
  placement: PlacementKind;
  impressions: number;
  clicks: number;
}

export const getBusinessVisibilityPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; windowDays?: number }) => input)
  .handler(async ({ data, context }): Promise<BusinessPlacementRow[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supa: any = context.supabase;
    const windowDays = Math.min(Math.max(data.windowDays ?? 30, 1), 365);
    const { data: rows, error } = await supa.rpc("business_visibility_performance", {
      _business_id: data.businessId,
      _window_days: windowDays,
    });
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((rows ?? []) as any[]).map((r) => ({
      surface: String(r.surface ?? "sin-superficie"),
      placement: (r.placement ?? "organico") as PlacementKind,
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
    }));
  });

export function ctr(impressions: number, clicks: number): number {
  if (!impressions) return 0;
  return Math.round((clicks / impressions) * 1000) / 10;
}
