/**
 * CV8.2 · Journey State Projection — Server Function v1.0.
 *
 * Lee historial append-only del sujeto desde `visitor_intel.events` y
 * devuelve el estado proyectado mediante `projectVisitorState` (pura).
 *
 * Autorización: sólo callers autenticados con rol admin/super_admin. La
 * proyección puede exponer patrones de comportamiento sensibles.
 *
 * NOTA (server-side-modern): `client.server` se carga DENTRO del handler.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { VisitorEventSchema, type VisitorEvent } from "./events";
import {
  projectVisitorState,
  type ProjectedVisitorState,
} from "./projection";

const InputSchema = z.object({ subject_id: z.string().min(1) });

export const projectVisitorStateFromDb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }): Promise<ProjectedVisitorState> => {
    // Authorization — admin only. Reuse existing has_role RPC (no paralleles).
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isAdmin && !isSuper) {
      throw new Response("Forbidden", { status: 403 });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as unknown as {
      schema: (s: string) => {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (
              col: string,
              val: string,
            ) => {
              order: (
                col: string,
                opts: { ascending: boolean },
              ) => Promise<{ data: Array<{ payload: unknown }> | null; error: unknown }>;
            };
          };
        };
      };
    })
      .schema("visitor_intel")
      .from("events")
      .select("payload")
      .eq("subject_id", data.subject_id)
      .order("occurred_at", { ascending: true });

    if (error) {
      console.error("[visitor_intel.projection] read failed", error);
      throw new Response("Read failed", { status: 500 });
    }

    const events: VisitorEvent[] = [];
    for (const r of rows ?? []) {
      const parsed = VisitorEventSchema.safeParse(r.payload);
      // Regla de Recomputación — se ignoran filas ilegibles y se sigue
      // recomputando; nunca se cae la proyección por un evento corrupto.
      if (parsed.success) events.push(parsed.data);
    }

    return projectVisitorState(data.subject_id, events);
  });