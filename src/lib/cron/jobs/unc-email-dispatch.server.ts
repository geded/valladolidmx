/**
 * UNC · Despachador de avisos por correo.
 *
 * Toma las entregas `channel='email'` en estado `pending` del Delivery Ledger
 * y las encola en la cola oficial de correo (`enqueueTransactionalEmail`),
 * marcando el resultado en el propio ledger. No crea tablas, estados ni
 * canales nuevos, y no altera el flujo de aprobación editorial.
 *
 * Simulación (`ctx.dryRun`): selecciona y cuenta, pero no encola ni marca.
 */
import type { CronJobResult, CronRunContext, CronSupabase } from "@/lib/cron/cron-hook-auth.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";
import { uncEventTitle } from "@/lib/notifications/event-titles";

const PUBLIC_ORIGIN = "https://valladolid.mx";
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 3;
/** Ventana de vigencia: un aviso más viejo que esto ya no se envía por correo. */
const MAX_AGE_HOURS = 72;

type DeliveryRow = {
  id: string;
  event_type: string;
  recipient_user_id: string | null;
  attempt_count: number;
  payload_ref: Record<string, unknown> | null;
};

function detailOf(row: DeliveryRow): string {
  const alt = row.payload_ref?.["alt_text"];
  if (typeof alt === "string" && alt.trim()) return alt.trim();
  return "Abre la plataforma para revisar el detalle.";
}

function actionUrlOf(row: DeliveryRow): string | undefined {
  const url = row.payload_ref?.["url"];
  if (typeof url === "string" && url.startsWith("/")) return `${PUBLIC_ORIGIN}${url}`;
  return undefined;
}

export async function runUncEmailDispatch(
  supabase: CronSupabase,
  ctx: CronRunContext,
): Promise<CronJobResult> {
  const since = new Date(Date.now() - MAX_AGE_HOURS * 3_600_000).toISOString();

  const { data, error } = await supabase
    .from("notification_deliveries")
    .select("id, event_type, recipient_user_id, attempt_count, payload_ref")
    .eq("channel", "email")
    .eq("status", "pending")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) return { status: 500, body: { ok: false, error: error.message } };

  const rows = (data ?? []) as DeliveryRow[];
  const results = { candidates: rows.length, sent: 0, failed: 0, skipped: 0 };

  for (const row of rows) {
    if (!row.recipient_user_id) {
      results.skipped += 1;
      if (!ctx.dryRun) {
        await supabase
          .from("notification_deliveries")
          .update({ status: "skipped", last_error: "missing_recipient", delivered_at: new Date().toISOString() })
          .eq("id", row.id);
      }
      continue;
    }

    let email: string | null = null;
    try {
      const { data: userRes } = await supabase.auth.admin.getUserById(row.recipient_user_id);
      email = userRes?.user?.email ?? null;
    } catch {
      email = null;
    }

    if (!email) {
      results.skipped += 1;
      if (!ctx.dryRun) {
        await supabase
          .from("notification_deliveries")
          .update({ status: "skipped", last_error: "missing_email", delivered_at: new Date().toISOString() })
          .eq("id", row.id);
      }
      continue;
    }

    if (ctx.dryRun) {
      results.sent += 1;
      continue;
    }

    const outcome = await enqueueTransactionalEmail(supabase, {
      templateName: "unc-notification",
      recipientEmail: email,
      idempotencyKey: `unc-${row.id}`,
      label: row.event_type,
      templateData: {
        title: uncEventTitle(row.event_type),
        detail: detailOf(row),
        actionUrl: actionUrlOf(row),
      },
    });

    const attempts = (row.attempt_count ?? 0) + 1;

    if (outcome.ok) {
      results.sent += 1;
      await supabase
        .from("notification_deliveries")
        .update({ status: "sent", attempt_count: attempts, delivered_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }

    if (outcome.skipped) {
      results.skipped += 1;
      await supabase
        .from("notification_deliveries")
        .update({
          status: "skipped",
          attempt_count: attempts,
          last_error: outcome.skipped,
          delivered_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      continue;
    }

    results.failed += 1;
    await supabase
      .from("notification_deliveries")
      .update({
        status: attempts >= MAX_ATTEMPTS ? "dead_letter" : "pending",
        attempt_count: attempts,
        last_error: outcome.error ?? "enqueue_failed",
      })
      .eq("id", row.id);
  }

  return { body: { ok: true, results } };
}
