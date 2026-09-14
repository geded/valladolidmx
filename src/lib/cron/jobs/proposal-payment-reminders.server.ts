/**
 * Recordatorios de pago de propuestas aceptadas (Concierge).
 *
 * El viajero aceptó la propuesta pero no ha registrado el pago, así que el
 * expediente no puede cerrar fechas con los proveedores. Este trabajo horario
 * envía tres avisos al viajero (1 h, 24 h y 72 h después de aceptar) y, a las
 * 72 h, un aviso interno al equipo con los datos de contacto para seguimiento
 * personal.
 *
 * No introduce estados nuevos: la selección se deriva del estado real de la
 * propuesta (`accepted`), del expediente (abierto) y de la reservación
 * (sin `paid`/`fulfilled`). Idempotente vía columnas `pay_reminder_*_sent_at`
 * en `concierge_proposals`.
 *
 * Con `ctx.dryRun` se ejecuta la selección y el render sin encolar ni marcar.
 */
import * as React from "react";
import { meridaLongDate } from "@/lib/time/merida";
import { render } from "@react-email/render";
import { TEMPLATES } from "@/lib/email-templates/registry";
import type { CronJobResult, CronRunContext, CronSupabase } from "@/lib/cron/cron-hook-auth.server";
import {
  newDryRunStats,
  previewCandidate,
  recordDryRunOutcome,
  type DryRunKindStats,
} from "@/lib/cron/cron-dry-run.server";

const SITE_NAME = "valladolidmx";
const SENDER_DOMAIN = "notify.alux.travel";
const FROM_DOMAIN = "notify.alux.travel";
const PUBLIC_ORIGIN = "https://valladolid.mx";

export const PAYMENT_REMINDER_KINDS = [
  { kind: "r1", template: "proposal-payment-reminder", column: "pay_reminder_r1_sent_at" },
  { kind: "r2", template: "proposal-payment-reminder", column: "pay_reminder_r2_sent_at" },
  { kind: "r3", template: "proposal-payment-reminder", column: "pay_reminder_r3_sent_at" },
  {
    kind: "team",
    template: "proposal-payment-stalled-team",
    column: "pay_reminder_team_sent_at",
  },
] as const;

