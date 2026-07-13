/**
 * CV6.5.3 · Traffic Contributor (Google Maps Routes API).
 *
 * Publica la señal `traffic` (una por cálculo de trayecto) usando la
 * ÚNICA puerta cartográfica server-side existente (`computeRouteInternal`
 * → gateway Lovable). Puro respecto al Guardrail: sólo genera señales
 * normalizadas; toda decisión visible vive en el Decision Center.
 *
 * Consentimiento: si `scope.geo` está presente proviene de una decisión
 * explícita del cliente (superficie ha solicitado geolocalización). Si
 * no, degradamos al origen del itinerario / hotel / actividad anterior
 * / centro del destino declarado en `scope.traffic.origin` y marcamos
 * menor precisión y confianza.
 */
import type {
  DestinationContextContributor,
  DestinationSignal,
} from "../types";
import {
  evaluateTrafficStatus,
  type TrafficStatus,
} from "@/lib/traveler/traffic-status";
import type { TravelMode } from "@/lib/maps/routes.server";

export interface TrafficSignalPayload {
  destEntityId: string;
  destEntityType: string;
  originGeo: { lat: number; lon: number };
  destinationGeo: { lat: number; lon: number };
  originLabel: string;
  originPrecision:
    | "device"
    | "hotel"
    | "previous_activity"
    | "destination_center"
    | "unknown";
  mode: TravelMode;
  distanceKm: number | null;
  durationMinutes: number | null;
  baseDurationMinutes: number | null;
  trafficDeltaMinutes: number | null;
  etaISO: string | null;
  arriveByISO: string | null;
  bufferMinutes: number | null;
  minutesToLeave: number | null;
  status: TrafficStatus;
  confidence: "high" | "medium" | "low";
}

const TTL_MS = 3 * 60 * 1000;

export const trafficContributor: DestinationContextContributor = {
  id: "destination.traffic.google-maps",
  kind: "traffic",
  async resolve({ scope, at }) {
    const trafficReq = scope.traffic;
    const entities = scope.entities ?? [];
    const nextEnt =
      entities.find((e) => e.role === "next") ??
      entities.find((e) => e.role !== "previous");
    if (!nextEnt) return [];

    // Origen (consentimiento + fallbacks documentados).
    const originGeo =
      trafficReq?.origin?.geo ?? scope.geo ?? null;
    const originLabel =
      trafficReq?.origin?.label ??
      (scope.geo ? "Tu ubicación" : "Origen sin definir");
    const originPrecision =
      trafficReq?.origin?.precision ??
      (scope.geo ? "device" : "unknown");
    if (!originGeo) return [];

    // Destino: geo declarado en la entidad, o lookup CMS (businesses).
    let destGeo: { lat: number; lon: number } | null = nextEnt.geo ?? null;
    if (!destGeo && nextEnt.type === "business") {
      try {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data } = await supabaseAdmin
          .from("business_locations")
          .select("latitude, longitude, is_primary")
          .eq("business_id", nextEnt.id)
          .is("deleted_at", null)
          .order("is_primary", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (
          data &&
          data.latitude != null &&
          data.longitude != null
        ) {
          destGeo = {
            lat: Number(data.latitude),
            lon: Number(data.longitude),
          };
        }
      } catch {
        destGeo = null;
      }
    }
    if (!destGeo) return [];

    const mode: TravelMode = trafficReq?.mode ?? "DRIVE";

    const { computeRouteInternal } = await import(
      "@/lib/maps/routes.server"
    );
    const route = await computeRouteInternal({
      origin: originGeo,
      destination: destGeo,
      mode,
      trafficAware: mode === "DRIVE",
    });

    const evalResult = evaluateTrafficStatus({
      durationSeconds: route.durationSeconds,
      staticDurationSeconds: route.staticDurationSeconds,
      distanceMeters: route.distanceMeters,
      arriveBy: trafficReq?.arriveBy ?? null,
      now: at,
      routeUnavailable: !route.ok,
    });

    // Auto-Hide (contribuidor). El DC vuelve a filtrar por su cuenta,
    // pero evitamos gasto de tarjetas cuando no hay ayuda concreta.
    if (evalResult.hidden) return [];

    const payload: TrafficSignalPayload = {
      destEntityId: nextEnt.id,
      destEntityType: nextEnt.type,
      originGeo,
      destinationGeo: destGeo,
      originLabel,
      originPrecision,
      mode,
      distanceKm:
        route.distanceMeters != null
          ? Math.round((route.distanceMeters / 1000) * 10) / 10
          : null,
      durationMinutes:
        route.durationSeconds != null
          ? Math.round(route.durationSeconds / 60)
          : null,
      baseDurationMinutes:
        route.staticDurationSeconds != null
          ? Math.round(route.staticDurationSeconds / 60)
          : null,
      trafficDeltaMinutes: evalResult.trafficDeltaMinutes,
      etaISO: evalResult.etaISO,
      arriveByISO: trafficReq?.arriveBy ?? null,
      bufferMinutes: evalResult.bufferMinutes,
      minutesToLeave: evalResult.minutesToLeave,
      status: evalResult.status,
      confidence: evalResult.confidence,
    };

    const sig: DestinationSignal<TrafficSignalPayload> = {
      kind: "traffic",
      scope: {
        ...scope,
        entityType: nextEnt.type,
        entityId: nextEnt.id,
      },
      at: at.toISOString(),
      ttlMs: TTL_MS,
      explain: {
        rationale: `${evalResult.rationale} Origen: ${originLabel} (${originPrecision}). Modo ${mode}. Fuente: Google Maps Routes API.`,
        provider: "Google Maps · Routes API",
        url: "https://developers.google.com/maps/documentation/routes",
      },
      payload,
    };
    return [sig];
  },
};