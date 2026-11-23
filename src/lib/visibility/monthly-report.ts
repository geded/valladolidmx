/**
 * monthly-report.ts — Reporte mensual gratis para cada empresa (Fase A).
 *
 * Módulo puro: decide qué día se manda, qué mes resume y cómo se lee el
 * mensaje. El trabajo programado (`business-monthly-report.server.ts`) sólo
 * lee las cifras, guarda el envío y lo entrega por correo y WhatsApp.
 */

/** Cuándo sale el reporte: el día 1 o el primer lunes de cada mes. */
export type MonthlyReportSchedule = "first-day" | "first-monday";

/** Día elegido por el Founder para mandar el reporte. */
export const MONTHLY_REPORT_SCHEDULE: MonthlyReportSchedule = "first-day";

/** ¿Hoy (día en Mérida, `YYYY-MM-DD`) toca mandar el reporte? */
export function isMonthlyReportDay(
  isoDay: string,
  schedule: MonthlyReportSchedule = MONTHLY_REPORT_SCHEDULE,
): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
  if (!m) return false;
  const day = Number(m[3]);
  if (schedule === "first-day") return day === 1;
  const weekday = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, day)).getUTCDay();
  return weekday === 1 && day <= 7;
}

/** Días extra para terminar envíos pendientes si el primer día no alcanzó. */
export const MONTHLY_REPORT_CATCH_UP_DAYS = 2;

/** ¿Hoy toca mandar o terminar el reporte del mes? */
export function isWithinMonthlyReportWindow(
  isoDay: string,
  schedule: MonthlyReportSchedule = MONTHLY_REPORT_SCHEDULE,
): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
  if (!m) return false;
  const base = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  for (let k = 0; k <= MONTHLY_REPORT_CATCH_UP_DAYS; k += 1) {
    const d = new Date(base - k * 86_400_000).toISOString().slice(0, 10);
    // Sólo cuenta un día de envío del mismo mes calendario.
    if (d.slice(0, 7) === isoDay.slice(0, 7) && isMonthlyReportDay(d, schedule)) return true;
  }
  return false;
}

export interface MonthlyReportPeriod {
  /** Primer día del mes que se resume (`YYYY-MM-01`). */
  readonly periodMonth: string;
  /** Inicio y fin (exclusivo) del mes en hora de Mérida (UTC−6), en ISO. */
  readonly fromIso: string;
  readonly toIso: string;
  /** Nombre del mes en español, p. ej. «octubre de 2026». */
  readonly label: string;
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** El mes calendario anterior al día dado (Mérida no cambia de horario). */
export function previousMonthPeriod(isoDay: string): MonthlyReportPeriod {
  const [y, mo] = isoDay.split("-").map(Number) as [number, number];
  const prevYear = mo === 1 ? y - 1 : y;
  const prevMonth = mo === 1 ? 12 : mo - 1;
  const pad = (v: number) => String(v).padStart(2, "0");
  const periodMonth = `${prevYear}-${pad(prevMonth)}-01`;
  return {
    periodMonth,
    fromIso: `${periodMonth}T06:00:00.000Z`,
    toIso: `${y}-${pad(mo)}-01T06:00:00.000Z`,
    label: `${MONTHS[prevMonth - 1]} de ${prevYear}`,
  };
}

export interface MonthlyReportStats {
  readonly views: number;
  readonly aluxMentions: number;
  readonly contacts: number;
  readonly mapOpens: number;
  readonly quoteRequests: number;
  readonly quotesSent: number;
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString("es-MX")} ${n === 1 ? one : many}`;
}

/** Renglones del reporte, en el orden del plan («Te vieron…»). */
export function monthlyReportLines(s: MonthlyReportStats): string[] {
  return [
    `Te vieron ${plural(s.views, "persona", "personas")}`,
    `Alux te recomendó ${plural(s.aluxMentions, "vez", "veces")}`,
    `${plural(s.contacts, "persona te escribió o llamó", "personas te escribieron o llamaron")}`,
    `${plural(s.mapOpens, "persona abrió", "personas abrieron")} cómo llegar`,
    `${plural(s.quoteRequests, "cotización pedida", "cotizaciones pedidas")} por el concierge`,
  ];
}

/** Mensaje de WhatsApp: corto, sin enlaces de seguimiento ni datos de viajeros. */
export function monthlyReportWhatsAppText(input: {
  businessName: string;
  periodLabel: string;
  stats: MonthlyReportStats;
  completenessPercent: number | null;
  portalUrl: string;
}): string {
  const lines = monthlyReportLines(input.stats).map((l) => `• ${l}`);
  const tip =
    input.completenessPercent !== null && input.completenessPercent < 100
      ? `\nTu ficha para Alux va al ${input.completenessPercent} %. Complétala y Alux te recomendará más seguido.`
      : "";
  return (
    `Hola, este es el resumen de ${input.businessName} en Valladolid.mx durante ${input.periodLabel}:\n\n` +
    `${lines.join("\n")}\n${tip}\n\nVe el detalle en tu Portal: ${input.portalUrl}`
  ).slice(0, 1500);
}
