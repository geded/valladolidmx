/**
 * CRM Prospectos · Fase 1 — reglas acordadas con el Founder (propuesta 19.48).
 * Ejecutar con: `bun test scripts/omxds/crm/prospect-rules.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  MAX_CONTACT_OFFERS_PER_SESSION,
  PROSPECT_FUNNEL_STAGES,
  URGENT_WAIT_MINUTES,
  cleanFirstName,
  decideContactOffer,
  normalizeWhatsApp,
} from "../../../src/lib/crm/prospect-rules";

const base = {
  authenticated: false,
  alreadyProspect: false,
  offerCount: 0,
  lastOfferMessageCount: null,
  messageCount: 1,
  message: "hola",
};

describe("cuándo Alux ofrece dejar nombre y WhatsApp", () => {
  test("al pedir hablar con un concierge", () => {
    expect(decideContactOffer({ ...base, message: "quiero hablar con un asesor" })).toBe("concierge");
  });
  test("al querer reservar", () => {
    expect(decideContactOffer({ ...base, message: "¿cómo reservo el tour?" })).toBe("booking");
  });
  test("al preguntar precio", () => {
    expect(decideContactOffer({ ...base, message: "¿cuánto cuesta?" })).toBe("price");
  });
  test("al pedir el itinerario completo", () => {
    expect(decideContactOffer({ ...base, message: "arma mi viaje de 3 días" })).toBe("itinerary");
  });
  test("tras 4 mensajes previos aunque no lo pida", () => {
    expect(decideContactOffer({ ...base, messageCount: 4 })).toBe("followup");
    expect(decideContactOffer({ ...base, messageCount: 3 })).toBeNull();
  });
  test("máximo dos veces por plática", () => {
    expect(MAX_CONTACT_OFFERS_PER_SESSION).toBe(2);
    expect(
      decideContactOffer({ ...base, offerCount: 2, messageCount: 20, message: "precio" }),
    ).toBeNull();
  });
  test("el segundo ofrecimiento espera al menos 3 mensajes", () => {
    expect(
      decideContactOffer({ ...base, offerCount: 1, lastOfferMessageCount: 4, messageCount: 6, message: "precio" }),
    ).toBeNull();
    expect(
      decideContactOffer({ ...base, offerCount: 1, lastOfferMessageCount: 4, messageCount: 7, message: "precio" }),
    ).toBe("price");
  });
  test("nunca a quien ya tiene cuenta o ya dejó sus datos", () => {
    expect(decideContactOffer({ ...base, authenticated: true, message: "precio" })).toBeNull();
    expect(decideContactOffer({ ...base, alreadyProspect: true, message: "precio" })).toBeNull();
  });
});

describe("WhatsApp", () => {
  test("10 dígitos se toman como México", () => {
    expect(normalizeWhatsApp("999 123 4567")).toBe("+529991234567");
  });
  test("conserva lada internacional", () => {
    expect(normalizeWhatsApp("+1 (555) 123-4567")).toBe("+15551234567");
  });
  test("convierte el antiguo 521 de celular", () => {
    expect(normalizeWhatsApp("5219991234567")).toBe("+529991234567");
  });
  test("rechaza números incompletos", () => {
    expect(normalizeWhatsApp("12345")).toBeNull();
  });
});

describe("embudo y espera", () => {
  test("orden del embudo como Zazil", () => {
    expect(PROSPECT_FUNNEL_STAGES).toEqual([
      "nuevo",
      "contactado",
      "propuesta_enviada",
      "reservo",
      "por_viajar",
      "viajo",
      "posventa",
    ]);
  });
  test("urgente después de 30 minutos", () => {
    expect(URGENT_WAIT_MINUTES).toBe(30);
  });
  test("nombre limpio", () => {
    expect(cleanFirstName("  Ana 123 ")).toBe("Ana");
    expect(cleanFirstName("1")).toBeNull();
  });
});
