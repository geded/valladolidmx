import { describe, expect, test } from "bun:test";
import { parseOmxdsTheme, resolveOmxdsTheme } from "../../../src/lib/theme/theme";

describe("OMXDS Sol/Luna contract", () => {
  test("accepts only the closed theme vocabulary", () => {
    expect(parseOmxdsTheme("sol")).toBe("sol");
    expect(parseOmxdsTheme("luna")).toBe("luna");
    expect(parseOmxdsTheme("dark")).toBeNull();
    expect(parseOmxdsTheme(null)).toBeNull();
  });

  test("manual preference wins; system preference is first-visit fallback", () => {
    expect(resolveOmxdsTheme("sol", true)).toBe("sol");
    expect(resolveOmxdsTheme("luna", false)).toBe("luna");
    expect(resolveOmxdsTheme("corrupt", true)).toBe("luna");
    expect(resolveOmxdsTheme(undefined, false)).toBe("sol");
  });
});
