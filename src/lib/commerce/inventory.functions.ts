/**
 * commerce/inventory.functions.ts
 *
 * Paso 4 del plan "Experiencias: la sección que vende en línea".
 * Calendario, horarios y cupo real con bloqueo de lugares (C3 del Blueprint 13).
 *
 * Toda la lógica de cupo vive en el servidor de base de datos
 * (`commerce_*` RPC, SECURITY DEFINER) para que dos compras simultáneas
 * nunca excedan el cupo. Aquí sólo se exponen lecturas y acciones de
 * Administración; el cobro en línea sigue apagado.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AnyClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => any;
};

const client = (context: { supabase: unknown }) => context.supabase as unknown as AnyClient;

async function assertStaff(context: { supabase: unknown; userId: string }): Promise<void> {
  const c = client(context);
  const roles = ["super_admin", "admin", "editor"] as const;
  const results = await Promise.all(
    roles.map((role) => c.rpc("has_role", { _user_id: context.userId, _role: role })),
  );
  for (const r of results) {
    if (r.error) throw new Error(`role_check_failed: ${r.error.message}`);
  }
  if (!results.some((r) => r.data === true)) throw new Error("forbidden");
}

export interface DepartureRow {
  id: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: "scheduled" | "closed" | "cancelled";
  capacity_total: number;
  capacity_reservable: number;
  adjustments: number;
  held: number;
  confirmed: number;
  available: number;
  blacked_out: boolean;
  notes: string | null;
}

export interface ScheduleTemplateRow {
  id: string;
  label: string | null;
  timezone: string;
  weekdays: number[];
  start_times: string[];
  duration_minutes: number;
  capacity_total: number;
  capacity_reservable: number | null;
  min_participants: number;
  max_participants: number | null;
  min_lead_hours: number;
  sale_horizon_days: number;
  cutoff_minutes: number;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
}

export interface BlackoutRow {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
}

export const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

export const DEPARTURE_STATUS_LABEL: Record<string, string> = {
  scheduled: "Programada",
  closed: "Cerrada",
  cancelled: "Cancelada",
};

/** Calendario de una experiencia: patrones, salidas con cupo y cierres. */
export const getProductInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const c = client(context);

    const [templates, departures, blackouts] = await Promise.all([
      c
        .from("commerce_schedule_templates")
        .select("*")
        .eq("product_id", data.productId)
        .order("created_at", { ascending: true }),
      c.rpc("commerce_list_departures", {
        _product_id: data.productId,
        _from: data.from ?? null,
        _to: data.to ?? null,
      }),
      c
        .from("commerce_blackouts")
        .select("id, starts_at, ends_at, reason")
        .eq("product_id", data.productId)
        .order("starts_at", { ascending: true }),
    ]);

    if (templates.error) throw new Error(templates.error.message);
    if (departures.error) throw new Error(departures.error.message);
    if (blackouts.error) throw new Error(blackouts.error.message);

    return {
      templates: (templates.data ?? []) as ScheduleTemplateRow[],
      departures: ((departures.data ?? []) as DepartureRow[]).map((d) => ({
        ...d,
        status: d.status as DepartureRow["status"],
      })),
      blackouts: (blackouts.data ?? []) as BlackoutRow[],
    };
  });

/** Crea o actualiza un patrón de salidas. */
export const saveScheduleTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        productId: z.string().uuid(),
        label: z.string().max(120).optional(),
        weekdays: z.array(z.number().int().min(0).max(6)).min(1),
        startTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1),
        durationMinutes: z.number().int().min(15).max(24 * 60),
        capacityTotal: z.number().int().min(1).max(5000),
        capacityReservable: z.number().int().min(0).max(5000).nullable().optional(),
        minParticipants: z.number().int().min(1).max(500).default(1),
        maxParticipants: z.number().int().min(1).max(5000).nullable().optional(),
        minLeadHours: z.number().int().min(0).max(24 * 60).default(24),
        saleHorizonDays: z.number().int().min(1).max(365).default(120),
        cutoffMinutes: z.number().int().min(0).max(24 * 60).default(0),
        validFrom: z.string(),
        validUntil: z.string().nullable().optional(),
        active: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const c = client(context);

    if (
      data.capacityReservable != null &&
      data.capacityReservable > data.capacityTotal
    ) {
      throw new Error("capacity_reservable_exceeds_total");
    }

    const payload = {
      product_id: data.productId,
      label: data.label?.trim() || null,
      weekdays: data.weekdays,
      start_times: data.startTimes,
      duration_minutes: data.durationMinutes,
      capacity_total: data.capacityTotal,
      capacity_reservable: data.capacityReservable ?? null,
      min_participants: data.minParticipants,
      max_participants: data.maxParticipants ?? null,
      min_lead_hours: data.minLeadHours,
      sale_horizon_days: data.saleHorizonDays,
      cutoff_minutes: data.cutoffMinutes,
      valid_from: data.validFrom,
      valid_until: data.validUntil ?? null,
      active: data.active,
      created_by: context.userId,
    };

    const query = data.id
      ? c.from("commerce_schedule_templates").update(payload).eq("id", data.id).select("id").single()
      : c.from("commerce_schedule_templates").insert(payload).select("id").single();

    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

/** Genera las salidas concretas del patrón hasta el horizonte de venta. */
export const generateDepartures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ templateId: z.string().uuid(), until: z.string().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: created, error } = await client(context).rpc("commerce_generate_departures", {
      _template_id: data.templateId,
      _until: data.until ?? null,
    });
    if (error) throw new Error(error.message);
    return { created: Number(created ?? 0) };
  });

/** Cambia el estado de una salida (programada, cerrada, cancelada). */
export const setDepartureStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        departureId: z.string().uuid(),
        status: z.enum(["scheduled", "closed", "cancelled"]),
        reason: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await client(context).rpc("commerce_departure_set_status", {
      _departure_id: data.departureId,
      _status: data.status,
      _reason: data.reason?.trim() || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Ajusta manualmente los lugares de una salida. Exige motivo. */
export const adjustDepartureCapacity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        departureId: z.string().uuid(),
        delta: z.number().int().refine((v) => v !== 0, "delta_required"),
        reason: z.string().trim().min(3).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await client(context).rpc("commerce_departure_adjust", {
      _departure_id: data.departureId,
      _delta: data.delta,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Cierra la venta en un periodo (por experiencia). */
export const saveBlackout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        startsAt: z.string(),
        endsAt: z.string(),
        reason: z.string().trim().min(3).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    if (new Date(data.endsAt) <= new Date(data.startsAt)) throw new Error("invalid_range");
    const { error } = await client(context)
      .from("commerce_blackouts")
      .insert({
        product_id: data.productId,
        starts_at: data.startsAt,
        ends_at: data.endsAt,
        reason: data.reason,
        created_by: context.userId,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBlackout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await client(context).from("commerce_blackouts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Libera los apartados vencidos (idempotente). */
export const expireStaleHolds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await client(context).rpc("commerce_holds_expire");
    if (error) throw new Error(error.message);
    return { expired: Number(data ?? 0) };
  });
