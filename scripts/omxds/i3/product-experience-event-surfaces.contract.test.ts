import { describe, expect, test } from "bun:test";
import {
  createProductSurfaceContract,
  type ProductSurfaceContractInput,
} from "../../../src/lib/omxds/surfaces/product-surface.contract";
import { adaptExperienceSurfaceContract } from "../../../src/lib/omxds/surfaces/experience-surface.adapter";
import { createEventSurfaceContract } from "../../../src/lib/omxds/surfaces/event-surface.contract";

const fictionalProduct: ProductSurfaceContractInput = {
  id: "00000000-0000-4000-8000-000000000040",
  slug: "pieza-lucero-ficticia",
  name: "Pieza Lucero Ficticia",
  productType: "artesanal",
  businessName: "Taller Horizonte Ficticio",
  canonicalUrl: "/oriente-maya/destino-ficticio/artesanias/taller-horizonte/pieza-lucero-ficticia",
  hasMedia: true,
  hasCollection: true,
  verifiedBusiness: true,
};

describe("I3-C Product, Experience and Event surface contracts", () => {
  test("creates Product with one non-commercial add-to-trip CTA", () => {
    const contract = createProductSurfaceContract(fictionalProduct, "fixture");
    expect(contract?.family).toBe("product");
    expect(contract?.actions).toHaveLength(1);
    expect(contract?.actions[0]).toMatchObject({
      id: "add_to_trip",
      role: "dominant",
      href: fictionalProduct.canonicalUrl,
    });
    expect(contract?.omissions).toEqual(
      expect.arrayContaining(["offer", "price", "availability", "reservation", "delivery"]),
    );
  });

  test("adapts only the governed experiencia and tour product types", () => {
    for (const productType of ["experiencia", "tour"])
      expect(
        adaptExperienceSurfaceContract({ ...fictionalProduct, productType }, "fixture")?.family,
      ).toBe("experience");
    expect(adaptExperienceSurfaceContract(fictionalProduct, "fixture")).toBeNull();
  });

  test("omits absent media, collection and trust without inventing data", () => {
    const contract = createProductSurfaceContract(
      {
        ...fictionalProduct,
        hasMedia: false,
        hasCollection: false,
        verifiedBusiness: false,
      },
      "fixture",
    );
    expect(contract?.state).toBe("no_media");
    expect(contract?.omissions).toEqual(
      expect.arrayContaining(["media", "map", "collection", "trust"]),
    );
  });

  test("creates Event from timezone-explicit fictional data", () => {
    const contract = createEventSurfaceContract(
      {
        id: "00000000-0000-4000-8000-000000000041",
        slug: "noche-lucero-ficticia",
        title: "Noche Lucero Ficticia",
        startsAt: "2031-07-18T20:00:00-06:00",
        hasMedia: true,
        hasOrganizer: true,
      },
      "fixture",
    );
    expect(contract?.family).toBe("event");
    expect(contract?.actions).toEqual([
      expect.objectContaining({ id: "add_to_trip", role: "dominant" }),
    ]);
    expect(contract?.omissions).toEqual(
      expect.arrayContaining(["offer", "price", "availability", "reservation"]),
    );
  });

  test("fails closed for unsafe Product routes and timezone-ambiguous Events", () => {
    expect(
      createProductSurfaceContract(
        { ...fictionalProduct, canonicalUrl: "https://example.invalid/producto" },
        "fixture",
      ),
    ).toBeNull();
    expect(
      createEventSurfaceContract(
        {
          id: "00000000-0000-4000-8000-000000000042",
          slug: "evento-ficticio",
          title: "Evento Ficticio",
          startsAt: "2031-07-18T20:00:00",
          hasMedia: false,
          hasOrganizer: false,
        },
        "fixture",
      ),
    ).toBeNull();
  });
});
