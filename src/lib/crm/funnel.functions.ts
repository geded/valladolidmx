/**
 * CRM Prospectos · Fase 4 — datos del embudo y rentabilidad por canal.
 * Lee con la sesión del concierge (RLS de personal del CRM) y calcula con
 * las reglas puras de `funnel-rules.ts`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  FUNNEL_PERIODS,
  computeFunnel,
  funnelPeriodStart,
  type FunnelInvite,
  type FunnelOrder,
  type FunnelProspect,
} from "./funnel-rules";

async function assertStaff(context: {
  supabase: { rpc: (fn: never, args: never) => PromiseLike<{ data: unknown; error: unknown }> };
  userId: string;
}) {
  const { data, error } = await context.supabase.rpc(
    "crm_is_prospect_staff" as never,
    { _user_id: context.userId } as never,
  );
  if (error || data !== true) throw new Error("forbidden");
}

const ORDER_COLUMNS = "id, user_id, status, total_amount, paid_at, source_case_id";
const SOLD = ["paid", "fulfilled", "refunded"];

function chunks<T>(list: readonly T[], size = 150): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export const getProspectFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ period: z.enum(FUNNEL_PERIODS).default("30d") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const sb = context.supabase;
    const now = new Date();
    const since = funnelPeriodStart(data.period, now);
    const sinceIso = since?.toISOString() ?? "1970-01-01T00:00:00Z";

    const [web, wa, prospects, invites, touched] = await Promise.all([
      sb
        .from("alux_public_sessions")
        .select("id", { count: "exact", head: true })
        .eq("channel", "web")
        .is("traveler_user_id", null)
        .gt("message_count", 0)
        .gte("first_seen_at", sinceIso),
      sb
        .from("alux_public_sessions")
        .select("id", { count: "exact", head: true })
        .eq("channel", "whatsapp")
        .gte("first_seen_at", sinceIso),
      sb
        .from("concierge_prospects")
        .select("id, source, created_at, linked_user_id, case_id")
        .limit(10000),
      sb
        .from("crm_prospect_invites")
        .select("id, prospect_id, order_id, created_at, expires_at, cancelled_at")
        .eq("purpose", "pay")
        .limit(10000),
      sb
        .from("alux_public_sessions")
        .select("prospect_id")
        .not("prospect_id", "is", null)
        .not("human_reply_at", "is", null)
        .limit(10000),
    ]);
    for (const r of [web, wa, prospects, invites, touched])
      if (r.error) throw new Error(r.error.message);

    const prospectRows = (prospects.data ?? []) as FunnelProspect[];
    const inviteRows = (invites.data ?? []) as FunnelInvite[];
    const linkedUsers = Array.from(
      new Set(prospectRows.map((p) => p.linked_user_id).filter((u): u is string => Boolean(u))),
    );
    const inviteOrders = Array.from(
      new Set(inviteRows.map((i) => i.order_id).filter((o): o is string => Boolean(o))),
    );

    const orderMap = new Map<string, FunnelOrder>();
    const reads = [
      ...chunks(inviteOrders).map((ids) =>
        sb.from("concierge_orders").select(ORDER_COLUMNS).in("id", ids),
      ),
      ...chunks(linkedUsers).map((ids) =>
        sb.from("concierge_orders").select(ORDER_COLUMNS).in("user_id", ids).in("status", SOLD),
      ),
    ];
    for (const r of await Promise.all(reads)) {
      if (r.error) throw new Error(r.error.message);
      for (const o of (r.data ?? []) as FunnelOrder[]) orderMap.set(o.id, o);
    }

    const result = computeFunnel({
      conversations: { web: web.count ?? 0, whatsapp: wa.count ?? 0, otros: 0 },
      prospects: prospectRows,
      orders: Array.from(orderMap.values()),
      payInvites: inviteRows,
      conciergeTouched: new Set(
        (touched.data ?? []).map((t) => t.prospect_id).filter((p): p is string => Boolean(p)),
      ),
      since,
      now,
    });
    return { period: data.period, since: since?.toISOString() ?? null, ...result };
  });
