import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  calls: [] as string[],
  quotaError: null as Error | null,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
}));
vi.mock("@/lib/security/public-quota.server", () => ({
  assertPlatformOrigin: () => state.calls.push("origin"),
  enforcePublicQuota: async (tool: string) => {
    state.calls.push(`quota:${tool}`);
    if (state.quotaError) throw state.quotaError;
    return { perMinute: 1, perHour: 2, perDay: 3 };
  },
}));

import { Route as SttRoute } from "../../src/routes/api/public/stt";
import { Route as TtsRoute } from "../../src/routes/api/public/tts";

type Handler = (input: { request: Request }) => Promise<Response>;
const sttPost = (SttRoute as unknown as { server: { handlers: { POST: Handler } } }).server.handlers
  .POST;
const ttsPost = (TtsRoute as unknown as { server: { handlers: { POST: Handler } } }).server.handlers
  .POST;

function request(path: string, body: BodyInit, contentType?: string): Request {
  return new Request(`https://www.quehacerenvalladolid.com${path}`, {
    method: "POST",
    body,
    headers: {
      origin: "https://www.quehacerenvalladolid.com",
      "sec-fetch-site": "same-origin",
      ...(contentType ? { "content-type": contentType } : {}),
    },
  });
}

describe("Consumo público de voz", () => {
  beforeEach(() => {
    state.calls = [];
    state.quotaError = null;
    process.env["LOVABLE_API_KEY"] = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        state.calls.push("provider");
        return new Response("data: {}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        });
      }),
    );
  });

  it("voz alta reserva su propio cupo antes del proveedor", async () => {
    const response = await ttsPost({
      request: request("/api/public/tts", JSON.stringify({ text: "Hola" }), "application/json"),
    });
    expect(response.status).toBe(200);
    expect(state.calls).toEqual(["origin", "quota:alux.tts", "provider"]);
  });

  it("voz alta rechazada no llama al proveedor", async () => {
    state.quotaError = new Error("rate_limited");
    const response = await ttsPost({
      request: request("/api/public/tts", JSON.stringify({ text: "Hola" }), "application/json"),
    });
    expect(response.status).toBe(429);
    expect(state.calls).toEqual(["origin", "quota:alux.tts"]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("texto vacío no consume cupo ni IA", async () => {
    const response = await ttsPost({
      request: request("/api/public/tts", JSON.stringify({ text: "" }), "application/json"),
    });
    expect(response.status).toBe(400);
    expect(state.calls).toEqual([]);
  });

  it("micrófono reserva un cupo que sí aumenta en cada transcripción", async () => {
    const form = new FormData();
    form.append("file", new File(["audio-de-prueba"], "recording.webm", { type: "audio/webm" }));
    const response = await sttPost({ request: request("/api/public/stt", form) });
    expect(response.status).toBe(200);
    expect(state.calls).toEqual(["origin", "quota:alux.stt", "provider"]);
  });
});