export type PaymentReminderRow = {
  proposal_id: string;
  case_id: string;
  case_summary: string | null;
  total_amount_cents: number | null;
  currency: string | null;
  valid_until: string | null;
  accepted_at: string | null;
  traveler_user_id: string | null;
  traveler_email: string | null;
  traveler_name: string | null;
  traveler_phone: string | null;
  whatsapp_consent: boolean | null;
  start_date: string | null;
  end_date: string | null;
  party_size: number | null;
};

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function moneyLabel(cents: number | null, currency: string | null): string | undefined {
  if (cents == null) return undefined;
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency || "MXN",
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency || "MXN"}`;
  }
}

function dayLabel(iso: string | null): string | undefined {
  if (!iso) return undefined;
  return meridaLongDate(iso) || undefined;
}

function datesLabel(row: PaymentReminderRow): string | undefined {
  const from = dayLabel(row.start_date);
  const to = dayLabel(row.end_date);
  if (from && to) return `${from} – ${to}`;
  return from ?? to;
}

/** Referencia legible, idéntica a la del expediente. */
export function caseReference(caseId: string): string {
  return `Expediente ${caseId.slice(0, 8).toUpperCase()}`;
}

export function buildTravelerData(
  row: PaymentReminderRow,
  stage: "r1" | "r2" | "r3",
): Record<string, unknown> {
  const firstName = (row.traveler_name ?? "").trim().split(/\s+/)[0] || undefined;
  return {
    stage,
    travelerName: firstName,
    caseReference: caseReference(row.case_id),
    totalLabel: moneyLabel(row.total_amount_cents, row.currency),
    datesLabel: datesLabel(row),
    validUntilLabel: dayLabel(row.valid_until),
    checkoutUrl: `${PUBLIC_ORIGIN}/cuenta/concierge/${row.case_id}`,
  };
}

export function buildTeamData(row: PaymentReminderRow): Record<string, unknown> {
  return {
    caseReference: caseReference(row.case_id),
    caseSummary: row.case_summary ?? undefined,
    travelerName: row.traveler_name ?? undefined,
    travelerEmail: row.traveler_email ?? undefined,
    travelerPhone: row.traveler_phone ?? undefined,
    whatsappConsent: Boolean(row.whatsapp_consent),
    totalLabel: moneyLabel(row.total_amount_cents, row.currency),
    datesLabel: datesLabel(row),
    acceptedAtLabel: dayLabel(row.accepted_at),
    caseUrl: `${PUBLIC_ORIGIN}/concierge/expedientes/${row.case_id}`,
  };
}

/** Destinatarios internos: configuración de plataforma, si no, admins. */
async function internalRecipients(supabase: CronSupabase): Promise<string[]> {
  let recipients: string[] = [];
  const { data: setting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "notifications.admin_booking_emails")
    .maybeSingle();
  const raw = (setting as { value?: unknown } | null)?.value;
  if (typeof raw === "string") recipients = [raw];
  else if (Array.isArray(raw)) recipients = raw.filter((v): v is string => typeof v === "string");

  if (recipients.length === 0) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "super_admin"]);
    const ids = Array.from(new Set((roles ?? []).map((r: { user_id: string }) => r.user_id)));
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("email").in("user_id", ids);
      recipients = (profiles ?? [])
        .map((p: { email: string | null }) => p.email)
        .filter((e): e is string => Boolean(e));
    }
  }
  return Array.from(new Set(recipients.map((e) => e.toLowerCase().trim()))).filter(Boolean);
}

async function dryRun(supabase: CronSupabase): Promise<CronJobResult> {
  const results: Record<string, DryRunKindStats> = {
    r1: newDryRunStats(),
    r2: newDryRunStats(),
    r3: newDryRunStats(),
    team: newDryRunStats(),
  };
  const selection_errors: string[] = [];

  for (const step of PAYMENT_REMINDER_KINDS) {
    const { data, error } = await supabase.rpc("get_proposals_needing_payment_reminder", {
      _kind: step.kind,
    });
    if (error) {
      selection_errors.push(step.kind);
      continue;
    }
    for (const row of (data ?? []) as PaymentReminderRow[]) {
      const isTeam = step.kind === "team";
      const outcome = await previewCandidate(supabase, {
        email: (isTeam ? "" : (row.traveler_email ?? "")) || "equipo@interno",
        templateName: step.template,
        templateData: isTeam
          ? buildTeamData(row)
          : buildTravelerData(row, step.kind as "r1" | "r2" | "r3"),
      });
      recordDryRunOutcome(results[step.kind], outcome);
    }
  }

  return { body: { ok: selection_errors.length === 0, results, selection_errors } };
}

async function enqueue(
  supabase: CronSupabase,
  args: {
    email: string;
    templateName: string;
    templateData: Record<string, unknown>;
    idempotencyKey: string;
  },
): Promise<"sent" | "suppressed" | "failed"> {
  const template = TEMPLATES[args.templateName];
  if (!template) return "failed";
  const email = args.email.toLowerCase().trim();
  if (!email) return "failed";

  const { data: suppressed } = await supabase
    .from("suppressed_emails")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (suppressed) return "suppressed";

  let unsubToken: string | null = null;
  const { data: existingToken } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", email)
    .maybeSingle();
  if (existingToken && !existingToken.used_at) {
    unsubToken = existingToken.token;
  } else if (!existingToken) {
    const newToken = generateToken();
    await supabase
      .from("email_unsubscribe_tokens")
      .upsert({ email, token: newToken }, { onConflict: "email", ignoreDuplicates: true });
    const { data: readBack } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", email)
      .maybeSingle();
    unsubToken = readBack?.token ?? newToken;
  }

  const element = React.createElement(template.component, args.templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof template.subject === "function" ? template.subject(args.templateData) : template.subject;

  const messageId = crypto.randomUUID();
  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: args.templateName,
    recipient_email: email,
    status: "pending",
  });

  const { error } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
      label: args.templateName,
      idempotency_key: args.idempotencyKey,
      unsubscribe_token: unsubToken,
      queued_at: new Date().toISOString(),
    },
  });

  if (error) {
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: args.templateName,
      recipient_email: email,
      status: "failed",
      error_message: error.message,
    });
    return "failed";
  }
  return "sent";
}

export async function runProposalPaymentReminders(
  supabase: CronSupabase,
  ctx: CronRunContext = { dryRun: false },
): Promise<CronJobResult> {
  if (ctx.dryRun) return dryRun(supabase);

  const results: Record<string, { sent: number; failed: number; suppressed: number }> = {
    r1: { sent: 0, failed: 0, suppressed: 0 },
    r2: { sent: 0, failed: 0, suppressed: 0 },
    r3: { sent: 0, failed: 0, suppressed: 0 },
    team: { sent: 0, failed: 0, suppressed: 0 },
  };
  let teamRecipients: string[] | null = null;

  for (const step of PAYMENT_REMINDER_KINDS) {
    const { data, error } = await supabase.rpc("get_proposals_needing_payment_reminder", {
      _kind: step.kind,
    });
    if (error) {
      console.error("payment reminder RPC failed", { kind: step.kind, error });
      continue;
    }

    for (const row of (data ?? []) as PaymentReminderRow[]) {
      try {
        if (step.kind === "team") {
          if (teamRecipients === null) teamRecipients = await internalRecipients(supabase);
          if (teamRecipients.length === 0) {
            results.team.failed += 1;
            continue;
          }
          let anySent = false;
          for (const recipient of teamRecipients) {
            const outcome = await enqueue(supabase, {
              email: recipient,
              templateName: step.template,
              templateData: buildTeamData(row),
              idempotencyKey: `proposal-pay-team-${row.proposal_id}-${recipient}`,
            });
            if (outcome === "sent") anySent = true;
            results.team[outcome] += 1;
          }
          if (anySent || teamRecipients.length > 0) {
            await supabase
              .from("concierge_proposals")
              .update({ [step.column]: new Date().toISOString() })
              .eq("id", row.proposal_id);
          }
          continue;
        }

        const stage = step.kind as "r1" | "r2" | "r3";
        const outcome = await enqueue(supabase, {
          email: row.traveler_email ?? "",
          templateName: step.template,
          templateData: buildTravelerData(row, stage),
          idempotencyKey: `proposal-pay-${stage}-${row.proposal_id}`,
        });
        results[stage][outcome] += 1;
        if (outcome !== "failed") {
          await supabase
            .from("concierge_proposals")
            .update({ [step.column]: new Date().toISOString() })
            .eq("id", row.proposal_id);
        }
      } catch (err) {
        console.error("payment reminder failed", {
          proposal_id: row.proposal_id,
          kind: step.kind,
          err: err instanceof Error ? err.message : String(err),
        });
        results[step.kind].failed += 1;
      }
    }
  }

  return { body: { ok: true, results } };
}
