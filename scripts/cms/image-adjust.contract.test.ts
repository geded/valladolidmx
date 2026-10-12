import { describe, expect, it } from "vitest";
import { applyAdjust, NEUTRAL_ADJUST, suggestAutoAdjust } from "@/lib/cms/image-adjust";

describe("image-adjust", () => {
  it("leaves pixels untouched when neutral", () => {
    const d = new Uint8ClampedArray([10, 20, 30, 255]);
    applyAdjust(d, NEUTRAL_ADJUST);
    expect(Array.from(d)).toEqual([10, 20, 30, 255]);
  });

  it("positive exposure brightens a dark pixel", () => {
    const d = new Uint8ClampedArray([40, 40, 40, 255]);
    applyAdjust(d, { ...NEUTRAL_ADJUST, exposure: 60 });
    expect(d[0]).toBeGreaterThan(40);
  });

  it("auto-suggest brightens a dark photo", () => {
    const d = new Uint8ClampedArray(4 * 400).fill(30);
    expect(suggestAutoAdjust(d).exposure).toBeGreaterThan(0);
  });
});
