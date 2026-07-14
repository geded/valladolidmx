/**
 * CV8.8 · Priorización por Segmento — Pure Module v1.0.0.
 *
 * Cruza `JourneySegmentSnapshot` (CV8.4) con `RecommendationValidationSnapshot`
 * (CV8.6) y produce hallazgos priorizados por segmento respetando:
 *   - Founder Ethical Segmentation Principle (MIN_SEGMENT_POPULATION=25, "Otros").
 *   - Founder Fair Opportunity Principle (CV8.8): 5 tipos de hallazgo, sesgo y
 *     explicación alternativa explícitos, equilibrio de factores.
 *   - Founder Journey State Principle: derivación total, cero persistencia.
 *   - Founder Decision Prioritization Principle (CV8.7): pesos auditables.
 *
 * Función pura, sin red, sin snapshots, sin identidades individuales.
 */
import type {
  JourneySegmentSnapshot,
  SegmentBucket,
  SegmentDimension,
} from "./segments.functions";
import type { RecommendationValidationSnapshot } from "./recommendations.functions";

export const SEGMENT_PRIORITIZATION_CONTRACT_VERSION = "1.0.0" as const;

/** Pesos oficiales auditables — suma = 1.0. Nunca sólo revenue/conversión. */
export const SEGMENT_PRIORITIZATION_WEIGHTS = {
  impact: 0.2,
  confidence: 0.15,
  urgency: 0.15,
  reach: 0.15,
  friction: 0.15,
  traveler_benefit: 0.1,
  ecosystem_benefit: 0.1,
} as const;

/** Umbrales explicables — protegen contra sobre-reacción y sesgo. */
export const COMMERCIAL_DELTA_THRESHOLD = 0.05 as const; // +5% JPR vs baseline
export const INCLUSION_DELTA_THRESHOLD = -0.05 as const; // -5% JPR vs baseline
export const ABANDONMENT_DELTA_THRESHOLD = -0.2 as const; // -20% JPR vs baseline
export const EXPERIENCE_INTENT_RATIO = 0.25 as const; // ≥25% intent/active

export type SegmentFindingType =
  | "commercial_opportunity"
  | "experience_opportunity"
  | "inclusion_opportunity"
  | "abandonment_risk"
  | "insufficient_data";

export type BiasRisk = "low" | "medium" | "high";

export interface SegmentFactor {
  key: keyof typeof SEGMENT_PRIORITIZATION_WEIGHTS;
  weight: number;
  value: number;
  contribution: number;
  explanation: string;
}

export interface SegmentFinding {
  rank: number;
  dimension: SegmentDimension;
  segment_key: string;
  segment_label: string;
  type: SegmentFindingType;
  score: number; // ∈ [0,1]
  sample_size: number;
  jpr: number;
  baseline_jpr: number;
  delta_vs_baseline: number;
  confidence: "low" | "medium" | "high" | "unknown";
  expected_impact: string;
  bias_risk: BiasRisk;
  alternative_explanations: readonly string[];
  recommended_action: string;
  rationale: string;
  factors: SegmentFactor[];
}

export interface SegmentPrioritizationInput {
  segments: readonly JourneySegmentSnapshot[];
  validation: RecommendationValidationSnapshot | null;
}

export interface SegmentPrioritizationResult {
  contract_version: typeof SEGMENT_PRIORITIZATION_CONTRACT_VERSION;
  computed_at: string;
  weights: typeof SEGMENT_PRIORITIZATION_WEIGHTS;
  min_population: number;
  findings: SegmentFinding[];
  matrix: SegmentFinding[]; // alias — matriz Segmento → Hallazgo → Prioridad
  summary: {
    total: number;
    by_type: Record<SegmentFindingType, number>;
  };
}

const DIMENSION_LABEL: Record<SegmentDimension, string> = {
  locale: "Idioma",
  destination: "Destino",
  capability: "Capability",
  country: "País",
  channel: "Canal",
  device: "Dispositivo",
};

function averageLearnedConfidence(
  v: RecommendationValidationSnapshot | null,
): { value: number; reliability: "unknown" | "insufficient_data" | "learning" | "reliable" } {
  if (!v || v.family_confidence.length === 0) return { value: 0.5, reliability: "unknown" };
  const reliable = v.family_confidence.filter((f) => f.reliability !== "insufficient_data");
  const src = reliable.length > 0 ? reliable : v.family_confidence;
  const mean = src.reduce((s, f) => s + f.learned_confidence, 0) / src.length;
  const rel = reliable.length === 0 ? "insufficient_data" : reliable.length === v.family_confidence.length ? "reliable" : "learning";
  return { value: Number(mean.toFixed(4)), reliability: rel };
}

