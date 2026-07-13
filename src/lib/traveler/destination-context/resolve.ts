/**
 * CV6.4 · Destination Context Resolver.
 *
 * Compone `ResolvedDestinationContext` a partir del registry de
 * Contributors. Publica el resultado al Context Engine
 * (`publishResolvedContext`-like via `destination.signals`) para que
 * consumidores globales (Alux, Decision Center, Mi Viaje, Concierge)
 * lo lean sin acoplarse al proveedor.
 *
 * NOTA CV6.4: la publicación al Context Engine se realiza mediante el
 * bus de eventos existente (`emitContextEngineEvent`) — no se
 * introducen nuevos módulos de transporte. Sub-olas futuras pueden
 * añadir un canal dedicado sin refactor de firmas.
 */
import { emitContextEngineEvent } from "@/lib/context-engine/events";
import {
  listDestinationContributors,
  getContributorsByKind,
} from "./registry";
import type {
  DestinationContributorInput,
  DestinationSignal,
  ResolvedDestinationContext,
} from "./types";

function notExpired(sig: DestinationSignal, now: number): boolean {
  const at = new Date(sig.at).getTime();
  if (!Number.isFinite(at)) return false;
  return now - at <= sig.ttlMs;
}

export async function resolveDestinationContext(
  input: DestinationContributorInput,
): Promise<ResolvedDestinationContext> {
  const contributors = input.only?.length
    ? input.only.flatMap((k) => getContributorsByKind(k))
    : listDestinationContributors();

  const results = await Promise.allSettled(
    contributors.map(async (c) => ({ id: c.id, sigs: await c.resolve(input) })),
  );

  const now = input.at.getTime();
  const signals: Record<string, DestinationSignal[]> = {};
  const ids: string[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    ids.push(r.value.id);
    for (const sig of r.value.sigs) {
      if (!notExpired(sig, now)) continue;
      (signals[sig.kind] ??= []).push(sig);
    }
  }

  const resolved: ResolvedDestinationContext = {
    signals,
    resolvedAt: input.at.toISOString(),
    contributors: ids,
    // Compat con DestinationContext extensible (CV6.1): exponer accesos
    // directos si un contribuyente aporta señales típicas.
    weather: signals.weather?.[0]?.payload,
    hours: signals.hours,
    events: signals.events,
    traffic: signals.traffic?.[0]?.payload,
    availability: signals.availability,
    incidents: signals.incidents,
    recommendations: signals.recommendations,
  };

  // Publicación al Context Engine (canal `destination.*` — reutilizando
  // el bus existente). Consumidores globales pueden suscribirse.
  emitContextEngineEvent("context_engine.resolved", {
    kind: "destination",
    at: now,
    inheritedSlots: Object.keys(signals),
  });

  return resolved;
}
