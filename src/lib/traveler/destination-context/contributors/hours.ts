/**
 * CV6.5.2 · Hours Contributor (wiring efectivo contra CMS).
 *
 * Publica la señal `hours` (una por entidad del scope) leyendo la
 * fuente CANÓNICA del CMS: `public.business_hours`. Puro respecto al
 * Guardrail — normaliza estados y NO decide qué acción mostrar.
 *
 * Estados normalizados: `open_now` · `closing_soon` · `closed_now` ·
 * `opening_soon` · `closed_today` · `hours_unknown`.
 *
 * Timezone: LOCAL del destino (default `America/Merida`). Si la entidad
 * declara su timezone en `scope.entities[i].timezone`, se respeta.
 *
 * Datos incompletos → `hours_unknown`. Nunca inventar horarios.
 */
import type {
  DestinationContextContributor,
  DestinationSignal,
} from "../types";
import { evaluateHoursStatus, type HoursStatus } from "@/lib/business/hours-status";
import type { BusinessHourRow } from "@/lib/business/open-now";

export interface HoursSignalPayload {
  entityId: string;
  entityType: string;
  status: HoursStatus;
  closesAt?: string | null;
  opensAt?: string | null;
  opensDayLabel?: string | null;
  minutesToClose?: number | null;
  minutesToOpen?: number | null;
  timezone: string;
}

const TTL_MS = 5 * 60 * 1000;
const DEFAULT_TZ = "America/Merida";

export const hoursContributor: DestinationContextContributor = {
  id: "destination.hours.cms",
  kind: "hours",
  async resolve({ scope, at }) {
    const entities = (scope.entities ?? []).filter(
      (e) => e && e.type === "business" && typeof e.id === "string",
    );
    if (entities.length === 0) return [];

    let rowsByBusiness: Map<string, BusinessHourRow[]>;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ids = Array.from(new Set(entities.map((e) => e.id)));
      const { data, error } = await supabaseAdmin
        .from("business_hours")
        .select("business_id, day_of_week, opens_at, closes_at, is_closed")
        .in("business_id", ids);
      if (error) return [];
      rowsByBusiness = new Map();
      for (const row of (data ?? []) as Array<{
        business_id: string;
        day_of_week: number;
        opens_at: string | null;
        closes_at: string | null;
        is_closed: boolean | null;
      }>) {
        const arr = rowsByBusiness.get(row.business_id) ?? [];
        arr.push({
          day_of_week: row.day_of_week,
          opens_at: row.opens_at,
          closes_at: row.closes_at,
          is_closed: row.is_closed,
        });
        rowsByBusiness.set(row.business_id, arr);
      }
    } catch {
      return [];
    }

    const signals: DestinationSignal<HoursSignalPayload>[] = [];
    for (const ent of entities) {
      const tz = ent.timezone || DEFAULT_TZ;
      const rows = rowsByBusiness.get(ent.id) ?? null;
      const evalResult = evaluateHoursStatus(rows, { timezone: tz, now: at });
      // Auto-Hide friendly: sólo emitimos señal si hay información útil
      // para el consumidor. `hours_unknown` degrada silenciosamente
      // omitiendo la señal — el Decision Center se auto-oculta.
      if (evalResult.status === "hours_unknown") continue;
      const payload: HoursSignalPayload = {
        entityId: ent.id,
        entityType: ent.type,
        status: evalResult.status,
        closesAt: evalResult.closesAt ?? null,
        opensAt: evalResult.opensAt ?? null,
        opensDayLabel: evalResult.opensDayLabel ?? null,
        minutesToClose: evalResult.minutesToClose ?? null,
        minutesToOpen: evalResult.minutesToOpen ?? null,
        timezone: tz,
      };
      const slotsText = evalResult.evaluatedSlots
        .map((s) => `${s.opens}–${s.closes}`)
        .join(", ") || "sin franjas hoy";
      signals.push({
        kind: "hours",
        scope: { ...scope, entityType: ent.type, entityId: ent.id },
        at: at.toISOString(),
        ttlMs: TTL_MS,
        explain: {
          rationale: `Horario evaluado ${slotsText} (tz ${tz}) a ${at.toISOString()}. Estado: ${evalResult.status}.`,
          provider: "CMS · business_hours",
        },
        payload,
      });
    }
    return signals;
  },
};
