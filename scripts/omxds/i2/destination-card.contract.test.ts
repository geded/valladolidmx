import { describe, expect, test } from "bun:test";
import { createCardAnalyticsEvent, hasAnalyticsPii } from "../../../src/lib/omxds/cards/card-contract";
import { validateDestinationCardContract } from "../../../src/lib/omxds/cards/destination-card.contract";

const fixture = {
  family: "destination" as const,
  id: "destination:fixture-001",
  name: "Destino Luciérnaga",
  territorialType: "Destino",
  identityPromise: "Una ciudad ficticia para validar el contrato sin datos reales.",
  parentTerritory: "region-ficticia",
  canonicalUrl: "/oriente-maya/destino-ficticio",
  media: null,
  reasons: ["Caminar", "Saborear", "Descubrir"],
  variant: "standard" as const,
  state: "no_media" as const,
  actions: [
    { id: "save" as const, label: "Guardar" },
    { id: "add_to_trip" as const, label: "Agregar a mi viaje" },
    { id: "discover" as const, label: "Descubrir destino", href: "/oriente-maya/destino-ficticio" },
  ],
};

describe("DestinationCard contract", () => {
  test("accepts a wholly fictional fixture", () => {
    expect(validateDestinationCardContract(fixture)).toEqual({ valid: true, errors: [] });
  });

  test("rejects missing CTA and excessive reasons", () => {
    const result = validateDestinationCardContract({ ...fixture, reasons: ["1", "2", "3", "4"], actions: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("exactly one discover action is required");
  });

  test("keeps actions analytically distinct and PII-free", () => {
    const events = fixture.actions.map((action) =>
      createCardAnalyticsEvent(fixture.id, fixture.variant, action.id),
    );
    expect(new Set(events.map((event) => event.action)).size).toBe(3);
    expect(events.every((event) => !hasAnalyticsPii(event))).toBe(true);
  });
});
