import { describe, expect, it } from "vitest";
import {
  maxPurchasable,
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

describe("piezas de tienda", () => {
  it("no deja comprar más piezas de las que hay", () => {
    expect(maxPurchasable(3, 10)).toBe(3);
    expect(maxPurchasable(0, null)).toBe(0);
    expect(maxPurchasable(null, null)).toBe(20);
  });
});
