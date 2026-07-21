import { describe, expect, it } from "vitest";
import {
  evaluateTripEligibility,
  isCanonicalId,
  isTripEligible,
  TRIP_LEGACY_KINDS,
  TRIP_UNIVERSAL_KINDS,
} from "../src/lib/traveler/trip-eligibility";

const uuid = "11111111-1111-4111-a111-111111111111";
const bad = "not-a-uuid";

describe("TP1.1 · trip-eligibility", () => {
  it("universalizes only product/business/event", () => {
    expect(TRIP_UNIVERSAL_KINDS.has("product")).toBe(true);
    expect(TRIP_UNIVERSAL_KINDS.has("business")).toBe(true);
    expect(TRIP_UNIVERSAL_KINDS.has("event")).toBe(true);
    expect(TRIP_UNIVERSAL_KINDS.has("destination")).toBe(false);
    expect(TRIP_LEGACY_KINDS.has("destination")).toBe(true);
  });

  it("requires canonical UUID identity", () => {
    expect(isCanonicalId(uuid)).toBe(true);
    expect(isCanonicalId(bad)).toBe(false);
    expect(isCanonicalId(null)).toBe(false);
    expect(isCanonicalId("valladolid")).toBe(false);
  });

  it("accepts a product with UUID + title", () => {
    const r = evaluateTripEligibility({
      kind: "product",
      targetId: uuid,
      title: "Tour",
    });
    expect(r.eligible).toBe(true);
    expect(r.identity).toEqual({ kind: "product", targetId: uuid });
  });

  it("rejects slug as identity fallback", () => {
    const r = evaluateTripEligibility({
      kind: "business",
      targetId: "casa-hamaca",
      title: "Casa Hamaca",
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("missing_canonical_id");
    expect(r.identity).toBeNull();
  });

  it("rejects missing title (snapshot mínimo)", () => {
    const r = evaluateTripEligibility({
      kind: "event",
      targetId: uuid,
      title: "  ",
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("missing_snapshot_title");
  });

  it("hides destination in universal mode; allows it in legacy mode", () => {
    const u = evaluateTripEligibility({
      kind: "destination",
      targetId: uuid,
      title: "Valladolid",
    });
    expect(u.eligible).toBe(false);
    expect(u.reason).toBe("kind_not_universal");
    const l = evaluateTripEligibility({
      kind: "destination",
      targetId: uuid,
      title: "Valladolid",
      mode: "legacy",
    });
    expect(l.eligible).toBe(true);
  });

  it("rejects unsupported kinds (region, promotion)", () => {
    for (const kind of ["region", "promotion", "coupon", "note"]) {
      const r = evaluateTripEligibility({
        kind,
        targetId: uuid,
        title: "x",
      });
      expect(r.eligible).toBe(false);
    }
  });

  it("isTripEligible sugar mirrors evaluateTripEligibility", () => {
    expect(
      isTripEligible({ kind: "product", targetId: uuid, title: "T" }),
    ).toBe(true);
    expect(
      isTripEligible({ kind: "product", targetId: bad, title: "T" }),
    ).toBe(false);
  });
});