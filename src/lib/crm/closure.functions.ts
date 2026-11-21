/**
 * CRM Prospectos · Fase 3 · cierre automático (propuesta 19.48).
 *
 * - Equipo concierge: crear y enviar el enlace personal (registro o pago de
 *   una experiencia), ver los enlaces del prospecto, buscar experiencias con
 *   venta directa y marcar un recontacto como hecho.
 * - Público: leer el enlace personal (sólo nombre, correo y lo platicado).
 * - Viajero con sesión: canjear el enlace. Crea su viaje en Mi Viaje y su
 *   expediente en CRM Arma tu viaje con el mismo contrato de «Enviar a mi
 *   concierge», asignado al mismo concierge y con la ficha de traspaso.
 *
 * Los permisos se verifican con la sesión antes de usar el cliente de
 * servicio, que se carga sólo dentro de cada función.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = {
  supabase: { rpc: (fn: never, args: never) => PromiseLike<{ data: unknown; error: unknown }> };
  userId: string;
};

async function assertStaff(context: Ctx) {
  const { data, error } = await context.supabase.rpc(
    "crm_is_prospect_staff" as never,
    { _user_id: context.userId } as never,
  );
  if (error || data !== true) throw new Error("forbidden");
}

async function requestOrigin(): Promise<string> {
  const [{ getRequest }, rules] = await Promise.all([
    import("@tanstack/react-start/server"),
    import("@/lib/crm/whatsapp/rules"),
  ]);
  const req = getRequest();
  return rules.resolveWebhookOrigin(req.headers.get("origin") ?? new URL(req.url).origin);
}

const TokenSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });

/* ───────────────────────────── equipo concierge ───────────────────────────── */

export const createProspectInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        prospectId: z.string().uuid(),
        purpose: z.enum(["register", "pay"]),
        productId: z.string().uuid().nullable().default(null),
        sendWhatsApp: z.boolean().default(false),
        quantity: z.number().int().min(1).max(50).default(1),
        visitDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .default(null),
        ttlHours: z.number().int().min(1).max(720).optional(),
      })
      .refine((v) => (v.purpose === "pay") === Boolean(v.productId), "product_required")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const [{ supabaseAdmin }, { evolutionChannel }, invites] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/crm/channel/evolution.server"),
      import("@/lib/crm/invites.server"),
    ]);
    const { data: p } = await supabaseAdmin
      .from("concierge_prospects")
      .select("id, linked_user_id")
      .eq("id", data.prospectId)
      .maybeSingle();
    if (!p) return { ok: false as const, error: "No encontramos el prospecto." };
    try {
      const r = await invites.createAndSendInvite(supabaseAdmin, evolutionChannel, {
        prospectId: data.prospectId,
        purpose: data.purpose,
        productId: data.productId,
        createdBy: context.userId,
        via: "panel",
        origin: await requestOrigin(),
        send: data.sendWhatsApp,
        quantity: data.quantity,
        visitDate: data.visitDate,
        ...(data.ttlHours !== undefined ? { ttlHours: data.ttlHours } : {}),
      });
      return {
        ok: true as const,
        url: r.url,
        sent: r.sent,
        sendError: r.sendError,
        folio: r.presale?.folio ?? null,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "not_sellable")
        return {
          ok: false as const,
          error: "Esa experiencia no tiene venta directa activa con precio. Sólo las experiencias se cobran en línea.",
        };
      console.error("[crm.invite] no se creó", msg);
      return { ok: false as const, error: "No se pudo crear el enlace." };
    }
  });

export type ProspectInviteRow = {
  id: string;
  created_at: string;
  purpose: "register" | "pay";
  product_id: string | null;
  channel: string;
  expires_at: string;
  opened_at: string | null;
  used_at: string | null;
  folio: string | null;
  quantity: number;
  total_amount: number | null;
  currency: string | null;
  cancelled_at: string | null;
  order_id: string | null;
};

export const listProspectInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ prospectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const { data: rows, error } = await context.supabase
      .from("crm_prospect_invites")
      .select(
        "id, created_at, purpose, product_id, channel, expires_at, opened_at, used_at, folio, quantity, total_amount, currency, cancelled_at, order_id",
      )
      .eq("prospect_id", data.prospectId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (rows ?? []) as ProspectInviteRow[];
  });

export const searchDirectSaleExperiences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().max(60).default("") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const [{ supabaseAdmin }, invites] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/crm/invites.server"),
    ]);
    return invites.searchSellableExperiences(supabaseAdmin, data.q, 10);
  });

