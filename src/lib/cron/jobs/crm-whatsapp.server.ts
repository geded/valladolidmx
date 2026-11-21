/**
 * CRM Prospectos · Fase 2 · revisión de respaldo (una vez por hora).
 *
 * Reintenta los avisos de WhatsApp que quedaron pendientes cuando no llegó
 * otro aviso que los procesara. Lo normal es procesar al recibir cada aviso.
 */
import type { CronJobResult, CronRunContext, CronSupabase } from "@/lib/cron/cron-hook-auth.server";

export async function runCrmWhatsAppBackstop(
  supabase: CronSupabase,
  ctx: CronRunContext,
): Promise<CronJobResult> {
  if (ctx.dryRun) {
    const { count } = await supabase
      .from("crm_whatsapp_inbox")
      .select("id", { count: "exact", head: true })
      .is("processed_at", null);
    return { body: { ok: true, dryRun: true, pending: count ?? 0 } };
  }
  const { processPending } = await import("@/lib/crm/whatsapp/process.server");
  let processed = 0;
  let failed = 0;
  const started = Date.now();
  while (Date.now() - started < 40_000) {
    const r = await processPending(supabase as never, { limit: 5 });
    processed += r.processed;
    failed += r.failed;
    if (r.processed + r.failed === 0) break;
  }
  return { body: { ok: true, processed, failed } };
}
