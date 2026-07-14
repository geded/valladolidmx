/**
 * CV8.S.3 · Sub-motor Concierge (Capa 2: Generación).
 *
 * Ciclo de vida completo del caso:
 *  case.opened → case.assigned → case.first_response → proposal.sent
 *   → proposal.accepted | proposal.rejected | abandoned
 *
 * SLA de respuesta afecta directamente la probabilidad de conversión.
 * Founder Ecosystem Interaction Principle:
 *  - Sólo se abre caso si el sujeto llegó a T6 (from_transition).
 *  - No hay aceptación de propuesta sin propuesta previa emitida.
 */
import { destinationRoute } from "../paths";
import { sampleGap, MINUTE_MS, HOUR_MS, DAY_MS } from "../calendar";
import type { SimulatedEvent } from "../behavior";
import type { ConciergeOutcome, SubMotorContext } from "./types";

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
      surface: `concierge:${ctx.destination}`,
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

export function emitConciergeCase(ctx: SubMotorContext): ConciergeOutcome {
  const { prng, profile, scenario } = ctx;
  const events: SimulatedEvent[] = [];
  let cursor = ctx.cursor_ms;

  const caseId = `case_${prng.uuid().slice(0, 12)}`;
  const proposalId = `proposal_${prng.uuid().slice(0, 12)}`;

  // 1. Apertura de caso — consecuencia directa de T6.
  events.push(makeEvent(ctx, "decision.offered", cursor, {
    decision: {
      capability: "concierge",
      recommendation_id: caseId,
      rationale: `Caso abierto tras promover Travel Plan (${profile.id})`,
      accepted: null,
    },
  }, {
    prerequisite: ctx.from_transition,
    influencer: "concierge.case_open",
    gap_ms: 0,
    scenario_probability: 1,
  }));

  // 2. Asignación — SLA operativo (5m..2h).
  const assignGap = sampleGap(prng, 5 * MINUTE_MS, 2 * HOUR_MS);
  cursor += assignGap;
  events.push(makeEvent(ctx, "decision.offered", cursor, {
    decision: {
      capability: "concierge.assign",
      recommendation_id: caseId,
      rationale: "Caso asignado a experto disponible",
      accepted: true,
    },
  }, {
    prerequisite: caseId,
    influencer: "concierge.assign",
    gap_ms: assignGap,
    scenario_probability: 1,
  }));

  // 3. Primera respuesta — SLA que planted_issues puede degradar.
  const isSlow = prng.bool(scenario.planted_issues.slow_business_response_rate);
  const firstResponseGap = isSlow
    ? sampleGap(prng, 6 * HOUR_MS, 3 * DAY_MS)
    : sampleGap(prng, 15 * MINUTE_MS, 6 * HOUR_MS);
  cursor += firstResponseGap;
  events.push(makeEvent(ctx, "decision.offered", cursor, {
    decision: {
      capability: "concierge.first_response",
      recommendation_id: caseId,
      rationale: isSlow ? "Primera respuesta lenta (SLA superado)" : "Primera respuesta dentro de SLA",
      accepted: true,
    },
  }, {
    prerequisite: caseId,
    influencer: "concierge.first_response",
    gap_ms: firstResponseGap,
    scenario_probability: isSlow ? 1 - scenario.planted_issues.slow_business_response_rate : 1,
  }));

  // 4. Probabilidad de abandono antes de propuesta (mayor si SLA lento).
  const abandonBeforeProposal = isSlow ? 0.35 : 0.08;
  if (prng.bool(abandonBeforeProposal)) {
    events.push(makeEvent(ctx, "outcome.observed", cursor + 30 * MINUTE_MS, {
      outcome: {
        transition_id: "T6_travel_plan_to_concierge",
        traveler_value: 0.2,
        ecosystem_value: 0.1,
        label: isSlow ? "concierge_abandoned_slow_sla" : "concierge_abandoned",
      },
    }, {
      prerequisite: caseId,
      influencer: "concierge",
      gap_ms: 30 * MINUTE_MS,
      scenario_probability: abandonBeforeProposal,
    }));
    return {
      events, cursor_ms: cursor + 30 * MINUTE_MS,
      case_id: caseId, proposal_id: null,
      status: "abandoned", sla_response_ms: firstResponseGap, slow_response: isSlow,
    };
  }

  // 5. Propuesta enviada.
  const proposalGap = sampleGap(prng, 30 * MINUTE_MS, 1 * DAY_MS);
  cursor += proposalGap;
  events.push(makeEvent(ctx, "decision.offered", cursor, {
    decision: {
      capability: "concierge.proposal",
      recommendation_id: proposalId,
      rationale: `Propuesta personalizada para ${profile.id} en ${ctx.destination}`,
      accepted: null,
    },
  }, {
    prerequisite: caseId,
    influencer: "concierge.proposal",
    gap_ms: proposalGap,
    scenario_probability: 1,
  }));

  // 6. Seguimiento (posible) — sólo si el viajero tarda en decidir.
  const needsFollowUp = prng.bool(0.4);
  if (needsFollowUp) {
    const followUpGap = sampleGap(prng, 6 * HOUR_MS, 2 * DAY_MS);
    cursor += followUpGap;
    events.push(makeEvent(ctx, "decision.offered", cursor, {
      decision: {
        capability: "concierge.followup",
        recommendation_id: proposalId,
        rationale: "Seguimiento tras propuesta sin respuesta",
        accepted: true,
      },
    }, {
      prerequisite: proposalId,
      influencer: "concierge.followup",
      gap_ms: followUpGap,
      scenario_probability: 0.4,
    }));
  }

  // 7. Resolución — aceptación/rechazo/abandono modulados por SLA + perfil.
  const acceptBase = 0.3 + 0.55 * profile.propensities.purchase_intent;
  const acceptEffective = isSlow ? acceptBase * 0.55 : acceptBase;
  const decisionGap = sampleGap(prng, 30 * MINUTE_MS, 3 * DAY_MS);
  cursor += decisionGap;
  const roll = prng.next();

  if (roll < acceptEffective) {
    events.push(makeEvent(ctx, "decision.offered", cursor, {
      decision: {
        capability: "concierge.proposal",
        recommendation_id: proposalId,
        rationale: "Propuesta aceptada por el viajero",
        accepted: true,
      },
    }, {
      prerequisite: proposalId,
      influencer: "concierge.proposal",
      gap_ms: decisionGap,
      scenario_probability: acceptEffective,
    }));
    return {
      events, cursor_ms: cursor,
      case_id: caseId, proposal_id: proposalId,
      status: "proposal_accepted", sla_response_ms: firstResponseGap, slow_response: isSlow,
    };
  }

  // Rechazo explícito vs abandono silencioso.
  const explicitReject = prng.bool(0.55);
  if (explicitReject) {
    events.push(makeEvent(ctx, "decision.offered", cursor, {
      decision: {
        capability: "concierge.proposal",
        recommendation_id: proposalId,
        rationale: "Propuesta rechazada por el viajero",
        accepted: false,
      },
    }, {
      prerequisite: proposalId,
      influencer: "concierge.proposal",
      gap_ms: decisionGap,
      scenario_probability: 1 - acceptEffective,
    }));
    events.push(makeEvent(ctx, "outcome.observed", cursor + 60_000, {
      outcome: {
        transition_id: "T7_concierge_to_reservation",
        traveler_value: 0.4, ecosystem_value: 0.2,
        label: "concierge_lost",
      },
    }, {
      prerequisite: proposalId,
      influencer: "concierge",
      gap_ms: 60_000,
      scenario_probability: 1 - acceptEffective,
    }));
    return {
      events, cursor_ms: cursor + 60_000,
      case_id: caseId, proposal_id: proposalId,
      status: "proposal_rejected", sla_response_ms: firstResponseGap, slow_response: isSlow,
    };
  }

  events.push(makeEvent(ctx, "outcome.observed", cursor, {
    outcome: {
      transition_id: "T7_concierge_to_reservation",
      traveler_value: 0.3, ecosystem_value: 0.1,
      label: "concierge_abandoned_after_proposal",
    },
  }, {
    prerequisite: proposalId,
    influencer: "concierge",
    gap_ms: decisionGap,
    scenario_probability: 1 - acceptEffective,
  }));
  return {
    events, cursor_ms: cursor,
    case_id: caseId, proposal_id: proposalId,
    status: "abandoned", sla_response_ms: firstResponseGap, slow_response: isSlow,
  };
}