function confidenceBand(sample: number): SegmentFinding["confidence"] {
  if (sample >= 300) return "high";
  if (sample >= 75) return "medium";
  return "low";
}

function biasFor(sample: number, minPop: number): BiasRisk {
  if (sample < minPop) return "high";
  if (sample < minPop * 2) return "medium";
  return "low";
}

function classify(
  b: SegmentBucket,
  baselineJpr: number,
  minPop: number,
): SegmentFindingType {
  if (b.suppressed || b.active_subjects < minPop) return "insufficient_data";
  const delta = b.jpr_delta_vs_baseline;
  if (delta <= ABANDONMENT_DELTA_THRESHOLD) return "abandonment_risk";
  if (delta <= INCLUSION_DELTA_THRESHOLD) return "inclusion_opportunity";
  if (delta >= COMMERCIAL_DELTA_THRESHOLD) return "commercial_opportunity";
  const intentRatio =
    b.active_subjects === 0 ? 0 : b.intent_signals / b.active_subjects;
  if (intentRatio >= EXPERIENCE_INTENT_RATIO && b.jpr <= baselineJpr) {
    return "experience_opportunity";
  }
  // Sin señal accionable — dejamos como insufficient para no sobre-priorizar ruido.
  return "insufficient_data";
}

function urgencyFor(t: SegmentFindingType, delta: number): number {
  if (t === "abandonment_risk") return 1.0;
  if (t === "inclusion_opportunity") return 0.8;
  if (t === "experience_opportunity") return 0.6;
  if (t === "commercial_opportunity") return Math.min(1, 0.4 + Math.abs(delta));
  return 0.1;
}

function travelerBenefit(t: SegmentFindingType): { value: number; label: string } {
  switch (t) {
    case "inclusion_opportunity":
      return { value: 1.0, label: "Reduce barreras del viajero (idioma/accesibilidad/atención)." };
    case "experience_opportunity":
      return { value: 0.9, label: "Mejora la experiencia de un grupo que ya mostró intención." };
    case "abandonment_risk":
      return { value: 0.7, label: "Recupera confianza de viajeros que estaban avanzando." };
    case "commercial_opportunity":
      return { value: 0.5, label: "Amplifica un grupo satisfecho sin sacrificar experiencia." };
    default:
      return { value: 0.2, label: "Beneficio directo limitado sin más evidencia." };
  }
}

function ecosystemBenefit(dim: SegmentDimension, t: SegmentFindingType): { value: number; label: string } {
  if (dim === "destination") return { value: 1.0, label: "Impacta directamente al ecosistema del destino." };
  if (dim === "capability") return { value: 0.8, label: "Fortalece una capacidad transversal del ecosistema." };
  if (dim === "locale" && t === "inclusion_opportunity") {
    return { value: 0.9, label: "Expande cobertura lingüística del ecosistema." };
  }
  if (dim === "locale") return { value: 0.5, label: "Optimiza cobertura lingüística existente." };
  return { value: 0.4, label: "Beneficio ecosistémico moderado." };
}

function alternativeExplanationsFor(t: SegmentFindingType, dim: SegmentDimension): string[] {
  const shared = [
    "Cambios en el mix de tráfico durante la ventana.",
    "Estacionalidad o eventos externos no controlados por el producto.",
  ];
  if (t === "abandonment_risk" || t === "inclusion_opportunity") {
    return [
      dim === "locale"
        ? "Contenido incompleto o mal traducido en este idioma."
        : "Contenido, precio o disponibilidad no adecuados al grupo.",
      "Fricción de UX, accesibilidad o desempeño en este contexto.",
      "Baja confianza (falta de reseñas, verificación o atención).",
      "Canal de adquisición con expectativas mal calibradas.",
      ...shared,
    ];
  }
  if (t === "experience_opportunity") {
    return [
      "El grupo muestra intención pero encuentra fricción para reservar/planear.",
      "Falta información clave (precio, disponibilidad, cómo llegar).",
      "Selección de oferta insuficiente para su perfil.",
      ...shared,
    ];
  }
  if (t === "commercial_opportunity") {
    return [
      "Composición del segmento particularmente favorable esta ventana.",
      "Campaña reciente amplifica el efecto observado.",
      ...shared,
    ];
  }
  return shared;
}

