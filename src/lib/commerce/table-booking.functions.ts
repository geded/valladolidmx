/**
 * Reservar mesa · funciones de servidor.
 *
 * - `sendTableBookingNotices`: tras reservar, envía los avisos pendientes al
 *   teléfono del equipo y los WhatsApp (restaurante y cliente) por la línea
 *   propia `vmx-*`. Una sola vez por reservación (`notices_sent_at`).
 * - Portal: ajustes, agenda del día y cambios de estado, siempre con RLS/RPC
 *   que validan el acceso a la empresa.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SITE } from "@/config/site";
import { DEFAULT_TABLE_SETTINGS, formatTableDate, formatTableTime, type TableBookingSettings } from "@/lib/commerce/table-booking";

type Loose = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export const sendTableBookingNotices = createServerFn({ method: "POST" })
  .inputValidator((d: { reservationId: string; manageToken: string }) =>
    z.object({ reservationId: z.string().uuid(), manageToken: z.string().min(16).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as unknown as Loose;
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: claimed, error } = await sb
      .from("restaurant_reservations")
      .update({ notices_sent_at: new Date().toISOString() })
      .eq("id", data.reservationId)
      // Sólo quien acaba de reservar conoce el enlace privado de la reservación.
      .eq("manage_token", data.manageToken)
      .is("notices_sent_at", null)
      .gte("created_at", since)
      .select("id, business_id, folio, starts_at, party_size, status, guest_name, guest_phone, occasion, note, manage_token")
      .maybeSingle();
    if (error || !claimed) return { ok: false as const };
    const r = claimed as {
      business_id: string; folio: string; starts_at: string; party_size: number; status: string;
      guest_name: string; guest_phone: string | null; occasion: string | null; note: string | null; manage_token: string;
    };

    try {
      const { dispatchPendingPush } = await import("@/lib/notifications/push-dispatch.server");
      await dispatchPendingPush({ limit: 25 });
    } catch {
      /* el aviso al teléfono queda pendiente para otro intento */
    }

    try {
      const [{ data: biz }, { data: contacts }, { data: lines }] = await Promise.all([
        sb.from("businesses").select("display_name").eq("id", r.business_id).maybeSingle(),
        sb.from("business_contacts").select("value").eq("business_id", r.business_id).eq("contact_type", "whatsapp").is("deleted_at", null).limit(1),
        sb.from("crm_whatsapp_lines").select("instance_name").is("owner_business_id", null).eq("status", "connected").like("instance_name", "vmx-%").limit(1),
      ]);
      const instance = (lines as Array<{ instance_name: string }> | null)?.[0]?.instance_name;
      if (!instance) return { ok: true as const, whatsapp: false };
      const { evolutionChannel } = await import("@/lib/crm/channel/evolution.server");
      const { normalizeWhatsApp } = await import("@/lib/crm/prospect-rules");
      const name = (biz as { display_name?: string } | null)?.display_name ?? "el restaurante";
      const when = `${formatTableDate(r.starts_at)} a las ${formatTableTime(r.starts_at)}`;
      const pending = r.status === "pendiente";
      const bizTo = normalizeWhatsApp((contacts as Array<{ value: string }> | null)?.[0]?.value ?? "");
      if (bizTo) {
        await evolutionChannel.sendText(
          instance,
          bizTo.replace(/^\+/, ""),
          `🍽️ Nueva reservación de mesa (${r.folio})\n${r.guest_name} · ${r.party_size} personas\n${when}` +
            (r.occasion ? `\nOcasión: ${r.occasion}` : "") + (r.note ? `\nNota: ${r.note}` : "") +
            `\n${pending ? "Confírmala" : "Revísala"} en tu Portal: ${SITE.url}/portal/reservaciones-mesa`,
        ).catch(() => undefined);
      }
      const guestTo = r.guest_phone ? normalizeWhatsApp(r.guest_phone) : null;
      if (guestTo) {
        await evolutionChannel.sendText(
          instance,
          guestTo.replace(/^\+/, ""),
          `Hola ${r.guest_name.split(" ")[0]}, ${pending ? "recibimos tu solicitud de mesa" : "tu mesa está reservada"} en ${name}.\n` +
            `${r.party_size} personas · ${when}\nFolio: ${r.folio}` +
            (pending ? "\nEl restaurante te confirmará pronto." : "") +
            `\nCambia o cancela aquí: ${SITE.url}/reservacion-mesa/${r.manage_token}` + "\nValladolid.mx",
        ).catch(() => undefined);
      }
      return { ok: true as const, whatsapp: true };
    } catch (e) {
      console.warn("[table-booking] avisos", e instanceof Error ? e.message.slice(0, 160) : e);
      return { ok: true as const, whatsapp: false };
    }
  });

