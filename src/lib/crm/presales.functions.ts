/**
 * Reservaciones · Preventa (CRM Prospectos, como en Zazil).
 *
 * Lista, amplía, cancela y reenvía las preventas del equipo concierge. Una
 * preventa es el enlace de pago de una experiencia con venta directa; al
 * pagarse por el cobro de la plataforma aparece su reservación.
 * Lecturas con la sesión del equipo (RLS); los cambios usan el cliente de
 * servicio sólo después de verificar que es del equipo.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { presaleState, type PresaleState } from "@/lib/crm/presale-rules";

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

const STATES = ["vigente", "en_pago", "pagada", "vencida", "cancelada"] as const;

export interface PresaleRow {
  id: string;
  folio: string;
  createdAt: string;
  expiresAt: string;
  state: PresaleState;
  quantity: number;
  totalCents: number;
  currency: string;
  visitDate: string | null;
  channel: string;
  openedAt: string | null;
  cancelReason: string | null;
  productName: string;
  prospect: { id: string; firstName: string; phone: string } | null;
  hasWhatsApp: boolean;
  order: { id: string; folio: string; status: string; paidAt: string | null } | null;
}

export interface PresaleSummary {
  counts: Record<PresaleState, number>;
  activeCents: number;
  paidCents: number;
  expiringSoon: number;
}

/** Hasta las 500 preventas más recientes; los filtros se aplican sobre ellas. */
const WINDOW = 500;

export const listPresales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        state: z.enum(["all", ...STATES]).default("all"),
        search: z.string().max(80).default(""),
        page: z.number().int().min(1).max(50).default(1),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const sb = context.supabase;
    const { data: rows, error } = await sb
      .from("crm_prospect_invites")
      .select(
        "id, folio, created_at, expires_at, cancelled_at, cancel_reason, order_id, quantity, total_amount, currency, visit_date, channel, opened_at, prospect_id, product_id",
      )
      .eq("purpose", "pay")
      .order("created_at", { ascending: false })
      .limit(WINDOW);
    if (error) throw new Error(error.message);
    type R = {
      id: string;
      folio: string | null;
      created_at: string;
      expires_at: string;
      cancelled_at: string | null;
      cancel_reason: string | null;
      order_id: string | null;
      quantity: number;
      total_amount: number | null;
      currency: string | null;
      visit_date: string | null;
      channel: string;
      opened_at: string | null;
      prospect_id: string;
      product_id: string | null;
    };
    const list = (rows ?? []) as R[];
    const uniq = (xs: Array<string | null>) => [...new Set(xs.filter((x): x is string => Boolean(x)))];
    const prospectIds = uniq(list.map((r) => r.prospect_id));
    const productIds = uniq(list.map((r) => r.product_id));
    const orderIds = uniq(list.map((r) => r.order_id));
    const [prospects, products, orders, sessions] = await Promise.all([
      prospectIds.length
        ? sb.from("concierge_prospects").select("id, first_name, phone_e164").in("id", prospectIds)
        : Promise.resolve({ data: [] }),
      productIds.length
        ? sb.from("products").select("id, name").in("id", productIds)
        : Promise.resolve({ data: [] }),
      orderIds.length
        ? sb.from("concierge_orders").select("id, folio, status, paid_at").in("id", orderIds)
        : Promise.resolve({ data: [] }),
      prospectIds.length
        ? sb
            .from("alux_public_sessions")
            .select("prospect_id")
            .eq("channel", "whatsapp")
            .not("wa_remote_jid", "is", null)
            .in("prospect_id", prospectIds)
        : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map(
      ((prospects.data ?? []) as Array<{ id: string; first_name: string; phone_e164: string }>).map((p) => [p.id, p]),
    );
    const prMap = new Map(((products.data ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));
    const oMap = new Map(
      ((orders.data ?? []) as Array<{ id: string; folio: string; status: string; paid_at: string | null }>).map(
        (o) => [o.id, o],
      ),
    );
    const wa = new Set(((sessions.data ?? []) as Array<{ prospect_id: string }>).map((s) => s.prospect_id));
    const now = new Date();
    const all: PresaleRow[] = list.map((r) => {
      const p = pMap.get(r.prospect_id);
      const o = r.order_id ? oMap.get(r.order_id) : undefined;
      return {
        id: r.id,
        folio: r.folio ?? "PRE-…",
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        state: presaleState(r, o?.status ?? null, now),
        quantity: r.quantity,
        totalCents: r.total_amount ?? 0,
        currency: r.currency ?? "MXN",
        visitDate: r.visit_date,
        channel: r.channel,
        openedAt: r.opened_at,
        cancelReason: r.cancel_reason,
        productName: (r.product_id && prMap.get(r.product_id)) || "Experiencia",
        prospect: p ? { id: p.id, firstName: p.first_name, phone: p.phone_e164 } : null,
        hasWhatsApp: wa.has(r.prospect_id),
        order: o ? { id: o.id, folio: o.folio, status: o.status, paidAt: o.paid_at } : null,
      };
    });
    const summary: PresaleSummary = {
      counts: { vigente: 0, en_pago: 0, pagada: 0, vencida: 0, cancelada: 0 },
      activeCents: 0,
      paidCents: 0,
      expiringSoon: 0,
    };
    const soon = now.getTime() + 6 * 3_600_000;
    for (const r of all) {
      summary.counts[r.state] += 1;
      if (r.state === "vigente" || r.state === "en_pago") {
        summary.activeCents += r.totalCents;
        if (new Date(r.expiresAt).getTime() <= soon) summary.expiringSoon += 1;
      }
      if (r.state === "pagada") summary.paidCents += r.totalCents;
    }
    const term = data.search.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    const filtered = all.filter((r) => {
      if (data.state !== "all" && r.state !== data.state) return false;
      if (!term) return true;
      return (
        r.folio.toLowerCase().includes(term) ||
        r.productName.toLowerCase().includes(term) ||
        (r.prospect?.firstName.toLowerCase().includes(term) ?? false) ||
        (digits.length >= 3 && (r.prospect?.phone.includes(digits) ?? false)) ||
        (r.order?.folio.toLowerCase().includes(term) ?? false)
      );
    });
    const pageSize = 30;
    return {
      rows: filtered.slice((data.page - 1) * pageSize, data.page * pageSize),
      total: filtered.length,
      pageSize,
      summary,
      capped: list.length >= WINDOW,
    };
  });

const IdSchema = z.object({ inviteId: z.string().uuid() });

function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : "";
  if (/presale_paid/.test(m)) return "Esta preventa ya está pagada.";
  if (/presale_cancelled/.test(m)) return "Esta preventa está cancelada.";
  if (/presale_not_found/.test(m)) return "No encontramos la preventa.";
  return "No se pudo completar. Inténtalo de nuevo.";
}

