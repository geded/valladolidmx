import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseFor } from "../lib/ctx-supabase";
import { withMcpGuardrails } from "../lib/wrap";
import { LocaleSchema } from "../lib/contracts";

const CONTRACT_VERSION = "1.1.0";

const OutputSchema = z.object({
  profile: z.record(z.string(), z.unknown()).nullable(),
  contract_version: z.string(),
  explain: z.object({
    rationale: z.string(),
    sources: z.array(z.object({ kind: z.literal("traveler_profile"), table: z.string() })),
    locale_used: z.string(),
    locale_fallback: z.boolean(),
  }),
});

export default defineTool({
  name: "get_my_traveler_profile",
  title: "Obtener mi perfil de viajero",
  description:
    "Devuelve el perfil de viajero (handle, nombre, preferencias, idioma) del usuario autenticado. Requiere OAuth.",
  inputSchema: { locale: LocaleSchema },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withMcpGuardrails<{}>({
    toolName: "get_my_traveler_profile",
    contractVersion: CONTRACT_VERSION,
    requiresAuth: true,
    handler: async (_input, ctx, meta) => {
      const supabase = supabaseFor(ctx);
      const { data, error } = await supabase
        .from("traveler_profiles")
        .select("*")
        .eq("user_id", ctx.getUserId()!)
        .maybeSingle();
      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true, resultCount: 0 };
      }
      const output = OutputSchema.parse({
        profile: (data as Record<string, unknown> | null) ?? null,
        contract_version: CONTRACT_VERSION,
        explain: {
          rationale: "Perfil del usuario autenticado, leído bajo RLS como ese usuario.",
          sources: [{ kind: "traveler_profile", table: "traveler_profiles" }],
          locale_used: meta.localeUsed,
          locale_fallback: meta.localeFallback,
        },
      });
      return {
        content: [
          {
            type: "text",
            text: data
              ? `Perfil de viajero (${(data as { handle?: string }).handle ?? "sin handle"}) cargado.`
              : "Aún no tienes perfil de viajero.",
          },
        ],
        structuredContent: output,
        resultCount: data ? 1 : 0,
      };
    },
  }),
});
