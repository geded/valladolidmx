/**
 * Fase A · Reporte mensual gratis por WhatsApp y correo.
 *
 * Reglas del Founder: «Te vieron 340 personas, Alux te recomendó 12 veces,
 * 8 te escribieron, 2 cotizaciones del concierge»; sale el día 1 y resume el
 * mes anterior; nunca se repite.
 *
 * Ejecutar con: `bun test ./scripts/visibility/monthly-report.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  isMonthlyReportDay,
  isWithinMonthlyReportWindow,
  monthlyReportLines,
  monthlyReportWhatsAppText,
  previousMonthPeriod,
} from "@/lib/visibility/monthly-report";
import { runBusinessMonthlyReport } from "@/lib/cron/jobs/business-monthly-report.server";

describe("cuándo sale el reporte", () => {
  test("sale el día 1 de cada mes", () => {
    expect(isMonthlyReportDay("2026-12-01")).toBe(true);
    expect(isMonthlyReportDay("2026-12-02")).toBe(false);
  });

  test("si no alcanzó, termina los pendientes el 2 y el 3, nunca después", () => {
    expect(isWithinMonthlyReportWindow("2026-12-03")).toBe(true);
    expect(isWithinMonthlyReportWindow("2026-12-04")).toBe(false);
    expect(isWithinMonthlyReportWindow("2026-11-30")).toBe(false);
  });

  test("opción primer lunes: 7 de diciembre de 2026", () => {
    expect(isMonthlyReportDay("2026-12-07", "first-monday")).toBe(true);
    expect(isMonthlyReportDay("2026-12-14", "first-monday")).toBe(false);
  });

  test("el 1 de diciembre resume noviembre completo en hora de Mérida", () => {
    expect(previousMonthPeriod("2026-12-01")).toEqual({
      periodMonth: "2026-11-01",
      fromIso: "2026-11-01T06:00:00.000Z",
      toIso: "2026-12-01T06:00:00.000Z",
      label: "noviembre de 2026",
    });
    expect(previousMonthPeriod("2027-01-01").periodMonth).toBe("2026-12-01");
  });
});

describe("qué dice el reporte", () => {
  const stats = { views: 340, aluxMentions: 12, contacts: 8, mapOpens: 21, quoteRequests: 2, quotesSent: 1 };

  test("los renglones usan las cifras del mes", () => {
    expect(monthlyReportLines(stats)).toEqual([
      "Te vieron 340 personas",
      "Alux te recomendó 12 veces",
      "8 personas te escribieron o llamaron",
      "21 personas abrieron cómo llegar",
      "2 cotizaciones pedidas por el concierge",
    ]);
  });

  test("en singular no dice «1 veces»", () => {
    const lines = monthlyReportLines({ ...stats, aluxMentions: 1, views: 1 });
    expect(lines[0]).toBe("Te vieron 1 persona");
    expect(lines[1]).toBe("Alux te recomendó 1 vez");
  });

  test("el WhatsApp invita a completar la ficha cuando no está al 100 %", () => {
    const text = monthlyReportWhatsAppText({
      businessName: "Hotel Casa Colonial",
      periodLabel: "noviembre de 2026",
      stats,
      completenessPercent: 62,
      portalUrl: "https://www.quehacerenvalladolid.com/portal",
    });
    expect(text).toContain("Tu ficha para Alux va al 62 %");
    expect(text).toContain("• Alux te recomendó 12 veces");
  });
});

describe("envío programado", () => {
  test("fuera del día de envío no lee ni manda nada", async () => {
    let touched = false;
    const spy = new Proxy(
      {},
      {
        get() {
          touched = true;
          throw new Error("no debía consultar");
        },
      },
    );
    const r = await runBusinessMonthlyReport(spy as never, { dryRun: false }, { today: "2026-11-23" });
    expect(r.body["skipped"]).toBe("not_report_day");
    expect(touched).toBe(false);
  });
});
