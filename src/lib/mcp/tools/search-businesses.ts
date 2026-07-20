import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseFor } from "../lib/ctx-supabase";
import { withMcpGuardrails } from "../lib/wrap";
import { sanitizeSearchQuery, SEARCH_RESULT_HARD_CAP } from "../lib/sanitize";
import { LocaleSchema } from "../lib/contracts";

const CONTRACT_VERSION = "1.1.0";

const BusinessResultSchema = z.object({
  id: z.string(),
  slug: z.string().nullable(),
  name: z.string(),
  short_description: z.string().nullable(),
  city: z.string().nullable(),
  primary_category_id: z.string().nullable(),
});

const OutputSchema = z.object({
  results: z.array(BusinessResultSchema),
  result_count: z.number().int(),
  contract_version: z.string(),
  explain: z.object({
    rationale: z.string(),
    sources: z.array(z.object({ kind: z.literal("catalog"), table: z.string() })),
    limitations: z.array(z.string()).optional(),
    locale_used: z.string(),
    locale_fallback: z.boolean(),
  }),
});

export default defineTool({
  name: "search_businesses",
  title: "Buscar negocios y experiencias en Valladolid",
  description:
    "Busca hoteles, restaurantes, tours, experiencias y demás negocios turísticos publicados en Valladolid y el Oriente Maya. Devuelve resultados públicos del catálogo.",
  inputSchema: {
    query: z.string().min(3).max(60).describe("Texto de búsqueda (mínimo 3 caracteres alfanuméricos)."),
    limit: z.number().int().min(1).max(SEARCH_RESULT_HARD_CAP).default(10),
    locale: LocaleSchema,
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withMcpGuardrails<{ query: string; limit: number }>({
    toolName: "search_businesses",
    contractVersion: CONTRACT_VERSION,
    handler: async ({ query, limit }, ctx, meta) => {
      const clean = sanitizeSearchQuery(query);
      if (!clean.ok) {
        return {
          content: [{ type: "text", text: clean.error }],
          isError: true,
          resultCount: 0,
        };
      }
      const cappedLimit = Math.min(limit ?? 10, SEARCH_RESULT_HARD_CAP);
      const supabase = supabaseFor(ctx);
      const { data, error } = await supabase
        .from("businesses")
        .select("id, slug, name, short_description, city, primary_category_id")
        .eq("status", "published")
        .ilike("name", `%${clean.value}%`)
        .limit(cappedLimit);
      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true, resultCount: 0 };
      }
      const rows = data ?? [];
      const output = OutputSchema.parse({
        results: rows,
        result_count: rows.length,
        contract_version: CONTRACT_VERSION,
        explain: {
          rationale: `Coincidencia por nombre (ILIKE) sobre negocios publicados. Locale: ${meta.localeUsed}.`,
          sources: [{ kind: "catalog", table: "businesses" }],
          limitations: [
            "Búsqueda por nombre (ILIKE). Se implementará FTS multi-idioma en M2.",
          ],
          locale_used: meta.localeUsed,
          locale_fallback: meta.localeFallback,
        },
      });
      return {
        content: [
          {
            type: "text",
            text:
              rows.length === 0
                ? `No se encontraron negocios para "${query}".`
                : rows
                    .map((r) => `• ${r.name}${r.city ? ` (${r.city})` : ""}${r.short_description ? ` — ${r.short_description}` : ""}`)
                    .join("\n"),
          },
        ],
        structuredContent: output,
        resultCount: rows.length,
      };
    },
  }),
});