export const markRecontactDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ prospectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const { error } = await context.supabase
      .from("concierge_prospects")
      .update({ recontact_due_at: null })
      .eq("id", data.prospectId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ───────────────────────────── público ───────────────────────────── */

export type PublicInviteView =
  | { status: "invalid" | "expired" | "used" | "cancelled" }
  | {
      status: "valid";
      firstName: string;
      email: string | null;
      phoneHint: string;
      language: string;
      purpose: "register" | "pay";
      product: { name: string; price: number; currency: string } | null;
      /** Preventa: folio, personas, total congelado (centavos) y vencimiento. */
      presale: {
        folio: string;
        quantity: number;
        totalCents: number;
        currency: string;
        visitDate: string | null;
        expiresAt: string;
      } | null;
      destinations: string[];
      items: string[];
      startDate: string | null;
      partySize: number | null;
      converted: boolean;
    };

export const getProspectInvitePublic = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TokenSchema.parse(d))
  .handler(async ({ data }): Promise<PublicInviteView> => {
    const [{ supabaseAdmin }, rules, invites] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/crm/closure-rules"),
      import("@/lib/crm/invites.server"),
    ]);
    const hash = await rules.hashInviteToken(data.token);
    const { data: inv } = await supabaseAdmin
      .from("crm_prospect_invites")
      .select(
        "id, prospect_id, purpose, product_id, expires_at, opened_at, used_at, cancelled_at, folio, quantity, total_amount, currency, visit_date",
      )
      .eq("token_hash", hash)
      .maybeSingle();
    if (!inv) return { status: "invalid" };
    if (inv.cancelled_at) return { status: "cancelled" };
    const state = rules.inviteState(inv);
    if (state !== "valid") return { status: state };
    if (!inv.opened_at) {
      await supabaseAdmin
        .from("crm_prospect_invites")
        .update({ opened_at: new Date().toISOString() } as never)
        .eq("id", inv.id);
    }
    const { data: p } = await supabaseAdmin
      .from("concierge_prospects")
      .select(
        "first_name, email, phone_e164, language, source, capture_reason, destination_slug, trip_brief, trip_items, handoff_summary, converted_at",
      )
      .eq("id", inv.prospect_id)
      .maybeSingle();
    if (!p) return { status: "invalid" };
    const product =
      inv.purpose === "pay" && inv.product_id
        ? await invites.getSellableExperience(supabaseAdmin, inv.product_id)
        : null;
    const prospect = p as unknown as Parameters<typeof rules.tripDestinations>[0] & {
      email: string | null;
      phone_e164: string;
      converted_at: string | null;
    };
    const brief = prospect.trip_brief;
    return {
      status: "valid",
      firstName: prospect.first_name,
      email: prospect.email,
      phoneHint: `•••• ${prospect.phone_e164.slice(-4)}`,
      language: prospect.language,
      purpose: inv.purpose as "register" | "pay",
      product: product ? { name: product.name, price: product.price, currency: product.currency } : null,
      presale:
        inv.purpose === "pay" && inv.folio
          ? {
              folio: inv.folio,
              quantity: inv.quantity,
              totalCents: inv.total_amount ?? (product ? product.price * inv.quantity : 0),
              currency: inv.currency ?? product?.currency ?? "MXN",
              visitDate: inv.visit_date,
              expiresAt: inv.expires_at,
            }
          : null,
      destinations: rules.tripDestinations(prospect),
      items: prospect.trip_items
        .map((i) => i.title)
        .filter((t): t is string => Boolean(t))
        .slice(0, 12),
      startDate: typeof brief["startDate"] === "string" ? (brief["startDate"] as string) : null,
      partySize: typeof brief["partySize"] === "number" ? (brief["partySize"] as number) : null,
      converted: Boolean(prospect.converted_at),
    };
  });

/* ───────────────────────────── viajero con sesión ───────────────────────────── */

export type RedeemResult =
  | { ok: true; caseId: string; planId: string | null; orderId: string | null; presaleExpired?: boolean }
  | {
      ok: false;
      error: "invalid" | "expired" | "used" | "cancelled" | "other_account" | "account_has_prospect" | "failed";
    };

