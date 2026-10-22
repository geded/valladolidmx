import { describe, expect, it, vi } from "vitest";
import { resolveMediaSource, type MediaAssetInput } from "@/lib/media/resolve-source";
import { businessToTourismCard } from "@/lib/experience-builder/adapters/tourism-listing-adapters";
import { routeToTourismCard } from "@/lib/routes-editorial/route-public-contract";
vi.mock("@/lib/media/pipeline-flag.server", () => ({ isMediaPipelineEnabled: vi.fn() }));
import { isMediaPipelineEnabled } from "@/lib/media/pipeline-flag.server";
import { shouldServePublicVariants, attachReadyVariants } from "@/lib/media/variant-bundles.server";
const asset: MediaAssetInput = { id: "photo", file_url: "https://example.test/original.jpg", pipeline_status: "ready", variants: [
  { format: "webp", width: 400, url: "https://example.test/400.webp", status: "ready", usage_context: "generic" },
  { format: "webp", width: 800, url: "https://example.test/800.webp", status: "ready", usage_context: "generic" },
] };
describe("public image transport preserves originals and shared rollout", () => {
  it("does not serve non-business variants when the global switch is off", async () => {
    vi.mocked(isMediaPipelineEnabled).mockResolvedValue(false);
    expect(await shouldServePublicVariants()).toBe(false);
  });
  it("serves non-business variants only when the global switch is on", async () => {
    vi.mocked(isMediaPipelineEnabled).mockResolvedValue(true);
    expect(await shouldServePublicVariants()).toBe(true);
  });
  it("keeps an unprocessed asset on its original without privileged variant reads", async () => {
    expect(await attachReadyVariants([{id:"pending",file_url:"https://example.test/original.jpg",width:800,height:600,pipeline_status:"pending"}])).toEqual({});
    const resolved = resolveMediaSource({...asset, pipeline_status:"pending"}, {context:"card"});
    expect(resolved.src).toBe(asset.file_url);
    expect(resolved.sources).toEqual([]);
  });
  for (const context of ["card", "hero", "gallery", "thumbnail"] as const) {
    it(`offers generic upload WebP for ${context} while preserving the original URL`, () => {
      const resolved = resolveMediaSource(asset, { context });
      expect(resolved.canonical).toBe("https://example.test/original.jpg");
      expect(resolved.sources).toEqual([{type:"image/webp",srcSet:"https://example.test/400.webp 400w, https://example.test/800.webp 800w"}]);
    });
  }
  it("business card forwards the selected asset without replacing its cover", () => {
    const card = businessToTourismCard({id:"b",slug:"hotel",display_name:"Hotel",tagline:"",destination_slug:"valladolid",category_slug:"hoteles",verified:false,cover_url:asset.file_url,cover_asset:asset});
    expect(card.mediaUrl).toBe(asset.file_url);
    expect(card.mediaAsset).toBe(asset);
  });
});
