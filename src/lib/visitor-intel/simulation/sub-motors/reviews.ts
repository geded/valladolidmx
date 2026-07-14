/**
 * CV8.S.3 · Sub-motor Reviews (Capa 2: Generación).
 *
 * review.requested → review.published → business.responded → (ambassador boost)
 *
 * Founder Ecosystem Interaction Principle:
 *  - Sólo se solicita reseña si hubo experiencia completada (T8 alcanzado).
 *  - No todos reseñan (base ~35% modulada por perfil).
 *  - Ambassador boost sólo si reseña publicada + rating alto.
 */
import { destinationRoute } from "../paths";
import { sampleGap, HOUR_MS, DAY_MS } from "../calendar";
import type { SimulatedEvent } from "../behavior";
import type { ReviewsOutcome, SubMotorContext } from "./types";

function makeEvent(
  ctx: SubMotorContext,
  kind: "intent.signal" | "outcome.observed" | "decision.offered",
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
      surface: `reviews:${ctx.destination}`,
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

export function emitReviewLoop(ctx: SubMotorContext): ReviewsOutcome {
  const { prng, profile } = ctx;
  const events: SimulatedEvent[] = [];
  let cursor = ctx.cursor_ms;

  const reviewRequestId = `review_${prng.uuid().slice(0, 12)}`;

  // 1. Solicitud de reseña (post-experiencia).
  const requestGap = sampleGap(prng, 12 * HOUR_MS, 3 * DAY_MS);
  cursor += requestGap;
  events.push(makeEvent(ctx, "decision.offered", cursor, {
    decision: {
      capability: "reviews.request",
      recommendation_id: reviewRequestId,
      rationale: "Solicitud de reseña tras experiencia completada",
      accepted: null,
    },
  }, {
    prerequisite: ctx.from_transition,
    influencer: "reviews",
    gap_ms: requestGap,
    scenario_probability: 1,
  }));

  // 2. Publicación — no todos reseñan.
  const publishRate = 0.25 + 0.35 * profile.propensities.concierge_acceptance;
  if (!prng.bool(publishRate)) {
    return {
      events, cursor_ms: cursor,
      review_published: false, rating: null,
      business_responded: false, ambassador_modifier: 1,
    };
  }

  const publishGap = sampleGap(prng, 4 * HOUR_MS, 7 * DAY_MS);
  cursor += publishGap;
  const rating = prng.int(3, 5); // sesgado positivo tras experiencia completada
  events.push(makeEvent(ctx, "intent.signal", cursor, {
    intent: {
      action: "reviews.published",
      target_type: "business",
      target_id: ctx.destination,
      strength: rating / 5,
    },
  }, {
    prerequisite: reviewRequestId,
    influencer: "reviews",
    gap_ms: publishGap,
    scenario_probability: publishRate,
  }));

  // 3. Respuesta del negocio (probabilidad alta si rating >=4).
  const respondRate = rating >= 4 ? 0.75 : 0.55;
  let businessResponded = false;
  if (prng.bool(respondRate)) {
    const respondGap = sampleGap(prng, 2 * HOUR_MS, 3 * DAY_MS);
    cursor += respondGap;
    businessResponded = true;
    events.push(makeEvent(ctx, "decision.offered", cursor, {
      decision: {
        capability: "reviews.business_response",
        recommendation_id: reviewRequestId,
        rationale: rating >= 4 ? "Agradecimiento por reseña positiva" : "Atención a reseña con áreas de mejora",
        accepted: true,
      },
    }, {
      prerequisite: reviewRequestId,
      influencer: "reviews.business_response",
      gap_ms: respondGap,
      scenario_probability: respondRate,
    }));
  }

  // 4. Boost para T9 (ambassador): rating alto + respuesta del negocio.
  const ambassador_modifier =
    rating >= 4 ? (businessResponded ? 1.5 : 1.25) : 1;

  return {
    events, cursor_ms: cursor,
    review_published: true, rating,
    business_responded: businessResponded,
    ambassador_modifier,
  };
}