export interface TableReservationRow {
  id: string;
  folio: string;
  starts_at: string;
  party_size: number;
  status: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  occasion: string | null;
  note: string | null;
  source: string;
}

export const getTableBookingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; date: string }) =>
    z.object({ businessId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Loose;
    const { data: access } = await sb.rpc("has_business_access", { _user_id: context.userId, _business_id: data.businessId, _min_role: "viewer" });
    const { data: staff } = await sb.rpc("is_editor_or_admin", { _user_id: context.userId });
    if (access !== true && staff !== true) throw new Error("forbidden");
    const { data: canManage } = await sb.rpc("has_business_access", { _user_id: context.userId, _business_id: data.businessId, _min_role: "manager" });
    const dayStart = new Date(`${data.date}T00:00:00-06:00`).toISOString();
    const dayEnd = new Date(new Date(dayStart).getTime() + 86_400_000).toISOString();
    const [settingsRes, rowsRes, salesRes, closedRes] = await Promise.all([
      sb.from("restaurant_booking_settings").select("*").eq("business_id", data.businessId).maybeSingle(),
      sb.from("restaurant_reservations")
        .select("id, folio, starts_at, party_size, status, guest_name, guest_phone, guest_email, occasion, note, source")
        .eq("business_id", data.businessId).gte("starts_at", dayStart).lt("starts_at", dayEnd).order("starts_at"),
      sb.from("business_online_sales").select("enabled, modes").eq("business_id", data.businessId).maybeSingle(),
      sb.rpc("restaurant_day_closed", { _business_id: data.businessId, _date: data.date }),
    ]);
    const s = settingsRes.data as (TableBookingSettings & { billing_enabled: boolean; billing_mode: string }) | null;
    const sales = salesRes.data as { enabled: boolean; modes: string[] } | null;
    return {
      activated: Boolean(sales?.enabled && sales.modes.includes("mesas")),
      configured: Boolean(s && Array.isArray(s.tables) && s.tables.length > 0),
      canManage: canManage === true || staff === true,
      settings: s
        ? {
            slot_minutes: s.slot_minutes, duration_minutes: s.duration_minutes, max_party: s.max_party,
            min_notice_minutes: s.min_notice_minutes, max_days_ahead: s.max_days_ahead, confirm_mode: s.confirm_mode,
            hours: s.hours ?? {}, tables: s.tables ?? [],
          }
        : DEFAULT_TABLE_SETTINGS,
      closed: closedRes.data === true,
      billing: { enabled: s?.billing_enabled ?? false, mode: s?.billing_mode ?? "gratis" },
      reservations: (rowsRes.data ?? []) as TableReservationRow[],
    };
  });

const settingsSchema = z.object({
  slot_minutes: z.number(), duration_minutes: z.number(), max_party: z.number(),
  min_notice_minutes: z.number(), max_days_ahead: z.number(),
  confirm_mode: z.enum(["inmediata", "confirmacion"]),
  hours: z.record(z.string(), z.array(z.tuple([z.string(), z.string()]))),
  tables: z.array(z.object({ seats: z.number().int(), count: z.number().int() })).max(30),
});

