/**
 * Fase A · «El plan gratis vale la pena».
 *
 * Reglas del Founder (plan aprobado 2026-11-23):
 *  - Medidor «Tu ficha para Alux» con porcentaje, qué falta y el beneficio.
 *  - Alux premia la ficha completa, no sólo el pago; el pago sigue primero
 *    (marcado) sólo si encaja.
 *  - Turno justo entre gratuitas: nadie queda fuera por la letra inicial.
 *
 * Ejecutar con: `bun test ./scripts/visibility/profile-completeness.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  aluxQualityScore,
  computeProfileCompleteness,
  type BusinessProfileSignals,
} from "@/lib/visibility/profile-completeness";
import { prioritizeRows } from "@/lib/alux/converse-priority";
import { arrangeBusinessListing } from "@/lib/listings/listing-public-contract";
import type { MarketplaceBusinessCard } from "@/lib/catalog/marketplace-reads.functions";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";

const EMPTY: BusinessProfileSignals = {
  business_id: "b-empty",
  has_cover: false,
  gallery_count: 0,
  description_length: 0,
  hours_days: 0,
  has_location: false,
  has_whatsapp: false,
  has_google: false,
  faq_count: 0,
  published_products: 0,
  sellable_experiences: 0,
  verified: false,
  quotes_90d: 0,
  quotes_fast_90d: 0,
};

const COMPLETE: BusinessProfileSignals = {
  ...EMPTY,
  business_id: "b-full",
  has_cover: true,
  gallery_count: 6,
  description_length: 400,
  hours_days: 7,
  has_location: true,
  has_whatsapp: true,
  has_google: true,
  faq_count: 3,
  published_products: 2,
};

describe("Tu ficha para Alux", () => {
  test("una ficha vacía marca 0 % y los 8 puntos pendientes", () => {
    const r = computeProfileCompleteness(EMPTY);
    expect(r.percent).toBe(0);
    expect(r.pending).toBe(8);
    expect(r.items.map((i) => i.id)).toEqual([
      "fotos",
      "descripcion",
      "horario",
      "ubicacion",
      "whatsapp",
      "google",
      "preguntas",
      "productos",
    ]);
  });

  test("una ficha completa marca 100 % sin pendientes", () => {
    const r = computeProfileCompleteness(COMPLETE);
    expect(r.percent).toBe(100);
    expect(r.pending).toBe(0);
  });

  test("el horario explica su beneficio con las palabras del plan", () => {
    const horario = computeProfileCompleteness(EMPTY).items.find((i) => i.id === "horario");
    expect(horario?.benefit).toBe(
      "Agrega tu horario y Alux podrá recomendarte cuando pregunten qué está abierto.",
    );
  });

  test("la portada sola cuenta como avance parcial de fotos", () => {
    const fotos = computeProfileCompleteness({ ...EMPTY, has_cover: true }).items.find(
      (i) => i.id === "fotos",
    );
    expect(fotos?.status).toBe("partial");
    expect(fotos?.missing).toBe("Agrega 4 fotos de galería.");
  });
});

describe("Alux premia la ficha completa", () => {
  test("ficha completa vale 70; verificada, rápida y con venta en línea llega a 100", () => {
    expect(aluxQualityScore(COMPLETE)).toBe(70);
    expect(
      aluxQualityScore({
        ...COMPLETE,
        verified: true,
        quotes_90d: 2,
        quotes_fast_90d: 2,
        sellable_experiences: 1,
      }),
    ).toBe(100);
  });

  type Row = { id: string; name: string; text: string; weight: number; quality: number };
  const pick = (rows: Row[], terms: string[], seed = "2026-11-23") =>
    prioritizeRows(rows, {
      limit: rows.length,
      terms,
      seed,
      idOf: (r) => r.id,
      nameOf: (r) => r.name,
      textOf: (r) => r.text,
      weightOf: (r) => r.weight,
      qualityOf: (r) => r.quality,
    }).map((r) => r.id);

  test("entre iguales, la ficha completa se lee primero", () => {
    const rows: Row[] = [
      { id: "a", name: "Alfa", text: "hotel", weight: 0, quality: 0 },
      { id: "z", name: "Zeta", text: "hotel", weight: 0, quality: 100 },
    ];
    expect(pick(rows, [])[0]).toBe("z");
  });

  test("la calidad nunca le gana a lo que pide la persona", () => {
    const rows: Row[] = [
      { id: "full", name: "Completa", text: "hotel", weight: 0, quality: 100 },
      { id: "match", name: "Cenote", text: "cenote", weight: 0, quality: 0 },
    ];
    expect(pick(rows, ["cenote"])[0]).toBe("match");
  });

  test("el paquete pagado sigue leyéndose antes que la ficha completa", () => {
    const rows: Row[] = [
      { id: "full", name: "Completa", text: "hotel", weight: 0, quality: 100 },
      { id: "paid", name: "Pagada", text: "hotel", weight: 40, quality: 0 },
    ];
    expect(pick(rows, [])[0]).toBe("paid");
  });
});

describe("Turno justo entre gratuitas", () => {
  const names = Array.from({ length: 30 }, (_, i) => `Empresa ${String.fromCharCode(65 + (i % 26))}${i}`);

  test("Alux: empates cambian de orden según el día, no por abecedario", () => {
    const rows = names.map((name, i) => ({ id: `id-${i}`, name, text: "", weight: 0, quality: 0 }));
    const firsts = new Set(
      ["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26"].map(
        (day) =>
          prioritizeRows(rows, {
            limit: 1,
            terms: [],
            seed: day,
            idOf: (r) => r.id,
            nameOf: (r) => r.name,
            textOf: (r) => r.text,
          })[0]?.id,
      ),
    );
    expect(firsts.size).toBeGreaterThanOrEqual(4);
  });

  const card = (id: string, name: string, cover: boolean): MarketplaceBusinessCard => ({
    id,
    slug: id,
    display_name: name,
    tagline: "",
    destination_slug: "valladolid",
    category_slug: "hoteles",
    verified: false,
    cover_url: cover ? `https://example.com/${id}.jpg` : null,
  });
  const toCard = (b: MarketplaceBusinessCard) => ({ id: b.id }) as unknown as TourismCardVM;

  test("listados: la empresa que empieza con Z no queda siempre al final", () => {
    const list = names.map((name, i) => card(`b-${i}`, name, true));
    list.push(card("zazil", "Zazil Tunich", true));
    const positions = ["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24"].map((day) =>
      arrangeBusinessListing(list, `${day}:listado`, toCard).findIndex((c) => c.id === "zazil"),
    );
    expect(Math.min(...positions)).toBeLessThan(list.length - 1);
    expect(new Set(positions).size).toBeGreaterThanOrEqual(3);
  });

  test("listados: las fichas con foto van antes que las que no tienen", () => {
    const list = [card("sin-foto", "Aaa", false), card("con-foto", "Zzz", true)];
    expect(arrangeBusinessListing(list, "2026-11-23:listado", toCard).map((c) => c.id)).toEqual([
      "con-foto",
      "sin-foto",
    ]);
  });
});
