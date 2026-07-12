/**
 * plan-limits.ts — Ola 7 · Sub-ola 7.4.b
 *
 * Helpers server-safe para aplicar límites duros derivados del plan de
 * visibilidad efectivo de un negocio. Se llama desde los server functions
 * de editores (media, productos, promociones) ANTES de crear un nuevo
 * registro. Si el negocio alcanzó el límite del plan vigente, lanza un
 * error `plan_limit_reached:<key>:<max>` que el UI traduce a mensaje humano.
 *
 * Reglas:
 *  - Usa el mismo cliente Supabase autenticado que recibe el handler
 *    (RLS aplica; no requiere service role).
 *  - Nunca falla-open ante un error de RPC: si la consulta al plan efectivo
 *    falla, deja pasar la operación (mejor experiencia degradada que
 *    bloqueo). El endpoint escritor sigue validando permisos vía RPC.
 *  - Los límites vienen del catálogo editable `visibility_plans.limits`
 *    (JSONB), consumidos vía la RPC `get_business_active_plan`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export type PlanLimitKey =
  | "max_photos"
  | "max_products"
  | "max_active_coupons"
  | "max_events"
  | "max_featured_campaigns";

export type EffectiveLimits = Partial<Record<PlanLimitKey, number>> & {
  plan_slug?: string;
  plan_name?: string;
};

/**
 * Devuelve los límites JSONB del plan efectivo. Fallback: {} si no se
 * puede resolver (no bloqueamos escritura por un fallo de lectura del plan).
 */
export async function getEffectiveLimits(
  supabase: AnySupabase,
  businessId: string,
): Promise<EffectiveLimits> {
  try {
    const { data, error } = await supabase.rpc("get_business_active_plan", {
      _business_id: businessId,
    });
    if (error) return {};
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return {};
    const limits = (row.limits ?? {}) as Record<string, unknown>;
    const out: EffectiveLimits = {
      plan_slug: row.plan_slug as string | undefined,
      plan_name: row.plan_name as string | undefined,
    };
    for (const k of Object.keys(limits)) {
      const n = Number(limits[k]);
      if (Number.isFinite(n)) (out as Record<string, number>)[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Lanza si `currentCount >= max` para la palanca dada. Un valor <= 0 en el
 * catálogo significa "sin límite" (ilimitado).
 */
export function assertUnderLimit(
  limits: EffectiveLimits,
  key: PlanLimitKey,
  currentCount: number,
): void {
  const max = limits[key];
  if (max === undefined || max === null) return;
  if (!Number.isFinite(max) || max <= 0) return;
  if (currentCount >= max) {
    const err = new Error(
      `plan_limit_reached:${key}:${max}:${limits.plan_slug ?? "unknown"}`,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = "plan_limit_reached";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).limitKey = key;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).max = max;
    throw err;
  }
}

/**
 * Traducciones humanas de las palancas para mensajes de error en UI.
 */
export const PLAN_LIMIT_LABELS: Record<PlanLimitKey, string> = {
  max_photos: "fotografías",
  max_products: "productos publicables",
  max_active_coupons: "promociones activas",
  max_events: "eventos",
  max_featured_campaigns: "campañas destacadas",
};