export const saveTableBookingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; settings: TableBookingSettings }) =>
    z.object({ businessId: z.string().uuid(), settings: settingsSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Loose).rpc("restaurant_booking_settings_save", {
      _business_id: data.businessId, _settings: data.settings,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTableReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status?: string; startsAt?: string; party?: number }) =>
    z.object({ id: z.string().uuid(), status: z.string().max(20).optional(), startsAt: z.string().datetime({ offset: true }).optional(), party: z.number().int().min(1).max(60).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Loose).rpc("restaurant_reservation_update", {
      _id: data.id, _status: data.status ?? null, _starts_at: data.startsAt ?? null, _party: data.party ?? null,
    });
    if (error) throw new Error(error.message);
    try {
      const { dispatchPendingPush } = await import("@/lib/notifications/push-dispatch.server");
      await dispatchPendingPush({ limit: 25 });
    } catch { /* pendiente */ }
    return { ok: true };
  });

export const createStaffTableReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; startsAt: string; party: number; name: string; phone?: string; note?: string; source: "telefono" | "sin_cita" }) =>
    z.object({
      businessId: z.string().uuid(), startsAt: z.string().datetime({ offset: true }), party: z.number().int().min(1).max(60),
      name: z.string().trim().min(1).max(120), phone: z.string().max(20).optional(), note: z.string().max(500).optional(),
      source: z.enum(["telefono", "sin_cita"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await (context.supabase as unknown as Loose).rpc("restaurant_staff_create", {
      _business_id: data.businessId, _starts_at: data.startsAt, _party: data.party, _name: data.name,
      _phone: data.phone ?? null, _note: data.note ?? null, _source: data.source,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const setTableBookingBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; enabled: boolean; mode: "gratis" | "por_persona" | "mensualidad" }) =>
    z.object({ businessId: z.string().uuid(), enabled: z.boolean(), mode: z.enum(["gratis", "por_persona", "mensualidad"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Loose).rpc("admin_set_restaurant_booking_billing", {
      _business_id: data.businessId, _enabled: data.enabled, _mode: data.mode,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setTableDayClosed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; date: string; closed: boolean }) =>
    z.object({ businessId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), closed: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as Loose).rpc("restaurant_set_day_closed", {
      _business_id: data.businessId, _date: data.date, _closed: data.closed,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Mi Viaje: mesas que el viajero apartó con su cuenta (RLS: solo las suyas). */
export const listMyTableReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Loose;
    const since = new Date(Date.now() - 6 * 3600_000).toISOString();
    const { data, error } = await sb
      .from("restaurant_reservations")
      .select("id, business_id, folio, starts_at, party_size, status, occasion, manage_token")
      .eq("user_id", context.userId)
      .gte("starts_at", since)
      .in("status", ["pendiente", "confirmada"])
      .order("starts_at", { ascending: true })
      .limit(20);
    if (error) throw new Error("No pudimos leer tus mesas apartadas.");
    const rows = (data ?? []) as Array<{
      id: string; business_id: string; folio: string; starts_at: string; party_size: number;
      status: string; occasion: string | null; manage_token: string;
    }>;
    const ids = [...new Set(rows.map((r) => r.business_id))];
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: biz } = await sb.from("businesses").select("id, display_name").in("id", ids);
      for (const b of (biz ?? []) as Array<{ id: string; display_name: string }>) names.set(b.id, b.display_name);
    }
    return rows.map((r) => ({
      id: r.id,
      folio: r.folio,
      startsAt: r.starts_at,
      partySize: r.party_size,
      status: r.status as "pendiente" | "confirmada",
      occasion: r.occasion,
      manageToken: r.manage_token,
      restaurant: names.get(r.business_id) ?? "Restaurante",
    }));
  });