function recommendedActionFor(t: SegmentFindingType, dim: SegmentDimension, label: string): string {
  switch (t) {
    case "commercial_opportunity":
      return `Amplificar oferta y visibilidad para ${DIMENSION_LABEL[dim].toLowerCase()} "${label}" sin degradar la experiencia de otros grupos.`;
    case "experience_opportunity":
      return `Reducir fricción de progresión (información, precio, disponibilidad, atención) para ${DIMENSION_LABEL[dim].toLowerCase()} "${label}".`;
    case "inclusion_opportunity":
      return `Auditar barreras (idioma, accesibilidad, confianza, canal, atención) antes de asumir menor interés en ${DIMENSION_LABEL[dim].toLowerCase()} "${label}".`;
    case "abandonment_risk":
      return `Intervenir de inmediato en ${DIMENSION_LABEL[dim].toLowerCase()} "${label}": diagnóstico de causa raíz y plan de recuperación.`;
    default:
      return `Recolectar más evidencia antes de decidir sobre ${DIMENSION_LABEL[dim].toLowerCase()} "${label}".`;
  }
}

function expectedImpactFor(t: SegmentFindingType, delta: number, sample: number): string {
  const pct = Math.abs(delta) * 100;
  if (t === "commercial_opportunity") {
    return `Si el efecto se sostiene, este segmento aporta ~${pct.toFixed(0)}% más avance vs baseline sobre n=${sample}.`;
  }
  if (t === "abandonment_risk") {
    return `Sin intervención, se pierden hasta ~${pct.toFixed(0)}% de avance vs baseline sobre n=${sample}.`;
  }
  if (t === "inclusion_opportunity") {
    return `Cerrar la brecha recuperaría ~${pct.toFixed(0)}% de progresión sobre n=${sample} viajeros.`;
  }
  if (t === "experience_opportunity") {
    return `Reducir fricción convertiría intención observada en avance para n=${sample}.`;
  }
  return "Impacto no determinable — evidencia insuficiente.";
}

