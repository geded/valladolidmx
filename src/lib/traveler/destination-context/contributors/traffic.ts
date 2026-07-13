/**
 * CV6.4 · Traffic Contributor (stub arquitectónico).
 *
 * Publica la señal `traffic` (tiempo de traslado estimado hacia el
 * próximo ítem del plan) usando la integración Google Maps ya existente
 * en el proyecto. Firma estable; wiring efectivo en sub-olas siguientes.
 */
import type {
  DestinationContextContributor,
  DestinationSignal,
} from "../types";

export interface TrafficSignalPayload {
  fromGeo: { lat: number; lon: number };
  toGeo: { lat: number; lon: number };
  durationMinutes: number;
  distanceKm: number;
  condition: "light" | "moderate" | "heavy" | "unknown";
}

const TTL_MS = 5 * 60 * 1000;

export const trafficContributor: DestinationContextContributor = {
  id: "destination.traffic.google-maps",
  kind: "traffic",
  async resolve(_input) {
    void _input;
    void TTL_MS;
    return [] as DestinationSignal<TrafficSignalPayload>[];
  },
};
