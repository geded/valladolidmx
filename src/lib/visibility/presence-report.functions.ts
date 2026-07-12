/**
 * presence-report.functions.ts — Ola 7.7
 *
 * Reporte de presencia del negocio (impresiones, clicks, menciones de
 * Alux, shares) con niveles de profundidad según el plan de visibilidad
 * activo de la empresa. Todos ven KPIs básicos; los niveles superiores
 * amplían la ventana temporal y desbloquean fuentes/países.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlanSlug = "basico" | "destacado" | "premium" | "elite";

export interface PresenceTier {
  planSlug: PlanSlug;
  planName: string;
  windowDaysAllowed: number[]; // ventanas permitidas
  maxWindowDays: number;
  showCountries: boolean;
  showSources: boolean;
  showAluxMentions: boolean;
  showShares: boolean;
}

const TIERS: Record<PlanSlug, PresenceTier> = {
  basico: {
    planSlug: "basico",
    planName: "Básico",
    windowDaysAllowed: [7, 30],
    maxWindowDays: 30,
    showCountries: false,
    showSources: false,
    showAluxMentions: false,
    showShares: false,
  },
  destacado: {
    planSlug: "destacado",
    planName: "Destacado",
    windowDaysAllowed: [7, 30, 90],
    maxWindowDays: 90,
    showCountries: true,
    showSources: true,
    showAluxMentions: false,
    showShares: false,
  },
  premium: {
    planSlug: "premium",
    planName: "Premium",
    windowDaysAllowed: [7, 30, 90, 365],
    maxWindowDays: 365,
    showCountries: true,
    showSources: true,
    showAluxMentions: true,
    showShares: true,
  },
  elite: {
    planSlug: "elite",
    planName: "Élite",
    windowDaysAllowed: [7, 30, 90, 365, 730],
    maxWindowDays: 730,
    showCountries: true,
    showSources: true,
    showAluxMentions: true,
    showShares: true,
  },
};

export function getTierForSlug(slug: string | null | undefined): PresenceTier {
  const key = (slug ?? "basico") as PlanSlug;
  return TIERS[key] ?? TIERS.basico;
}

export interface PresenceReport {
  window_days: number;
  tier: PresenceTier;
  totals: {
    impressions: number;
    whatsapp: number;
    map: number;
    web: number;
    phone: number;
    alux: number;
    share: number;
  };
  series: Array<{ date: string; impressions: number; interactions: number }>;
  top_sources: Array<{ source: string; count: number }>;
  countries: Array<{ country_code: string; count: number }>;
}

export const getBusinessPresenceReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { businessId: string; windowDays?: number }) => input,
  )
  .handler(async ({ data, context }): Promise<PresenceReport> => {
    // Resolver plan activo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supa: any = context.supabase;
    const { data: planRows } = await supa.rpc("get_business_active_plan", {
      _business_id: data.businessId,
    });
    const planRow = Array.isArray(planRows) ? planRows[0] : planRows;
    const tier = getTierForSlug(planRow?.plan_slug ?? "basico");
    const requested = data.windowDays ?? 30;
    const windowDays = Math.min(
      Math.max(requested, 1),
      tier.maxWindowDays,
    );

    const { data: rows, error } = await supa.rpc(
      "get_business_presence_report",
      { _business_id: data.businessId, _window_days: windowDays },
    );
    if (error) throw error;
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) throw new Error("Sin datos");

    // Consolidar series por día (sumando por event_type)
    type Ev = { date: string; event_type: string; count: number };
    const raw = (row.series ?? []) as Ev[];
    const byDay = new Map<
      string,
      { impressions: number; interactions: number }
    >();
    for (const e of raw) {
      const entry = byDay.get(e.date) ?? { impressions: 0, interactions: 0 };
      if (e.event_type === "impression") entry.impressions += Number(e.count);
      else entry.interactions += Number(e.count);
      byDay.set(e.date, entry);
    }
    const series = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    return {
      window_days: windowDays,
      tier,
      totals: {
        impressions: Number(row.total_impressions ?? 0),
        whatsapp: Number(row.total_whatsapp ?? 0),
        map: Number(row.total_map ?? 0),
        web: Number(row.total_web ?? 0),
        phone: Number(row.total_phone ?? 0),
        alux: Number(row.total_alux ?? 0),
        share: Number(row.total_share ?? 0),
      },
      series,
      top_sources: tier.showSources ? (row.top_sources ?? []) : [],
      countries: tier.showCountries ? (row.countries ?? []) : [],
    };
  });