import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  reads: [] as string[],
  rows: new Map<string, { value: unknown; refreshed_at: string }>(),
  wait: null as Promise<void> | null,
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: (_column: string, key: string) => ({
          maybeSingle: async () => {
            state.reads.push(key);
            if (state.wait) await state.wait;
            return { data: state.rows.get(key) ?? null };
          },
        }),
      }),
      upsert: async (row: { key: string; value: unknown; refreshed_at: string }) => {
        state.rows.set(row.key, row);
      },
    }),
  },
}));
import { __resetPublicReadMemo, publicReadMemo } from "../../src/lib/cache/public-read-memo";

describe("public shared-read concurrency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    __resetPublicReadMemo();
    state.rows.clear();
    state.reads = [];
    state.wait = null;
  });
  afterEach(() => {
    state.wait = null;
    vi.useRealTimers();
  });

  it("starts a cold copy read alongside the CMS stamp and deduplicates simultaneous visitors", async () => {
    state.rows.set("page", { value: "published", refreshed_at: new Date(999_000).toISOString() });
    let release = () => {};
    state.wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const render = vi.fn(async () => "unexpected");
    const requests = Array.from({ length: 20 }, () => publicReadMemo("page", render));
    await vi.waitFor(() => expect(state.reads).toEqual(["__cms_changed__", "page"]));
    release();
    expect(await Promise.all(requests)).toEqual(Array(20).fill("published"));
    expect(render).not.toHaveBeenCalled();
    await publicReadMemo("page", render);
    expect(state.reads).toHaveLength(2);
  });

  it("rejects an older copy even when it arrives alongside a newer CMS stamp", async () => {
    state.rows.set("page", { value: "old", refreshed_at: new Date(990_000).toISOString() });
    state.rows.set("__cms_changed__", {
      value: null,
      refreshed_at: new Date(999_000).toISOString(),
    });
    const render = vi.fn(async () => "updated");
    expect(await publicReadMemo("page", render)).toBe("updated");
    expect(render).toHaveBeenCalledTimes(1);
  });
});
