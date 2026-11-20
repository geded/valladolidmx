/** Shared server-only reader for the append-only CV8.9 decision ledger. */
import {
  projectDecisionQueue,
  type DecisionEventPayload,
  type DecisionQueueProjection,
} from "./decisions";
import { VisitorEventSchema } from "./events";
import { readVisitorIntelEvents } from "./event-reads.server";

export async function loadDecisionProjection(now = new Date()): Promise<DecisionQueueProjection> {
  const rows = await readVisitorIntelEvents(
    { kind: "recommendation.lifecycle", subjectPrefix: "decision:" },
    "decisions",
  );

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
