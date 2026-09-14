import { describe, expect, it } from "vitest";
import { DEFAULT_ALUX_COPY, fillAluxCopy, normalizeAluxCopy } from "./alux-brand";
import { aluxPaletteContrastChecks, normalizeAluxPalette } from "./brand-theme";
import { ACTIVE_BRAND } from "@/config/brand";

describe("Alux brand contract", () => {
  it("falls back safely for missing and blank localized copy", () => {
    const copy = normalizeAluxCopy({ es: { conversationTitle: "  Conversa con {name}  " } });
    expect(copy.es.conversationTitle).toBe("Conversa con {name}");
    expect(copy.es.disclaimer).toBe(DEFAULT_ALUX_COPY.es.disclaimer);
    expect(copy.en.conversationTitle).toBe(DEFAULT_ALUX_COPY.en.conversationTitle);
  });

  it("interpolates only declared placeholders without inventing content", () => {
    expect(fillAluxCopy("{name} · {territory} · {unknown}", { name: "Alux", territory: "Yucatán" }))
      .toBe("Alux · Yucatán · {unknown}");
  });

  it("rejects inaccessible stored palettes and keeps the approved fallback", () => {
    const invalid = { ...ACTIVE_BRAND.aluxPalette, primary: "#ffffff", primaryForeground: "#ffffff" };
    expect(normalizeAluxPalette(invalid, ACTIVE_BRAND.aluxPalette)).toEqual(ACTIVE_BRAND.aluxPalette);
    expect(aluxPaletteContrastChecks(ACTIVE_BRAND.aluxPalette).every((check) => check.pass)).toBe(true);
  });
});