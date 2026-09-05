/**
 * Ola 7.9 · Notificaciones de ciclo de vida de visibilidad (trabajo cron diario).
 *  - Recordatorio 7d antes de vencer
 *  - Recordatorio 24h antes de vencer
 *  - Aviso de plan vencido (una vez, hasta 48h después)
 *
 * Lote 3M-A: la lógica se extrajo verbatim de la ruta para que el gancho sea
 * `autorización → trabajo` y el trabajo pueda probarse con un cliente
 * simulado (0 envíos reales). La autorización vive en `cron-hook-auth.server`.
 */
import { sendVisibilityEmail } from "@/lib/visibility/visibility-notifications.server";
import type { CronJobResult, CronSupabase } from "@/lib/cron/cron-hook-auth.server";

export interface VisibilityGrantRow {
  grant_id: string;
  business_id: string;
  plan_name: string;
  expires_at: string;
  recipient_email: string;
  recipient_name: string | null;
  business_name: string | null;
  business_slug: string | null;
}

export async function runVisibilityNotifications(supabase: CronSupabase): Promise<CronJobResult> {
  const results = { expiring_7d: 0, expiring_1d: 0, expired: 0, failed: 0, skipped: 0 };

  async function processBatch(
    rows: VisibilityGrantRow[],
    kind: "expiring_7d" | "expiring_1d" | "expired",
  ) {
    for (const row of rows) {
      try {
        const daysLeft = kind === "expiring_7d" ? 7 : kind === "expiring_1d" ? 1 : 0;
        const templateName = kind === "expired" ? "visibility-expired" : "visibility-expiring";
        const res = await sendVisibilityEmail(supabase, {
          templateName: templateName as "visibility-expired" | "visibility-expiring",
          recipientEmail: row.recipient_email,
          recipientName: row.recipient_name,
          businessName: row.business_name,
          idempotencyKey: `visibility-${kind}-${row.grant_id}`,
          templateData: {
            planName: row.plan_name,
            expiresAt: row.expires_at,
            daysLeft,
          },
        });
        if (!res.ok) {
          if (res.skipped) results.skipped += 1;
          else results.failed += 1;
          continue;
        }
        const patch: Record<string, string> =
          kind === "expiring_7d"
            ? { notified_expiring_7d_at: new Date().toISOString() }
            : kind === "expiring_1d"
              ? { notified_expiring_1d_at: new Date().toISOString() }
              : { notified_expired_at: new Date().toISOString() };
        await supabase.from("business_visibility_grants").update(patch).eq("id", row.grant_id);
        results[kind] += 1;
      } catch (err) {
        console.error("visibility cron send failed", {
          grant_id: row.grant_id,
          err: err instanceof Error ? err.message : String(err),
        });
        results.failed += 1;
      }
    }
  }

  const { data: expiring7, error: e7 } = await supabase.rpc("list_visibility_grants_expiring", {
    _reminder: 7,
  });
  if (e7) console.error("list expiring 7d failed", e7);
  await processBatch((expiring7 ?? []) as VisibilityGrantRow[], "expiring_7d");

  const { data: expiring1, error: e1 } = await supabase.rpc("list_visibility_grants_expiring", {
    _reminder: 1,
  });
  if (e1) console.error("list expiring 1d failed", e1);
  await processBatch((expiring1 ?? []) as VisibilityGrantRow[], "expiring_1d");

  const { data: expired, error: ee } = await supabase.rpc(
    "list_visibility_grants_recently_expired",
  );
  if (ee) console.error("list expired failed", ee);
  await processBatch((expired ?? []) as VisibilityGrantRow[], "expired");

  return { body: { ok: true, ...results } };
}
