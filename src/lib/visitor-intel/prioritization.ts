/**
 * CV8.7 · Prescriptive Decision Prioritization — Pure Module v1.0.0.
 *
 * Función pura que prioriza `Opportunity[]` (CV8.5) combinando confianza
 * aprendida por familia (CV8.6) con impacto/urgencia/alcance/etapa Journey/
 * beneficio ecosistema. Cumple:
 *   - Founder Decision Prioritization Principle (CV8.7).
 *   - Founder Journey State Principle (derivación total, cero persistencia).
 *   - Founder Opportunity Intelligence Principle (5 preguntas Founder + rationale).
 *   - Founder Continuous Improvement Principle (usa learned_confidence real).
 *
 * Sin llamadas de red. Sin snapshots. Sin reglas ocultas: los pesos son
 * constantes exportadas y auditables.
 */
import type { Opportunity } from "./opportunities.functions";
import type {
  FamilyLearningSignal,
  RecommendationValidationSnapshot,
} from "./recommendations.functions";
import { JOURNEY_TRANSITIONS, type JourneyTransitionId } from "./journey";
import { KPI_CATALOG } from "./kpis";
import { factorLabel, reliabilityLabel, transitionLabel } from "./plain-language";

const SEVERITY_LABEL: Record<Opportunity["severity"], string> = {
  critical: "crítica",
  attention: "requiere atención",
  opportunity: "oportunidad",
  informative: "informativa",
};

export const PRIORITIZATION_CONTRACT_VERSION = "1.0.0" as const;

/** Pesos oficiales — auditables, no ocultos. Suma = 1.0. */
export const PRIORITIZATION_WEIGHTS = {
  confidence: 0.25,
  impact: 0.25,
  urgency: 0.2,
  reach: 0.15,
  journey: 0.1,
  ecosystem: 0.05,
} as const;

/** Confianza por defecto cuando la familia tiene muestra < MIN_FAMILY_SIGNAL. */
export const DEFAULT_CONFIDENCE_WHEN_UNKNOWN = 0.5;

export interface PriorityFactor {
  key: keyof typeof PRIORITIZATION_WEIGHTS;
  weight: number;
  value: number; // ∈ [0,1]
  contribution: number; // weight * value
  explanation: string;
}

export interface PrioritizedOpportunity {
  rank: number;
  opportunity: Opportunity;
  score: number; // ∈ [0,1]
  factors: PriorityFactor[];
  learned_confidence: number;
  confidence_reliability: FamilyLearningSignal["reliability"] | "unknown";
  rationale: string; // por qué ocupa esta posición
  expected_effect: string; // qué esperamos si actuamos ahora
}

function severityUrgency(s: Opportunity["severity"]): number {
  switch (s) {
    case "critical":
      return 1.0;
    case "attention":
      return 0.7;
    case "opportunity":
      return 0.5;
    case "informative":
      return 0.15;
  }
}

/** Etapas tempranas amplifican aguas abajo → boost prescriptivo. */
function journeyWeight(t: Opportunity["transition"]): { value: number; label: string } {
  if (t === "aggregate") return { value: 0.9, label: "avance general del recorrido" };
  const idx = (Object.keys(JOURNEY_TRANSITIONS) as JourneyTransitionId[]).indexOf(t);
  if (idx < 0) return { value: 0.5, label: "paso desconocido" };
  // T1..T9 → boost decreciente 1.0 → 0.55
  const value = Number((1.0 - (idx / 8) * 0.45).toFixed(3));
  return {
    value,
    label: transitionLabel(t),
  };
}

function ecosystemBenefit(o: Opportunity): { value: number; label: string } {
  const kpi = KPI_CATALOG.find((k) => k.id === o.metric_id);
  if (!kpi) return { value: 0.5, label: "indicador no catalogado (peso neutro)" };
  if (kpi.tier === "north_star") return { value: 1.0, label: "indicador principal" };
  if (kpi.tier === "secondary") return { value: 0.75, label: "indicador de un paso" };
  return { value: 0.4, label: "indicador de control" };
}

/** Normaliza magnitud del delta relativo a [0,1] con saturación en 50%. */
function impactValue(o: Opportunity): number {
  const raw = Math.abs(o.evidence.delta_relative);
  return Number(Math.min(1, raw / 0.5).toFixed(4));
}

/** Reach ∈ [0,1]: sample_size relativo al mayor de la ventana. */
function reachValue(sample: number, maxSample: number): number {
  if (maxSample <= 0) return 0;
  return Number(Math.min(1, sample / maxSample).toFixed(4));
}

export interface PrioritizationInput {
  opportunities: readonly Opportunity[];
  validation: RecommendationValidationSnapshot | null;
}

export interface PrioritizationResult {
  contract_version: typeof PRIORITIZATION_CONTRACT_VERSION;
  computed_at: string;
  weights: typeof PRIORITIZATION_WEIGHTS;
  ranked: PrioritizedOpportunity[];
  summary: {
    total: number;
    top_metric_id?: string;
    top_transition?: Opportunity["transition"];
    top_score?: number;
  };
}

