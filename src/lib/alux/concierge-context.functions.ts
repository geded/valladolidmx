/**
 * CV2.4 · Bridge Concierge → Alux
 *
 * Lente autenticada que expone al Concierge IA (Alux) lo que el
 * Concierge HUMANO ya trabaja con este viajero, para respetar y
 * complementar (no duplicar).
 *
 * Fuente única: RPC SECURITY DEFINER `alux_get_concierge_context_for_user`.
 * Sólo lee; nunca muta.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AluxConciergeContext {
  has_concierge: boolean;
  active_case_count?: number;
  reserved_business_ids: string[];
  reserved_business_slugs: string[];
  reserved_business_names: string[];
  reserved_product_ids: string[];
  reserved_event_ids: string[];
  reserved_destination_ids: string[];
  active_proposals_count: number;
  latest_proposal_summary: string | null;
  shared_notes: Array<{ body: string; created_at: string }>;
}

const EMPTY: AluxConciergeContext = {
  has_concierge: false,
  reserved_business_ids: [],
  reserved_business_slugs: [],
  reserved_business_names: [],
  reserved_product_ids: [],
  reserved_event_ids: [],
  reserved_destination_ids: [],
  active_proposals_count: 0,
  latest_proposal_summary: null,
  shared_notes: [],
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export const getAluxConciergeContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AluxConciergeContext> => {
    try {
      const { data, error } = await (
        context.supabase as unknown as {
          rpc: (
            name: string,
            args: Record<string, unknown>,
          ) => Promise<{ data: unknown; error: unknown }>;
        }
      ).rpc("alux_get_concierge_context_for_user", { _user_id: context.userId });
      if (error || !data) return EMPTY;
      const d = data as Record<string, unknown>;
      if (!d.has_concierge) return EMPTY;
      const notesRaw = Array.isArray(d.shared_notes) ? d.shared_notes : [];
      const shared_notes = notesRaw
        .map((n) => {
          const r = (n ?? {}) as { body?: unknown; created_at?: unknown };
          if (typeof r.body !== "string") return null;
          return {
            body: r.body,
            created_at: typeof r.created_at === "string" ? r.created_at : new Date().toISOString(),
          };
        })
        .filter((x): x is { body: string; created_at: string } => x !== null);
      return {
        has_concierge: true,
        active_case_count: Number(d.active_case_count ?? 0) || 0,
        reserved_business_ids: asStringArray(d.reserved_business_ids),
        reserved_business_slugs: asStringArray(d.reserved_business_slugs),
        reserved_business_names: asStringArray(d.reserved_business_names),
        reserved_product_ids: asStringArray(d.reserved_product_ids),
        reserved_event_ids: asStringArray(d.reserved_event_ids),
        reserved_destination_ids: asStringArray(d.reserved_destination_ids),
        active_proposals_count: Number(d.active_proposals_count ?? 0) || 0,
        latest_proposal_summary:
          typeof d.latest_proposal_summary === "string"
            ? d.latest_proposal_summary
            : null,
        shared_notes,
      };
    } catch {
      return EMPTY;
    }
  });
