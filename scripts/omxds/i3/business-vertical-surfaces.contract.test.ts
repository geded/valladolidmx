import { describe, expect, test } from "bun:test";
import {
  createBusinessSurfaceContract,
  type BusinessSurfaceContractInput,
} from "../../../src/lib/omxds/surfaces/business-surface.contract";
import { adaptHotelSurfaceContract } from "../../../src/lib/omxds/surfaces/hotel-surface.adapter";
import { adaptRestaurantSurfaceContract } from "../../../src/lib/omxds/surfaces/restaurant-surface.adapter";

const fictionalBusiness: BusinessSurfaceContractInput = {
  id: "00000000-0000-4000-8000-000000000039",
  slug: "casa-lucero-ficticia",
  displayName: "Casa Lucero Ficticia",
  destinationSlug: "destino-ficticio",
  categorySlug: "tour",
  coverUrl: "/fixtures/i3-b/casa-lucero-ficticia.webp",
  latitude: 20.0001,
  longitude: -88.0001,
  verified: true,
  relatedCount: 2,
};

describe("I3-B Business vertical surface contracts", () => {
  test("creates Business Standard with one non-commercial dominant CTA", () => {
    const contract = createBusinessSurfaceContract(fictionalBusiness, "fixture");
    expect(contract?.family).toBe("business");
    expect(contract?.provenance.reference).toBe("fixture:fictional:i3-b:casa-lucero-ficticia");
    expect(contract?.actions).toHaveLength(1);
    expect(contract?.actions[0]).toMatchObject({
      id: "contact",
      role: "dominant",
      href: "/oriente-maya/destino-ficticio/tour/casa-lucero-ficticia#contacto",
    });
    expect(contract?.omissions).toEqual(
      expect.arrayContaining(["offer", "price", "availability", "reservation", "reputation"]),
    );
  });

  test("normalizes singular and plural Hotel categories without a new renderer", () => {
    for (const categorySlug of ["hotel", "hoteles", "hospedaje", "hospedajes"])
      expect(
        adaptHotelSurfaceContract({ ...fictionalBusiness, categorySlug }, "fixture")?.family,
      ).toBe("hotel");
    expect(adaptHotelSurfaceContract(fictionalBusiness, "fixture")).toBeNull();
  });

  test("normalizes singular and plural Restaurant categories", () => {
    for (const categorySlug of [
      "restaurant",
      "restaurants",
      "restaurante",
      "restaurantes",
      "cafeteria",
      "cafeterias",
    ])
      expect(
        adaptRestaurantSurfaceContract({ ...fictionalBusiness, categorySlug }, "fixture")?.family,
      ).toBe("restaurant");
    expect(adaptRestaurantSurfaceContract(fictionalBusiness, "fixture")).toBeNull();
  });

  test("omits absent media, map, collection and trust without inventing data", () => {
    const contract = createBusinessSurfaceContract(
      {
        ...fictionalBusiness,
        coverUrl: null,
        latitude: null,
        longitude: null,
        verified: false,
        relatedCount: 0,
      },
      "fixture",
    );
    expect(contract?.state).toBe("no_media");
    expect(contract?.omissions).toEqual(
      expect.arrayContaining(["media", "map", "collection", "trust"]),
    );
  });

  test("fails closed when canonical business identity is incomplete", () => {
    expect(
      createBusinessSurfaceContract({ ...fictionalBusiness, destinationSlug: "" }, "fixture"),
    ).toBeNull();
  });
});