/** Priorización pura — CV8.7. */
export function prioritizeOpportunities(input: PrioritizationInput): PrioritizationResult {
  const opps = input.opportunities;
  const confidenceByMetric = new Map<string, FamilyLearningSignal>();
  if (input.validation) {
    for (const f of input.validation.family_confidence) {
      confidenceByMetric.set(f.metric_id, f);
    }
  }
  const maxSample = opps.reduce((m, o) => Math.max(m, o.evidence.sample_size), 0);

  const scored = opps.map((o): PrioritizedOpportunity => {
    const fam = confidenceByMetric.get(o.metric_id);
    const learned = fam?.learned_confidence ?? DEFAULT_CONFIDENCE_WHEN_UNKNOWN;
    const reliability: PrioritizedOpportunity["confidence_reliability"] =
      fam?.reliability ?? "unknown";

    const jw = journeyWeight(o.transition);
    const eco = ecosystemBenefit(o);
    const impact = impactValue(o);
    const urgency = severityUrgency(o.severity);
    const reach = reachValue(o.evidence.sample_size, maxSample);

    const factors: PriorityFactor[] = [
      {
        key: "confidence",
        weight: PRIORITIZATION_WEIGHTS.confidence,
        value: Number(learned.toFixed(4)),
        contribution: Number((PRIORITIZATION_WEIGHTS.confidence * learned).toFixed(4)),
        explanation:
          reliability === "unknown"
            ? "Aún no hay recomendaciones anteriores de este tipo; se asume 50%."
            : reliability === "insufficient_data"
              ? `Pocas recomendaciones anteriores (${fam?.sample_size}); confianza provisional.`
              : `Las recomendaciones anteriores de este tipo acertaron ${(learned * 100).toFixed(0)}% de ${fam?.sample_size} veces (${reliabilityLabel(reliability)}).`,
      },
      {
        key: "impact",
        weight: PRIORITIZATION_WEIGHTS.impact,
        value: impact,
        contribution: Number((PRIORITIZATION_WEIGHTS.impact * impact).toFixed(4)),
        explanation: `Cambió ${(o.evidence.delta_relative * 100).toFixed(1)}% frente al periodo anterior (un cambio de 50% o más cuenta como máximo).`,
      },
      {
        key: "urgency",
        weight: PRIORITIZATION_WEIGHTS.urgency,
        value: urgency,
        contribution: Number((PRIORITIZATION_WEIGHTS.urgency * urgency).toFixed(4)),
        explanation: `Gravedad: ${SEVERITY_LABEL[o.severity]}.`,
      },
      {
        key: "reach",
        weight: PRIORITIZATION_WEIGHTS.reach,
        value: reach,
        contribution: Number((PRIORITIZATION_WEIGHTS.reach * reach).toFixed(4)),
        explanation: `${o.evidence.sample_size} personas involucradas (el hallazgo más grande tiene ${maxSample}).`,
      },
      {
        key: "journey",
        weight: PRIORITIZATION_WEIGHTS.journey,
        value: jw.value,
        contribution: Number((PRIORITIZATION_WEIGHTS.journey * jw.value).toFixed(4)),
        explanation: `Etapa: ${jw.label}. Los primeros pasos pesan más porque afectan a todos los siguientes.`,
      },
      {
        key: "ecosystem",
        weight: PRIORITIZATION_WEIGHTS.ecosystem,
        value: eco.value,
        contribution: Number((PRIORITIZATION_WEIGHTS.ecosystem * eco.value).toFixed(4)),
        explanation: `Beneficio para el destino: ${eco.label}.`,
      },
    ];

    const score = Number(factors.reduce((s, f) => s + f.contribution, 0).toFixed(4));

    const topFactors = [...factors]
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 2)
      .map((f) => factorLabel(f.key).toLowerCase())
      .join(" y ");

    const rationale = `Prioridad ${(score * 100).toFixed(0)} de 100, sobre todo por ${topFactors}. ${o.what_happens}`;

    const expected_effect =
      o.expected_kpi +
      (reliability === "reliable"
        ? ` · Recomendaciones parecidas acertaron ${(learned * 100).toFixed(0)}% de las veces.`
        : reliability === "learning"
          ? ` · Todavía aprendiendo de recomendaciones parecidas (${(learned * 100).toFixed(0)}%).`
          : reliability === "insufficient_data"
            ? " · Aún hay pocas recomendaciones parecidas para asegurarlo."
            : " · Es la primera recomendación de este tipo.");

    return {
      rank: 0,
      opportunity: o,
      score,
      factors,
      learned_confidence: Number(learned.toFixed(4)),
      confidence_reliability: reliability,
      rationale,
      expected_effect,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((s, i) => (s.rank = i + 1));

  const top = scored[0];
  return {
    contract_version: PRIORITIZATION_CONTRACT_VERSION,
    computed_at: new Date().toISOString(),
    weights: PRIORITIZATION_WEIGHTS,
    ranked: scored,
    summary: {
      total: scored.length,
      top_metric_id: top?.opportunity.metric_id,
      top_transition: top?.opportunity.transition,
      top_score: top?.score,
    },
  };
}
