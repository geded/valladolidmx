/**
 * G8-R1 · R1-A · Contrato público tipado de listados.
 *
 * Verifica la vía canónica única de H-R1-01: seis familias declaradas,
 * origen productivo real, fail-closed, cero fixtures y cero invención de
 * elementos.
 */
import { describe, expect, test } from "bun:test";
import {
  LISTING_FAMILY_CONTRACTS,
  LISTING_FAMILY_IDS,
  LISTING_PUBLIC_CONTRACT_VERSION,
  buildPublicListing,
  emptyPublicListing,
  isListingFamilyId,
  listingFamilyContract,
} from "../../../src/lib/listings/listing-public-contract";

const business = (over: Record<string, unknown> = {}) =>
  ({
    id: "b1",
    slug: "hotel-uno",
    display_name: "Hotel Uno",
    tagline: "Patio colonial",
    destination_slug: "valladolid",
    category_slug: "hoteles",
    verified: true,
    cover_url: null,
    ...over,
  }) as never;

const event = (over: Record<string, unknown> = {}) =>
  ({
    id: "e1",
    slug: "festival",
    title: "Festival",
    summary: null,
    starts_at: "2026-09-01T00:00:00.000Z",
    ends_at: null,
    venue_name: null,
    is_free: true,
    destination_slug: "valladolid",
    cover_url: null,
    ...over,
  }) as never;

describe("G8-R1 · R1-A · contrato de listados (casos 1-6)", () => {
  test("1 · las seis familias autorizadas están declaradas", () => {
    expect([...LISTING_FAMILY_IDS].sort()).toEqual(
      [
        "casas-de-vacaciones",
        "eventos",
        "experiencias",
        "hoteles",
        "que-hacer",
        "restaurantes",
      ].sort(),
    );
    expect(LISTING_PUBLIC_CONTRACT_VERSION).toBe("1.0.0");
  });

  test("2 · cada familia declara ruta canónica y origen productivo real", () => {
    for (const id of LISTING_FAMILY_IDS) {
      const c = LISTING_FAMILY_CONTRACTS[id];
      expect(c.route.startsWith("/")).toBe(true);
      expect(["businesses", "events", "editorial"]).toContain(c.source);
      expect(c.hero.title.length).toBeGreaterThan(0);
      expect(c.emptyMessage.length).toBeGreaterThan(0);
    }
  });

  test("3 · fail-closed: familia desconocida no produce plantilla inventada", () => {
    expect(isListingFamilyId("museos")).toBe(false);
    expect(listingFamilyContract("museos").id).toBe("hoteles");
    expect(listingFamilyContract(undefined).id).toBe("hoteles");
  });

  test("4 · sin feeds no se inventa contenido", () => {
    for (const id of LISTING_FAMILY_IDS) {
      const dto = emptyPublicListing(id);
      expect(dto.items).toEqual([]);
      expect(dto.provenance).toBe("real_reads");
    }
  });

  test("5 · los negocios se filtran por categoría y destino reales", () => {
    const dto = buildPublicListing({
      family: "hoteles",
      businesses: [business(), business({ id: "b2", category_slug: "restaurantes" })],
    });
    expect(dto.items).toHaveLength(1);
    expect(dto.items[0].name).toBe("Hotel Uno");

    const filtered = buildPublicListing({
      family: "hoteles",
      destino: "izamal",
      businesses: [business()],
    });
    expect(filtered.items).toHaveLength(0);
    expect(filtered.hero.title).toBe("Hoteles en Izamal");
    expect(filtered.emptyMessage).toContain("Izamal");
  });

  test("6 · eventos y editorial proyectan sus feeds reales", () => {
    const eventos = buildPublicListing({ family: "eventos", events: [event()] });
    expect(eventos.source).toBe("events");
    expect(eventos.items).toHaveLength(1);

    const queHacer = buildPublicListing({ family: "que-hacer", events: [event()] });
    expect(queHacer.source).toBe("editorial");
    expect(queHacer.items).toHaveLength(1);
    expect(queHacer.hero.title).toBe("Qué hacer");
  });
});
