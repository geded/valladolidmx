/** Shared server-only reader for the append-only CV8.9 decision ledger. */
import {
  projectDecisionQueue,
  type DecisionEventPayload,
  type DecisionQueueProjection,
} from "./decisions";
import { VisitorEventSchema } from "./events";

type DecisionEventRow = { payload: unknown };
type DecisionEventPage = {
  data: DecisionEventRow[] | null;
  error: { message: string } | null;
};
type DecisionEventQuery = {
  eq: (column: string, value: string) => DecisionEventQuery;
  like: (column: string, pattern: string) => DecisionEventQuery;
  order: (column: string, options: { ascending: boolean }) => DecisionEventQuery;
  range: (from: number, to: number) => Promise<DecisionEventPage>;
};
type DecisionReadClient = {
  schema: (schema: string) => {
    from: (table: string) => {
      select: (columns: string) => DecisionEventQuery;
    };
  };
};

export async function loadDecisionProjection(now = new Date()): Promise<DecisionQueueProjection> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as DecisionReadClient;
  const pageSize = 1_000;
  const rows: DecisionEventRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .schema("visitor_intel")
      .from("events")
      .select("payload")
      .eq("kind", "recommendation.lifecycle")
      .like("subject_id", "decision:%")
      .order("occurred_at", { ascending: true })
      .order("ingested_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("[visitor_intel.decisions] read failed", error);
      throw new Response("Read failed", { status: 500 });
    }
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < pageSize) break;
  }

  const payloads: DecisionEventPayload[] = [];
  for (const row of rows) {
    const parsed = VisitorEventSchema.safeParse(row.payload);
    if (
      parsed.success &&
      parsed.data.kind === "recommendation.lifecycle" &&
      parsed.data.subtype === "decision" &&
      parsed.data.payload
    ) {
      payloads.push(parsed.data.payload);
    }
  }
  return projectDecisionQueue(payloads, { now });
}
