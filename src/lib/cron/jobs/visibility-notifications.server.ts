/**
 * Ola 7.9 · Notificaciones de ciclo de vida de visibilidad (trabajo cron diario).
 *  - Recordatorio 7d antes de vencer
 *  - Recordatorio 24h antes de vencer
 *  - Aviso de plan vencido (una vez, hasta 48h después)
 *
 * Lote 3M-A: la lógica se extrajo verbatim de la ruta para que el gancho sea
 * `autorización → trabajo` y el trabajo pueda probarse con un cliente
 * simulado (0 envíos reales). La autorización vive en `cron-hook-auth.server`.
 *
 * Lote 3M-A.2: con `ctx.dryRun` se ejecutan los tres listados (RPC `STABLE`),
 * la supresión y el render; no se llama a `sendVisibilityEmail` (que registra,
 * encola y crea token) ni se marca `notified_*_at`. Sólo contadores.
 */
import { sendVisibilityEmail } from "@/lib/visibility/visibility-notifications.server";
import { SITE } from "@/config/site";
import type {
  CronJobResult,
  CronRunContext,
  CronSupabase,
} from "@/lib/cron/cron-hook-auth.server";
import {
  newDryRunStats,
  previewCandidate,
  recordDryRunOutcome,
  type DryRunKindStats,
} from "@/lib/cron/cron-dry-run.server";

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

type VisibilityKind = "expiring_7d" | "expiring_1d" | "expired";

function kindMeta(kind: VisibilityKind): {
  daysLeft: number;
  templateName: "visibility-expired" | "visibility-expiring";
} {
  return {
    daysLeft: kind === "expiring_7d" ? 7 : kind === "expiring_1d" ? 1 : 0,
    templateName: kind === "expired" ? "visibility-expired" : "visibility-expiring",
  };
}

/** Lista candidatos de cada tipo con los mismos tres RPC que la ejecución real. */
async function listVisibilityCandidates(
  supabase: CronSupabase,
  onError: (kind: VisibilityKind, error: unknown) => void,
): Promise<Record<VisibilityKind, VisibilityGrantRow[]>> {
  const { data: expiring7, error: e7 } = await supabase.rpc("list_visibility_grants_expiring", {
    _reminder: 7,
  });
  if (e7) onError("expiring_7d", e7);

  const { data: expiring1, error: e1 } = await supabase.rpc("list_visibility_grants_expiring", {
    _reminder: 1,
  });
  if (e1) onError("expiring_1d", e1);

  const { data: expired, error: ee } = await supabase.rpc(
    "list_visibility_grants_recently_expired",
  );
  if (ee) onError("expired", ee);

  return {
    expiring_7d: (expiring7 ?? []) as VisibilityGrantRow[],
    expiring_1d: (expiring1 ?? []) as VisibilityGrantRow[],
    expired: (expired ?? []) as VisibilityGrantRow[],
  };
}

/**
 * Simulación (Lote 3M-A.2): reproduce los datos de plantilla que construye
 * `sendVisibilityEmail` y sólo ejecuta supresión + render.
 */
async function dryRunVisibilityNotifications(supabase: CronSupabase): Promise<CronJobResult> {
  const results: Record<VisibilityKind, DryRunKindStats> = {
    expiring_7d: newDryRunStats(),
    expiring_1d: newDryRunStats(),
    expired: newDryRunStats(),
  };
  const selection_errors: string[] = [];
  const candidates = await listVisibilityCandidates(supabase, (kind) =>
    selection_errors.push(kind),
  );

  for (const kind of Object.keys(candidates) as VisibilityKind[]) {
    const { daysLeft, templateName } = kindMeta(kind);
    for (const row of candidates[kind]) {
      const outcome = await previewCandidate(supabase, {
        email: row.recipient_email ?? "",
        templateName,
        templateData: {
          recipientName: row.recipient_name ?? undefined,
          businessName: row.business_name ?? undefined,
          portalUrl: `${SITE.url}/portal/visibilidad`,
          planName: row.plan_name,
          expiresAt: row.expires_at,
          daysLeft,
        },
      });
      recordDryRunOutcome(results[kind], outcome);
    }
  }

  return { body: { ok: selection_errors.length === 0, ...results, selection_errors } };
}

export async function runVisibilityNotifications(
  supabase: CronSupabase,
  ctx: CronRunContext = { dryRun: false },
): Promise<CronJobResult> {
  if (ctx.dryRun) return dryRunVisibilityNotifications(supabase);

  const results = { expiring_7d: 0, expiring_1d: 0, expired: 0, failed: 0, skipped: 0 };

  async function processBatch(rows: VisibilityGrantRow[], kind: VisibilityKind) {
    for (const row of rows) {
      try {
        const { daysLeft, templateName } = kindMeta(kind);
        const res = await sendVisibilityEmail(supabase, {
          templateName,
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

  const candidates = await listVisibilityCandidates(supabase, (kind, error) =>
    console.error(`list ${kind} failed`, error),
  );
  await processBatch(candidates.expiring_7d, "expiring_7d");
  await processBatch(candidates.expiring_1d, "expiring_1d");
  await processBatch(candidates.expired, "expired");

  return { body: { ok: true, ...results } };
}
