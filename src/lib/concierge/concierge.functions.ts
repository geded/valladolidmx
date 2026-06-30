/**
 * 14.60.1 — Concierge Workspace · Fundaciones
 * Server functions sobre las RPCs SECURITY DEFINER del dominio Concierge.
 * Toda autorización vive en la base de datos.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ConciergeCaseScope = "traveler" | "concierge" | "lead" | "admin";

export interface ConciergeCase {
  id: string;
  traveler_user_id: string;
  status: string;
  priority: string;
  source: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

const ListInput = z.object({
  scope: z.enum(["traveler", "concierge", "lead", "admin"]).default("traveler"),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listConciergeCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ListInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc(
      "concierge_case_list_for_role",
      { _scope: data.scope, _limit: data.limit },
    );
    if (error) throw new Error(error.message);
    return ((rows ?? []) as unknown as ConciergeCase[]);
  });

const GetInput = z.object({ caseId: z.string().uuid() });

export const getConciergeCase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => GetInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("concierge_case_get", {
      _case_id: data.caseId,
    });
    if (error) throw new Error(error.message);
    return row as unknown;
  });