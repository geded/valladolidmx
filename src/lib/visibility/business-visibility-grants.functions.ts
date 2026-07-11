/**
 * business-visibility-grants.functions.ts — Ola 7 · Sub-ola 7.2.a
 *
 * Server functions para que un empresario consulte los paquetes
 * disponibles, vea el paquete activo de su empresa y solicite la
 * contratación (modo manual, sin Stripe todavía).
 *
 * Reglas:
 *  - Sólo miembros con acceso a la empresa pueden ver/solicitar.
 *  - La solicitud se guarda como grant `status='pending'` y
 *    `source='manual_request'`; un admin la activa desde /cms/visibilidad.
 *  - El cobro real (Stripe checkout) se implementará en Sub-ola 7.2.b.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { VisibilityPlan } from "./visibility-plans.functions";

export interface BusinessVisibilityGrant {
  id: string;
  business_id: string;
  plan_id: string;
  cycle: string;
  status: string;
  source: string;
  amount_paid_mxn: number | null;
  starts_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  notes: string | null;
  created_at: string;
  plan?: Pick<
    VisibilityPlan,
    "id" | "slug" | "name" | "badge_variant" | "color_token" | "base_price_mxn"
  > | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertBusinessAccess(context: any, businessId: string) {
  const { data, error } = await context.supabase
    .from("business_users")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("forbidden_business_access");
}

/**
 * Catálogo público de paquetes disponibles para contratación.
 * Devuelve sólo los planes activos y públicos, en orden.
 */
export const listAvailableVisibilityPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VisibilityPlan[]> => {
    const { data, error } = await context.supabase
      .from("visibility_plans")
      .select("*")
      .eq("is_active", true)
      .eq("is_public", true)
      .order("display_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as VisibilityPlan[];
  });

/**
 * Grant activo (o el más reciente pendiente/expirado) de la empresa.
 */
export const getBusinessActiveGrant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { business_id: string }) => {
    if (!input?.business_id) throw new Error("missing_business_id");
    return input;
  })
  .handler(async ({ data, context }): Promise<BusinessVisibilityGrant | null> => {
    await assertBusinessAccess(context as never, data.business_id);
    const { data: rows, error } = await context.supabase
      .from("business_visibility_grants")
      .select(
        "id, business_id, plan_id, cycle, status, source, amount_paid_mxn, starts_at, expires_at, auto_renew, notes, created_at, plan:visibility_plans(id, slug, name, badge_variant, color_token, base_price_mxn)",
      )
      .eq("business_id", data.business_id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    return ((rows ?? [])[0] as unknown as BusinessVisibilityGrant) ?? null;
  });

/**
 * Registra una solicitud manual de contratación. El grant queda en
 * estado `pending` a la espera de que un admin lo active.
 *
 * Bypassa RLS con el cliente admin porque no existe policy de INSERT
 * para miembros de la empresa (los grants los administra el equipo
 * interno). La autorización se hace explícita arriba.
 */
export const requestVisibilityGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      business_id: string;
      plan_id: string;
      cycle: string;
      notes?: string;
    }) => {
      if (!input?.business_id) throw new Error("missing_business_id");
      if (!input?.plan_id) throw new Error("missing_plan_id");
      if (!input?.cycle) throw new Error("missing_cycle");
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertBusinessAccess(context as never, data.business_id);

    // Validar que el plan exista y esté disponible.
    const { data: plan, error: planErr } = await context.supabase
      .from("visibility_plans")
      .select("id, slug, name, cycles, base_price_mxn, is_active, is_public")
      .eq("id", data.plan_id)
      .maybeSingle();
    if (planErr) throw planErr;
    if (!plan || !plan.is_active || !plan.is_public) {
      throw new Error("plan_unavailable");
    }
    const cycles = (plan.cycles ?? []) as Array<{ cycle: string }>;
    if (!cycles.some((c) => c.cycle === data.cycle)) {
      throw new Error("cycle_unavailable");
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row, error } = await supabaseAdmin
      .from("business_visibility_grants")
      .insert({
        business_id: data.business_id,
        plan_id: data.plan_id,
        cycle: data.cycle,
        status: "pending",
        source: "manual_request",
        notes: data.notes ?? null,
        created_by: context.userId,
        auto_renew: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id as string };
  });
