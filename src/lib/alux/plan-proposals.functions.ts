/**
 * CV2.2 · Bridge Alux → Travel Plan
 *
 * Cola oficial de propuestas de Alux al plan del viajero.
 * Alux propone; el viajero confirma. Nunca escribe directo al plan.
 *
 * Contrato:
 *  - proposeAluxPlanAddition(input)      → Alux inserta una propuesta pendiente.
 *  - listMyAluxPlanProposals({ status? })→ Bandeja del viajero.
 *  - acceptAluxPlanProposal({ id, note? })→ crea el item vía addPlanItem + marca accepted.
 *  - dismissAluxPlanProposal({ id, note? })→ marca dismissed.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { addPlanItem, type TravelItemKind } from "@/lib/traveler/travel-plans.functions";
import type { Json } from "@/integrations/supabase/types";

const ENTITY_TYPES = ["business", "product", "event", "destination"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

export interface AluxPlanProposal {
  id: string;
  entity_type: EntityType;
  entity_id: string | null;
  entity_slug: string | null;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  rationale: string | null;
  sources: Json;
  source_session_id: string | null;
  status: "pending" | "accepted" | "dismissed" | "expired";
  decided_at: string | null;
  decision_note: string | null;
  created_plan_item_id: string | null;
  plan_id: string | null;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------------------------
// proposeAluxPlanAddition — Alux inserta una propuesta pendiente
// -------------------------------------------------------------------------
const ProposeInput = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().uuid().optional().nullable(),
  entitySlug: z.string().max(200).optional().nullable(),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  rationale: z.string().max(600).optional().nullable(),
  sources: z.array(z.any()).optional().default([]),
  sourceSessionId: z.string().max(200).optional().nullable(),
  planId: z.string().uuid().optional().nullable(),
});

export const proposeAluxPlanAddition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProposeInput.parse(d))
  .handler(async ({ data, context }): Promise<AluxPlanProposal> => {
    // Dedupe suave: si ya existe una pendiente para (user, entity_type, entity_id),
    // devolverla en vez de duplicar.
    if (data.entityId) {
      const { data: existing } = await context.supabase
        .from("alux_plan_proposals")
        .select("*")
        .eq("user_id", context.userId)
        .eq("entity_type", data.entityType)
        .eq("entity_id", data.entityId)
        .eq("status", "pending")
        .maybeSingle();
      if (existing) return existing as AluxPlanProposal;
    }

    const { data: row, error } = await context.supabase
      .from("alux_plan_proposals")
      .insert({
        user_id: context.userId,
        plan_id: data.planId ?? null,
        entity_type: data.entityType,
        entity_id: data.entityId ?? null,
        entity_slug: data.entitySlug ?? null,
        title: data.title,
        subtitle: data.subtitle ?? null,
        image_url: data.imageUrl ?? null,
        rationale: data.rationale ?? null,
        sources: (data.sources ?? []) as unknown as Json,
        source_session_id: data.sourceSessionId ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(`propose_failed: ${error.message}`);
    return row as AluxPlanProposal;
  });

// -------------------------------------------------------------------------
// listMyAluxPlanProposals — Bandeja del viajero
// -------------------------------------------------------------------------
const ListInput = z.object({
  status: z.enum(["pending", "accepted", "dismissed", "expired", "all"]).optional().default("pending"),
  limit: z.number().int().min(1).max(100).optional().default(30),
});

export const listMyAluxPlanProposals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListInput.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<AluxPlanProposal[]> => {
    const base = context.supabase
      .from("alux_plan_proposals")
      .select("*")
      .eq("user_id", context.userId);
    const filtered = data.status === "all" ? base : base.eq("status", data.status);
    const { data: rows, error } = await filtered
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(`list_failed: ${error.message}`);
    return (rows ?? []) as AluxPlanProposal[];
  });

// -------------------------------------------------------------------------
// acceptAluxPlanProposal — Confirma y crea el item en el plan
// -------------------------------------------------------------------------
const DecisionInput = z.object({
  id: z.string().uuid(),
  note: z.string().max(500).optional().nullable(),
});

export const acceptAluxPlanProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DecisionInput.parse(d))
  .handler(async ({ data, context }): Promise<{ proposal: AluxPlanProposal; itemId: string }> => {
    // 1. Cargar propuesta (RLS garantiza ownership)
    const { data: prop, error: readErr } = await context.supabase
      .from("alux_plan_proposals")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(`accept_read_failed: ${readErr.message}`);
    if (!prop) throw new Error("proposal_not_found");
    if ((prop as AluxPlanProposal).status !== "pending") {
      throw new Error("proposal_not_pending");
    }
    if (!prop.entity_id) throw new Error("proposal_missing_entity_id");

    // 2. Crear item vía Write Contract oficial (addPlanItem)
    const kind = prop.entity_type as TravelItemKind;
    const { item } = await addPlanItem({
      data: {
        planId: prop.plan_id,
        kind,
        targetId: prop.entity_id,
        notes: prop.rationale ?? null,
        snapshot: {
          title: prop.title,
          subtitle: prop.subtitle,
          slug: prop.entity_slug,
          image_url: prop.image_url,
        },
      },
    });

    // 3. Marcar propuesta accepted
    const { data: updated, error: upErr } = await context.supabase
      .from("alux_plan_proposals")
      .update({
        status: "accepted",
        decided_at: new Date().toISOString(),
        decision_note: data.note ?? null,
        created_plan_item_id: item.id,
        plan_id: item.plan_id,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (upErr) throw new Error(`accept_update_failed: ${upErr.message}`);

    return { proposal: updated as AluxPlanProposal, itemId: item.id };
  });

// -------------------------------------------------------------------------
// dismissAluxPlanProposal — Descarta sin crear item
// -------------------------------------------------------------------------
export const dismissAluxPlanProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DecisionInput.parse(d))
  .handler(async ({ data, context }): Promise<AluxPlanProposal> => {
    const { data: row, error } = await context.supabase
      .from("alux_plan_proposals")
      .update({
        status: "dismissed",
        decided_at: new Date().toISOString(),
        decision_note: data.note ?? null,
      })
      .eq("id", data.id)
      .eq("status", "pending")
      .select("*")
      .single();
    if (error) throw new Error(`dismiss_failed: ${error.message}`);
    return row as AluxPlanProposal;
  });