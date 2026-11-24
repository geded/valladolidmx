import { describe, expect, it } from "vitest";
import { pickDestinationSection } from "@/lib/destinations/destination-rail-order";

const cards = Array.from({ length: 30 }, (_, i) => ({ id: `b${String(i).padStart(2, "0")}` }));
const paid = new Set(["b27", "b28"]);
const describe_ = (c: { id: string }) => ({
  id: c.id,
  hasCover: true,
  visibilityBoost: paid.has(c.id) ? 5 : 0,
  pinned: c.id === "b29",
});

describe("destination sections", () => {
  it("sends at most 12 cards per section", () => {
    expect(pickDestinationSection(cards, describe_, "s")).toHaveLength(12);
  });
  it("spotlight goes first and paid packages make it into the sample", () => {
    const picked = pickDestinationSection(cards, describe_, "s").map((c) => c.id);
    expect(picked[0]).toBe("b29");
    expect(picked).toContain("b27");
    expect(picked).toContain("b28");
  });
  it("free businesses with photo come before those without", () => {
    const picked = pickDestinationSection(
      [{ id: "a" }, { id: "z" }],
      (c) => ({ id: c.id, hasCover: c.id === "z", visibilityBoost: 0, pinned: false }),
      "s",
    );
    expect(picked[0]?.id).toBe("z");
  });
});
