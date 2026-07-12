/**
 * admin-grants.functions.ts — Ola 7 · Sub-ola 7.2.a.2
 *
 * Bandeja admin de solicitudes de visibilidad: listar, activar y rechazar
 * grants creados manualmente. Restringido a admin / super_admin.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminGrantRow {
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
  cancelled_reason: string | null;
  created_at: string;
  business: { id: string; name: string | null; slug: string | null } | null;
  plan: {
    id: string;
    slug: string;
    name: string;
    base_price_mxn: number;
    color_token: string;
  } | null;
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

function monthsForCycle(cycle: string): number {
  switch (cycle) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "semiannual":
      return 6;
    case "annual":
      return 12;
    default:
      return 1;
  }
}

function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

/** Lista grants con filtros opcionales (status, business_id). */
export const listVisibilityGrantsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { status?: string; business_id?: string; limit?: number } = {}) => ({
      status: input?.status ?? undefined,
      business_id: input?.business_id ?? undefined,
      limit: Math.min(Math.max(input?.limit ?? 100, 1), 500),
    }),
  )
  .handler(async ({ data, context }): Promise<AdminGrantRow[]> => {
    await assertAdmin(context as never);
    let q = context.supabase
      .from("business_visibility_grants")
      .select(
        "id, business_id, plan_id, cycle, status, source, amount_paid_mxn, starts_at, expires_at, auto_renew, notes, cancelled_reason, created_at, business:businesses(id, name, slug), plan:visibility_plans(id, slug, name, base_price_mxn, color_token)",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.business_id) q = q.eq("business_id", data.business_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as unknown as AdminGrantRow[];
  });

/**
 * Activa una solicitud pendiente:
 *  - Marca cualquier grant previo `active` de esa empresa como `superseded`.
 *  - Calcula starts_at (ahora) / expires_at (ahora + n meses).
 *  - Persiste monto, ciclo y notas.
 */
export const activateVisibilityGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      grant_id: string;
      cycle: string;
      amount_paid_mxn: number;
      auto_renew?: boolean;
      admin_notes?: string;
    }) => {
      if (!input?.grant_id) throw new Error("missing_grant_id");
      if (!input?.cycle) throw new Error("missing_cycle");
      if (typeof input.amount_paid_mxn !== "number" || input.amount_paid_mxn < 0) {
        throw new Error("invalid_amount");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);

    const { data: grant, error: gErr } = await context.supabase
      .from("business_visibility_grants")
      .select("id, business_id, status, notes")
      .eq("id", data.grant_id)
      .maybeSingle();
    if (gErr) throw gErr;
    if (!grant) throw new Error("grant_not_found");
    if (grant.status !== "pending") throw new Error("grant_not_pending");

    // Superseder grants activos previos.
    await context.supabase
      .from("business_visibility_grants")
      .update({ status: "superseded", cancelled_at: new Date().toISOString() })
      .eq("business_id", grant.business_id)
      .eq("status", "active");

    const startsAt = new Date();
    const expiresAt = addMonths(startsAt, monthsForCycle(data.cycle));
    const combinedNotes = [grant.notes, data.admin_notes]
      .filter(Boolean)
      .join("\n---\n");

    const { error: uErr } = await context.supabase
      .from("business_visibility_grants")
      .update({
        status: "active",
        cycle: data.cycle,
        amount_paid_mxn: data.amount_paid_mxn,
        auto_renew: data.auto_renew ?? false,
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        notes: combinedNotes || null,
      })
      .eq("id", data.grant_id);
    if (uErr) throw uErr;

    // Ola 7.9 · Notificar activación (silent-fail).
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ getVisibilityRecipient, sendVisibilityEmail }, { data: planRow }] = await Promise.all([
        import("@/lib/visibility/visibility-notifications.server"),
        context.supabase
          .from("business_visibility_grants")
          .select("plan:visibility_plans(name)")
          .eq("id", data.grant_id)
          .maybeSingle(),
      ]);
      const recipient = await getVisibilityRecipient(supabaseAdmin, grant.business_id);
      if (recipient) {
        const result = await sendVisibilityEmail(supabaseAdmin, {
          templateName: "visibility-activated",
          recipientEmail: recipient.recipientEmail,
          recipientName: recipient.recipientName,
          businessName: recipient.businessName,
          idempotencyKey: `visibility-activated-${data.grant_id}`,
          templateData: {
            planName: (planRow as { plan?: { name?: string } } | null)?.plan?.name,
            expiresAt: expiresAt.toISOString(),
          },
        });
        if (result.ok) {
          await supabaseAdmin
            .from("business_visibility_grants")
            .update({ notified_activated_at: new Date().toISOString() })
            .eq("id", data.grant_id);
        }
      }
    } catch (err) {
      console.error("visibility activation email failed", err);
    }

    return { ok: true, starts_at: startsAt.toISOString(), expires_at: expiresAt.toISOString() };
  });

/** Rechaza una solicitud pendiente. */
export const rejectVisibilityGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { grant_id: string; reason: string }) => {
    if (!input?.grant_id) throw new Error("missing_grant_id");
    if (!input?.reason || input.reason.trim().length < 3) throw new Error("missing_reason");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { data: grantRow, error } = await context.supabase
      .from("business_visibility_grants")
      .update({
        status: "rejected",
        cancelled_at: new Date().toISOString(),
        cancelled_reason: data.reason.trim(),
      })
      .eq("id", data.grant_id)
      .eq("status", "pending")
      .select("id, business_id, plan:visibility_plans(name)")
      .maybeSingle();
    if (error) throw error;

    // Ola 7.9 · Notificar rechazo (silent-fail).
    if (grantRow?.business_id) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { getVisibilityRecipient, sendVisibilityEmail } = await import(
          "@/lib/visibility/visibility-notifications.server"
        );
        const recipient = await getVisibilityRecipient(
          supabaseAdmin,
          grantRow.business_id,
        );
        if (recipient) {
          const result = await sendVisibilityEmail(supabaseAdmin, {
            templateName: "visibility-rejected",
            recipientEmail: recipient.recipientEmail,
            recipientName: recipient.recipientName,
            businessName: recipient.businessName,
            idempotencyKey: `visibility-rejected-${data.grant_id}`,
            templateData: {
              planName: (grantRow as { plan?: { name?: string } }).plan?.name,
              reason: data.reason.trim(),
            },
          });
          if (result.ok) {
            await supabaseAdmin
              .from("business_visibility_grants")
              .update({ notified_rejected_at: new Date().toISOString() })
              .eq("id", data.grant_id);
          }
        }
      } catch (err) {
        console.error("visibility rejection email failed", err);
      }
    }

    return { ok: true };
  });

/** Cancela un grant activo (admin). */
export const cancelVisibilityGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { grant_id: string; reason: string }) => {
    if (!input?.grant_id) throw new Error("missing_grant_id");
    if (!input?.reason || input.reason.trim().length < 3) throw new Error("missing_reason");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("business_visibility_grants")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_reason: data.reason.trim(),
      })
      .eq("id", data.grant_id)
      .in("status", ["active", "pending"]);
    if (error) throw error;
    return { ok: true };
  });