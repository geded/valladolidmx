/**
 * CV8.S.3 · Sub-motor Commerce (Capa 2: Generación).
 *
 * Ciclo de vida de la orden:
 *  order.created → payment.pending → payment.paid | cancelled | expired | refunded
 *
 * Founder Ecosystem Interaction Principle:
 *  - NO se crea orden sin `proposalAccepted` previo (Concierge o Alux).
 *  - Todo evento declara prerequisito real (proposal_id o recommendation_id).
 */
import { destinationRoute } from "../paths";
import { sampleGap, MINUTE_MS, HOUR_MS, DAY_MS } from "../calendar";
import type { SimulatedEvent } from "../behavior";
import type { CommerceOutcome, ConciergeOutcome, SubMotorContext } from "./types";

function makeEvent(
  ctx: SubMotorContext,
  kind: "decision.offered" | "outcome.observed",
  atMs: number,
  extra: Record<string, unknown>,
  causality: SimulatedEvent["causality"],
): SimulatedEvent {
  const base = {
    event_id: ctx.prng.uuid(),
    occurred_at: new Date(atMs).toISOString(),
    schema_version: "1.0.0" as const,
    subject: {
      subject_id: ctx.subject_id,
      trust_level: ctx.trust_level,
      is_authenticated: ctx.is_authenticated,
      locale: ctx.locale,
    },
    context: {
      destination_id: null,
      surface: `commerce:${ctx.destination}`,
      route: destinationRoute(ctx.destination),
    },
  };
  return {
    event: { ...base, kind, ...extra } as SimulatedEvent["event"],
    is_simulation: true,
    simulation_run_id: ctx.runId,
    causality,
  };
}

export function emitCommerceOrder(
  ctx: SubMotorContext,
  concierge: ConciergeOutcome,
): CommerceOutcome {
  // Prerequisito duro: sólo si el Concierge cerró una propuesta aceptada.
  if (concierge.status !== "proposal_accepted" || !concierge.proposal_id) {
    return {
      events: [], cursor_ms: ctx.cursor_ms,
      order_id: null, status: "not_created", amount_usd: null,
    };
  }

  const { prng, profile } = ctx;
  const events: SimulatedEvent[] = [];
  let cursor = ctx.cursor_ms;

  const orderId = `order_${prng.uuid().slice(0, 12)}`;
  const [minAmt, maxAmt] = profile.propensities.ticket_size_usd;
  const amount = Math.round(prng.int(Math.round(minAmt), Math.round(maxAmt)));

  // 1. Orden creada — pago pendiente.
  cursor += sampleGap(prng, 30_000, 15 * MINUTE_MS);
  events.push(makeEvent(ctx, "decision.offered", cursor, {
    decision: {
      capability: "commerce.order_created",
      recommendation_id: orderId,
      rationale: `Orden creada desde propuesta ${concierge.proposal_id} (${amount} USD)`,
      accepted: null,
    },
  }, {
    prerequisite: concierge.proposal_id,
    influencer: "commerce",
    gap_ms: 0,
    scenario_probability: 1,
  }));

  // 2. Ventana de pago — pending.
  events.push(makeEvent(ctx, "outcome.observed", cursor, {
    outcome: {
      transition_id: "T7_concierge_to_reservation",
      traveler_value: 0.5, ecosystem_value: 0.4,
      label: "payment_pending",
    },
  }, {
    prerequisite: orderId,
    influencer: "commerce.payment",
    gap_ms: 0,
    scenario_probability: 1,
  }));

  // 3. Resolución del pago — modulada por perfil.
  const payGap = sampleGap(prng, 2 * MINUTE_MS, 8 * HOUR_MS);
  cursor += payGap;
  const successProb = 0.72 + 0.2 * profile.propensities.purchase_intent;
  const roll = prng.next();

  if (roll < successProb) {
    events.push(makeEvent(ctx, "outcome.observed", cursor, {
      outcome: {
        transition_id: "T7_concierge_to_reservation",
        traveler_value: 0.85, ecosystem_value: 0.9,
        label: "payment_paid",
      },
    }, {
      prerequisite: orderId,
      influencer: "commerce.payment",
      gap_ms: payGap,
      scenario_probability: successProb,
    }));
    // Pequeña probabilidad de reembolso posterior.
    if (prng.bool(0.03)) {
      const refundGap = sampleGap(prng, 1 * DAY_MS, 14 * DAY_MS);
      cursor += refundGap;
      events.push(makeEvent(ctx, "outcome.observed", cursor, {
        outcome: {
          transition_id: "T7_concierge_to_reservation",
          traveler_value: 0.4, ecosystem_value: 0.1,
          label: "payment_refunded",
        },
      }, {
        prerequisite: orderId,
        influencer: "commerce.payment",
        gap_ms: refundGap,
        scenario_probability: 0.03,
      }));
      return { events, cursor_ms: cursor, order_id: orderId, status: "refunded", amount_usd: amount };
    }
    return { events, cursor_ms: cursor, order_id: orderId, status: "paid", amount_usd: amount };
  }

  // Fallo — cancelación explícita vs expiración de la ventana.
  if (prng.bool(0.6)) {
    events.push(makeEvent(ctx, "outcome.observed", cursor, {
      outcome: {
        transition_id: "T7_concierge_to_reservation",
        traveler_value: 0.2, ecosystem_value: 0.05,
        label: "payment_cancelled",
      },
    }, {
      prerequisite: orderId,
      influencer: "commerce.payment",
      gap_ms: payGap,
      scenario_probability: 1 - successProb,
    }));
    return { events, cursor_ms: cursor, order_id: orderId, status: "cancelled", amount_usd: null };
  }

  events.push(makeEvent(ctx, "outcome.observed", cursor, {
    outcome: {
      transition_id: "T7_concierge_to_reservation",
      traveler_value: 0.15, ecosystem_value: 0.05,
      label: "payment_expired",
    },
  }, {
    prerequisite: orderId,
    influencer: "commerce.payment",
    gap_ms: payGap,
    scenario_probability: 1 - successProb,
  }));
  return { events, cursor_ms: cursor, order_id: orderId, status: "expired", amount_usd: null };
}