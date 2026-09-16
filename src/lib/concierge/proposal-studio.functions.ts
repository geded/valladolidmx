/**
 * Estudio de Propuesta · Server functions (2026-09-14).
 *
 * Sólo añade capacidades nuevas sobre el dominio Concierge ya aprobado:
 *  - Plantillas de propuesta reutilizables (personal interno).
 *  - Reaplicar al viaje el itinerario capturado en una propuesta.
 *
 * Toda autorización vive en la base de datos (RLS + RPC SECURITY DEFINER).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Partida guardada en una plantilla reutilizable. */
export interface ProposalTemplateItem {
  title: string;
  notes: string | null;
  amount_cents: number;
  currency: string;
  is_suggestion: boolean;
  day_index: number | null;
  starts_at_local: string | null;
  duration_minutes: number | null;
}

export interface ProposalTemplate {
  id: string;
  title: string;
  description: string | null;
  items: ProposalTemplateItem[];
  created_at: string;
  updated_at: string;
  owner_user_id: string;
}


export const listProposalTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("concierge_proposal_templates")
      .select("id, title, description, items, created_at, updated_at, owner_user_id")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ProposalTemplate[];
  });

const SaveTemplateInput = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  items: z.array(z.record(z.string(), z.unknown())).min(1).max(60),
});

export const saveProposalTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SaveTemplateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("concierge_proposal_templates")
      .insert({
        owner_user_id: context.userId,
        title: data.title,
        description: data.description ?? null,
        items: data.items as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteProposalTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ templateId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("concierge_proposal_templates")
      .delete()
      .eq("id", data.templateId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Reaplica al viaje del viajero el día/hora capturado en la propuesta. */
export const applyProposalScheduleToPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ proposalId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: applied, error } = await context.supabase.rpc(
      "concierge_proposal_apply_schedule_to_plan",
      { _proposal_id: data.proposalId },
    );
    if (error) throw new Error(error.message);
    return { applied: Number(applied ?? 0) };
  });

/* ============================================================
 * Escritorio Concierge (2026-09-16) — itinerarios y ajustes.
 * Lecturas sobre `travel_plans` / `travel_plan_items` (RLS de
 * lector concierge ya existente) y cobro complementario sobre
 * la operación `concierge_order_create_adjustment`.
 * ============================================================ */

export interface ItineraryDeskRow {
  plan_id: string;
  case_id: string | null;
  title: string | null;
  status: string | null;
  party_size: number | null;
  start_date: string | null;
  end_date: string | null;
  items_count: number;
  updated_at: string;
}

export const listConciergeItineraries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        search: z.string().trim().max(120).optional().default(""),
        page: z.number().int().min(1).max(200).optional().default(1),
        pageSize: z.number().int().min(10).max(100).optional().default(50),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.pageSize;
    let query = context.supabase
      .from("travel_plans")
      .select("id, case_id, title, status, party_size, start_date, end_date, updated_at", {
        count: "exact",
      })
      .not("case_id", "is", null)
      .order("updated_at", { ascending: false })
      .range(from, from + data.pageSize - 1);
    if (data.search) query = query.ilike("title", `%${data.search}%`);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);

    const plans = (rows ?? []) as Array<Record<string, unknown>>;
    const planIds = plans.map((p) => p["id"] as string);
    const counts = new Map<string, number>();
    if (planIds.length) {
      const { data: items } = await context.supabase
        .from("travel_plan_items")
        .select("plan_id")
        .in("plan_id", planIds);
      for (const i of (items ?? []) as Array<Record<string, unknown>>) {
        const key = i["plan_id"] as string;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    const result: ItineraryDeskRow[] = plans.map((p) => ({
      plan_id: p["id"] as string,
      case_id: (p["case_id"] as string | null) ?? null,
      title: (p["title"] as string | null) ?? null,
      status: (p["status"] as string | null) ?? null,
      party_size: (p["party_size"] as number | null) ?? null,
      start_date: (p["start_date"] as string | null) ?? null,
      end_date: (p["end_date"] as string | null) ?? null,
      items_count: counts.get(p["id"] as string) ?? 0,
      updated_at: (p["updated_at"] as string) ?? new Date().toISOString(),
    }));

    return { rows: result, total: count ?? result.length, page: data.page, pageSize: data.pageSize };
  });

export interface ItineraryStop {
  id: string;
  day_index: number | null;
  position: number | null;
  starts_at_local: string | null;
  duration_minutes: number | null;
  item_kind: string;
  title: string | null;
  notes: string | null;
}

export interface CaseItinerary {
  plan_id: string;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  party_size: number | null;
  status: string | null;
  stops: ItineraryStop[];
}

