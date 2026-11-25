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

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

/** Señal serializable (payload libre JSON). */
export interface SerializableDestinationSignal {
  kind: string;
  scope: { [k: string]: JsonValue };
  at: string;
  ttlMs: number;
  explain: { rationale: string; provider: string; url?: string };
  payload: { [k: string]: JsonValue };
}

/** Payload serializable devuelto al cliente. */
export interface TravelerDestinationContextPayload {
  signals: { [kind: string]: SerializableDestinationSignal[] };
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
  entities: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        type: z.string().min(1).max(32),
        timezone: z.string().max(64).optional(),
        role: z.enum(["current", "next", "later", "previous"]).optional(),
        geo: z
          .object({
            lat: z.number().gte(-90).lte(90),
            lon: z.number().gte(-180).lte(180),
          })
          .optional(),
      }),
    )
    .max(50)
    .optional(),
  traffic: z
    .object({
      origin: z
        .object({
          geo: z
            .object({
              lat: z.number().gte(-90).lte(90),
              lon: z.number().gte(-180).lte(180),
            })
            .optional(),
          label: z.string().max(80).optional(),
          precision: z
            .enum(["device", "hotel", "previous_activity", "destination_center", "unknown"])
            .optional(),
        })
        .optional(),
      arriveBy: z.string().max(40).optional(),
      mode: z.enum(["DRIVE", "WALK", "BICYCLE", "TWO_WHEELER"]).optional(),
    })
    .optional(),
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

    // Rutas de tráfico (servicio de pago): sólo dentro de la península y con cupo por visitante.
    let traffic = data.traffic ?? undefined;
    if (traffic) {
      const inBox = (g?: { lat: number; lon: number }) =>
        !g || (g.lat >= 17 && g.lat <= 22.5 && g.lon >= -92.5 && g.lon <= -86);
      const t = traffic as { origin?: { geo?: { lat: number; lon: number } }; destination?: { geo?: { lat: number; lon: number } } };
      if (!inBox(t.origin?.geo) || !inBox(t.destination?.geo)) {
        traffic = undefined;
      } else {
        try {
          const { enforcePublicQuota } = await import("@/lib/security/public-quota.server");
          await enforcePublicQuota("traveler.traffic", { perMinute: 10, perHour: 120 });
        } catch {
          traffic = undefined;
        }
      }
    }

    // Horarios: sólo de empresas publicadas.
    let entities = data.entities ?? undefined;
    if (entities?.length) {
      const bizIds = entities.filter((e) => e.type === "business").map((e) => e.id);
      let allowed = new Set<string>();
      if (bizIds.length) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: pub } = await supabaseAdmin
          .from("businesses")
          .select("id")
          .in("id", bizIds)
          .eq("status", "published");
        allowed = new Set((pub ?? []).map((r: { id: string }) => r.id));
      }
      entities = entities.filter((e) => e.type !== "business" || allowed.has(e.id));
    }

    const resolved = await mod.resolveDestinationContext({
      scope: {
        destination: data.destination ?? undefined,
        geo: data.geo ?? undefined,
        entities,
        traffic,
      },
      at: new Date(),
      locale: data.locale,
    });
    return JSON.parse(
      JSON.stringify({
        signals: resolved.signals,
        resolvedAt: resolved.resolvedAt,
        contributors: resolved.contributors,
      }),
    ) as TravelerDestinationContextPayload;
  });
