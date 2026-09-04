/**
 * Experiencias · contrato de separación comercial.
 * Ejecutar con: `bun test scripts/experiences/experience-commerce.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import { resolveExperienceCommerce } from "../../src/lib/experiences/experience-commerce";

describe("resolveExperienceCommerce", () => {
  test("sólo hay Reservar con reserva en línea Y pago en línea", () => {
    const ok = resolveExperienceCommerce({
      conversionMode: "reservar_en_linea",
      acceptsOnlinePayment: true,
      priceAmount: 1200,
      priceCurrency: "MXN",
    });
    expect(ok.canBookOnline).toBe(true);
    expect(ok.bookLabel).toBe("Reservar en línea");
    expect(ok.priceLabel).toContain("1,200");
  });

  test("reserva en línea sin pago acreditado NO produce checkout", () => {
    const decision = resolveExperienceCommerce({
      conversionMode: "reservar_en_linea",
      acceptsOnlinePayment: false,
      contact: { type: "whatsapp", value: "+52 985 100 0000" },
    });
    expect(decision.canBookOnline).toBe(false);
    expect(decision.bookLabel).toBeNull();
    expect(decision.contactHref).toBe("https://wa.me/+529851000000");
  });

  test("cotización, teléfono y sitio externo nunca habilitan pago", () => {
    for (const mode of ["solicitar_cotizacion", "telefono", "sitio_externo"]) {
      const decision = resolveExperienceCommerce({
        conversionMode: mode,
        acceptsOnlinePayment: false,
        externalUrl: "https://operador.example/reservas",
      });
      expect(decision.canBookOnline).toBe(false);
      expect(decision.bookLabel).toBeNull();
    }
  });

  test("sin capacidad comercial la ficha queda informativa", () => {
    const decision = resolveExperienceCommerce({
      conversionMode: "informacion",
      acceptsOnlinePayment: false,
    });
    expect(decision.capability).toBe("information_only");
    expect(decision.contactLabel).toBeNull();
    expect(decision.priceLabel).toBeNull();
  });

  test("Agregar a Mi Viaje es independiente de la capacidad comercial", () => {
    expect(
      resolveExperienceCommerce({ conversionMode: "informacion", acceptsOnlinePayment: false })
        .showAddToTrip,
    ).toBe(true);
    expect(
      resolveExperienceCommerce({ conversionMode: "reservar_en_linea", acceptsOnlinePayment: true })
        .showAddToTrip,
    ).toBe(true);
  });
});
