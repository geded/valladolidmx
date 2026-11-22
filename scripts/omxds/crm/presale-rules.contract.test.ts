/**
 * Preventa (como en Zazil) — reglas acordadas con el Founder el 2026-11-21.
 * Ejecutar con: `bun test scripts/omxds/crm/presale-rules.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  PRESALE_DEFAULT_TTL_HOURS,
  presaleMessage,
  presaleState,
  presaleTotal,
  splitQuantity,
  timeLeftLabel,
  ttlLabel,
} from "../../../src/lib/crm/presale-rules";

const NOW = new Date("2026-11-21T18:00:00Z");
const future = "2026-11-22T18:00:00Z";
const past = "2026-11-21T17:00:00Z";
const open = { expires_at: future, cancelled_at: null, order_id: null };

describe("Preventa", () => {
  test("vence en 24 horas si el concierge no elige otra vigencia", () => {
    expect(PRESALE_DEFAULT_TTL_HOURS).toBe(24);
  });

  test("el total es precio por persona × personas (en centavos)", () => {
    expect(presaleTotal(85_000, 4)).toBe(340_000);
  });

  test("un pago tardío gana aunque la preventa ya haya vencido", () => {
    expect(presaleState({ ...open, expires_at: past, order_id: "o" }, "paid", NOW)).toBe("pagada");
  });

  test("sin pago, pasada su hora queda vencida", () => {
    expect(presaleState({ ...open, expires_at: past }, null, NOW)).toBe("vencida");
  });

  test("cancelada no se puede cobrar aunque siga en hora", () => {
    expect(presaleState({ ...open, cancelled_at: past }, null, NOW)).toBe("cancelada");
  });

  test("con reservación abierta y en hora está en pago", () => {
    expect(presaleState({ ...open, order_id: "o" }, "awaiting_payment", NOW)).toBe("en_pago");
  });

  test("#enlace cenote suytun 4 es para 4 personas", () => {
    expect(splitQuantity("cenote suytun 4")).toEqual({ query: "cenote suytun", quantity: 4 });
    expect(splitQuantity("cenote suytun")).toEqual({ query: "cenote suytun", quantity: 1 });
  });

  test("vigencia visible en palabras", () => {
    expect(ttlLabel(24)).toBe("24 horas");
    expect(ttlLabel(168)).toBe("7 días");
    expect(timeLeftLabel(future, NOW)).toBe("Vence en 24 h");
    expect(timeLeftLabel(past, NOW)).toBe("Venció hace 1 h");
  });

  test("el mensaje lleva folio, personas, total, vencimiento en hora de Yucatán y enlace", () => {
    const m = presaleMessage("es", {
      firstName: "Ana",
      productName: "Cenote Suytun",
      quantity: 2,
      totalCents: 170_000,
      currency: "MXN",
      folio: "PRE-20261121-0001",
      expiresAt: "2026-11-22T18:00:00Z",
      url: "https://x/continuar/t",
    });
    expect(m).toContain("PRE-20261121-0001");
    expect(m).toContain("2 personas");
    expect(m).toContain("1,700");
    expect(m).toContain("12:00");
    expect(m).toContain("https://x/continuar/t");
  });
});
