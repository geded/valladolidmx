import { describe, expect, it } from "vitest";
import {
  MAX_VENUES_PER_HOST,
  filterVenueCandidates,
  venueActionLabel,
  venueBookingHref,
  venueCategoryLabel,
  venueLinkProblem,
  venuePlaceLabel,
  type LinkedBusiness,
  type PublicVenue,
} from "../src/lib/commerce/hotel-venue";

const venue = (over: Partial<PublicVenue> = {}): PublicVenue => ({
  link_id: "l1",
  id: "b1",
  name: "Copalli Café",
  slug: "copalli-cafe",
  tagline: "Café de especialidad",
  category_slug: "cafeterias",
  destination_slug: "valladolid",
  booking_enabled: true,
  ...over,
});

describe("Restaurante del hotel", () => {
  it("enlaza directo al cuadro de reserva cuando el restaurante acepta mesas", () => {
    expect(venueBookingHref(venue())).toBe(
      "/oriente-maya/valladolid/cafeterias/copalli-cafe#reservar-mesa",
    );
    expect(venueActionLabel(venue())).toBe("Reservar mesa");
  });
  it("sin reservas no promete mesa, solo lleva a la ficha", () => {
    expect(venueBookingHref(venue({ booking_enabled: false }))).toBe(
      "/oriente-maya/valladolid/cafeterias/copalli-cafe",
    );
    expect(venueActionLabel(venue({ booking_enabled: false }))).toBe("Ver carta y horarios");
  });
  it("un negocio no puede vincularse a sí mismo", () => {
    expect(venueLinkProblem({ hostId: "h1", venueId: "h1", current: [] })).toBe(
      "Un negocio no puede vincularse a sí mismo.",
    );
  });
  it("no se duplica un vínculo existente", () => {
    const current: LinkedBusiness[] = [{ link_id: "l1", id: "b1", name: "Copalli Café" }];
    expect(venueLinkProblem({ hostId: "h1", venueId: "b1", current })).toBe("Ese vínculo ya existe.");
  });
  it("un hotel muestra como máximo seis restaurantes", () => {
    const current: LinkedBusiness[] = Array.from({ length: MAX_VENUES_PER_HOST }, (_, i) => ({
      link_id: `l${i}`,
      id: `b${i}`,
      name: `Restaurante ${i}`,
    }));
    expect(venueLinkProblem({ hostId: "h1", venueId: "nuevo", current })).toBe(
      "Un hotel puede mostrar hasta 6 restaurantes.",
    );
  });
  it("muestra categorías y lugares legibles, nunca el nombre interno con guiones", () => {
    expect(venueCategoryLabel("cafeterias")).toBe("Cafetería");
    expect(venueCategoryLabel("restaurantes")).toBe("Restaurante");
    expect(venueCategoryLabel("hoteles_boutique")).toBe("Hoteles boutique");
    expect(venueCategoryLabel("")).toBe("");
    expect(venuePlaceLabel("el-cuyo")).toBe("El Cuyo");
    expect(venuePlaceLabel("valladolid")).toBe("Valladolid");
  });
  it("las búsqueda del Portal nunca ofrece al propio negocio ni a los ya vinculados", () => {
    const candidates = [
      { id: "h1", name: "Hotel Self", slug: "s", category_slug: "hoteles", destination_slug: "valladolid" },
      { id: "b1", name: "Copalli Café", slug: "c", category_slug: "cafeterias", destination_slug: "valladolid" },
      { id: "b2", name: "Casa Tía Micha", slug: "ctm", category_slug: "restaurantes", destination_slug: "valladolid" },
    ];
    const out = filterVenueCandidates(candidates, {
      selfId: "h1",
      current: [{ link_id: "l1", id: "b1", name: "Copalli Café" }],
      term: "ca",
    });
    expect(out.map((c) => c.id)).toEqual(["b2"]);
  });
});
