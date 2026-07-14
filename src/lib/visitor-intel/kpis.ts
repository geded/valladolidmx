/**
 * CV8.0 · Journey Contracts — KPI Contract v1.0.0.
 *
 * Cada KPI declarado aquí cumple simultáneamente:
 *  - Founder Visitor Intelligence Principle (mide personas/decisiones/evolución).
 *  - Founder Journey Optimization Principle (atado a una transición del Journey).
 *  - Regla de Accionabilidad (declara qué decisión permite tomar).
 *
 * Prohibido registrar KPIs que no cumplan estas 3 condiciones. Métricas de
 * vanidad (pageviews, sesiones, bounce) sólo se aceptan como diagnóstico
 * secundario y no se listan aquí.
 */
import type { JourneyTransitionId } from "./journey";

export interface KpiDefinition {
  id: string;
  /** Métrica North Star o secundaria. */
  tier: "north_star" | "secondary" | "counterweight";
  /** Transición del Journey optimizada (obligatorio para tier north_star/secondary). */
  transition: JourneyTransitionId | "aggregate";
  /** Descripción operativa. */
  description: string;
  /** Regla de Accionabilidad — decisión concreta que permite tomar. */
  actionable_decision: string;
  /** Fórmula/definición (referencial — no ejecuta cálculo aquí). */
  formula: string;
  /** Segregación mínima obligatoria. */
  segments: readonly ("trust_level" | "destination" | "stage" | "capability")[];
  /** Frecuencia de refresco esperada. */
  refresh: "realtime" | "hourly" | "daily";
}

export const KPI_CATALOG: readonly KpiDefinition[] = [
  // North Star — Journey Progression Rate 30d
  {
    id: "JPR_30D",
    tier: "north_star",
    transition: "aggregate",
    description:
      "Proporción de visitantes que avanzaron ≥1 etapa del Journey en los últimos 30 días.",
    actionable_decision:
      "Priorizar inversión en las transiciones con menor progresión relativa al benchmark del trimestre.",
    formula: "count(distinct subject_id con transition en 30d) / count(distinct subject_id activo en 30d)",
    segments: ["trust_level", "destination", "stage"],
    refresh: "daily",
  },
  // Secundarias — una por transición canónica
  {
    id: "T1_conversion",
    tier: "secondary",
    transition: "T1_stranger_to_anonymous",
    description: "Tasa de conversión de impresión externa a primera sesión.",
    actionable_decision: "Ajustar canales/landing pages con menor conversión.",
    formula: "count(anonymous_started) / count(external_impression)",
    segments: ["capability", "destination"],
    refresh: "daily",
  },
  {
    id: "T2_conversion",
    tier: "secondary",
    transition: "T2_anonymous_to_identified",
    description: "Tasa de identificación (registro/sign-in) tras primera sesión.",
    actionable_decision: "Ajustar momentos de valor (AC1.4) con menor aceptación.",
    formula: "count(identified) / count(anonymous_eligible)",
    segments: ["capability", "stage"],
    refresh: "daily",
  },
  {
    id: "T4_conversion",
    tier: "secondary",
    transition: "T4_explorer_to_interested",
    description: "Tasa de captura de primera señal de intención.",
    actionable_decision: "Repriorizar surfaces/recomendaciones que producen menos intención.",
    formula: "count(first_intent_signal) / count(explorer)",
    segments: ["capability", "destination"],
    refresh: "daily",
  },
  {
    id: "T5_conversion",
    tier: "secondary",
    transition: "T5_interested_to_travel_plan",
    description: "Tasa de creación de Travel Plan con ≥1 item real.",
    actionable_decision: "Optimizar el Bridge Alux↔Plan cuando esta transición se degrada.",
    formula: "count(plan_created) / count(interested)",
    segments: ["capability", "stage"],
    refresh: "daily",
  },
  {
    id: "T6_conversion",
    tier: "secondary",
    transition: "T6_travel_plan_to_concierge",
    description: "Tasa de promoción de Plan a caso Concierge.",
    actionable_decision: "Ajustar Alux Proposal / CTA cuando la promoción baja del benchmark.",
    formula: "count(promoted_to_case) / count(travel_plan)",
    segments: ["capability", "destination"],
    refresh: "daily",
  },
  {
    id: "T7_conversion",
    tier: "secondary",
    transition: "T7_concierge_to_reservation",
    description: "Tasa de conversión Concierge → Reserva confirmada.",
    actionable_decision: "Refinar propuestas/checkout narrativo que no cierran.",
    formula: "count(order_confirmed) / count(concierge_case)",
    segments: ["capability"],
    refresh: "hourly",
  },
  {
    id: "T9_conversion",
    tier: "secondary",
    transition: "T9_traveler_to_ambassador",
    description: "Tasa de conversión Viajero → Embajador (post-viaje).",
    actionable_decision: "Priorizar experiencias/post-trip loops que generan mayor advocacy.",
    formula: "count(advocacy_signal) / count(trip_completed)",
    segments: ["destination", "capability"],
    refresh: "daily",
  },
  // Contrapesos — Confianza / Continuidad / CSAT
  {
    id: "TRUST_INDEX",
    tier: "counterweight",
    transition: "aggregate",
    description: "Índice compuesto de confianza percibida a lo largo de Progressive Trust.",
    actionable_decision: "Bloquear/revisar cambios que degraden confianza aunque suban conversión.",
    formula: "compuesto(retencion, reversibilidad_usada, quejas_privacidad)",
    segments: ["trust_level"],
    refresh: "daily",
  },
  {
    id: "CONTINUITY_RATE",
    tier: "counterweight",
    transition: "aggregate",
    description: "Proporción de visitantes que regresan y reconocen su viaje (First Five Seconds).",
    actionable_decision: "Ajustar continuidad cuando cae — es predictor de conversión T2/T5.",
    formula: "count(return_recognized) / count(return_total)",
    segments: ["trust_level"],
    refresh: "daily",
  },
  {
    id: "CSAT_ONSITE",
    tier: "counterweight",
    transition: "aggregate",
    description: "Satisfacción reportada durante y después del viaje.",
    actionable_decision: "Suspender promoción de proveedores/experiencias con CSAT bajo sostenido.",
    formula: "avg(csat_score) por experiencia/destino en ventana 30d",
    segments: ["destination", "capability"],
    refresh: "daily",
  },
];

/** Guardrail: falla en tiempo de compilación si se registra un KPI sin `actionable_decision`. */
export function assertActionable(kpi: KpiDefinition): asserts kpi is KpiDefinition {
  if (!kpi.actionable_decision || kpi.actionable_decision.trim().length === 0) {
    throw new Error(
      `KPI ${kpi.id} viola Regla de Accionabilidad: falta actionable_decision.`,
    );
  }
}
