/**
 * CV6.5.1 · Server Function — Resolve Traveler Destination Context.
 *
 * Compone `ResolvedDestinationContext` para el viajero, orquestando el
 * registry de Destination Context Contributors. Consumido por
 * superficies (Now·Next·Later Decision Center) vía TanStack Query.
 *
 * Guardrail vinculante:
 *   - Los Contributors son independientes y sólo emiten señales
 *     normalizadas.
 *   - La correlación / priorización vive en el Decision Center.
 *   - Los consumidores acceden EXCLUSIVAMENTE a `ResolvedDestinationContext`.
 *
 * CV6.5.1 registra efectivamente el `weatherContributor` (Open-Meteo,
 * server-only). `hoursContributor` (CMS) y `trafficContributor`
 * (Google Maps) quedan registrados con firma estable — wiring efectivo
 * en CV6.5.2 / CV6.5.3.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { DestinationSignal } from "@/lib/traveler/destination-context";

/** Payload serializable devuelto al cliente. */
export interface TravelerDestinationContextPayload {
  signals: Record<string, DestinationSignal[]>;
  resolvedAt: string;
  contributors: string[];
}

const InputSchema = z.object({
  geo: z
    .object({
      lat: z.number().gte(-90).lte(90),
      lon: z.number().gte(-180).lte(180),
    })
    .nullable()
    .optional(),
  destination: z.string().max(120).nullable().optional(),
  locale: z.string().max(10).optional(),
});

export const resolveTravelerDestinationContext = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<TravelerDestinationContextPayload> => {
    const mod = await import("@/lib/traveler/destination-context");
    // Registro idempotente por ID (registry es un Map en módulo cargado
    // una vez por worker). Contributors independientes — sin
    // dependencias cruzadas (Guardrail).
    mod.registerDestinationContributor(mod.weatherContributor);
    mod.registerDestinationContributor(mod.hoursContributor);
    mod.registerDestinationContributor(mod.trafficContributor);

    const resolved = await mod.resolveDestinationContext({
      scope: {
        destination: data.destination ?? undefined,
        geo: data.geo ?? undefined,
      },
      at: new Date(),
      locale: data.locale,
    });
    return {
      signals: resolved.signals,
      resolvedAt: resolved.resolvedAt,
      contributors: resolved.contributors,
    };
  });
