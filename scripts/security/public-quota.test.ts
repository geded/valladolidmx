import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  request: new Request("https://www.quehacerenvalladolid.com/"),
  rpc: vi.fn(),
}));

vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => state.request }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: state.rpc },
}));

import {
  assertPlatformOrigin,
  enforcePublicQuota,
} from "../../src/lib/security/public-quota.server";

describe("Cupo público durable", () => {
  beforeEach(() => {
    state.rpc.mockReset();
    state.request = new Request("https://www.quehacerenvalladolid.com/", {
      headers: {
        origin: "https://www.quehacerenvalladolid.com",
        "sec-fetch-site": "same-origin",
        "cf-connecting-ip": "203.0.113.10",
      },
    });
  });

  it("reserva minuto, hora, día y tope compartido antes de autorizar", async () => {
    state.rpc.mockImplementation(async (_name: string, args: Record<string, unknown>) => ({
      data: { allowed: true, current_count: args.p_window_seconds === 60 ? 2 : 7 },
      error: null,
    }));

    const usage = await enforcePublicQuota("test.ai", {
      perMinute: 3,
      perHour: 10,
      perDay: 40,
      platformPerDay: 2000,
    });

    expect(usage).toEqual({ perMinute: 2, perHour: 7, perDay: 7 });
    expect(state.rpc).toHaveBeenCalledTimes(4);
    expect(state.rpc.mock.calls.map((call) => call[1].p_window_seconds)).toEqual([
      60, 3600, 86400, 86400,
    ]);
    expect(state.rpc.mock.calls[3]?.[1].p_scope_key).toBe("platform:all");
    expect(state.rpc.mock.calls[0]?.[1].p_scope_key).not.toContain("203.0.113.10");
  });

  it("se detiene en la primera ventana rechazada", async () => {
    state.rpc.mockResolvedValue({
      data: { allowed: false, current_count: 4, retry_after_seconds: 20 },
      error: null,
    });

    await expect(
      enforcePublicQuota("test.ai", { perMinute: 3, perHour: 10, perDay: 40 }),
    ).rejects.toThrow("rate_limited");
    expect(state.rpc).toHaveBeenCalledTimes(1);
  });

  it("falla cerrado si el contador no responde con una decisión", async () => {
    state.rpc.mockResolvedValue({ data: null, error: null });
    await expect(enforcePublicQuota("test.ai", { perMinute: 3, perHour: 10 })).rejects.toThrow(
      "quota_unavailable",
    );
  });

  it("rechaza un origen que sólo finge pertenecer al alojamiento", () => {
    state.request = new Request("https://www.quehacerenvalladolid.com/", {
      headers: { origin: "https://lovable.app.ejemplo-invalido.com" },
    });
    expect(() => assertPlatformOrigin()).toThrow("origin_not_allowed");
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
