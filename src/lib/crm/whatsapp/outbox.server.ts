/**
 * CRM Prospectos · Fase 3 · mensajes programados por WhatsApp (sólo servidor).
 *
 * Hoy sólo el recontacto de 30 días antes del viaje. La revisión diaria lo
 * deja en `crm_whatsapp_outbox`; la revisión de cada hora lo envía por la
 * línea de la plática, en el idioma del cliente y en horario de día. Si no
 * hay plática de WhatsApp, la línea tiene apagado el recontacto o un
 * concierge atiende la plática, no se envía: queda en «Hoy» para el equipo.
 */
import type { WhatsAppChannel } from "@/lib/crm/channel/types";
import { recontactMessage, tripDestinations, type HandoffProspect } from "@/lib/crm/closure-rules";
import { findProspectWhatsApp, sendToProspectWhatsApp } from "@/lib/crm/invites.server";
import { MAX_SENDS_PER_MINUTE } from "./rules";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** Horario para escribir al cliente (hora de Mérida). */
const SEND_FROM_HOUR = 9;
const SEND_UNTIL_HOUR = 20;
const MAX_ATTEMPTS = 24;

export function isDaytimeInMerida(now: Date = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Merida", hour: "numeric", hour12: false }).format(now),
  );
  return hour >= SEND_FROM_HOUR && hour < SEND_UNTIL_HOUR;
}

type OutboxRow = { id: string; prospect_id: string; kind: string; attempts: number };

async function finish(admin: Admin, id: string, status: "sent" | "failed" | "skipped", error: string | null) {
  await admin
    .from("crm_whatsapp_outbox")
    .update({
      status,
      last_error: error ? error.slice(0, 500) : null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    } as never)
    .eq("id", id);
}

export async function processWhatsAppOutbox(
  admin: Admin,
  channel: WhatsAppChannel,
  opts: { limit?: number; now?: Date } = {},
): Promise<{ sent: number; skipped: number; waiting: number }> {
  const out = { sent: 0, skipped: 0, waiting: 0 };
  if (!isDaytimeInMerida(opts.now)) return out;
  // Fase 4 · con «Alux en WhatsApp» apagado los recontactos esperan; no se pierden.
  const { readAluxChannelsServer } = await import("@/lib/alux/channels.server");
  if (!(await readAluxChannelsServer(admin)).whatsapp) return out;
  const { data } = await admin
    .from("crm_whatsapp_outbox")
    .select("id, prospect_id, kind, attempts")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at")
    .limit(Math.min(opts.limit ?? MAX_SENDS_PER_MINUTE, MAX_SENDS_PER_MINUTE));
  for (const row of (data ?? []) as OutboxRow[]) {
    // Candado: sólo quien incrementa el intento lo envía.
    const { data: claimed } = await admin
      .from("crm_whatsapp_outbox")
      .update({
        attempts: row.attempts + 1,
        next_attempt_at: new Date(Date.now() + 60 * 60_000).toISOString(),
      } as never)
      .eq("id", row.id)
      .eq("status", "pending")
      .eq("attempts", row.attempts)
      .select("id");
    if (!claimed?.length) continue;

    const { data: p } = await admin
      .from("concierge_prospects")
      .select("first_name, language, source, capture_reason, destination_slug, trip_brief, trip_items, handoff_summary, stage")
      .eq("id", row.prospect_id)
      .maybeSingle();
    const prospect = p as unknown as (HandoffProspect & { stage: string }) | null;
    if (!prospect || ["perdido", "no_interesado", "viajo", "posventa"].includes(prospect.stage)) {
      await finish(admin, row.id, "skipped", "El prospecto ya no está activo.");
      out.skipped++;
      continue;
    }
    const target = await findProspectWhatsApp(admin, row.prospect_id);
    if (!target) {
      await finish(admin, row.id, "skipped", "Sin plática de WhatsApp: el concierge lo atiende desde «Hoy».");
      out.skipped++;
      continue;
    }
    if (!target.lineAutoRecontact || !target.lineAluxEnabled || target.aluxMode === "human") {
      await finish(admin, row.id, "skipped", "Recontacto automático apagado o plática con concierge.");
      out.skipped++;
      continue;
    }
    if (target.lineStatus !== "connected") {
      if (row.attempts + 1 >= MAX_ATTEMPTS) {
        await finish(admin, row.id, "failed", "La línea de WhatsApp siguió desconectada.");
        out.skipped++;
      } else out.waiting++;
      continue;
    }
    const text = recontactMessage(target.language ?? prospect.language, {
      firstName: prospect.first_name,
      destination: tripDestinations(prospect)[0] ?? null,
    });
    const r = await sendToProspectWhatsApp(admin, channel, target, text, "alux", null);
    if (!r.ok) {
      if (row.attempts + 1 >= MAX_ATTEMPTS) await finish(admin, row.id, "failed", r.error);
      out.waiting++;
      continue;
    }
    await finish(admin, row.id, "sent", null);
    await admin.from("concierge_prospect_events").insert({
      prospect_id: row.prospect_id,
      kind: "recontact",
      body: "Alux mandó el recontacto de 30 días por WhatsApp.",
      meta: { outbox_id: row.id, source: "whatsapp" },
    } as never);
    out.sent++;
  }
  return out;
}
