/**
 * Conversación del expediente Concierge (viajero ⇄ concierge).
 *
 * No crea un modelo nuevo: usa `concierge_case_notes`, que ya distinguía
 * entre nota interna del equipo (`internal`) y mensaje con el viajero
 * (`traveler`). Las reglas de acceso viven en RLS; aquí sólo se leen y
 * escriben filas con la sesión del usuario.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CaseMessageVisibility = "traveler" | "internal";

export interface CaseMessage {
  id: string;
  case_id: string;
  author_user_id: string | null;
  body: string;
  visibility: CaseMessageVisibility;
  created_at: string;
  author_name: string | null;
  mine: boolean;
}

const ListInput = z.object({ caseId: z.string().uuid() });
const SendInput = z.object({
  caseId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
  visibility: z.enum(["traveler", "internal"]).default("traveler"),
});

export const listConciergeCaseMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("concierge_case_notes")
      .select("id, case_id, author_user_id, body, visibility, created_at")
      .eq("case_id", data.caseId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);

    // Nombre del personal interno; el viajero se muestra como "Viajero".
    const directory = new Map<string, string | null>();
    const dir = await context.supabase.rpc("concierge_directory" as never);
    for (const row of (dir.data ?? []) as unknown as Array<{
      user_id: string;
      display_name: string | null;
    }>) {
      directory.set(row.user_id, row.display_name);
    }

    return ((rows ?? []) as Array<{
      id: string;
      case_id: string;
      author_user_id: string | null;
      body: string;
      visibility: string;
      created_at: string;
    }>).map<CaseMessage>((r) => ({
      id: r.id,
      case_id: r.case_id,
      author_user_id: r.author_user_id,
      body: r.body,
      visibility: r.visibility === "internal" ? "internal" : "traveler",
      created_at: r.created_at,
      author_name: r.author_user_id ? (directory.get(r.author_user_id) ?? null) : null,
      mine: r.author_user_id === context.userId,
    }));
  });

export const sendConciergeCaseMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("concierge_case_notes")
      .insert({
        case_id: data.caseId,
        author_user_id: context.userId,
        body: data.body,
        visibility: data.visibility,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (row as { id: string }).id };
  });