export const redeemProspectInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TokenSchema.parse(d))
  .handler(async ({ data, context }): Promise<RedeemResult> => {
    const [{ supabaseAdmin }, rules] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/crm/closure-rules"),
    ]);
    const hash = await rules.hashInviteToken(data.token);
    const { data: claimRows, error: claimError } = await supabaseAdmin.rpc("crm_claim_prospect_invite", {
      _token_hash: hash,
      _user_id: context.userId,
    });
    if (claimError) {
      console.error("[crm.redeem] canje", claimError.message);
      return { ok: false, error: "failed" };
    }
    const claim = (Array.isArray(claimRows) ? claimRows[0] : claimRows) as
      | { invite_id: string; prospect_id: string; purpose: string; product_id: string | null; status: string }
      | undefined;
    if (!claim || claim.status !== "ok") {
      const st = claim?.status;
      return {
        ok: false,
        error:
          st === "expired" ||
          st === "used" ||
          st === "cancelled" ||
          st === "other_account" ||
          st === "account_has_prospect"
            ? st
            : "invalid",
      };
    }

    const { data: pRow } = await supabaseAdmin
      .from("concierge_prospects")
      .select(
        "id, first_name, email, phone_e164, language, source, capture_reason, destination_slug, trip_brief, trip_items, handoff_summary, case_id, travel_plan_id, linked_user_id",
      )
      .eq("id", claim.prospect_id)
      .maybeSingle();
    if (!pRow) return { ok: false, error: "invalid" };
    const p = pRow as unknown as Parameters<typeof rules.buildHandoffSummary>[0] & {
      id: string;
      email: string | null;
      phone_e164: string;
      case_id: string | null;
      travel_plan_id: string | null;
      linked_user_id: string | null;
    };

    const user = context.supabase;
    let caseId = p.linked_user_id === context.userId ? p.case_id : null;
    let planId = p.linked_user_id === context.userId ? p.travel_plan_id : null;

    try {
      if (!caseId) {
        // 1. Viaje en Mi Viaje con lo platicado (como el propio viajero, con RLS).
        const brief = p.trip_brief;
        const start = typeof brief["startDate"] === "string" ? (brief["startDate"] as string) : null;
        const end = typeof brief["endDate"] === "string" ? (brief["endDate"] as string) : null;
        const party = typeof brief["partySize"] === "number" ? (brief["partySize"] as number) : null;
        const dests = rules.tripDestinations(p);
        if (!planId) {
          // Reusa su viaje activo (sólo puede haber uno por cuenta) o crea uno.
          const { data: activeId, error: ensureError } = await user.rpc("travel_plan_ensure_active");
          if (ensureError || typeof activeId !== "string") {
            throw new Error(`plan_ensure_failed: ${ensureError?.message ?? ""}`);
          }
          planId = activeId;
          const { data: current } = await user
            .from("travel_plans")
            .select("title, party_size, start_date, end_date, meta")
            .eq("id", planId)
            .maybeSingle();
          const cur = (current ?? {}) as {
            title?: string | null;
            party_size?: number | null;
            start_date?: string | null;
            end_date?: string | null;
            meta?: unknown;
          };
          // Sólo completa lo que esté vacío: nunca pisa lo que el viajero ya puso.
          const patch: Record<string, unknown> = {
            meta: {
              ...(cur.meta && typeof cur.meta === "object" && !Array.isArray(cur.meta) ? (cur.meta as object) : {}),
              prospect_id: p.id,
              origin: "crm_prospectos",
            },
          };
          if (!cur.party_size && party) patch["party_size"] = party;
          if (!cur.start_date && start && /^\d{4}-\d{2}-\d{2}$/.test(start)) patch["start_date"] = start;
          if (!cur.end_date && end && /^\d{4}-\d{2}-\d{2}$/.test(end)) patch["end_date"] = end;
          if (dests.length && (!cur.title || /^mi viaje$/i.test(cur.title.trim()))) {
            patch["title"] = `Mi viaje: ${dests.slice(0, 3).join(", ")}`;
          }
          const { error: patchError } = await user.from("travel_plans").update(patch as never).eq("id", planId);
          if (patchError) console.warn("[crm.redeem] datos del viaje", patchError.message);

          const { data: existing } = await user
            .from("travel_plan_items")
            .select("item_kind, target_id, notes, position")
            .eq("plan_id", planId);
          const have = (existing ?? []) as Array<{
            item_kind: string;
            target_id: string | null;
            notes: string | null;
            position: number | null;
          }>;
          const seen = new Set(have.map((h) => (h.target_id ? `${h.item_kind}:${h.target_id}` : `note:${h.notes ?? ""}`)));
          let pos = have.reduce((m, h) => Math.max(m, h.position ?? 0), -1) + 1;
          const items = rules
            .toPlanItems(p.trip_items)
            .filter((it) => !seen.has(it.target_id ? `${it.item_kind}:${it.target_id}` : `note:${it.notes ?? ""}`))
            .map((it) => ({ ...it, plan_id: planId, position: pos++ }));
          if (items.length) {
            const { error: itemsError } = await user.from("travel_plan_items").insert(items as never);
            if (itemsError) console.warn("[crm.redeem] partes del viaje", itemsError.message);
          }
        }

        // 2. Expediente con el contrato existente de «Enviar a mi concierge».
        const ccItems = p.trip_items.slice(0, 20).map((it) => ({
          title: it.title ?? undefined,
          kind: "non_reservable" as const,
          product_id: it.kind === "product" ? it.targetId : null,
          business_id: it.kind === "business" ? it.targetId : null,
        }));
        const { data: newCase, error: caseError } = await user.rpc("cc_case_create_from_plan", {
          _summary: rules.buildCaseSummary(p),
          _items: ccItems as never,
          _travel_plan_id: planId,
        } as never);
        if (caseError || typeof newCase !== "string") throw new Error(`case_create_failed: ${caseError?.message ?? ""}`);
        caseId = newCase;
        const { error: linkError } = await user
          .from("travel_plans")
          .update({ case_id: caseId, status: "shared_with_concierge" } as never)
          .eq("id", planId);
        if (linkError) console.warn("[crm.redeem] liga del viaje", linkError.message);
      }

      // 3. Asignación al mismo concierge, ficha de traspaso y ficha convertida.
      const { error: finError } = await supabaseAdmin.rpc("crm_finalize_prospect_conversion", {
        _prospect_id: p.id,
        _user_id: context.userId,
        _case_id: caseId,
        _travel_plan_id: planId as string,
        _summary: rules.buildHandoffSummary(p),
      });
      if (finError) throw new Error(`finalize_failed: ${finError.message}`);

      // 4. Datos de contacto en su perfil sólo si estaban vacíos.
      const { data: prof } = await user
        .from("profiles")
        .select("display_name, phone")
        .eq("user_id", context.userId)
        .maybeSingle();
      const patch: Record<string, string> = {};
      if (prof && !prof.display_name?.trim()) patch["display_name"] = p.first_name;
      if (prof && !prof.phone?.trim()) patch["phone"] = p.phone_e164;
      if (Object.keys(patch).length) {
        await user.from("profiles").update(patch as never).eq("user_id", context.userId);
      }
    } catch (e) {
      console.error("[crm.redeem] pase", e instanceof Error ? e.message : e);
      return { ok: false, error: "failed" };
    }

    // 5. Enlace de pago: la orden de venta directa existente (sólo experiencias).
    let orderId: string | null = null;
    if (claim.purpose === "pay" && claim.product_id) {
      const { data: inv } = await supabaseAdmin
        .from("crm_prospect_invites")
        .select("id, folio, quantity, total_amount, expires_at, order_id")
        .eq("id", claim.invite_id)
        .maybeSingle();
      const presale = inv as {
        id: string;
        folio: string | null;
        quantity: number;
        total_amount: number | null;
        expires_at: string;
        order_id: string | null;
      } | null;
      if (presale && new Date(presale.expires_at).getTime() < Date.now()) {
        // La preventa venció: su viaje y su expediente quedan, pero ya no se cobra con ese enlace.
        return { ok: true, caseId: caseId as string, planId, orderId: null, presaleExpired: true };
      }
      // Cobro existente de la plataforma: la reservación de venta directa con sus personas.
      const { data: oid, error: orderError } = await user.rpc("concierge_create_direct_sale_order", {
        _product_id: claim.product_id,
        _quantity: presale?.quantity ?? 1,
      });
      if (orderError) console.warn("[crm.redeem] orden", orderError.message);
      else if (typeof oid === "string") orderId = oid;
      if (orderId && presale && (!presale.order_id || presale.order_id === orderId)) {
        const { data: ord } = await supabaseAdmin
          .from("concierge_orders")
          .select("id, user_id, total_amount, metadata, status")
          .eq("id", orderId)
          .maybeSingle();
        const o = ord as {
          id: string;
          user_id: string | null;
          total_amount: number;
          metadata: Record<string, unknown> | null;
          status: string;
        } | null;
        if (o && o.user_id === context.userId) {
          await supabaseAdmin
            .from("crm_prospect_invites")
            .update({ order_id: o.id } as never)
            .eq("id", presale.id);
          if (o.status === "draft" || o.status === "awaiting_payment") {
            await supabaseAdmin
              .from("concierge_orders")
              .update({
                expires_at: presale.expires_at,
                metadata: {
                  ...(o.metadata ?? {}),
                  presale_folio: presale.folio,
                  presale_invite_id: presale.id,
                  ...(presale.total_amount !== null && presale.total_amount !== o.total_amount
                    ? { presale_total_differs: presale.total_amount }
                    : {}),
                },
              } as never)
              .eq("id", o.id);
          }
        }
      }
    }
    return { ok: true, caseId: caseId as string, planId, orderId };
  });
