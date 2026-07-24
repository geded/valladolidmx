import { describe, expect, test } from "bun:test";
import {
  createCardAnalyticsEvent,
  hasAnalyticsPii,
} from "../../../src/lib/omxds/cards/card-contract";
import { toBusinessCardContract } from "../../../src/lib/omxds/cards/business-card.adapter";
import { validateBusinessCardContract } from "../../../src/lib/omxds/cards/business-card.contract";

const business = {
  id: "00000000-0000-4000-8000-000000000042",
  slug: "casa-luciernaga",
  name: "Casa Luciérnaga",
  category_slug: "experiencias",
  destination_slug: "destino-ficticio",
  tagline: "Una empresa completamente ficticia para validar el contrato.",
  palette: "cenote" as const,
};

describe("BusinessCard contract", () => {
  test("adapts a wholly fictional teaser without invented trust data", () => {
    const contract = toBusinessCardContract(business);
    expect(contract).not.toBeNull();
    expect(contract?.family).toBe("business");
    expect(contract?.rating).toBeNull();
    expect(contract?.badges).toEqual([]);
    expect(contract?.commercialState).toBeNull();
  });

  test("rejects invalid routes, duplicate actions and untraceable ratings", () => {
    const contract = toBusinessCardContract(business)!;
    const result = validateBusinessCardContract({
      ...contract,
      canonicalUrl: "https://example.test/company",
      rating: { value: 6, source: "", verifiedAt: "" },
      actions: [
        { id: "discover", label: "Uno", href: contract.canonicalUrl },
        { id: "discover", label: "Dos", href: contract.canonicalUrl },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("canonicalUrl must be an internal route");
    expect(result.errors).toContain("actions must be independent and unique");
    expect(result.errors.some((error) => error.startsWith("rating requires"))).toBe(true);
  });

  test("preserves the requested family and excludes PII from analytics", () => {
    const contract = toBusinessCardContract(business)!;
    const events = contract.actions.map((action) =>
      createCardAnalyticsEvent(contract.id, contract.variant, action.id, contract.family),
    );
    expect(events.every((event) => event.family === "business")).toBe(true);
    expect(events.every((event) => !hasAnalyticsPii(event))).toBe(true);
  });
});
