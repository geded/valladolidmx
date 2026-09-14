/**
 * booking-admin-notify.functions.ts — Aviso interno de reservación pagada.
 *
 * Cuando el viajero (o el Concierge en su nombre) confirma el pago de una
 * reservación, la administración recibe por correo los datos completos:
 * viajero y contacto, expediente, folio, fechas, total y qué incluye.
 *
 * Autorización: el llamante debe poder leer la reservación por RLS
 * (dueño o equipo interno). El resto de la lectura usa el cliente
 * privilegiado sólo para componer el aviso interno.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SITE } from "@/config/site";

const Input = z.object({ orderId: z.string().uuid() });

const ADMIN_RECIPIENTS_KEY = "notifications.admin_booking_emails";

function money(cents: number | null | undefined, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format((cents ?? 0) / 100);
}

function dateLabel(value?: string | null) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Merida",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

export const notifyAdminBookingPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data, context }) => {
    // 1) El llamante debe poder ver la reservación (RLS).
    const { data: visible, error: visibleError } = await context.supabase
      .from("concierge_orders")
      .select("id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (visibleError) throw new Error(visibleError.message);
    if (!visible) throw new Error("order_not_found");
    if (!["paid", "fulfilled"].includes(visible.status)) {
      return { ok: false, skipped: "order_not_paid" as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");

    const { data: order } = await supabaseAdmin
      .from("concierge_orders")
      .select(
        "id, folio, status, user_id, traveler_email, traveler_name, traveler_phone, source_case_id, travel_plan_id, currency, total_amount, destination_name, payment_provider, paid_at",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("order_not_found");

    const { data: items } = await supabaseAdmin
      .from("concierge_order_items")
      .select("title, description, quantity, unit_amount, currency, subtotal_amount")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    // Contacto del viajero: snapshot de la reservación + perfil.
    let travelerName = order.traveler_name ?? null;
    let travelerEmail = order.traveler_email ?? null;
    let travelerPhone = order.traveler_phone ?? null;
    let whatsappConsent = false;
    if (order.user_id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name, first_name, last_name, email, phone")
        .eq("user_id", order.user_id)
        .maybeSingle();
      if (profile) {
        travelerName =
          travelerName ??
          profile.display_name ??
          [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ??
          null;
        travelerEmail = travelerEmail ?? profile.email ?? null;
        travelerPhone = travelerPhone ?? profile.phone ?? null;
      }
      const { data: travelerProfile } = await supabaseAdmin
        .from("traveler_profiles")
        .select("whatsapp_contact_consent")
        .eq("user_id", order.user_id)
        .maybeSingle();
      whatsappConsent = Boolean(travelerProfile?.whatsapp_contact_consent);
    }

    // Fechas y tamaño del grupo desde el viaje enlazado.
    let datesLabel: string | null = null;
    let partySizeLabel: string | null = null;
    let planId = order.travel_plan_id as string | null;
    if (!planId && order.source_case_id) {
      const { data: plan } = await supabaseAdmin
        .from("travel_plans")
        .select("id")
        .eq("case_id", order.source_case_id)
        .maybeSingle();
      planId = plan?.id ?? null;
    }
    if (planId) {
      const { data: plan } = await supabaseAdmin
        .from("travel_plans")
        .select("start_date, end_date, party_size")
        .eq("id", planId)
        .maybeSingle();
      const from = dateLabel(plan?.start_date);
      const to = dateLabel(plan?.end_date);
      datesLabel = from && to ? `${from} — ${to}` : (from ?? to);
      if (plan?.party_size) {
        partySizeLabel = `${plan.party_size} ${plan.party_size === 1 ? "persona" : "personas"}`;
      }
    }

    // Destinatarios de administración.
    let recipients: string[] = [];
    const { data: setting } = await supabaseAdmin
      .from("platform_settings")
      .select("value")
      .eq("key", ADMIN_RECIPIENTS_KEY)
      .maybeSingle();
    const raw = setting?.value as unknown;
    if (typeof raw === "string") recipients = [raw];
    else if (Array.isArray(raw)) recipients = raw.filter((v): v is string => typeof v === "string");

    if (recipients.length === 0) {
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "super_admin"]);
      const ids = (adminRoles ?? []).map((r: { user_id: string }) => r.user_id);
      if (ids.length > 0) {
        const { data: adminProfiles } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .in("user_id", ids);
        recipients = (adminProfiles ?? [])
          .map((p: { email: string | null }) => p.email)
          .filter((e: string | null): e is string => Boolean(e));
      }
    }
    recipients = Array.from(new Set(recipients.map((e) => e.toLowerCase().trim()))).filter(Boolean);
    if (recipients.length === 0) return { ok: false, skipped: "no_admin_recipients" as const };

    const currency = order.currency ?? "MXN";
    const templateData = {
      folio: order.folio,
      caseReference: order.source_case_id
        ? `Expediente ${order.source_case_id.slice(0, 8).toUpperCase()}`
        : undefined,
      travelerName: travelerName ?? undefined,
      travelerEmail: travelerEmail ?? undefined,
      travelerPhone: travelerPhone ?? undefined,
      whatsappConsent,
      destinationName: order.destination_name ?? undefined,
      datesLabel: datesLabel ?? undefined,
      partySizeLabel: partySizeLabel ?? undefined,
      totalLabel: money(order.total_amount, currency),
      paymentMethodLabel: order.payment_provider === "cash" ? "Efectivo" : "Pago en línea",
      paidAtLabel: dateLabel(order.paid_at) ?? undefined,
      items: (items ?? []).map(
        (it: {
          title: string;
          description: string | null;
          quantity: number;
          subtotal_amount: number;
          currency: string;
        }) => ({
          title: it.title,
          detail: it.description ?? `${it.quantity} × servicio`,
          amountLabel: money(it.subtotal_amount, it.currency ?? currency),
        }),
      ),
      caseUrl: order.source_case_id
        ? `${SITE.url}/concierge/expedientes/${order.source_case_id}`
        : `${SITE.url}/concierge`,
    };

    let sent = 0;
    for (const recipient of recipients) {
      const res = await enqueueTransactionalEmail(supabaseAdmin, {
        templateName: "booking-paid-admin",
        recipientEmail: recipient,
        idempotencyKey: `booking-paid-admin-${order.id}-${recipient}`,
        label: "booking-paid-admin",
        templateData,
      });
      if (res.ok) sent += 1;
    }

    return { ok: sent > 0, sent };
  });
