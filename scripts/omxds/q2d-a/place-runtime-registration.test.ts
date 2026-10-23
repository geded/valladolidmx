import { describe, expect, test } from "bun:test";
import "../../../src/lib/experience-builder/block-library";
import { getBlock } from "../../../src/lib/experience-builder/block-registry";
import { resolvePlacePremiumQ2d } from "../../../src/components/place-premium/place-premium-config";

describe("approved place runtime authority", () => {
  test("the saved official place block is registered, not discarded as unknown", () => {
    const contract = getBlock("vmx.place.premium-q2d");
    expect(contract?.type).toBe("vmx.place.premium-q2d");
    expect(contract?.version).toBe("1.0.0");
    expect(contract?.editorial?.mode).toBe("authorable");
  });

  test("resolving the existing place retains saved configuration and section order", () => {
    const config = {
      variant: "cenote",
      identity_title: "Lugar editorial",
      place_section_order: ["hero", "map", "intro"],
    };
    const before = JSON.stringify(config);
    const resolved = resolvePlacePremiumQ2d(config);
    expect(JSON.stringify(config)).toBe(before);
    expect(resolved.order.slice(0, 3)).toEqual(["hero", "map", "intro"]);
  });
});