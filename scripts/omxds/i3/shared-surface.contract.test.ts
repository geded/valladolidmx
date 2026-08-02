import { describe, expect, test } from "bun:test";
import {
  createOmxdsSurfaceContract,
  isOmxdsSurfaceFamily,
  OMXDS_SURFACE_FAMILIES,
} from "../../../src/lib/omxds/surfaces/surface-contract";
import { OMXDS_SURFACE_STATES } from "../../../src/lib/omxds/surfaces/surface-state";

const fictionalReadySurface = {
  contractVersion: "i3-0",
  entityId: "fictional:destination:lucero",
  family: "destination",
  title: "Destino Lucero Ficticio",
  state: "ready",
  provenance: { kind: "fixture", reference: "fixture:fictional:i3-0:lucero" },
  actions: [
    {
      id: "discover",
      label: "Descubrir destino ficticio",
      role: "dominant",
      href: "/destino-ficticio",
    },
    { id: "add_to_trip", label: "Agregar al viaje ficticio", role: "utility", href: "/viaje" },
  ],
  omissions: ["media", "map"],
} as const;

describe("I3-0 shared surface contract", () => {
  test("accepts the seven implementable families and the approved state vocabulary", () => {
    expect(OMXDS_SURFACE_FAMILIES).toEqual([
      "destination",
      "business",
      "experience",
      "hotel",
      "restaurant",
      "event",
      "product",
    ]);
    expect(OMXDS_SURFACE_STATES).toEqual([
      "ready",
      "loading",
      "empty",
      "partial_error",
      "total_error",
      "offline",
      "no_media",
    ]);
    expect(isOmxdsSurfaceFamily("business-premium")).toBe(false);
  });

  test("accepts a fictitious ready surface with provenance and one dominant CTA", () => {
    expect(createOmxdsSurfaceContract(fictionalReadySurface)).toEqual(fictionalReadySurface);
  });

  test("rejects missing provenance and multiple dominant CTAs", () => {
    const withoutProvenance = { ...fictionalReadySurface, provenance: undefined };
    const twoDominant = {
      ...fictionalReadySurface,
      actions: [
        fictionalReadySurface.actions[0],
        { id: "view", label: "Ver otra", role: "dominant", href: "/otra" },
      ],
    };
    expect(createOmxdsSurfaceContract(withoutProvenance)).toBeNull();
    expect(createOmxdsSurfaceContract(twoDominant)).toBeNull();
  });

  test("rejects commerce, reservation and unsafe external actions", () => {
    for (const action of [
      { id: "buy", label: "Comprar", role: "dominant", href: "/comprar" },
      { id: "reserve", label: "Reservar", role: "dominant", href: "/reservar" },
      { id: "view", label: "Salir", role: "dominant", href: "https://example.invalid" },
    ])
      expect(
        createOmxdsSurfaceContract({ ...fictionalReadySurface, actions: [action] }),
      ).toBeNull();
  });

  test("permits fail-safe degraded states without invented dominant actions", () => {
    for (const state of ["loading", "empty", "partial_error", "total_error", "offline"])
      expect(
        createOmxdsSurfaceContract({
          ...fictionalReadySurface,
          state,
          actions: [],
          omissions: ["media", "availability"],
        }),
      ).not.toBeNull();
  });
});
