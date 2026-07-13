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
      } else if (p.status === "opening_soon") {
        cards.push({
          id: `destination.hours:opening:${p.entityId}`,
          slot: "next",
          priority: 58,
          tone: "info",
          title: "Abre pronto",
          rationale: p.opensAt
            ? `Aún cerrado — abre a las ${p.opensAt}. Puedes acercarte para llegar en cuanto abra.`
            : `Aún cerrado — abre pronto.`,
          sources: ["destination_context"],
          at: s.at,
        });
      } else if (p.status === "closed_now" || p.status === "closed_today") {
        cards.push({
          id: `destination.hours:closed:${p.entityId}`,
          slot: "next",
          priority: p.status === "closed_today" ? 44 : 40,
          tone: "critical",
          title:
            p.status === "closed_today"
              ? "Cerrado hoy"
              : "Está cerrado ahora",
          rationale: p.opensAt
            ? `Reabre ${p.opensDayLabel ?? "próximamente"} ${p.opensAt}. Ajusta el orden de tu día.`
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
 * Traffic → convierte el TrafficSignalPayload normalizado (CV6.5.3) en
 * decisiones accionables. Auto-Hide: `on_time` con holgura amplia y sin
 * novedad relevante NO produce tarjeta.
 */
export const destinationTrafficDecisionContributor: DecisionContributor = {
  id: "destination.traffic",
  contribute(input): DecisionCard[] {
    const ctx = asResolved(input);
    const sigs = signalsOf<TrafficSignalPayload>(ctx, "traffic");
    const cards: DecisionCard[] = [];
    for (const sig of sigs) {
      const t = sig.payload;
      const dur = t.durationMinutes ?? null;
      const dist = t.distanceKm ?? null;
      const durTxt = dur != null ? `${dur} min` : "trayecto";
      const distTxt = dist != null ? ` (${dist.toFixed(1)} km)` : "";
      const deltaTxt =
        t.trafficDeltaMinutes != null && t.trafficDeltaMinutes > 0
          ? `, +${t.trafficDeltaMinutes} min por tráfico`
          : "";
      const originHint =
        t.originPrecision !== "device" ? ` · desde ${t.originLabel}` : "";
      const baseSources: DecisionCard["sources"] = [
        "destination_context",
        ...(t.originPrecision === "device"
          ? (["geolocation"] as const)
          : []),
      ];
      const navAction = {
        id: "navigate",
        label: "Iniciar navegación",
        intent: "navigate" as const,
      };

      switch (t.status) {
        case "leave_now":
          cards.push({
            id: `destination.traffic:leave-now:${t.destEntityId}`,
            slot: "now",
            priority: 90,
            tone: "warning",
            title: "Sal ahora",
            rationale: `${durTxt}${distTxt}${deltaTxt}${originHint}.`,
            primaryAction: navAction,
            sources: baseSources,
            at: sig.at,
          });
          break;
        case "leave_soon":
          cards.push({
            id: `destination.traffic:leave-soon:${t.destEntityId}`,
            slot: "next",
            priority: 75,
            tone: "info",
            title:
              t.minutesToLeave != null
                ? `Sal en ${t.minutesToLeave} min`
                : "Sal pronto",
            rationale: `${durTxt}${distTxt}${deltaTxt}${originHint}.`,
            primaryAction: navAction,
            sources: baseSources,
            at: sig.at,
          });
          break;
        case "delay_risk":
          cards.push({
            id: `destination.traffic:delay-risk:${t.destEntityId}`,
            slot: "next",
            priority: 70,
            tone: "warning",
            title: "Riesgo de retraso",
            rationale: `${durTxt}${deltaTxt}. Considera adelantar la salida o mover la actividad.`,
            primaryAction: navAction,
            sources: baseSources,
            at: sig.at,
          });
          break;
        case "likely_late":
          cards.push({
            id: `destination.traffic:likely-late:${t.destEntityId}`,
            slot: "now",
            priority: 92,
            tone: "critical",
            title: "Llegarías tarde",
            rationale: `${durTxt}${deltaTxt}. Reorganiza la actividad o avisa al lugar.`,
            primaryAction: navAction,
            sources: baseSources,
            at: sig.at,
          });
          break;
        case "on_time":
          // Sólo emitir si el tráfico añade tiempo relevante — de lo
          // contrario, silencio (Auto-Hide).
          if ((t.trafficDeltaMinutes ?? 0) >= 8) {
            cards.push({
              id: `destination.traffic:heavier:${t.destEntityId}`,
              slot: "next",
              priority: 45,
              tone: "info",
              title: "El tráfico aumentó",
              rationale: `${durTxt} (+${t.trafficDeltaMinutes} min respecto a lo habitual).`,
              primaryAction: navAction,
              sources: baseSources,
              at: sig.at,
            });
          }
          break;
        case "route_unavailable":
          cards.push({
            id: `destination.traffic:route-unavailable:${t.destEntityId}`,
            slot: "next",
            priority: 30,
            tone: "warning",
            title: "Ruta no disponible",
            rationale: `No pudimos calcular el trayecto hacia el próximo lugar${originHint}.`,
            sources: baseSources,
            at: sig.at,
          });
          break;
        case "traffic_unknown":
          // Auto-Hide.
          break;
      }
    }
    return cards;
  },
};

/** Bundle CV6.5.1 — aditivo a `CV6_2_BASE_CONTRIBUTORS`. */
export const CV6_5_DESTINATION_CONTRIBUTORS: DecisionContributor[] = [
  destinationWeatherDecisionContributor,
  destinationHoursDecisionContributor,
  destinationTrafficDecisionContributor,
];
