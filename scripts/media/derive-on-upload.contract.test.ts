import { describe, expect, it } from "vitest";
import {
  derivedVariantPath,
  isAllowedDerivedWidth,
  pickMediaAssetId,
  plannedDerivedWidths,
} from "@/lib/media/derive-on-upload";
import { resolveMediaSource } from "@/lib/media/resolve-source";

describe("derivación al subir", () => {
  it("genera 400, 800 y 1200 px para una foto grande", () => {
    expect(plannedDerivedWidths(1600)).toEqual([400, 800, 1200]);
  });
  it("nunca amplía una foto pequeña", () => {
    expect(plannedDerivedWidths(836)).toEqual([400, 800]);
    expect(plannedDerivedWidths(300)).toEqual([]);
  });
  it("sólo acepta los anchos oficiales", () => {
    expect(isAllowedDerivedWidth(800)).toBe(true);
    expect(isAllowedDerivedWidth(2000)).toBe(false);
  });
  it("guarda las versiones en la carpeta del asset, fuera del original", () => {
    expect(derivedVariantPath("abc", 400)).toBe("abc/browser-canvas/webp/400.webp");
  });
  it("lee el id de cualquier registro oficial", () => {
    expect(pickMediaAssetId({ mediaAssetId: "a" })).toBe("a");
    expect(pickMediaAssetId({ media_asset_id: "b" })).toBe("b");
    expect(pickMediaAssetId({ id: "c", url: "x" })).toBe("c");
    expect(pickMediaAssetId(null)).toBeNull();
  });
  it("sin versiones listas se muestra la foto original", () => {
    const r = resolveMediaSource(
      { id: "a", file_url: "https://x/orig.jpg", pipeline_status: "disabled", variants: [] },
      { context: "gallery" },
    );
    expect(r.src).toBe("https://x/orig.jpg");
    expect(r.usedPipeline).toBe(false);
  });
});
