/**
 * Fase A · Reporte mensual gratis para cada empresa (gancho diario).
 *
 * Cada día revisa si toca mandar el reporte (`isWithinMonthlyReportWindow`).
 * Cuando toca, resume el mes anterior de cada empresa con dueño y lo manda
 * al correo de su cuenta y, si hay línea de la plataforma conectada, al
 * WhatsApp de su ficha. La tabla `business_monthly_reports` guarda un
 * reporte por empresa y mes para no repetirlo. Sin datos de viajeros.
 */
import type { CronJobResult, CronRunContext, CronSupabase } from "@/lib/cron/cron-hook-auth.server";
import { SITE } from "@/config/site";
import { meridaIsoDay } from "@/lib/visibility/commercial-slots";
import {
  isWithinMonthlyReportWindow,
  monthlyReportLines,
  monthlyReportWhatsAppText,
  previousMonthPeriod,
  type MonthlyReportStats,
} from "@/lib/visibility/monthly-report";
import {
  computeProfileCompleteness,
  type BusinessProfileSignals,
} from "@/lib/visibility/profile-completeness";

/** Máximo de empresas por ronda (el resto sigue en los días de respaldo). */
const MAX_PER_RUN = 150;
/** Tiempo máximo de envío por ronda. */
const TIME_BUDGET_MS = 40_000;

interface ReportRow {
  business_id: string;
  business_name: string | null;
  business_slug: string | null;
  recipient_email: string;
  recipient_name: string | null;
  whatsapp: string | null;
  views: number;
  alux_mentions: number;
  contacts: number;
  map_opens: number;
  quote_requests: number;
  quotes_sent: number;
}

type Loose = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export interface MonthlyReportDeps {
  /** Día en Mérida (inyectable en pruebas). */
  today?: string;
}

export async function runBusinessMonthlyReport(
  supabase: CronSupabase,
  ctx: CronRunContext,
  deps: MonthlyReportDeps = {},
): Promise<CronJobResult> {
  const today = deps.today ?? meridaIsoDay();
  if (!isWithinMonthlyReportWindow(today)) {
    return { body: { ok: true, skipped: "not_report_day", today } };
  }
  const sb = supabase as unknown as Loose;
  const period = previousMonthPeriod(today);

  const { data: rowsData, error } = await sb.rpc("list_business_monthly_report_rows", {
    _from: period.fromIso,
    _to: period.toIso,
  });
  if (error) return { status: 500, body: { ok: false, error: error.message } };
  const rows = (Array.isArray(rowsData) ? rowsData : []) as ReportRow[];

  const { data: doneData } = await sb
    .from("business_monthly_reports")
    .select("business_id")
    .eq("period_month", period.periodMonth)
    .limit(5000);
  const done = new Set(((doneData ?? []) as Array<{ business_id: string }>).map((r) => r.business_id));
  const pending = rows.filter((r) => !done.has(r.business_id)).slice(0, MAX_PER_RUN);

  const completeness = new Map<string, number>();
  if (pending.length > 0) {
    const { data: signals } = await sb.rpc("business_profile_signals", {
      _business_ids: pending.map((r) => r.business_id),
    });
    for (const s of (Array.isArray(signals) ? signals : []) as BusinessProfileSignals[]) {
      completeness.set(s.business_id, computeProfileCompleteness(s).percent);
    }
  }

  const { data: lineData } = await sb
    .from("crm_whatsapp_lines")
    .select("instance_name")
    .is("owner_business_id", null)
    .eq("status", "connected")
    .like("instance_name", "vmx-%")
    .limit(1);
  const instanceName =
    ((lineData ?? []) as Array<{ instance_name: string }>)[0]?.instance_name ?? null;

  if (ctx.dryRun) {
    return {
      body: {
        ok: true,
        dryRun: true,
        period: period.periodMonth,
        candidates: rows.length,
        pending: pending.length,
        whatsappLine: Boolean(instanceName),
      },
    };
  }

  const [{ sendVisibilityEmail }, { normalizeWhatsApp }] = await Promise.all([
    import("@/lib/visibility/visibility-notifications.server"),
    import("@/lib/crm/prospect-rules"),
  ]);
  const channel = instanceName
    ? (await import("@/lib/crm/channel/evolution.server")).evolutionChannel
    : null;

  const portalUrl = `${SITE.url}/portal`;
  const started = Date.now();
  let emailed = 0;
  let whatsapped = 0;
  let failed = 0;

  for (const row of pending) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const stats: MonthlyReportStats = {
      views: Number(row.views) || 0,
      aluxMentions: Number(row.alux_mentions) || 0,
      contacts: Number(row.contacts) || 0,
      mapOpens: Number(row.map_opens) || 0,
      quoteRequests: Number(row.quote_requests) || 0,
      quotesSent: Number(row.quotes_sent) || 0,
    };
    // Reserva el envío: si otra ronda ya lo tomó, no se repite.
    const { data: claimed } = await sb
      .from("business_monthly_reports")
      .upsert(
        { business_id: row.business_id, period_month: period.periodMonth, stats },
        { onConflict: "business_id,period_month", ignoreDuplicates: true },
      )
      .select("id");
    const claimId = ((claimed ?? []) as Array<{ id: string }>)[0]?.id;
    if (!claimId) continue;

    const businessName = row.business_name ?? "tu negocio";
    const percent = completeness.get(row.business_id) ?? null;

    const email = await sendVisibilityEmail(supabase, {
      templateName: "business-monthly-report",
      recipientEmail: row.recipient_email,
      recipientName: row.recipient_name,
      businessName,
      idempotencyKey: `business-monthly-report:${row.business_id}:${period.periodMonth}`,
      label: "business-monthly-report",
      templateData: {
        periodLabel: period.label,
        lines: monthlyReportLines(stats),
        completenessPercent: percent,
        portalUrl,
      },
    });
    if (email.ok) emailed += 1;

    let whatsappStatus = "skipped";
    const to = row.whatsapp ? normalizeWhatsApp(row.whatsapp) : null;
    if (channel && instanceName && to) {
      try {
        await channel.sendText(
          instanceName,
          to.replace(/^\+/, ""),
          monthlyReportWhatsAppText({
            businessName,
            periodLabel: period.label,
            stats,
            completenessPercent: percent,
            portalUrl,
          }),
        );
        whatsappStatus = "sent";
        whatsapped += 1;
      } catch (e) {
        whatsappStatus = "failed";
        console.warn("[monthly-report] WhatsApp", e instanceof Error ? e.message.slice(0, 160) : e);
      }
    }
    if (!email.ok && whatsappStatus !== "sent") failed += 1;
    await sb
      .from("business_monthly_reports")
      .update({
        email_status: email.ok ? "sent" : email.skipped ? `skipped:${email.skipped}` : "failed",
        whatsapp_status: whatsappStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claimId);
  }

  return {
    body: { ok: true, period: period.periodMonth, candidates: rows.length, emailed, whatsapped, failed },
  };
}
