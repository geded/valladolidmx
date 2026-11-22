/**
 * CRM · Fase 4 — embudo y rentabilidad por canal.
 * Ejecutar con: `bun test scripts/omxds/crm/funnel-rules.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  attributeOrders,
  computeFunnel,
  funnelPeriodStart,
  funnelToCsv,
  type FunnelInput,
} from "../../../src/lib/crm/funnel-rules";

const NOW = new Date("2026-11-22T00:30:00Z"); // 21 nov 18:30 en Yucatán

const base: FunnelInput = {
  conversations: { web: 10, whatsapp: 4, otros: 0 },
  prospects: [
    {
      id: "p-web",
      source: "alux_web",
      created_at: "2026-11-20T15:00:00Z",
      linked_user_id: "u1",
      case_id: "c1",
    },
    {
      id: "p-wa",
      source: "whatsapp",
      created_at: "2026-11-20T15:00:00Z",
      linked_user_id: null,
      case_id: null,
    },
  ],
  orders: [
    {
      id: "o1",
      user_id: "u1",
      status: "paid",
      total_amount: 245000,
      paid_at: "2026-11-21T15:00:00Z",
      source_case_id: null,
    },
    {
      id: "o2",
      user_id: "u9",
      status: "paid",
      total_amount: 490000,
      paid_at: "2026-11-21T16:00:00Z",
      source_case_id: null,
    },
    {
      id: "o3",
      user_id: "u1",
      status: "refunded",
      total_amount: 100000,
      paid_at: "2026-11-21T17:00:00Z",
      source_case_id: null,
    },
  ],
  payInvites: [
    {
      id: "i1",
      prospect_id: "p-wa",
      order_id: "o2",
      created_at: "2026-11-21T10:00:00Z",
      expires_at: "2026-11-22T10:00:00Z",
      cancelled_at: null,
    },
  ],
  conciergeTouched: new Set(),
  since: null,
  now: NOW,
};

describe("Periodos en hora de Yucatán", () => {
  test("«Hoy» empieza a medianoche de Yucatán (06:00 UTC)", () => {
    expect(funnelPeriodStart("hoy", NOW)?.toISOString()).toBe("2026-11-21T06:00:00.000Z");
  });
  test("«Este mes» empieza el día 1 a medianoche de Yucatán", () => {
    expect(funnelPeriodStart("mes", NOW)?.toISOString()).toBe("2026-11-01T06:00:00.000Z");
  });
  test("«Todo» no tiene inicio", () => {
    expect(funnelPeriodStart("todo", NOW)).toBeNull();
  });
});

describe("Ventas por canal", () => {
  test("una venta con enlace de pago cuenta para el canal de ese prospecto y como ayuda del concierge", () => {
    const r = computeFunnel(base);
    const wa = r.rows.find((x) => x.channel === "whatsapp")!;
    expect(wa.soldCents).toBe(490000);
    expect(wa.withConciergeCents).toBe(490000);
  });
  test("los reembolsos cuentan como venta pero no como cobrado", () => {
    const web = computeFunnel(base).rows.find((x) => x.channel === "web")!;
    expect(web.soldCents).toBe(345000);
    expect(web.collectedCents).toBe(245000);
  });
  test("una venta sin dueño claro no se atribuye a nadie", () => {
    const owners = attributeOrders({
      ...base,
      prospects: [
        ...base.prospects,
        {
          id: "p-dup",
          source: "whatsapp",
          created_at: "2026-11-20T15:00:00Z",
          linked_user_id: "u1",
          case_id: null,
        },
      ],
      payInvites: [],
    });
    expect(owners.has("o1")).toBe(false);
  });
  test("compradores por cada 100 pláticas", () => {
    expect(computeFunnel(base).total.conversionPct).toBe(14.3);
  });
});

describe("Exportar", () => {
  test("el archivo trae importes en pesos", () => {
    expect(funnelToCsv(computeFunnel(base), "Todo")).toContain(
      "Total,14,2,2,3,14.3,8350.00,7350.00",
    );
  });
});
