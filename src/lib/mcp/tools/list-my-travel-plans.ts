import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

function userClient(ctx: ToolContext) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_travel_plans",
  title: "Listar mis planes de viaje",
  description:
    "Lista los planes de viaje (Mi Viaje) del usuario autenticado, con título, fechas y estatus. Respeta RLS.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado." }], isError: true };
    }
    const supabase = userClient(ctx);
    const { data, error } = await supabase
      .from("travel_plans")
      .select("id, title, status, start_date, end_date, party_size, updated_at")
      .order("updated_at", { ascending: false })
      .limit(25);
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    const rows = data ?? [];
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
                      `• ${p.title} — ${p.status}${p.start_date ? ` (${p.start_date}${p.end_date ? ` → ${p.end_date}` : ""})` : ""}`,
                  )
                  .join("\n"),
        },
      ],
      structuredContent: { plans: rows },
    };
  },
});
