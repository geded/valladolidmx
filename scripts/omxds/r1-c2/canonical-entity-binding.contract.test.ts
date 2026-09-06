/**
 * G8-R1-C · Paso C2 — Contrato de conexión de rutas reales al resolutor
 * canónico. Puro: sin red, sin base de datos, sin publicación.
 */
import { describe, expect, it } from "bun:test";
import {
  CANONICAL_ROUTE_BINDING_MATRIX,
  bindBusinessRoute,
  bindEventRoute,
  bindPlaceRoute,
  bindProductRoute,
  hasRealValue,
  keepSectionsWithRealData,
  omittedSectionIds,
} from "@/lib/experience-builder/canonical-entity-binding";

describe("C2 · matriz ruta real → entidad → familia", () => {
  it("cubre las cuatro rutas reales y las siete familias productivas", () => {
    const routes = CANONICAL_ROUTE_BINDING_MATRIX.map((r) => r.routePattern);
    expect(routes).toEqual([
      "/oriente-maya/{destino}/{categoria}/{empresa}",
      "/producto/{slug}",
      "/eventos/{slug}",
      "/oriente-maya/{destino}/lugares/{lugar}",
    ]);
    const families = CANONICAL_ROUTE_BINDING_MATRIX.flatMap((r) => r.families);
    for (const f of [
      "hotel",
      "restaurant",
      "vacation_rental",
      "experience",
      "tour",
      "product_generic",
      "event",
      "place",
    ]) {
      expect(families).toContain(f);
    }
  });
});

describe("C2 · empresa", () => {
  it("hotel elegible resuelve al preset premium de familia", () => {
    const b = bindBusinessRoute({
      businessId: "b1",
      categorySlug: "hoteles",
      premiumEligible: true,
    });
    expect(b.family).toBe("hotel");
    expect(b.presetId).toBe("premium-entity-hotel");
    expect(b.surface).toBe("premium");
  });

  it("restaurante elegible resuelve al preset premium de familia", () => {
    const b = bindBusinessRoute({
      businessId: "b2",
      categorySlug: "restaurantes",
      premiumEligible: true,
    });
    expect(b.presetId).toBe("premium-entity-restaurant");
    expect(b.surface).toBe("premium");
  });

  it("casa de vacaciones elegible usa su preset premium", () => {
    const b = bindBusinessRoute({
      businessId: "b3",
      categorySlug: "casas-de-vacaciones",
      premiumEligible: true,
    });
    expect(b.surface).toBe("premium");
    expect(b.presetId).toBe("premium-entity-vacation-rental");
  });

  // G8-R1-F1L·P0 — familia ≠ medios: la carencia de fotografía acreditada ya
  // no expulsa a la entidad de su familia premium; sólo el contexto explícito
  // (`forceStandardSurface`) degrada a superficie estándar.
  it("entidad sin elegibilidad cinematográfica conserva su familia premium", () => {
    const b = bindBusinessRoute({
      businessId: "b4",
      categorySlug: "hoteles",
      premiumEligible: false,
    });
    expect(b.surface).toBe("premium");
  });

  it("sólo el contexto explícito degrada a superficie estándar", () => {
    const b = bindBusinessRoute({
      businessId: "b4",
      categorySlug: "hoteles",
      premiumEligible: false,
      forceStandardSurface: true,
    });
    expect(b.surface).toBe("standard");
  });

  it("categoría desconocida cae a superficie estándar", () => {
    const b = bindBusinessRoute({
      businessId: "b5",
      categorySlug: "tiendita",
      premiumEligible: true,
    });
    expect(b.surface).toBe("standard");
  });

  it("override editorial aprobado y compatible tiene prioridad", () => {
    const b = bindBusinessRoute({
      businessId: "b6",
      categorySlug: "hoteles",
      premiumEligible: true,
      override: { presetId: "premium-entity-hotel", entityId: "b6", approved: true },
    });
    expect(b.resolution.source).toBe("override");
    expect(b.surface).toBe("premium");
  });

  it("override no aprobado no se aplica", () => {
    const b = bindBusinessRoute({
      businessId: "b7",
      categorySlug: "hoteles",
      premiumEligible: true,
      override: { presetId: "premium-entity-restaurant", entityId: "b7", approved: false },
    });
    expect(b.resolution.source).toBe("family");
    expect(b.presetId).toBe("premium-entity-hotel");
  });
});

describe("C2 · producto", () => {
  it("experiencia y tour resuelven a su preset", () => {
    expect(bindProductRoute({ productId: "p1", productType: "experiencia" }).family).toBe(
      "experience",
    );
    expect(bindProductRoute({ productId: "p2", productType: "tour" }).family).toBe("tour");
  });

  it("producto genérico resuelve a superficie estándar", () => {
    const p = bindProductRoute({ productId: "p3", productType: "artesania" });
    expect(p.family).toBe("product_generic");
    expect(p.surface).toBe("standard");
  });
});

describe("C2 · evento y lugar", () => {
  it("evento resuelve al preset de familia", () => {
    const e = bindEventRoute({ eventId: "e1" });
    expect(e.presetId).toBe("premium-entity-event");
    expect(e.surface).toBe("premium");
  });

  it("lugar delega en premium-entity-place con variante cerrada", () => {
    const l = bindPlaceRoute({ placeId: "l1", placeType: "zona-arqueologica" });
    expect(l.presetId).toBe("premium-entity-place");
    expect(l.variant).toBe("zona-arqueologica");
    expect(l.surface).toBe("premium");
  });

  it("tipo de lugar no reconocido es fail-closed", () => {
    const l = bindPlaceRoute({ placeId: "l2", placeType: "inventado" });
    expect(l.surface).toBe("standard");
    expect(l.presetId).toBeNull();
  });
});

describe("C2 · cero contenido inventado", () => {
  it("hasRealValue rechaza vacíos y acepta datos reales", () => {
    expect(hasRealValue(null)).toBe(false);
    expect(hasRealValue("   ")).toBe(false);
    expect(hasRealValue([])).toBe(false);
    expect(hasRealValue([{ url: "" }])).toBe(false);
    expect(hasRealValue({ url: "https://cdn/x.jpg" })).toBe(true);
  });

  it("omite secciones sin datos reales y las declara", () => {
    const sections = [
      { id: "gallery", data: [] },
      { id: "schedule", data: null },
      { id: "location", data: { lat: 20.68, lng: -88.2 } },
    ];
    expect(keepSectionsWithRealData(sections).map((s) => s.id)).toEqual(["location"]);
    expect(omittedSectionIds(sections)).toEqual(["gallery", "schedule"]);
  });
});
