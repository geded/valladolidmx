/**
 * Reservar mesa · Etapa 2 (Portal): plano, mesa asignada, lista de espera,
 * ficha del comensal y reportes. Todas las escrituras pasan por RPC que
 * validan el acceso del equipo a la empresa.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildTableReport, clampFloor, groupsFromFloor, guestSummary, phoneKey, type FloorTable } from "@/lib/commerce/table-floor";

type Loose = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

async function assertViewer(sb: Loose, userId: string, businessId: string) {
  const [{ data: access }, { data: staff }] = await Promise.all([
    sb.rpc("has_business_access", { _user_id: userId, _business_id: businessId, _min_role: "viewer" }),
    sb.rpc("is_editor_or_admin", { _user_id: userId }),
  ]);
  if (access !== true && staff !== true) throw new Error("forbidden");
}

const dayRange = (date: string) => {
  const start = new Date(`${date}T00:00:00-06:00`).toISOString();
  return [start, new Date(new Date(start).getTime() + 86_400_000).toISOString()] as const;
};

export interface WaitlistRow {
  id: string; guest_name: string; guest_phone: string | null; party_size: number;
  quoted_minutes: number; status: string; note: string | null; created_at: string;
}

export const getTableFloor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; date: string }) =>
    z.object({ businessId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Loose;
    await assertViewer(sb, context.userId, data.businessId);
    const [start, end] = dayRange(data.date);
    const [s, res, wl] = await Promise.all([
      sb.from("restaurant_booking_settings").select("floor_plan, tables").eq("business_id", data.businessId).maybeSingle(),
      sb.from("restaurant_reservations").select("id, table_id").eq("business_id", data.businessId).gte("starts_at", start).lt("starts_at", end),
      sb.from("restaurant_waitlist").select("id, guest_name, guest_phone, party_size, quoted_minutes, status, note, created_at")
        .eq("business_id", data.businessId).gte("created_at", start).lt("created_at", end).order("created_at"),
    ]);
    const row = s.data as { floor_plan: FloorTable[] | null; tables: Array<{ seats: number; count: number }> | null } | null;
    return {
      plan: (row?.floor_plan ?? []) as FloorTable[],
      groups: row?.tables ?? [],
      assigned: Object.fromEntries(((res.data ?? []) as Array<{ id: string; table_id: string | null }>).map((r) => [r.id, r.table_id])) as Record<string, string | null>,
      waitlist: (wl.data ?? []) as WaitlistRow[],
    };
  });

const tableSchema = z.object({
  id: z.string().min(1).max(20), label: z.string().max(40), seats: z.number(), zone: z.string().max(40),
  x: z.number(), y: z.number(), round: z.boolean().optional(),
});

export const saveTableFloor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; plan: FloorTable[] }) =>
    z.object({ businessId: z.string().uuid(), plan: z.array(tableSchema).min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Loose;
    const plan = data.plan.map((t) => clampFloor(t as FloorTable));
    const { error } = await sb.rpc("restaurant_floor_plan_save", { _business_id: data.businessId, _plan: plan });
    if (error) throw new Error(error.message);
    // La disponibilidad pública sigue al plano: mismas mesas por tamaño.
    const { data: s } = await sb.from("restaurant_booking_settings").select("*").eq("business_id", data.businessId).maybeSingle();
    if (s) {
      const cur = s as Record<string, unknown>;
      const { error: e2 } = await sb.rpc("restaurant_booking_settings_save", {
        _business_id: data.businessId,
        _settings: {
          slot_minutes: cur["slot_minutes"], duration_minutes: cur["duration_minutes"], max_party: cur["max_party"],
          min_notice_minutes: cur["min_notice_minutes"], max_days_ahead: cur["max_days_ahead"],
          confirm_mode: cur["confirm_mode"], hours: cur["hours"] ?? {}, tables: groupsFromFloor(plan),
        },
      });
      if (e2) throw new Error(e2.message);
    }
    return { ok: true };
  });

export const assignReservationTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; tableId: string | null }) =>
    z.object({ id: z.string().uuid(), tableId: z.string().max(20).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Loose).rpc("restaurant_assign_table", { _id: data.id, _table_id: data.tableId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; name: string; phone?: string; party: number; quoted: number; note?: string }) =>
    z.object({
      businessId: z.string().uuid(), name: z.string().trim().min(1).max(120), phone: z.string().max(20).optional(),
      party: z.number().int().min(1).max(60), quoted: z.number().int().min(0).max(240), note: z.string().max(300).optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Loose).rpc("restaurant_waitlist_add", {
      _business_id: data.businessId, _name: data.name, _phone: data.phone ?? null, _party: data.party, _quoted: data.quoted, _note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setWaitlistStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "esperando" | "avisado" | "sentado" | "se_fue" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["esperando", "avisado", "sentado", "se_fue"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Loose).rpc("restaurant_waitlist_set", { _id: data.id, _status: data.status });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getGuestProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; phone: string }) =>
    z.object({ businessId: z.string().uuid(), phone: z.string().max(30) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Loose;
    await assertViewer(sb, context.userId, data.businessId);
    const key = phoneKey(data.phone);
    if (!key) return null;
    const [res, note] = await Promise.all([
      sb.from("restaurant_reservations").select("starts_at, party_size, status, guest_phone, occasion")
        .eq("business_id", data.businessId).ilike("guest_phone", `%${key.slice(-7)}%`).order("starts_at", { ascending: false }).limit(200),
      sb.from("restaurant_guest_notes").select("tags, note").eq("business_id", data.businessId).eq("phone_key", key).maybeSingle(),
    ]);
    const visits = ((res.data ?? []) as Array<{ starts_at: string; party_size: number; status: string; guest_phone: string | null; occasion: string | null }>)
      .filter((v) => phoneKey(v.guest_phone) === key);
    const n = note.data as { tags: string[]; note: string | null } | null;
    return { key, summary: guestSummary(visits), recent: visits.slice(0, 8), tags: n?.tags ?? [], note: n?.note ?? "" };
  });

export const saveGuestNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; key: string; tags: string[]; note: string }) =>
    z.object({ businessId: z.string().uuid(), key: z.string().regex(/^\d{7,10}$/), tags: z.array(z.string().max(30)).max(12), note: z.string().max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Loose).rpc("restaurant_guest_note_save", {
      _business_id: data.businessId, _phone_key: data.key, _tags: data.tags, _note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getTableReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; days: number }) =>
    z.object({ businessId: z.string().uuid(), days: z.number().int().min(1).max(365) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Loose;
    await assertViewer(sb, context.userId, data.businessId);
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();
    const { data: rows } = await sb.from("restaurant_reservations").select("starts_at, party_size, status, source")
      .eq("business_id", data.businessId).gte("starts_at", since).lte("starts_at", new Date().toISOString()).limit(5000);
    return buildTableReport((rows ?? []) as Array<{ starts_at: string; party_size: number; status: string; source: string }>);
  });
