import { describe, expect, test } from "bun:test";
import { isBadgeEligible } from "../../../src/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry";

const now = new Date("2026-07-22T18:00:00-06:00");

describe("Institutional Badges fail-closed policy", () => {
  test("registry-backed territorial identity still respects subject restrictions", () => {
    expect(isBadgeEligible({ kind: "pueblo-magico" }, "valladolid", now)).toBe(true);
    expect(isBadgeEligible({ kind: "pueblo-magico" }, "merida", now)).toBe(false);
  });

  test("evidence-backed claims require verified, attributable and live evidence", () => {
    const valid = {
      kind: "certification" as const,
      verificationStatus: "verified" as const,
      sourceOwner: "Organismo emisor",
      evidenceUrl: "https://example.org/evidence/123",
      verifiedAt: "2026-01-01T00:00:00Z",
      expiresAt: "2027-01-01T00:00:00Z",
    };
    expect(isBadgeEligible(valid, undefined, now)).toBe(true);
    expect(isBadgeEligible({ ...valid, verificationStatus: "unverified" }, undefined, now)).toBe(false);
    expect(isBadgeEligible({ ...valid, expiresAt: "2026-01-01T00:00:00Z" }, undefined, now)).toBe(false);
    expect(isBadgeEligible({ ...valid, evidenceUrl: undefined }, undefined, now)).toBe(false);
  });

  test("custom is never accepted as an open factual bypass", () => {
    expect(isBadgeEligible({ kind: "custom", verificationStatus: "verified" }, undefined, now)).toBe(false);
  });
});
