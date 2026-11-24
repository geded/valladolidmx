import { describe, expect, it, vi } from "vitest";

const rows = new Map<string, { value: unknown; refreshed_at: string }>();
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: (_c: string, key: string) => ({
          maybeSingle: async () => ({ data: rows.get(key) ?? null }),
        }),
      }),
      upsert: async (r: { key: string; value: unknown; refreshed_at: string }) => {
        rows.set(r.key, r);
      },
    }),
  },
}));

describe("copias públicas tras un cambio en el CMS", () => {
  it("no reutiliza la copia guardada antes del cambio", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const { publicReadMemo, __resetPublicReadMemo } = await import("@/lib/cache/public-read-memo");
    __resetPublicReadMemo();
    expect(await publicReadMemo("k", async () => "foto-vieja")).toBe("foto-vieja");
    vi.setSystemTime(1_010_000);
    rows.clear();
    rows.set("__cms_changed__", { value: null, refreshed_at: new Date(1_009_000).toISOString() });
    expect(await publicReadMemo("k", async () => "foto-nueva")).toBe("foto-nueva");
    vi.useRealTimers();
  });
});
