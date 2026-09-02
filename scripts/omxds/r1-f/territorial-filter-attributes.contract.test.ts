import { describe, expect, test } from "vitest";
import { attributeValues, normalizeFilterAttributes } from "../../../src/lib/business-attributes/types";

describe("territorial filter attributes v1", () => {
  test("omits missing and empty values", () => {
    expect(normalizeFilterAttributes(null)).toEqual({});
    expect(normalizeFilterAttributes({ zone: "", services: [], hotel_type: "boutique" })).toEqual({ hotel_type: "boutique" });
  });

  test("deduplicates confirmed multi-values", () => {
    const normalized = normalizeFilterAttributes({ services: ["wifi", "wifi", "", null] });
    expect(attributeValues(normalized.services)).toEqual(["wifi"]);
  });
});
