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
    } catch (e) {
      console.error("[alux-schedule]", e);
      throw e;
    }
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
  /** Paradas con día u hora asignados. */
  scheduled_count: number;

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
    const scheduled = new Map<string, number>();
    if (planIds.length) {
      const { data: items } = await context.supabase
        .from("travel_plan_items")
        .select("plan_id, day_index, starts_at_local")
        .in("plan_id", planIds);
      for (const i of (items ?? []) as Array<Record<string, unknown>>) {
        const key = i["plan_id"] as string;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (i["day_index"] != null || i["starts_at_local"] != null) {
          scheduled.set(key, (scheduled.get(key) ?? 0) + 1);
        }
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
      scheduled_count: scheduled.get(p["id"] as string) ?? 0,
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
  /** Paradas con día u hora asignados. */
  scheduled_count: number;
  /** Propuesta vigente del expediente (para asignar y aplicar horarios). */
  latest_proposal_id: string | null;
  /** Partidas de esa propuesta que ya tienen día u hora. */
  proposal_scheduled_count: number;
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

    // Propuesta vigente del expediente: de ahí salen el día y la hora.
    const { data: proposals } = await context.supabase
      .from("concierge_proposals")
      .select("id, status, created_at")
      .eq("case_id", data.caseId)
      .order("created_at", { ascending: false });
    const proposalRows = (proposals ?? []) as Array<Record<string, unknown>>;
    const current =
      proposalRows.find((p) => p["status"] === "accepted") ?? proposalRows[0] ?? null;
    let proposalScheduled = 0;
    if (current) {
      const { data: pItems } = await context.supabase
        .from("concierge_proposal_items")
        .select("day_index, starts_at_local")
        .eq("proposal_id", current["id"] as string);
      proposalScheduled = ((pItems ?? []) as Array<Record<string, unknown>>).filter(
        (i) => i["day_index"] != null || i["starts_at_local"] != null,
      ).length;
    }

    const p = plan as Record<string, unknown>;
    return {
      plan_id: p["id"] as string,
      title: (p["title"] as string | null) ?? null,
      start_date: (p["start_date"] as string | null) ?? null,
      end_date: (p["end_date"] as string | null) ?? null,
      party_size: (p["party_size"] as number | null) ?? null,
      status: (p["status"] as string | null) ?? null,
      stops,
      scheduled_count: stops.filter((s) => s.day_index != null || s.starts_at_local != null).length,
      latest_proposal_id: current ? (current["id"] as string) : null,
      proposal_scheduled_count: proposalScheduled,
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
      _summary: `Saldo a favor por ajuste de itinerario: ${(data.amountCents / 100).toFixed(2)}`,
      _payload: {
        kind: "itinerary_credit",
        amount_cents: data.amountCents,
      } as never,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* --------------------- Alux · agenda sugerida (sólo interno) -------------------- */

export interface AluxScheduleSuggestion {
  index: number;
  dayIndex: number;
  startsAt: string;
  durationMinutes: number | null;
  reason?: string | null;
}

const ScheduleInput = z.object({
  days: z.number().int().min(1).max(30),
  startDate: z.string().max(20).nullable().optional(),
  items: z
    .array(
      z.object({
        index: z.number().int().min(0),
        title: z.string().min(1).max(160),
        notes: z.string().max(400).optional(),
        dayIndex: z.number().int().nullable().optional(),
        startsAt: z.string().max(10).optional(),
        durationMinutes: z.number().int().positive().max(1440).nullable().optional(),
      }),
    )
    .min(1)
    .max(40),
});

const SCHEDULE_SYSTEM = `
Eres Alux, copiloto interno del Concierge de Valladolid (Oriente Maya de Yucatán).
Tu tarea: proponer día y hora local (zona America/Merida) para cada actividad de una
propuesta de viaje, con criterio turístico real del destino.

Criterios:
· Reparte las actividades entre los días disponibles sin saturar: 2 o 3 actividades por día.
· Actividades fuera de Valladolid (Ek Balam, Izamal, Chichén Itzá, cenotes lejanos, Río Lagartos)
  empiezan temprano (08:00–09:00) y duran medio día o más.
· City tours y recorridos a pie: 09:00–10:00. Comidas: 13:30–15:00. Cenas: 19:00–20:30.
  Espectáculos y noches culturales: 20:00 en adelante.
· No encimes horarios dentro del mismo día; deja al menos 30 minutos entre actividades.
· Si una actividad ya trae día u hora capturados por el concierge, respétalos.
· Duración estimada realista en minutos.

Responde SÓLO con JSON válido, sin texto adicional, con esta forma exacta:
{"items":[{"index":0,"dayIndex":0,"startsAt":"09:00","durationMinutes":180,"reason":"…"}]}
dayIndex empieza en 0 (primer día del viaje). startsAt en formato HH:MM de 24 horas.
`.trim();

/** Propone día y hora para las partidas de la propuesta. Sólo personal interno. */
export const aluxSuggestProposalSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ScheduleInput.parse(data))
  .handler(async ({ data, context }): Promise<{ items: AluxScheduleSuggestion[] }> => {
    const { data: editorial } = await context.supabase.rpc("is_editor_or_admin", {
      _user_id: context.userId,
    });
    let allowed = Boolean(editorial);
    if (!allowed) {
      for (const role of ["concierge", "concierge_lead"] as const) {
        const { data: has } = await context.supabase.rpc("has_role", {
          _user_id: context.userId,
          _role: role,
        });
        if (has) {
          allowed = true;
          break;
        }
      }
    }
    if (!allowed) throw new Error("forbidden_proposal_schedule");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("alux_unavailable");

    const [{ generateText }, { createLovableAiGatewayProvider }] = await Promise.all([
      import("ai"),
      import("@/lib/ai-gateway.server"),
    ]);

    const prompt = [
      `Días disponibles del viaje: ${data.days}${data.startDate ? ` (inicia ${data.startDate})` : ""}.`,
      "ACTIVIDADES:",
      ...data.items.map((it) =>
        [
          `- index ${it.index}: ${it.title}`,
          it.notes ? ` | notas: ${it.notes}` : "",
          it.dayIndex != null ? ` | día ya capturado: ${it.dayIndex}` : "",
          it.startsAt ? ` | hora ya capturada: ${it.startsAt}` : "",
          it.durationMinutes ? ` | duración: ${it.durationMinutes} min` : "",
        ].join(""),
      ),
    ].join("\n");

    const res = await generateText({
      model: createLovableAiGatewayProvider(apiKey)("google/gemini-3-flash-preview"),
      system: SCHEDULE_SYSTEM,
      prompt,
      temperature: 0.2,
      maxOutputTokens: 1200,
      abortSignal: AbortSignal.timeout(30_000),
    });

    const raw = res.text ?? "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("alux_unavailable");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      throw new Error("alux_unavailable");
    }

    const list = (parsed as { items?: unknown }).items;
    if (!Array.isArray(list)) throw new Error("alux_unavailable");
    const valid = new Set(data.items.map((i) => i.index));
    const items: AluxScheduleSuggestion[] = [];
    for (const entry of list) {
      const e = entry as Record<string, unknown>;
      const index = typeof e["index"] === "number" ? e["index"] : null;
      const dayIndex = typeof e["dayIndex"] === "number" ? e["dayIndex"] : null;
      const startsAt = typeof e["startsAt"] === "string" ? e["startsAt"] : "";
      if (index == null || !valid.has(index)) continue;
      if (dayIndex == null || dayIndex < 0 || dayIndex >= data.days) continue;
      if (!/^\d{2}:\d{2}$/.test(startsAt)) continue;
      const duration = typeof e["durationMinutes"] === "number" ? e["durationMinutes"] : null;
      items.push({
        index,
        dayIndex,
        startsAt,
        durationMinutes: duration && duration > 0 && duration <= 1440 ? duration : null,
        reason: typeof e["reason"] === "string" ? e["reason"].slice(0, 160) : null,
      });
    }
    if (items.length === 0) throw new Error("alux_unavailable");
    return { items };
  });

/* --------- Alux · arma la agenda directamente sobre el viaje del viajero -------- */

/**
 * Asigna día, hora local (America/Merida) y duración a las paradas del viaje
 * ligado al expediente, respetando lo que ya estaba capturado. El resultado se
 * ve igual en el expediente del Concierge y en Mi Viaje del viajero.
 */
export const aluxScheduleCaseItinerary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ caseId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    try {
    const { data: plan, error: planError } = await context.supabase
      .from("travel_plans")
      .select("id, start_date, end_date")
      .eq("case_id", data.caseId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (planError) throw new Error(planError.message);
    if (!plan) return { applied: 0 };

    const planRow = plan as Record<string, unknown>;
    const planId = planRow["id"] as string;
    const startDate = (planRow["start_date"] as string | null) ?? null;
    const endDate = (planRow["end_date"] as string | null) ?? null;

    const { data: items } = await context.supabase
      .from("travel_plan_items")
      .select("id, day_index, position, starts_at_local, duration_minutes, notes, snapshot")
      .eq("plan_id", planId)
      .order("position", { ascending: true });

    const stops = ((items ?? []) as Array<Record<string, unknown>>).map((i, index) => {
      const snapshot = (i["snapshot"] ?? {}) as Record<string, unknown>;
      return {
        index,
        id: i["id"] as string,
        title:
          ((snapshot["title"] as string | null) ??
            (snapshot["name"] as string | null) ??
            (i["notes"] as string | null) ??
            "Parada del itinerario").slice(0, 160),
        notes: ((i["notes"] as string | null) ?? "").slice(0, 400),
        dayIndex: (i["day_index"] as number | null) ?? null,
        startsAt: (i["starts_at_local"] as string | null) ?? null,
        durationMinutes: (i["duration_minutes"] as number | null) ?? null,
      };
    });
    if (!stops.length) return { applied: 0 };

    let days = 1;
    if (startDate && endDate) {
      const diff =
        (new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) /
        86_400_000;
      days = Math.min(30, Math.max(1, Math.round(diff) + 1));
    } else {
      days = Math.min(30, Math.max(1, Math.ceil(stops.length / 2)));
    }

    const suggestion = await aluxScheduleCall(
      {
        days,
        startDate,
        items: stops.map((s) => ({
          index: s.index,
          title: s.title,
          ...(s.notes ? { notes: s.notes } : {}),
          dayIndex: s.dayIndex,
          ...(s.startsAt ? { startsAt: s.startsAt.slice(0, 5) } : {}),
          durationMinutes: s.durationMinutes,
        })),
      },
      context,
    );

    const byIndex = new Map(suggestion.map((s) => [s.index, s]));
    const entries = stops
      .map((s) => {
        const hit = byIndex.get(s.index);
        if (!hit) return null;
        return {
          item_id: s.id,
          day_index: s.dayIndex ?? hit.dayIndex,
          starts_at_local: s.startsAt ?? `${hit.startsAt}:00`,
          duration_minutes: s.durationMinutes ?? hit.durationMinutes,
        };
      })
      .filter(Boolean);
    if (!entries.length) return { applied: 0 };

    const { data: applied, error } = await context.supabase.rpc("concierge_plan_apply_schedule", {
      _case_id: data.caseId,
      _entries: entries as never,
    } as never);
    if (error) throw new Error(error.message);
    return { applied: Number(applied ?? 0) };
    } catch (e) {
      console.error("[alux-schedule]", e);
      throw e;
    }
  });

