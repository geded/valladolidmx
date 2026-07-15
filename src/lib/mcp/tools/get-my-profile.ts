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
  name: "get_my_traveler_profile",
  title: "Obtener mi perfil de viajero",
  description:
    "Devuelve el perfil de viajero (handle, nombre, preferencias, idioma) del usuario autenticado.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado." }], isError: true };
    }
    const supabase = userClient(ctx);
    const { data, error } = await supabase
      .from("traveler_profiles")
      .select("*")
      .eq("user_id", ctx.getUserId()!)
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [
        {
          type: "text",
          text: data
            ? `Perfil de viajero (${data.handle ?? "sin handle"}) cargado.`
            : "Aún no tienes perfil de viajero.",
        },
      ],
      structuredContent: { profile: data },
    };
  },
});
