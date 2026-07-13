/**
 * CV6.4 · Destination Context Contributors — Contratos base.
 *
 * Política vinculante: `mem://policies/founder-destination-context-engine.md`.
 * Toda fuente de contexto del destino se integra como Contributor y
 * publica señales al Context Engine (canal `destination.*`). Ninguna
 * superficie consume proveedores directamente.
 *
 * Diseño aditivo: los IDs de señal (`weather`, `hours`, `traffic`, …)
 * son abiertos por convención. Sub-olas futuras registran nuevos IDs
 * sin refactorar consumidores.
 */

import type { DestinationContext } from "@/lib/traveler/live-day";

/** Familia canónica de señal. Abierta para futuros contribuyentes. */
export type DestinationSignalKind =
  | "weather"
  | "hours"
  | "traffic"
  // Reservados para sub-olas futuras (registro sin refactor):
  | "events"
  | "availability"
  | "closures"
  | "incidents"
  | "recommendations"
  | "civil_protection"
  | "occupancy"
  | "promotions"
  | "festivities"
  | "operational_alerts"
  | (string & {}); // extensible sin cambios de firma

/** Alcance espacial/entitativo al que aplica la señal. */
export interface DestinationSignalScope {
  region?: string;
  destination?: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  geo?: { lat: number; lon: number };
}

/** Explicabilidad — obligatoria (Explainable by Default). */
export interface DestinationSignalExplain {
  rationale: string;
  provider: string;
  url?: string;
}

/** Señal canónica publicada por un Contributor. */
export interface DestinationSignal<TPayload = unknown> {
  kind: DestinationSignalKind;
  scope: DestinationSignalScope;
  at: string;
  ttlMs: number;
  explain: DestinationSignalExplain;
  payload: TPayload;
}

/** Entrada estándar que reciben los Contributors al resolver. */
export interface DestinationContributorInput {
  scope: DestinationSignalScope;
  at: Date;
  locale?: string;
  only?: DestinationSignalKind[];
}

/**
 * Contrato de Contributor. Los Contributors son puros respecto al
 * contrato: reciben un scope + timestamp, devuelven señales. Su
 * implementación decide si consulta cache, red, DB o cómputo local.
 */
export interface DestinationContextContributor {
  id: string;
  kind: DestinationSignalKind;
  resolve(input: DestinationContributorInput): Promise<DestinationSignal[]>;
}

/**
 * Vista agregada consumida por superficies (Decision Center, Alux,
 * Mi Viaje, Concierge). Compatible con el tipo extensible
 * `DestinationContext` definido en `live-day.ts` (Founder Destination
 * Awareness).
 */
export interface ResolvedDestinationContext extends DestinationContext {
  signals: Record<string, DestinationSignal[]>;
  resolvedAt: string;
  contributors: string[];
}
