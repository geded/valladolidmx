import { describe, expect, it } from "vitest";
import { signedUrlsMemo } from "../../src/lib/media/signed-url-memo";

describe("signedUrlsMemo", () => {
  it("firma todas las fotos de un bucket en una sola llamada y conserva el orden", async () => {
    let calls = 0;
    const client = {
      storage: {
        from: () => ({
          createSignedUrl: async () => ({ data: null, error: "no" }),
          createSignedUrls: async (paths: string[]) => {
            calls += 1;
            return { data: paths.map((p) => ({ path: p, signedUrl: `u:${p}` })), error: null };
          },
        }),
      },
    };
    const same = ["a", "b", "c"].map((path) => ({ bucket: "fotos-test", path }));
    const out = await signedUrlsMemo(client, same, 3600);
    expect(out).toEqual(["u:a", "u:b", "u:c"]);
    expect(calls).toBe(1);
    await signedUrlsMemo(client, same, 3600);
    expect(calls).toBe(1);
  });
});