export const extendPresale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.extend({ hours: z.number().int().min(1).max(168) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: until, error } = await supabaseAdmin.rpc("crm_presale_extend", {
      _invite_id: data.inviteId,
      _hours: data.hours,
      _actor: context.userId,
    });
    if (error) return { ok: false as const, error: friendly(error) };
    return { ok: true as const, expiresAt: until as string };
  });

export const cancelPresale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.extend({ reason: z.string().max(300).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("crm_presale_cancel", {
      _invite_id: data.inviteId,
      _actor: context.userId,
      _reason: data.reason,
    });
    if (error) return { ok: false as const, error: friendly(error) };
    return { ok: true as const };
  });

/** Nuevo enlace para la misma preventa: se copia o se manda por WhatsApp. */
export const resendPresale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.extend({ sendWhatsApp: z.boolean().default(false) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const [{ supabaseAdmin }, invites, { evolutionChannel }, rules] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/crm/invites.server"),
      import("@/lib/crm/channel/evolution.server"),
      import("@/lib/crm/presale-rules"),
    ]);
    const { data: inv } = await supabaseAdmin
      .from("crm_prospect_invites")
      .select("id, folio, expires_at, cancelled_at, order_id, quantity, total_amount, currency, product_id, used_at")
      .eq("id", data.inviteId)
      .eq("purpose", "pay")
      .maybeSingle();
    const row = inv as {
      id: string;
      folio: string | null;
      expires_at: string;
      cancelled_at: string | null;
      order_id: string | null;
      quantity: number;
      total_amount: number | null;
      currency: string | null;
      product_id: string | null;
      used_at: string | null;
    } | null;
    if (!row) return { ok: false as const, error: "No encontramos la preventa." };
    let orderStatus: string | null = null;
    if (row.order_id) {
      const { data: o } = await supabaseAdmin.from("concierge_orders").select("status").eq("id", row.order_id).maybeSingle();
      orderStatus = (o as { status: string } | null)?.status ?? null;
    }
    const state = rules.presaleState(row, orderStatus);
    if (state === "pagada" || state === "cancelada" || state === "vencida") {
      return {
        ok: false as const,
        error:
          state === "vencida"
            ? "La preventa venció. Amplíala antes de reenviar el enlace."
            : `Esta preventa está ${rules.PRESALE_STATE_LABEL[state].toLowerCase()}.`,
      };
    }
    try {
      const { url, prospectId } = await invites.rotatePresaleLink(supabaseAdmin, row.id, await requestOrigin());
      if (!data.sendWhatsApp) return { ok: true as const, url, sent: false, sendError: null };
      const { data: prod } = row.product_id
        ? await supabaseAdmin.from("products").select("name").eq("id", row.product_id).maybeSingle()
        : { data: null };
      const r = await invites.sendInviteByWhatsApp(
        supabaseAdmin,
        evolutionChannel,
        prospectId,
        {
          url,
          purpose: "pay",
          productName: (prod as { name: string } | null)?.name ?? "tu experiencia",
          presale: {
            folio: row.folio ?? "",
            quantity: row.quantity,
            totalCents: row.total_amount ?? 0,
            currency: row.currency ?? "MXN",
            expiresAt: row.expires_at,
          },
        },
        context.userId,
      );
      return { ok: true as const, url, ...r };
    } catch (e) {
      return { ok: false as const, error: friendly(e) };
    }
  });
