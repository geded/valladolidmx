/**
 * CV6.5.1 · Decision Center — Destination-driven Contributors.
 *
 * Consumen EXCLUSIVAMENTE `ResolvedDestinationContext` (compatible con
 * `DestinationContext` extensible). Toda correlación / priorización /
 * combinación entre señales vive aquí — nunca dentro de un
 * `DestinationContextContributor`.
 *
 * Guardrail vinculante:
 *   `mem://policies/founder-destination-contributors-guardrail.md`.
 *
 * Auto-Hide (Founder Experience First): si no hay señales relevantes,
 * un contribuyente devuelve `[]` y las superficies no renderizan nada.
 */

import type {
  DecisionCard,
  DecisionContributor,
  DecisionContributorInput,
} from "@/lib/traveler/decision-center";
import type {
  DestinationSignal,
  ResolvedDestinationContext,
} from "@/lib/traveler/destination-context";
import type { WeatherSignalPayload } from "@/lib/traveler/destination-context/contributors/weather";
import type { HoursSignalPayload } from "@/lib/traveler/destination-context/contributors/hours";
import type { TrafficSignalPayload } from "@/lib/traveler/destination-context/contributors/traffic";

function asResolved(
  input: DecisionContributorInput,
): ResolvedDestinationContext | null {
  const d = input.destination as ResolvedDestinationContext | undefined;
  if (!d || typeof d !== "object" || !("signals" in d)) return null;
  return d;
}

function signalsOf<T>(
  ctx: ResolvedDestinationContext | null,
  kind: string,
): DestinationSignal<T>[] {
  return ((ctx?.signals?.[kind] ?? []) as DestinationSignal<T>[]) || [];
}

/**
 * Weather → tarjeta de contexto/alerta.
 * Prioridad centralizada aquí (Guardrail): la señal sólo describe el
 * clima; la decisión ("prepárate") es responsabilidad del DC.
 */
export const destinationWeatherDecisionContributor: DecisionContributor = {
  id: "destination.weather",
  contribute(input): DecisionCard[] {
    const ctx = asResolved(input);
    const sigs = signalsOf<WeatherSignalPayload>(ctx, "weather");
    const sig = sigs[0];
    if (!sig) return [];
    const w = sig.payload;
    const rainy = w.rainChanceNext6h >= 60;
    if (!rainy) return [];
    return [
      {
        id: `destination.weather:rain`,
        slot: "next",
        priority: 55,
        tone: "warning",
        title: "Prepárate: probable lluvia",
        rationale: `${w.rainChanceNext6h}% de probabilidad de lluvia en las próximas 6h (${w.label}, ${w.tempC}°C).`,
        context: sig.explain.provider,
        sources: ["destination_context"],
        at: sig.at,
      },
    ];
  },
};

/**
 * Hours → si un negocio del scope cierra pronto o ya está cerrado,
 * emitir decisión accionable.
 */
export const destinationHoursDecisionContributor: DecisionContributor = {
  id: "destination.hours",
  contribute(input): DecisionCard[] {
    const ctx = asResolved(input);
    const sigs = signalsOf<HoursSignalPayload>(ctx, "hours");
    const cards: DecisionCard[] = [];
    for (const s of sigs) {
      const p = s.payload;
      if (p.status === "closing_soon") {
        cards.push({
          id: `destination.hours:closing:${p.entityId}`,
          slot: "now",
          priority: 72,
          tone: "warning",
          title: "Cierra pronto",
          rationale: p.closesAt
            ? `Este lugar cierra a las ${p.closesAt}. Considera acelerar tu visita.`
            : `Este lugar cierra pronto. Considera acelerar tu visita.`,
          sources: ["destination_context"],
          at: s.at,
        });
      } else if (p.status === "closed") {
        cards.push({
          id: `destination.hours:closed:${p.entityId}`,
          slot: "next",
          priority: 40,
          tone: "critical",
          title: "Está cerrado ahora",
          rationale: p.opensAt
            ? `Reabre a las ${p.opensAt}. Ajusta el orden de tu día.`
            : `Actualmente cerrado. Considera un plan alternativo.`,
          primaryAction: {
            id: "view_alternative",
            label: "Ver alternativas",
            intent: "view_alternative",
          },
          sources: ["destination_context"],
          at: s.at,
        });
      }
    }
    return cards;
  },
};

/**
 * Traffic → si el traslado al próximo ítem es largo, sugerir salir antes.
 */
export const destinationTrafficDecisionContributor: DecisionContributor = {
  id: "destination.traffic",
  contribute(input): DecisionCard[] {
    const ctx = asResolved(input);
    const sigs = signalsOf<TrafficSignalPayload>(ctx, "traffic");
    const sig = sigs[0];
    if (!sig) return [];
    const t = sig.payload;
    if (t.durationMinutes < 15) return [];
    return [
      {
        id: `destination.traffic:leave-earlier`,
        slot: "next",
        priority: t.durationMinutes >= 30 ? 78 : 50,
        tone: t.condition === "heavy" ? "warning" : "info",
        title: "Sal antes",
        rationale: `Traslado estimado ${t.durationMinutes} min (${t.distanceKm.toFixed(1)} km${t.condition !== "unknown" ? `, tráfico ${t.condition}` : ""}).`,
        primaryAction: {
          id: "navigate",
          label: "Iniciar navegación",
          intent: "navigate",
        },
        sources: ["destination_context", "geolocation"],
        at: sig.at,
      },
    ];
  },
};

/** Bundle CV6.5.1 — aditivo a `CV6_2_BASE_CONTRIBUTORS`. */
export const CV6_5_DESTINATION_CONTRIBUTORS: DecisionContributor[] = [
  destinationWeatherDecisionContributor,
  destinationHoursDecisionContributor,
  destinationTrafficDecisionContributor,
];
