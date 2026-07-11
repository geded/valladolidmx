/**
 * coupon-metrics.functions.ts — Ola 5 · Métricas de cupones para empresas.
 *
 * KPIs agregados de `traveler_coupons` para el dashboard `/portal/metricas`.
 * RLS ya limita a los business_users del negocio; aquí sólo agregamos.
 *
 * Devuelve:
 *  - totales por estado (issued / active / redeemed / expired)
 *  - tasa de conversión (redeemed / issued)
 *  - serie diaria (últimos N días) con emitidos y canjeados
 *  - top promociones por canjes
 *  - países de los viajeros que canjearon (agregado)
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CouponMetricsSeriesPoint {
  date: string; // YYYY-MM-DD
  issued: number;
  redeemed: number;
}

export interface CouponMetricsTopPromo {
  promotion_slug: string;
  title: string;
  issued: number;
  redeemed: number;
  conversion: number; // 0..1
}

export interface CouponMetricsCountry {
  country_code: string; // ISO-2 upper, "??" si desconocido
  count: number;
}

export interface CouponMetrics {
  window_days: number;
  totals: {
    issued: number;
    active: number;
    redeemed: number;
    expired: number;
    conversion: number; // 0..1
  };
  series: CouponMetricsSeriesPoint[];
  top_promotions: CouponMetricsTopPromo[];
  countries: CouponMetricsCountry[];
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const getBusinessCouponMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { business_id: string; window_days?: number }) => {
      const business_id = String(input?.business_id ?? "").trim();
      if (!business_id) throw new Error("invalid_business");
      const window_days = Math.min(
        Math.max(Number(input?.window_days ?? 30), 7),
        180,
      );
      return { business_id, window_days };
    },
  )
  .handler(async ({ data, context }): Promise<CouponMetrics> => {
    const now = new Date();
    const from = new Date(now.getTime() - data.window_days * 24 * 60 * 60 * 1000);
    const fromIso = from.toISOString();

    // Cupones creados en la ventana (para emisión / activos / expirados).
    const { data: issuedRows, error: e1 } = await context.supabase
      .from("traveler_coupons")
      .select(
        "id, status, created_at, redeemed_at, promotion_slug, title, user_id",
      )
      .eq("business_id", data.business_id)
      .gte("created_at", fromIso)
      .limit(5000);
    if (e1) throw new Error(`metrics_issued_failed: ${e1.message}`);

    // Canjes en la ventana (pueden haberse emitido antes).
    const { data: redeemedRows, error: e2 } = await context.supabase
      .from("traveler_coupons")
      .select("id, redeemed_at, promotion_slug, title, user_id")
      .eq("business_id", data.business_id)
      .eq("status", "redeemed")
      .gte("redeemed_at", fromIso)
      .limit(5000);
    if (e2) throw new Error(`metrics_redeemed_failed: ${e2.message}`);

    const issued = (issuedRows ?? []) as Array<{
      id: string;
      status: string;
      created_at: string;
      redeemed_at: string | null;
      promotion_slug: string;
      title: string;
      user_id: string;
    }>;
    const redeemed = (redeemedRows ?? []) as Array<{
      id: string;
      redeemed_at: string;
      promotion_slug: string;
      title: string;
      user_id: string;
    }>;

    // Totales.
    const totals = {
      issued: issued.length,
      active: issued.filter((r) => r.status === "active").length,
      redeemed: issued.filter((r) => r.status === "redeemed").length,
      expired: issued.filter((r) => r.status === "expired").length,
      conversion: 0,
    };
    totals.conversion = totals.issued > 0 ? totals.redeemed / totals.issued : 0;

    // Serie diaria.
    const days: string[] = [];
    for (let i = data.window_days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days.push(isoDay(d));
    }
    const seriesMap = new Map<string, CouponMetricsSeriesPoint>();
    for (const d of days) seriesMap.set(d, { date: d, issued: 0, redeemed: 0 });
    for (const r of issued) {
      const k = r.created_at.slice(0, 10);
      const p = seriesMap.get(k);
      if (p) p.issued++;
    }
    for (const r of redeemed) {
      const k = r.redeemed_at.slice(0, 10);
      const p = seriesMap.get(k);
      if (p) p.redeemed++;
    }
    const series = Array.from(seriesMap.values());

    // Top promociones (por canjes; empatan por emitidos).
    const promoAgg = new Map<
      string,
      { title: string; issued: number; redeemed: number }
    >();
    for (const r of issued) {
      const p = promoAgg.get(r.promotion_slug) ?? {
        title: r.title,
        issued: 0,
        redeemed: 0,
      };
      p.issued++;
      if (r.status === "redeemed") p.redeemed++;
      promoAgg.set(r.promotion_slug, p);
    }
    // También sumar canjes cuya emisión cayó antes de la ventana.
    for (const r of redeemed) {
      if (!promoAgg.has(r.promotion_slug)) {
        promoAgg.set(r.promotion_slug, {
          title: r.title,
          issued: 0,
          redeemed: 0,
        });
      }
    }
    const top_promotions: CouponMetricsTopPromo[] = Array.from(
      promoAgg.entries(),
    )
      .map(([slug, v]) => ({
        promotion_slug: slug,
        title: v.title,
        issued: v.issued,
        redeemed: v.redeemed,
        conversion: v.issued > 0 ? v.redeemed / v.issued : 0,
      }))
      .sort((a, b) => b.redeemed - a.redeemed || b.issued - a.issued)
      .slice(0, 5);

    // Países de quienes canjearon.
    const userIds = Array.from(new Set(redeemed.map((r) => r.user_id)));
    const countryMap = new Map<string, number>();
    if (userIds.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("user_id, country")
        .in("user_id", userIds);
      const cby = new Map<string, string | null>();
      for (const p of ((profs ?? []) as Array<{
        user_id: string;
        country: string | null;
      }>)) {
        cby.set(p.user_id, p.country);
      }
      for (const r of redeemed) {
        const c = cby.get(r.user_id);
        const key = c && c.length === 2 ? c.toUpperCase() : "??";
        countryMap.set(key, (countryMap.get(key) ?? 0) + 1);
      }
    }
    const countries: CouponMetricsCountry[] = Array.from(countryMap.entries())
      .map(([country_code, count]) => ({ country_code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      window_days: data.window_days,
      totals,
      series,
      top_promotions,
      countries,
    };
  });