/**
 * CRM Prospectos · Fase 3 (cierre automático) — reglas acordadas con el Founder (propuesta 19.48).
 * Ejecutar con: `bun test scripts/omxds/crm/closure-rules.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  INVITE_TTL_DAYS,
  RECONTACT_DAYS_BEFORE,
  buildCaseSummary,
  buildHandoffSummary,
  canSellDirect,
  generateInviteToken,
  hashInviteToken,
  inviteMessage,
  inviteState,
  isInviteTokenShape,
  parseEnlaceArg,
  recontactMessage,
  toPlanItems,
  type HandoffProspect,
} from "../../../src/lib/crm/closure-rules";
import { isDaytimeInMerida } from "../../../src/lib/crm/whatsapp/outbox.server";

const experience = {
  product_type: "experiencia",
  status: "published",
  deleted_at: null,
  direct_sale_enabled: true,
  direct_sale_price_amount: 1200,
};

describe("venta directa: sólo experiencias tienen enlace de pago", () => {
  test("experiencia publicada con cobro activo y precio sí se vende", () => {
    expect(canSellDirect(experience)).toBe(true);
  });
  test("hoteles, restaurantes, tours y transporte no tienen enlace de pago", () => {
    for (const t of ["hotel", "restaurante", "tour", "transporte", "servicio", "evento"]) {
      expect(canSellDirect({ ...experience, product_type: t })).toBe(false);
    }
  });
  test("sin precio, sin cobro activo, borrador o borrada no se vende", () => {
    expect(canSellDirect({ ...experience, direct_sale_price_amount: 0 })).toBe(false);
    expect(canSellDirect({ ...experience, direct_sale_price_amount: null })).toBe(false);
    expect(canSellDirect({ ...experience, direct_sale_enabled: false })).toBe(false);
    expect(canSellDirect({ ...experience, status: "draft" })).toBe(false);
    expect(canSellDirect({ ...experience, deleted_at: "2026-11-01T00:00:00Z" })).toBe(false);
  });
});

describe("#enlace del concierge", () => {
  test("sin texto manda el enlace para crear la cuenta", () => {
    expect(parseEnlaceArg("")).toEqual({ purpose: "register", query: null });
    expect(parseEnlaceArg("registro")).toEqual({ purpose: "register", query: null });
  });
  test("con el nombre de una experiencia manda su enlace de pago", () => {
    expect(parseEnlaceArg("cenote suytun")).toEqual({ purpose: "pay", query: "cenote suytun" });
  });
});

describe("enlace personal", () => {
  test("vale 14 días y el recontacto es 30 días antes del viaje", () => {
    expect(INVITE_TTL_DAYS).toBe(14);
    expect(RECONTACT_DAYS_BEFORE).toBe(30);
  });
  test("el código es aleatorio de 43 caracteres y sólo se guarda su huella", async () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(isInviteTokenShape(a)).toBe(true);
    expect(a).not.toBe(b);
    const h = await hashInviteToken(a);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(a);
  });
  test("estado: usado, vencido o vigente", () => {
    const now = new Date("2026-11-21T12:00:00Z");
    expect(inviteState({ expires_at: "2026-12-01T00:00:00Z", used_at: null }, now)).toBe("valid");
    expect(inviteState({ expires_at: "2026-11-20T00:00:00Z", used_at: null }, now)).toBe("expired");
    expect(inviteState({ expires_at: "2026-12-01T00:00:00Z", used_at: "2026-11-21T10:00:00Z" }, now)).toBe("used");
  });
});

const prospect: HandoffProspect = {
  first_name: "Laura",
  language: "en",
  source: "whatsapp",
  capture_reason: "itinerary",
  destination_slug: "valladolid",
  trip_brief: { startDate: "2026-12-20", endDate: "2026-12-24", partySize: 2, interests: ["cenotes"] },
  trip_items: [
    { kind: "product", targetId: "11111111-1111-4111-8111-111111111111", title: "Cenote Suytun" },
    { kind: "product", targetId: "11111111-1111-4111-8111-111111111111", title: "Cenote Suytun" },
    { kind: "destination", targetId: "not-a-uuid", title: "Ek Balam" },
  ],
  handoff_summary: null,
};

describe("ficha de traspaso al CRM Arma tu viaje", () => {
  test("lleva quién es, idioma, canal, fechas, personas, destinos e intereses", () => {
    const s = buildHandoffSummary(prospect);
    expect(s).toContain("Laura");
    expect(s).toContain("inglés");
    expect(s).toContain("WhatsApp");
    expect(s).toContain("del 2026-12-20 al 2026-12-24");
    expect(s).toContain("2 personas");
    expect(s).toContain("Valladolid");
    expect(s).toContain("cenotes");
    expect(s).toContain("Cenote Suytun");
  });
  test("no inventa datos: sin fechas lo dice así", () => {
    const s = buildHandoffSummary({ ...prospect, trip_brief: {}, destination_slug: null });
    expect(s).toContain("todavía sin fechas ni personas");
  });
  test("el resumen del expediente cabe en 500 caracteres", () => {
    const long = { ...prospect, trip_brief: { destinations: Array.from({ length: 80 }, (_, i) => `destino-${i}`) } };
    expect(buildCaseSummary(long).length).toBeLessThanOrEqual(500);
  });
  test("los lugares pasan a Mi Viaje sin duplicados; lo que no tiene ficha va como nota", () => {
    const items = toPlanItems(prospect.trip_items);
    expect(items.filter((i) => i.item_kind === "product")).toHaveLength(1);
    expect(items.find((i) => i.item_kind === "note")?.notes).toBe("Ek Balam");
  });
});

describe("mensajes en el idioma del cliente", () => {
  test("enlace de pago menciona la experiencia y el enlace", () => {
    const m = inviteMessage("en", { firstName: "Laura", url: "https://x/continuar/abc", purpose: "pay", productName: "Cenote Suytun" });
    expect(m).toContain("Hi Laura");
    expect(m).toContain("Cenote Suytun");
    expect(m).toContain("https://x/continuar/abc");
  });
  test("recontacto de 30 días en español e inglés; idioma desconocido cae a español", () => {
    expect(recontactMessage("es", { firstName: "Ana", destination: "Valladolid" })).toContain("faltan 30 días");
    expect(recontactMessage("en", { firstName: "Ann", destination: null })).toContain("30 days away");
    expect(recontactMessage("xx", { firstName: "Ana", destination: null })).toContain("Hola Ana");
  });
  test("Alux sólo escribe solo entre 9:00 y 20:00 de Mérida", () => {
    expect(isDaytimeInMerida(new Date("2026-11-21T15:30:00Z"))).toBe(true); // 9:30
    expect(isDaytimeInMerida(new Date("2026-11-21T12:00:00Z"))).toBe(false); // 6:00
    expect(isDaytimeInMerida(new Date("2026-11-22T02:30:00Z"))).toBe(false); // 20:30
  });
});