type ScheduleCallInput = z.infer<typeof ScheduleInput>;

/** Núcleo compartido: valida rol interno y pide la agenda a Alux. */
async function aluxScheduleCall(
  input: ScheduleCallInput,
  context: { supabase: unknown; userId: string },
): Promise<AluxScheduleSuggestion[]> {
  const client = context.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const rpc = (fn: string, args: Record<string, unknown>) => client.rpc(fn, args);
  const { data: editorial } = await rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  let allowed = Boolean(editorial);
  if (!allowed) {
    for (const role of ["concierge", "concierge_lead"] as const) {
      const { data: has } = await rpc("has_role", {
        _user_id: context.userId,
        _role: role,
      });
      if (has) {
        allowed = true;
        break;
      }
    }
  }
  if (!allowed) throw new Error("forbidden_proposal_schedule");

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("alux_unavailable");

  const [{ generateText }, { createLovableAiGatewayProvider }] = await Promise.all([
    import("ai"),
    import("@/lib/ai-gateway.server"),
  ]);

  const prompt = [
    `Días disponibles del viaje: ${input.days}${input.startDate ? ` (inicia ${input.startDate})` : ""}.`,
    "ACTIVIDADES:",
    ...input.items.map((it) =>
      [
        `- index ${it.index}: ${it.title}`,
        it.notes ? ` | notas: ${it.notes}` : "",
        it.dayIndex != null ? ` | día ya capturado: ${it.dayIndex}` : "",
        it.startsAt ? ` | hora ya capturada: ${it.startsAt}` : "",
        it.durationMinutes ? ` | duración: ${it.durationMinutes} min` : "",
      ].join(""),
    ),
  ].join("\n");

  const res = await generateText({
    model: createLovableAiGatewayProvider(apiKey)("google/gemini-3-flash-preview"),
    system: SCHEDULE_SYSTEM,
    prompt,
    temperature: 0.2,
    maxOutputTokens: 1200,
    abortSignal: AbortSignal.timeout(30_000),
  });

  const raw = res.text ?? "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("alux_unavailable");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new Error("alux_unavailable");
  }

  const list = (parsed as { items?: unknown }).items;
  if (!Array.isArray(list)) throw new Error("alux_unavailable");
  const valid = new Set(input.items.map((i) => i.index));
  const items: AluxScheduleSuggestion[] = [];
  for (const entry of list) {
    const e = entry as Record<string, unknown>;
    const index = typeof e["index"] === "number" ? e["index"] : null;
    const dayIndex = typeof e["dayIndex"] === "number" ? e["dayIndex"] : null;
    const startsAt = typeof e["startsAt"] === "string" ? e["startsAt"] : "";
    if (index == null || !valid.has(index)) continue;
    if (dayIndex == null || dayIndex < 0 || dayIndex >= input.days) continue;
    if (!/^\d{2}:\d{2}$/.test(startsAt)) continue;
    const duration = typeof e["durationMinutes"] === "number" ? e["durationMinutes"] : null;
    items.push({
      index,
      dayIndex,
      startsAt,
      durationMinutes: duration && duration > 0 && duration <= 1440 ? duration : null,
      reason: typeof e["reason"] === "string" ? e["reason"].slice(0, 160) : null,
    });
  }
  if (items.length === 0) throw new Error("alux_unavailable");
  return items;
}
