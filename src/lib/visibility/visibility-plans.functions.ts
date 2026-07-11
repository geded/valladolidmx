/**
 * visibility-plans.functions.ts — Ola 7 · Sub-ola 7.1
 *
 * Server functions para gestionar el catálogo editable de paquetes
 * de visibilidad desde /cms/visibilidad.
 *
 * Reglas:
 *  - Sólo admin y super_admin pueden listar/editar el catálogo completo.
 *  - Los datos son 100% editables (nombre, precio, ciclos, límites, palancas,
 *    reglas comerciales, reportes). La lógica de negocio consume estos valores
 *    en runtime, no hay hardcodes por nivel.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type VisibilityCycle = {
  cycle: string;
  discount_pct: number;
  label: string;
};

export type VisibilityLimits = {
  max_photos?: number;
  max_products?: number;
  max_active_coupons?: number;
  max_events?: number;
  max_featured_campaigns?: number;
};

export type VisibilityLevers = {
  discovery_boost?: number;
  home_boost?: number;
  map_boost?: number;
  alux_weight?: number;
  alux_proactive?: boolean;
  alux_daily_cap?: number;
  badge_visible?: boolean;
  golden_pin?: boolean;
  in_emails?: boolean;
  cross_destination?: boolean;
  cross_radius_km?: number;
  search_weight?: number;
};

export type VisibilityCommercialRules = {
  auto_renew_default?: boolean;
  grace_days?: number;
  requires_admin_approval?: boolean;
};

export type VisibilityReporting = {
  bi_enabled?: boolean;
  csv_export?: boolean;
  monthly_email_report?: boolean;
};

export interface VisibilityPlan {
  id: string;
  slug: string;
  name: string;
  description_short: string | null;
  description_long: string | null;
  badge_variant: string;
  color_token: string;
  display_order: number;
  is_active: boolean;
  is_public: boolean;
  base_price_mxn: number;
  cycles: VisibilityCycle[];
  limits: VisibilityLimits;
  visibility_levers: VisibilityLevers;
  commercial_rules: VisibilityCommercialRules;
  reporting: VisibilityReporting;
  created_at: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  const { data: isSuper } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (!isAdmin && !isSuper) throw new Error("forbidden");
}

export const listVisibilityPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VisibilityPlan[]> => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("visibility_plans")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as VisibilityPlan[];
  });

export const upsertVisibilityPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<VisibilityPlan> & { id?: string; slug: string; name: string }) => {
    if (!input?.slug || !input?.name) throw new Error("invalid_input");
    return input;
  })
  .handler(async ({ data, context }): Promise<VisibilityPlan> => {
    await assertAdmin(context as never);
    const payload = {
      ...data,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    };
    const query = data.id
      ? context.supabase.from("visibility_plans").update(payload).eq("id", data.id).select("*").single()
      : context.supabase.from("visibility_plans").insert(payload).select("*").single();
    const { data: row, error } = await query;
    if (error) throw error;
    return row as unknown as VisibilityPlan;
  });

export const toggleVisibilityPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; field: "is_active" | "is_public"; value: boolean }) => {
    if (!input?.id) throw new Error("missing_id");
    if (input.field !== "is_active" && input.field !== "is_public") throw new Error("invalid_field");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const patch =
      data.field === "is_active"
        ? { is_active: data.value, updated_by: context.userId }
        : { is_public: data.value, updated_by: context.userId };
    const { error } = await context.supabase
      .from("visibility_plans")
      .update(patch)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const duplicateVisibilityPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("missing_id");
    return input;
  })
  .handler(async ({ data, context }): Promise<VisibilityPlan> => {
    await assertAdmin(context as never);
    const { data: source, error: srcErr } = await context.supabase
      .from("visibility_plans")
      .select("*")
      .eq("id", data.id)
      .single();
    if (srcErr || !source) throw srcErr ?? new Error("not_found");
    const src = source as unknown as VisibilityPlan;
    const newSlug = `${src.slug}-copia-${Date.now().toString(36)}`;
    const { data: row, error } = await context.supabase
      .from("visibility_plans")
      .insert({
        slug: newSlug,
        name: `${src.name} (copia)`,
        description_short: src.description_short,
        description_long: src.description_long,
        badge_variant: src.badge_variant,
        color_token: src.color_token,
        display_order: (src.display_order ?? 0) + 1,
        is_active: false,
        is_public: false,
        base_price_mxn: src.base_price_mxn,
        cycles: src.cycles,
        limits: src.limits,
        visibility_levers: src.visibility_levers,
        commercial_rules: src.commercial_rules,
        reporting: src.reporting,
        updated_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row as unknown as VisibilityPlan;
  });

export const reorderVisibilityPlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { order: Array<{ id: string; display_order: number }> }) => {
    if (!Array.isArray(input?.order)) throw new Error("invalid_order");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    for (const item of data.order) {
      await context.supabase
        .from("visibility_plans")
        .update({ display_order: item.display_order, updated_by: context.userId })
        .eq("id", item.id);
    }
    return { ok: true };
  });