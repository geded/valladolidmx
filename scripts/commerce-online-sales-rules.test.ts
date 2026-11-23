import { describe, expect, test } from "vitest";
import {
  businessAllowsOnlineSale,
  commissionBpsForProduct,
  normalizeCommissionByMode,
  normalizeOnlineSalesInput,
  onlineSaleModeFor,
} from "../src/lib/commerce/online-sales-rules";

const copalliOn = { enabled: true, modes: ["pedidos"], channels: ["pagina", "whatsapp"] };

describe("ventas en línea por empresa", () => {
  test("las experiencias se venden como siempre, sin interruptor", () => {
    expect(businessAllowsOnlineSale(null, "experiencia", "whatsapp")).toBe(true);
  });

  test("una empresa sin interruptor no vende tienda, pedidos ni hotel", () => {
    expect(businessAllowsOnlineSale(null, "artesanal")).toBe(false);
    expect(businessAllowsOnlineSale(null, "restaurante")).toBe(false);
    expect(businessAllowsOnlineSale(null, "hotel")).toBe(false);
  });

  test("apagada, no vende aunque tenga modos guardados", () => {
    expect(businessAllowsOnlineSale({ ...copalliOn, enabled: false }, "restaurante", "pagina")).toBe(false);
  });

  test("activada vende sólo el modo y los canales elegidos", () => {
    expect(businessAllowsOnlineSale(copalliOn, "restaurante", "pagina")).toBe(true);
    expect(businessAllowsOnlineSale(copalliOn, "restaurante", "alux_pagina")).toBe(false);
    expect(businessAllowsOnlineSale(copalliOn, "artesanal", "pagina")).toBe(false);
  });

  test("cada tipo de producto cae en su forma de venta", () => {
    expect(onlineSaleModeFor("artesanal")).toBe("tienda");
    expect(onlineSaleModeFor("restaurante")).toBe("pedidos");
    expect(onlineSaleModeFor("hotel")).toBe("reservas");
    expect(onlineSaleModeFor("tour")).toBe("salidas");
  });

  test("no se puede dejar encendida sin modo o sin canal", () => {
    expect(normalizeOnlineSalesInput({ enabled: true, modes: ["tienda"], channels: [] }).enabled).toBe(false);
    expect(normalizeOnlineSalesInput({ enabled: true, modes: [], channels: ["pagina"] }).enabled).toBe(false);
  });
});

describe("comisión distinta por tipo", () => {
  const table = normalizeCommissionByMode({ tienda: 1500, pedidos: 1000, reservas: 1800 });

  test("tienda, pedidos y hoteles usan su propia comisión", () => {
    expect(commissionBpsForProduct("artesanal", table)).toBe(1500);
    expect(commissionBpsForProduct("restaurante", table)).toBe(1000);
    expect(commissionBpsForProduct("hotel", table)).toBe(1800);
  });

  test("experiencias conservan la comisión por producto", () => {
    expect(commissionBpsForProduct("experiencia", table)).toBeNull();
  });

  test("sin capturar, cada tipo arranca en 15 %", () => {
    expect(normalizeCommissionByMode(null)).toEqual({ tienda: 1500, pedidos: 1500, reservas: 1500 });
  });
});