export function prioritizeSegments(
  input: SegmentPrioritizationInput,
): SegmentPrioritizationResult {
  const minPop =
    input.segments[0]?.min_population ?? 25;
  const confAvg = averageLearnedConfidence(input.validation);

  const maxSample = input.segments.reduce((m, s) => {
    const localMax = s.buckets.reduce((mm, b) => Math.max(mm, b.active_subjects), 0);
    return Math.max(m, localMax);
  }, 0);

  const findings: SegmentFinding[] = [];

  for (const snap of input.segments) {
    if (snap.status !== "ok") continue;
    const baselineJpr = snap.baseline.jpr;

    const consider = (b: SegmentBucket, forcedType?: SegmentFindingType) => {
      const type = forcedType ?? classify(b, baselineJpr, minPop);
      const delta = b.jpr_delta_vs_baseline;

      // Métricas normalizadas ∈ [0,1]
      const impact = Number(Math.min(1, Math.abs(delta) / 0.5).toFixed(4));
      const urgency = Number(urgencyFor(type, delta).toFixed(4));
      const reach = maxSample === 0 ? 0 : Number(Math.min(1, b.active_subjects / maxSample).toFixed(4));
      const friction = delta < 0 ? Number(Math.min(1, Math.abs(delta) / 0.5).toFixed(4)) : 0;
      const trav = travelerBenefit(type);
      const eco = ecosystemBenefit(snap.dimension, type);

      const factors: SegmentFactor[] = [
        {
          key: "impact",
          weight: SEGMENT_PRIORITIZATION_WEIGHTS.impact,
          value: impact,
          contribution: Number((SEGMENT_PRIORITIZATION_WEIGHTS.impact * impact).toFixed(4)),
          explanation: `Δ JPR ${(delta * 100).toFixed(1)}% vs baseline (saturación en 50%).`,
        },
        {
          key: "confidence",
          weight: SEGMENT_PRIORITIZATION_WEIGHTS.confidence,
          value: Number(confAvg.value.toFixed(4)),
          contribution: Number((SEGMENT_PRIORITIZATION_WEIGHTS.confidence * confAvg.value).toFixed(4)),
          explanation:
            confAvg.reliability === "unknown"
              ? "Sin validación previa suficiente — se usa 0.5 por defecto (CV8.6)."
              : `Confianza aprendida promedio ${(confAvg.value * 100).toFixed(0)}% (${confAvg.reliability}) desde CV8.6.`,
        },
        {
          key: "urgency",
          weight: SEGMENT_PRIORITIZATION_WEIGHTS.urgency,
          value: urgency,
          contribution: Number((SEGMENT_PRIORITIZATION_WEIGHTS.urgency * urgency).toFixed(4)),
          explanation: `Tipo "${type}" define urgencia; se pondera magnitud del delta.`,
        },
        {
          key: "reach",
          weight: SEGMENT_PRIORITIZATION_WEIGHTS.reach,
          value: reach,
          contribution: Number((SEGMENT_PRIORITIZATION_WEIGHTS.reach * reach).toFixed(4)),
          explanation: `n=${b.active_subjects} sobre máximo observado n=${maxSample}.`,
        },
        {
          key: "friction",
          weight: SEGMENT_PRIORITIZATION_WEIGHTS.friction,
          value: friction,
          contribution: Number((SEGMENT_PRIORITIZATION_WEIGHTS.friction * friction).toFixed(4)),
          explanation:
            friction === 0
              ? "Sin fricción detectada (delta no negativo)."
              : `Fricción detectada por delta negativo ${(delta * 100).toFixed(1)}%.`,
        },
        {
          key: "traveler_benefit",
          weight: SEGMENT_PRIORITIZATION_WEIGHTS.traveler_benefit,
          value: trav.value,
          contribution: Number((SEGMENT_PRIORITIZATION_WEIGHTS.traveler_benefit * trav.value).toFixed(4)),
          explanation: trav.label,
        },
        {
          key: "ecosystem_benefit",
          weight: SEGMENT_PRIORITIZATION_WEIGHTS.ecosystem_benefit,
          value: eco.value,
          contribution: Number((SEGMENT_PRIORITIZATION_WEIGHTS.ecosystem_benefit * eco.value).toFixed(4)),
          explanation: eco.label,
        },
      ];

      const score =
        type === "insufficient_data"
          ? 0
          : Number(factors.reduce((s, f) => s + f.contribution, 0).toFixed(4));

      const bias = biasFor(b.active_subjects, minPop);
      const conf = b.suppressed ? "unknown" : confidenceBand(b.active_subjects);

      const topFactors = [...factors]
        .sort((x, y) => y.contribution - x.contribution)
        .slice(0, 2)
        .map((f) => f.key)
        .join(" + ");

      const rationale =
        type === "insufficient_data"
          ? `Muestra insuficiente (n=${b.active_subjects} < ${minPop}) — se reporta pero no se prioriza.`
          : `Score ${(score * 100).toFixed(0)}/100 — impulsado por ${topFactors}. Tipo: ${type.replace(/_/g, " ")}.`;

      findings.push({
        rank: 0,
        dimension: snap.dimension,
        segment_key: b.key,
        segment_label: b.label,
        type,
        score,
        sample_size: b.active_subjects,
        jpr: b.jpr,
        baseline_jpr: baselineJpr,
        delta_vs_baseline: delta,
        confidence: conf,
        expected_impact: expectedImpactFor(type, delta, b.active_subjects),
        bias_risk: bias,
        alternative_explanations: alternativeExplanationsFor(type, snap.dimension),
        recommended_action: recommendedActionFor(type, snap.dimension, b.label),
        rationale,
        factors,
      });
    };

    for (const b of snap.buckets) consider(b);
    if (snap.others) consider(snap.others, "insufficient_data");
  }

  // Orden: primero por tipo (accionables antes que insufficient_data), luego score.
  const typeOrder: Record<SegmentFindingType, number> = {
    abandonment_risk: 0,
    inclusion_opportunity: 1,
    experience_opportunity: 2,
    commercial_opportunity: 3,
    insufficient_data: 4,
  };
  findings.sort((a, b) => {
    const t = typeOrder[a.type] - typeOrder[b.type];
    if (t !== 0) return t;
    return b.score - a.score;
  });
  findings.forEach((f, i) => (f.rank = i + 1));

  const by_type: Record<SegmentFindingType, number> = {
    commercial_opportunity: 0,
    experience_opportunity: 0,
    inclusion_opportunity: 0,
    abandonment_risk: 0,
    insufficient_data: 0,
  };
  for (const f of findings) by_type[f.type] += 1;

  return {
    contract_version: SEGMENT_PRIORITIZATION_CONTRACT_VERSION,
    computed_at: new Date().toISOString(),
    weights: SEGMENT_PRIORITIZATION_WEIGHTS,
    min_population: minPop,
    findings,
    matrix: findings,
    summary: { total: findings.length, by_type },
  };
}