/** Itinerario del viaje ligado a un expediente (sólo lectura). */
export const getCaseItinerary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ caseId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: plan, error } = await context.supabase
      .from("travel_plans")
      .select("id, title, start_date, end_date, party_size, status")
      .eq("case_id", data.caseId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!plan) return null;

    const { data: items } = await context.supabase
      .from("travel_plan_items")
      .select("id, day_index, position, starts_at_local, duration_minutes, item_kind, notes, snapshot")
      .eq("plan_id", (plan as Record<string, unknown>)["id"] as string)
      .order("day_index", { ascending: true })
      .order("position", { ascending: true });

    const stops: ItineraryStop[] = ((items ?? []) as Array<Record<string, unknown>>).map((i) => {
      const snapshot = (i["snapshot"] ?? {}) as Record<string, unknown>;
      const title =
        (snapshot["title"] as string | null) ??
        (snapshot["name"] as string | null) ??
        null;
      return {
        id: i["id"] as string,
        day_index: (i["day_index"] as number | null) ?? null,
        position: (i["position"] as number | null) ?? null,
        starts_at_local: (i["starts_at_local"] as string | null) ?? null,
        duration_minutes: (i["duration_minutes"] as number | null) ?? null,
        item_kind: (i["item_kind"] as string) ?? "note",
        title,
        notes: (i["notes"] as string | null) ?? null,
      };
    });

    const p = plan as Record<string, unknown>;
    return {
      plan_id: p["id"] as string,
      title: (p["title"] as string | null) ?? null,
      start_date: (p["start_date"] as string | null) ?? null,
      end_date: (p["end_date"] as string | null) ?? null,
      party_size: (p["party_size"] as number | null) ?? null,
      status: (p["status"] as string | null) ?? null,
      stops,
    } satisfies CaseItinerary;
  });

export interface AdjustmentSummary {
  currency: string;
  /** Total de la propuesta vigente (aceptada o la última). */
  approved_cents: number;
  /** Suma de las reservaciones ya cobradas del expediente. */
  paid_cents: number;
  /** Suma pendiente de cobro en reservaciones abiertas. */
  pending_cents: number;
  /** Diferencia por cobrar (positiva) o saldo a favor (negativa). */
  difference_cents: number;
  latest_proposal_id: string | null;
  latest_proposal_status: string | null;
}

/** Compara lo aprobado con lo cobrado para saber qué falta ajustar. */
export const getCaseAdjustmentSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ caseId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const [proposalsRes, ordersRes] = await Promise.all([
      context.supabase
        .from("concierge_proposals")
        .select("id, status, version, total_amount_cents, currency")
        .eq("case_id", data.caseId)
        .order("version", { ascending: false }),
      context.supabase
        .from("concierge_orders")
        .select("status, total_amount, paid_at, currency")
        .eq("source_case_id", data.caseId),
    ]);
    if (proposalsRes.error) throw new Error(proposalsRes.error.message);
    if (ordersRes.error) throw new Error(ordersRes.error.message);

    const proposals = (proposalsRes.data ?? []) as Array<Record<string, unknown>>;
    const current =
      proposals.find((p) => p["status"] === "accepted") ?? proposals[0] ?? null;

    let paid = 0;
    let pending = 0;
    let currency = (current?.["currency"] as string) ?? "MXN";
    for (const o of (ordersRes.data ?? []) as Array<Record<string, unknown>>) {
      const status = (o["status"] as string) ?? "";
      if (status === "cancelled" || status === "expired" || status === "refunded") continue;
      const amount = Number(o["total_amount"] ?? 0);
      currency = (o["currency"] as string) || currency;
      if (o["paid_at"]) paid += amount;
      else pending += amount;
    }

    const approved = Number(current?.["total_amount_cents"] ?? 0);
    return {
      currency,
      approved_cents: approved,
      paid_cents: paid,
      pending_cents: pending,
      difference_cents: approved - paid - pending,
      latest_proposal_id: (current?.["id"] as string | null) ?? null,
      latest_proposal_status: (current?.["status"] as string | null) ?? null,
    } satisfies AdjustmentSummary;
  });

/** Cobro complementario por un ajuste de itinerario ya aprobado. */
export const createItineraryAdjustmentCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        caseId: z.string().uuid(),
        amountCents: z.number().int().min(1).max(100_000_000),
        title: z.string().trim().max(120).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: orderId, error } = await context.supabase.rpc(
      "concierge_order_create_adjustment",
      {
        _case_id: data.caseId,
        _amount_cents: data.amountCents,
        _title: data.title ?? undefined,
      },
    );
    if (error) throw new Error(error.message);
    return { orderId: orderId as string };
  });

/** Deja constancia del saldo a favor cuando el ajuste cuesta menos. */
export const registerItineraryCreditNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ caseId: z.string().uuid(), amountCents: z.number().int().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cc_timeline_append", {
      _case_id: data.caseId,
      _event_type: "note_added",
      _payload: {
        kind: "itinerary_credit",
        amount_cents: data.amountCents,
      } as never,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
