import { describe, expect, test } from "vitest";
import {
  menuFactsFor,
  menuSearchText,
  mergeMenuItems,
  normalizeMenuItems,
} from "../../src/lib/menu/menu-model";
import { businessToMenuDTO } from "../../src/lib/experience-builder/adapters/business-to-blocks";
import type { MarketplaceBusinessDetail } from "../../src/lib/catalog/marketplace-reads.functions";

const carta = normalizeMenuItems([
  { section: "Bebidas frías", name: "Frappé de horchata", priceAmount: 85, tags: ["sin-alcohol"] },
  { section: "Bebidas calientes", name: "Capuchino", description: "Con leche de avena", priceAmount: 70, tags: ["vegano", "inventada"] },
  { section: "Desayunos", name: "Huevos motuleños", priceAmount: "120" },
]);

describe("carta de restaurantes · reglas", () => {
  test("sólo se guardan etiquetas oficiales y el precio se lee como número", () => {
    expect(carta[1]?.tags).toEqual(["vegano"]);
    expect(carta[2]?.priceAmount).toBe(120);
  });

  test("Alux cita el platillo que coincide con la pregunta con precio de referencia, sin venta en línea", () => {
    const facts = menuFactsFor(carta, ["frappe"]);
    expect(facts[0]).toContain("Frappé de horchata");
    expect(facts[0]).toContain("$85 MXN");
    expect(facts[0]).toContain("precios de referencia");
    expect(facts.join(" ")).toContain("no se venden en línea");
  });

  test("la carta hace encontrable el negocio por sus platillos y etiquetas", () => {
    const text = menuSearchText(carta);
    expect(text).toContain("Huevos motuleños");
    expect(text).toContain("Vegano");
  });

  test("una carta leída se une sin duplicar y actualiza el precio", () => {
    const merged = mergeMenuItems(carta, normalizeMenuItems([
      { section: "Bebidas frías", name: "frappé de horchata", priceAmount: 90 },
      { section: "Postres", name: "Marquesita", priceAmount: 45 },
    ]));
    expect(merged).toHaveLength(4);
    expect(merged.find((i) => i.name === "Frappé de horchata")?.priceAmount).toBe(90);
  });

  test("la página pública agrupa por sección y avisa que no se cobra en línea", () => {
    const b = {
      display_name: "Café Zací",
      menu: carta.map((i) => ({
        section: i.section,
        name: i.name,
        description: i.description,
        price_amount: i.priceAmount,
        price_currency: i.priceCurrency,
        tags: i.tags,
      })),
    } as unknown as MarketplaceBusinessDetail;
    const dto = businessToMenuDTO(b);
    expect(dto?.sections.map((s) => s.title)).toEqual(["Bebidas frías", "Bebidas calientes", "Desayunos"]);
    expect(dto?.sections[1]?.items[0]?.tags).toEqual(["Vegano"]);
    expect(dto?.footnote).toContain("No se cobra en línea");
  });

  test("una carta en mayúsculas se une a la sección que ya existe", () => {
    const merged = mergeMenuItems(carta, normalizeMenuItems([
      { section: "DESAYUNOS", name: "Chilaquiles rojos", priceAmount: 100 },
    ]));
    expect(merged.find((i) => i.name === "Chilaquiles rojos")?.section).toBe("Desayunos");
    expect(normalizeMenuItems([{ section: "BEBIDAS FRÍAS", name: "Té" }])[0]?.section).toBe("Bebidas frías");
  });

  test("sin carta no aparece la sección", () => {
    expect(businessToMenuDTO({ display_name: "X", menu: [] } as unknown as MarketplaceBusinessDetail)).toBeNull();
  });
});
