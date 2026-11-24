import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ published: ["published"] as string[], failed: false }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (table: string) => {
    const chain = {
      select: () => chain, in: () => chain, eq: () => chain, is: () => chain,
      then: (resolve: (value: unknown) => unknown) => resolve(table === "media_assets"
        ? { data: state.failed ? null : state.published.map((id) => ({ id })), error: state.failed ? "failed" : null }
        : { data: ["published", "draft", "deleted"].map((id) => ({
          asset_id: id, format: "webp", width: 400, height: 300, bucket: "media-derived",
          path: `${id}/400.webp`, usage_context: "generic", variant_key: "v1",
        })), error: null }),
    };
    return chain;
  } },
}));
import { attachReadyVariants } from "@/lib/media/variant-bundles.server";
import { resolveMediaSource } from "@/lib/media/resolve-source";
const assets = ["published", "draft", "deleted"].map((id) => ({
  id, file_url: `https://original.test/${id}.jpg`, width: 800, height: 600, pipeline_status: "ready",
}));
describe("public variants match the public proxy publication boundary", () => {
  beforeEach(() => { state.published = ["published"]; state.failed = false; });
  it("offers variants only for published non-deleted assets", async () => {
    const bundles = await attachReadyVariants(assets);
    expect(Object.keys(bundles)).toEqual(["published"]);
    expect(bundles["published"]?.variants?.[0]?.url).toBe("/api/public/media-derived/published/400.webp");
    expect(resolveMediaSource(bundles["draft"], { fallbackUrl: "https://original.test/draft.jpg" }).src).toBe("https://original.test/draft.jpg");
  });
  it("fails closed when publication cannot be checked", async () => {
    state.failed = true;
    expect(await attachReadyVariants(assets)).toEqual({});
  });
});