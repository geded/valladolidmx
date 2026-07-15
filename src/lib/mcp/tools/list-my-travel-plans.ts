import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseFor } from "../lib/ctx-supabase";
import { withMcpGuardrails } from "../lib/wrap";
import { LocaleSchema } from "../lib/contracts";

const CONTRACT_VERSION = "1.1.0";

const PlanSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  status: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  party_size: z.number().nullable(),
  updated_at: z.string().nullable(),
});

const OutputSchema = z.object({
  plans: z.array(PlanSchema),
  result_count: z.number().int(),
  contract_version: z.string(),
  explain: z.object({
    rationale: z.string(),
    sources: z.array(z.object({ kind: z.literal("travel_plans"), table: z.string() })),
    locale_used: z.string(),
    locale_fallback: z.boolean(),
  }),
});

export default defineTool({
  name: "list_my_travel_plans",
  title: "Listar mis planes de viaje",
  description:
    "Lista los planes de viaje (Mi Viaje) del usuario autenticado, con título, fechas y estatus. Requiere OAuth. Respeta RLS.",
  inputSchema: { locale: LocaleSchema },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withMcpGuardrails<{}>({
    toolName: "list_my_travel_plans",
    contractVersion: CONTRACT_VERSION,
    requiresAuth: true,
    handler: async (_input, ctx, meta) => {
      const supabase = supabaseFor(ctx);
      const { data, error } = await supabase
        .from("travel_plans")
        .select("id, title, status, start_date, end_date, party_size, updated_at")
        .order("updated_at", { ascending: false })
        .limit(25);
      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true, resultCount: 0 };
      }
      const rows = (data ?? []) as z.infer<typeof PlanSchema>[];
      const output = OutputSchema.parse({
        plans: rows,
        result_count: rows.length,
        contract_version: CONTRACT_VERSION,
        explain: {
          rationale: "Planes del usuario autenticado, ordenados por actividad reciente, bajo RLS.",
          sources: [{ kind: "travel_plans", table: "travel_plans" }],
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
                ? "No tienes planes de viaje todavía."
                : rows
                    .map(
                      (p) =>
                        `• ${p.title ?? "(sin título)"} — ${p.status ?? "pending"}${p.start_date ? ` (${p.start_date}${p.end_date ? ` → ${p.end_date}` : ""})` : ""}`,
                    )
                    .join("\n"),
          },
        ],
        structuredContent: output,
        resultCount: rows.length,
      };
    },
  }),
});
