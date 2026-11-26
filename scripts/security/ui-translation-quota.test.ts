import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const state = {
  calls: [] as string[],
  cacheRows: [] as Array<{ source_hash: string; target_text: string }>,
  knownSources: [] as string[],
  writes: 0,
};

mock.module("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
mock.module("@/lib/security/public-quota.server", () => ({
  assertPlatformOrigin: () => state.calls.push("origin"),
  enforcePublicQuota: async (tool: string) => {
    state.calls.push(`quota:${tool}`);
    return { perMinute: 1, perHour: 2, perDay: 3 };
  },
}));
mock.module("@/lib/ai-gateway.server", () => ({
  createLovableAiGatewayProvider: () => () => "test-model",
}));
mock.module("ai", () => ({
  generateText: async () => {
    state.calls.push("ai");
    return { text: '{"t":["Hello"]}' };
  },
}));
mock.module("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => {
        const query = {
          eq: () => query,
          in: async (field: string) => ({
            data:
              field === "source_text"
                ? state.knownSources.map((source_text) => ({ source_text }))
                : state.cacheRows,
            error: null,
          }),
        };
        return query;
      },
    }),
  }),
}));
mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      upsert: async () => {
        state.writes++;
        return { error: null };
      },
    }),
  },
}));

const { translateUiBatch } = await import("../../src/lib/i18n/ui-translate.functions");
const translate = translateUiBatch as unknown as (input: {
  data: { locale: string; texts: string[] };
}) => Promise<Record<string, string>>;
const hash = createHash("sha256").update("Hola|en").digest("hex").slice(0, 20);

describe("Consumo y persistencia de traducciones públicas", () => {
  beforeEach(() => {
    state.calls = [];
    state.cacheRows = [];
    state.knownSources = ["Hola"];
    state.writes = 0;
    process.env["LOVABLE_API_KEY"] = "test-key";
    process.env["SUPABASE_URL"] = "https://example.invalid";
    process.env["SUPABASE_PUBLISHABLE_KEY"] = "public-test";
  });

  it("una fuente reconocida reserva cupo, genera y guarda", async () => {
    const result = await translate({ data: { locale: "en", texts: ["Hola"] } });
    expect(result[hash]).toBe("Hello");
    expect(state.calls).toEqual(["origin", "quota:i18n.ui", "ai"]);
    expect(state.writes).toBe(1);
  });

  it("una fuente arbitraria se traduce sin publicarla en el caché", async () => {
    const source = "Dato privado que nunca debe convertirse en contenido público 2026-11-26";
    const privateHash = createHash("sha256").update(`${source}|en`).digest("hex").slice(0, 20);
    const result = await translate({ data: { locale: "en", texts: [source] } });
    expect(result[privateHash]).toBe("Hello");
    expect(state.calls).toEqual(["origin", "quota:i18n.ui", "ai"]);
    expect(state.writes).toBe(0);
  });

  it("una frase guardada no consume cupo ni IA", async () => {
    state.cacheRows = [{ source_hash: hash, target_text: "Hello" }];
    const result = await translate({ data: { locale: "en", texts: ["Hola"] } });
    expect(result[hash]).toBe("Hello");
    expect(state.calls).toEqual([]);
    expect(state.writes).toBe(0);
  });
});
