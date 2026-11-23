import { describe, expect, it } from "vitest";
import {
  buildMenuOrderLines,
  isMenuExtraSection,
  maxPurchasable,
  updateMenuOrder,
  parseStoreSheet,
  setMenuOrderQuantity,
  summarizeMenuOrder,
} from "../src/lib/commerce/store-catalog";

describe("hoja de productos de tienda", () => {
  it("lee nombre, precio y piezas pegados de Excel", () => {
    const r = parseStoreSheet("Nombre\tPrecio\tPiezas\nBolso bordado\t890\t5\nHamaca\t$1,250\t");
    expect(r.rows).toEqual([
      { name: "Bolso bordado", price: 890, stock: 5, description: null },
      { name: "Hamaca", price: 1250, stock: null, description: null },
    ]);
    expect(r.problems).toEqual([]);
  });

  it("acepta comas y reporta la línea sin precio", () => {
    const r = parseStoreSheet("Perfume Coqui, 1,450, 3\nVela sin precio, , 2");
    expect(r.rows[0]).toEqual({ name: "Perfume Coqui", price: 1450, stock: 3, description: null });
    expect(r.problems).toEqual([{ line: 2, text: "Vela sin precio, , 2" }]);
  });
});

describe("pedido desde la carta", () => {
  const carta = [
    { id: "a", name: "Matcha fresa", price: 105 },
    { id: "b", name: "Cold brew", price: 65 },
    { id: "c", name: "Sin precio", price: null },
  ];

  it("suma dos matcha fresa y un cold brew: $275", () => {
    let cart = setMenuOrderQuantity({}, "a", 2);
    cart = setMenuOrderQuantity(cart, "b", 1);
    const s = summarizeMenuOrder(cart, carta);
    expect(s.total).toBe(275);
    expect(s.pieces).toBe(3);
  });

  it("no cuenta lo que no tiene precio y quita la línea en cero", () => {
    let cart = setMenuOrderQuantity({}, "c", 1);
    cart = setMenuOrderQuantity(cart, "a", 1);
    cart = setMenuOrderQuantity(cart, "a", 0);
    expect(summarizeMenuOrder(cart, carta).lines).toEqual([]);
  });

  it("no deja pedir más de 20 de una misma bebida", () => {
    expect(setMenuOrderQuantity({}, "a", 50)["a"]).toBe(20);
  });
});

describe("extras y notas de Copalli", () => {
  const carta = [
    { id: "latte", name: "Latte", price: 75 },
    { id: "vegetal", name: "Leche vegetal", price: 16, extra: true },
  ];

  it("reconoce la sección Extras y no una bebida", () => {
    expect(isMenuExtraSection("Extras")).toBe(true);
    expect(isMenuExtraSection("Adicionales")).toBe(true);
    expect(isMenuExtraSection("Bebidas frías")).toBe(false);
  });

  it("no deja agregar un extra sin una bebida en el pedido", () => {
    expect(updateMenuOrder({}, carta, "vegetal", 1)).toEqual({});
  });

  it("al quitar la última bebida se quitan sus extras", () => {
    let cart = updateMenuOrder({}, carta, "latte", 1);
    cart = updateMenuOrder(cart, carta, "vegetal", 1);
    expect(updateMenuOrder(cart, carta, "latte", 0)).toEqual({});
  });

  it("2 latte con leche vegetal y nota: $182 y la nota viaja con la bebida", () => {
    const r = buildMenuOrderLines({ latte: 2 }, { latte: { extras: ["vegetal"], note: "sin azúcar" } }, carta);
    expect(r.total).toBe(182);
    expect(r.pieces).toBe(2);
    expect(r.lines).toEqual([
      { menuItemId: "latte", quantity: 2, name: "Latte", subtotal: 150, note: "sin azúcar" },
      { menuItemId: "vegetal", quantity: 2, name: "Leche vegetal", subtotal: 32, forItemId: "latte", forName: "Latte" },
    ]);
  });

  it("un pedido con sólo extras no se arma", () => {
    expect(buildMenuOrderLines({ vegetal: 1 }, {}, carta).lines).toEqual([]);
  });
});

describe("piezas de tienda", () => {
  it("no deja comprar más piezas de las que hay", () => {
    expect(maxPurchasable(3, 10)).toBe(3);
    expect(maxPurchasable(0, null)).toBe(0);
    expect(maxPurchasable(null, null)).toBe(20);
  });
});
