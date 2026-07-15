import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "search_businesses",
  title: "Buscar negocios y experiencias en Valladolid",
  description:
    "Busca hoteles, restaurantes, tours, experiencias y demás negocios turísticos publicados en Valladolid y el Oriente Maya. Devuelve resultados públicos del catálogo.",
  inputSchema: {
    query: z
      .string()
      .min(1)
      .describe("Texto de búsqueda (nombre, categoría, especialidad)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(25)
      .describe("Cantidad máxima de resultados a devolver (1-25).")
      .default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return {
        content: [{ type: "text", text: "Backend no configurado." }],
        isError: true,
      };
    }
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data, error } = await supabase
      .from("businesses")
      .select("id, slug, name, short_description, city, primary_category_id")
      .eq("status", "published")
      .ilike("name", `%${query}%`)
      .limit(limit);
    if (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
    const rows = data ?? [];
    return {
      content: [
        {
          type: "text",
          text:
            rows.length === 0
              ? `No se encontraron negocios para "${query}".`
              : rows
                  .map(
                    (r) =>
                      `• ${r.name}${r.city ? ` (${r.city})` : ""}${r.short_description ? ` — ${r.short_description}` : ""}`,
                  )
                  .join("\n"),
        },
      ],
      structuredContent: { results: rows },
    };
  },
});
