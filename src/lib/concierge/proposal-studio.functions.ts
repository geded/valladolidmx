/**
 * Estudio de Propuesta · Server functions (2026-09-14).
 *
 * Sólo añade capacidades nuevas sobre el dominio Concierge ya aprobado:
 *  - Plantillas de propuesta reutilizables (personal interno).
 *  - Reaplicar al viaje el itinerario capturado en una propuesta.
 *
 * Toda autorización vive en la base de datos (RLS + RPC SECURITY DEFINER).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Partida guardada en una plantilla reutilizable. */
export interface ProposalTemplateItem {
  title: string;
  notes: string | null;
  amount_cents: number;
  currency: string;
  is_suggestion: boolean;
  day_index: number | null;
  starts_at_local: string | null;
  duration_minutes: number | null;
}

export interface ProposalTemplate {
  id: string;
  title: string;
  description: string | null;
  items: ProposalTemplateItem[];
  created_at: string;
  updated_at: string;
  owner_user_id: string;
}


export const listProposalTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("concierge_proposal_templates")
      .select("id, title, description, items, created_at, updated_at, owner_user_id")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ProposalTemplate[];
  });

const SaveTemplateInput = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  items: z.array(z.record(z.string(), z.unknown())).min(1).max(60),
});

export const saveProposalTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SaveTemplateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("concierge_proposal_templates")
      .insert({
        owner_user_id: context.userId,
        title: data.title,
        description: data.description ?? null,
        items: data.items as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteProposalTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ templateId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("concierge_proposal_templates")
      .delete()
      .eq("id", data.templateId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Reaplica al viaje del viajero el día/hora capturado en la propuesta. */
export const applyProposalScheduleToPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ proposalId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: applied, error } = await context.supabase.rpc(
      "concierge_proposal_apply_schedule_to_plan",
      { _proposal_id: data.proposalId },
    );
    if (error) throw new Error(error.message);
    return { applied: Number(applied ?? 0) };
  });
