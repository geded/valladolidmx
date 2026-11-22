/**
 * CRM · Fase 5 — WhatsApp de cada empresa con Alux.
 * Ejecutar con: `bun test scripts/omxds/crm/business-whatsapp-rules.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  businessChatRules,
  businessContextBlock,
  defaultPresentation,
  isBusinessCommand,
  makeBusinessInstanceName,
  productPriceText,
  type BusinessProductFact,
  type BusinessWhatsAppContext,
} from "../../../src/lib/crm/whatsapp/business-rules";
import { isVmxInstance } from "../../../src/lib/crm/whatsapp/rules";

const product = (over: Partial<BusinessProductFact> = {}): BusinessProductFact => ({
  name: "Habitación doble",
  type: "room",
  tagline: null,
  description: null,
  priceAmount: 1850,
  priceCurrency: "MXN",
  directSaleCents: null,
  directSaleCurrency: null,
  durationMinutes: null,
  ...over,
});

const ctx = (over: Partial<BusinessWhatsAppContext> = {}): BusinessWhatsAppContext => ({
  businessId: "00000000-0000-0000-0000-000000000001",
  name: "Hotel Sutuk",
  category: "Hotel",
  destinationName: "Valladolid",
  tagline: null,
  description: "Hotel boutique en el centro.",
  address: "Calle 41",
  mapsUrl: null,
  publicUrl: null,
  products: [product()],
  hours: [],
  faqs: [{ question: "¿Aceptan mascotas?", answer: "Sí, pequeñas." }],
  ...over,
});

describe("Presentación del asistente", () => {
  test("siempre se llama Alux, el asistente de la empresa", () => {
    expect(defaultPresentation("Hotel Sutuk", "Valladolid")).toBe(
      "Soy Alux, el asistente de Hotel Sutuk en Valladolid.",
    );
    expect(businessChatRules("Hotel Sutuk", "cercano")).toContain(
      "«Alux, el asistente de Hotel Sutuk»",
    );
  });
  test("sin saludo propio usa la presentación armada con la ficha", () => {
    const block = businessContextBlock(ctx(), {
      greeting: null,
      tone: "cercano",
      highlights: null,
    });
    expect(block).toContain("Soy Alux, el asistente de Hotel Sutuk en Valladolid.");
  });
  test("con saludo propio usa el de la empresa", () => {
    const block = businessContextBlock(ctx(), {
      greeting: "Bienvenido a Hotel Sutuk",
      tone: "cercano",
      highlights: "Somos pet friendly",
    });
    expect(block).toContain("Bienvenido a Hotel Sutuk");
    expect(block).not.toContain("Presentación para el primer mensaje");
    expect(block).toContain("Somos pet friendly");
  });
  test("el tono formal trata de usted", () => {
    expect(businessChatRules("Hotel Sutuk", "formal")).toContain("trata de usted");
    expect(businessChatRules("Hotel Sutuk", "cercano")).toContain("de tú");
  });
});

describe("Precios propios de la empresa", () => {
  test("da el precio que la empresa dio de alta", () => {
    expect(productPriceText(product())).toBe("$1,850 MXN");
    const block = businessContextBlock(ctx(), {
      greeting: null,
      tone: "cercano",
      highlights: null,
    });
    expect(block).toContain("Precio: $1,850 MXN");
  });
  test("la venta directa (en centavos) manda sobre el precio normal", () => {
    expect(productPriceText(product({ directSaleCents: 45000, priceAmount: 600 }))).toBe(
      "$450 MXN",
    );
  });
  test("sin precio no inventa uno", () => {
    expect(productPriceText(product({ priceAmount: null }))).toBeNull();
    const block = businessContextBlock(ctx({ products: [product({ priceAmount: null })] }), {
      greeting: null,
      tone: "cercano",
      highlights: null,
    });
    expect(block).toContain("sin precio publicado");
  });
});

describe("Sólo la empresa", () => {
  test("nunca recomienda otras empresas", () => {
    expect(businessChatRules("Hotel Sutuk", "cercano")).toContain(
      "Nunca recomiendas ni mencionas otras empresas",
    );
  });
  test("usa sus preguntas y respuestas", () => {
    const block = businessContextBlock(ctx(), {
      greeting: null,
      tone: "cercano",
      highlights: null,
    });
    expect(block).toContain("P: ¿Aceptan mascotas? R: Sí, pequeñas.");
  });
});

describe("Comandos y líneas", () => {
  test("en el WhatsApp de la empresa sólo sirven #alux, #apagar y #nota", () => {
    expect(isBusinessCommand("alux")).toBe(true);
    expect(isBusinessCommand("apagar")).toBe(true);
    expect(isBusinessCommand("nota")).toBe(true);
    expect(isBusinessCommand("enlace")).toBe(false);
    expect(isBusinessCommand("cotizar")).toBe(false);
  });
  test("las líneas de empresa viven en el espacio vmx- y nunca tocan las de Zazil", () => {
    const name = makeBusinessInstanceName("Hotel Sutuk Valladolid", "a1b2c3d4");
    expect(name.startsWith("vmx-biz-")).toBe(true);
    expect(isVmxInstance(name)).toBe(true);
    expect(isVmxInstance("zt-principal")).toBe(false);
  });
});
