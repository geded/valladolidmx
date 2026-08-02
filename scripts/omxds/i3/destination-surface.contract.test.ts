import { describe, expect, test } from "bun:test";
import { buildDestinationSurfaceContract } from "../../../src/components/surfaces/DestinationSurface";
import type { DestinationBlockInput } from "../../../src/lib/experience-builder/adapters/destination-to-blocks";

const fictionalDestination: DestinationBlockInput = {
  slug: "destino-lucero-ficticio",
  name: "Destino Lucero Ficticio",
  tagline: "Un territorio enteramente ficticio",
  description: "Descripción ficticia para el contrato I3-A.",
  highlights: ["Plaza ficticia"],
  heroUrl: "/fixtures/i3-a/destino-lucero-ficticio.webp",
  galleryUrls: [],
  latitude: 20.0001,
  longitude: -88.0001,
  mapPoints: [],
  regionSlug: "oriente-maya",
  regionName: "Oriente Maya de Yucatán",
  relatedCounts: {
    hoteles: 1,
    restaurantes: 1,
    experiencias: 1,
    otras: 0,
    productos: 0,
    eventos: 0,
  },
};

describe("I3-A Destination Surface contract", () => {
  test("creates a fictitious destination contract with one dominant CTA", () => {
    const contract = buildDestinationSurfaceContract(fictionalDestination, "fixture");
    expect(contract?.family).toBe("destination");
    expect(contract?.provenance).toEqual({
      kind: "fixture",
      reference: "fixture:fictional:i3-a:destino-lucero-ficticio",
    });
    expect(contract?.actions.filter((action) => action.role === "dominant")).toHaveLength(1);
    expect(contract?.actions[0]?.href).toBe("/oriente-maya/destino-lucero-ficticio#explora");
  });

  test("omits absent media, map and collections without inventing content", () => {
    const contract = buildDestinationSurfaceContract(
      {
        ...fictionalDestination,
        heroUrl: null,
        latitude: null,
        longitude: null,
        relatedCounts: {
          hoteles: 0,
          restaurantes: 0,
          experiencias: 0,
          otras: 0,
          productos: 0,
          eventos: 0,
        },
      },
      "fixture",
    );
    expect(contract?.state).toBe("no_media");
    expect(contract?.omissions).toEqual(["media", "map", "collection"]);
  });

  test("uses an internal safe URL even when the fictional slug needs encoding", () => {
    const contract = buildDestinationSurfaceContract(
      { ...fictionalDestination, slug: "destino ficticio" },
      "fixture",
    );
    expect(contract?.actions[0]?.href).toBe("/oriente-maya/destino%20ficticio#explora");
  });

  test("fails closed when the destination identity is incomplete", () => {
    expect(
      buildDestinationSurfaceContract({ ...fictionalDestination, name: "" }, "fixture"),
    ).toBeNull();
  });
});
