/**
 * CV6.7 · Itinerario con horas — capa de dominio.
 *
 * `suggestPlanDaySchedule` pide a Alux un horario SUGERIDO para un día del
 * viaje usando datos reales: orden del itinerario, horarios publicados del
 * lugar (`business_hours`), coordenadas (`business_locations`,
 * `destinations`) y duración típica por tipo.
 *
 * Explainable by Default: devuelve `rationale`, `sources`, `effect` y es
 * reversible (`previous` permite restaurar el estado anterior).
 *
 * Reglas Founder:
 *   · No inventa reservas: el resultado se guarda como sugerencia
 *     (`schedule_source = 'alux'`) y el viajero la ajusta o confirma.
 *   · Respeta horas confirmadas por el viajero o por el concierge.
 *   · Sin service_role. RLS estándar del viajero.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildDaySchedule, type ScheduleItemInput } from "./day-schedule";
import { MERIDA_TIME_ZONE } from "@/lib/time/merida";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SuggestDayScheduleResult {
  updated: number;
  rationale: string;
  sources: string[];
  effect: string;
  reversible: true;
  previous: Array<{
    itemId: string;
    startsAtLocal: string | null;
    durationMinutes: number | null;
    scheduleSource: string | null;
  }>;
}

function weekdayInMerida(startDate: string | null, dayIndex: number | null): number | null {
  if (!startDate || dayIndex == null) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!m) return null;
  const base = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  const target = new Date(base + dayIndex * 86_400_000);
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: MERIDA_TIME_ZONE,
    weekday: "short",
  }).format(target);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[label] ?? null;
}

export const suggestPlanDaySchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const src = (raw ?? {}) as { planId?: unknown; dayIndex?: unknown };
    if (typeof src.planId !== "string" || !UUID_RE.test(src.planId)) {
      throw new Error("invalid_plan_id");
    }
    const day =
      src.dayIndex === null || src.dayIndex === undefined
        ? null
        : Math.max(0, Math.min(365, Math.round(Number(src.dayIndex) || 0)));
    return { planId: src.planId, dayIndex: day };
  })
  .handler(async ({ data, context }): Promise<SuggestDayScheduleResult> => {
    const { supabase } = context;

    const { data: plan, error: pErr } = await supabase
      .from("travel_plans")
      .select("id, start_date")
      .eq("id", data.planId)
      .maybeSingle();
    if (pErr) throw new Error(`schedule_plan_read_failed: ${pErr.message}`);
    if (!plan) throw new Error("plan_not_found");

    const query = supabase
      .from("travel_plan_items")
      .select(
        "id, item_kind, target_id, position, day_index, starts_at_local, duration_minutes, schedule_source",
      )
      .eq("plan_id", data.planId)
      .order("position", { ascending: true });
    const { data: rows, error: iErr } =
      data.dayIndex == null
        ? await query.is("day_index", null)
        : await query.eq("day_index", data.dayIndex);
    if (iErr) throw new Error(`schedule_items_read_failed: ${iErr.message}`);

    type Row = {
      id: string;
      item_kind: string;
      target_id: string | null;
      starts_at_local: string | null;
      duration_minutes: number | null;
      schedule_source: string | null;
    };
    const items = (rows ?? []) as Row[];
    if (items.length === 0) {
      return {
        updated: 0,
        rationale: "Este día todavía no tiene actividades.",
        sources: [],
        effect: "Sin cambios.",
        reversible: true,
        previous: [],
      };
    }

    // --- Geo de negocios y destinos -------------------------------------
    const bizIds = items
      .filter((i) => i.item_kind === "business" && i.target_id)
      .map((i) => i.target_id as string);
    const destIds = items
      .filter((i) => i.item_kind === "destination" && i.target_id)
      .map((i) => i.target_id as string);

    const geoByTarget = new Map<string, { lat: number; lng: number }>();
    if (bizIds.length > 0) {
      const { data: locs } = await supabase
        .from("business_locations")
        .select("business_id, latitude, longitude, is_primary")
        .in("business_id", Array.from(new Set(bizIds)))
        .is("deleted_at", null);
      for (const l of (locs ?? []) as Array<{
        business_id: string;
        latitude: unknown;
        longitude: unknown;
        is_primary?: boolean | null;
      }>) {
        const lat = Number(l.latitude);
        const lng = Number(l.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        if (!geoByTarget.has(l.business_id) || l.is_primary) {
          geoByTarget.set(l.business_id, { lat, lng });
        }
      }
    }
    if (destIds.length > 0) {
      const { data: dests } = await supabase
        .from("destinations")
        .select("id, latitude, longitude")
        .in("id", Array.from(new Set(destIds)));
      for (const d of (dests ?? []) as Array<{ id: string; latitude: unknown; longitude: unknown }>) {
        const lat = Number(d.latitude);
        const lng = Number(d.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        geoByTarget.set(d.id, { lat, lng });
      }
    }

    // --- Horarios reales del día ----------------------------------------
    const dow = weekdayInMerida(plan.start_date as string | null, data.dayIndex);
    const slotsByBusiness = new Map<string, Array<{ opens: string; closes: string }>>();
    const closedBusinesses = new Set<string>();
    if (bizIds.length > 0 && dow != null) {
      const { data: hours } = await supabase
        .from("business_hours")
        .select("business_id, day_of_week, opens_at, closes_at, is_closed")
        .in("business_id", Array.from(new Set(bizIds)))
        .eq("day_of_week", dow);
      for (const h of (hours ?? []) as Array<{
        business_id: string;
        opens_at: string | null;
        closes_at: string | null;
        is_closed: boolean | null;
      }>) {
        if (h.is_closed) {
          if (!slotsByBusiness.has(h.business_id)) closedBusinesses.add(h.business_id);
          continue;
        }
        if (!h.opens_at || !h.closes_at) continue;
        const arr = slotsByBusiness.get(h.business_id) ?? [];
        arr.push({ opens: h.opens_at, closes: h.closes_at });
        slotsByBusiness.set(h.business_id, arr);
        closedBusinesses.delete(h.business_id);
      }
    }

    const input: ScheduleItemInput[] = items.map((i) => ({
      id: i.id,
      item_kind: i.item_kind,
      starts_at_local: i.starts_at_local,
      duration_minutes: i.duration_minutes,
      schedule_source: (i.schedule_source as ScheduleItemInput["schedule_source"]) ?? null,
      geo: i.target_id ? (geoByTarget.get(i.target_id) ?? null) : null,
      openSlots: i.target_id ? (slotsByBusiness.get(i.target_id) ?? null) : null,
      closedToday: Boolean(i.target_id && closedBusinesses.has(i.target_id)),
    }));

    const result = buildDaySchedule(input);

    const previous = items.map((i) => ({
      itemId: i.id,
      startsAtLocal: i.starts_at_local,
      durationMinutes: i.duration_minutes,
      scheduleSource: i.schedule_source,
    }));

    let updated = 0;
    for (const a of result.assignments) {
      if (a.locked) continue;
      const { error } = await supabase
        .from("travel_plan_items")
        .update({
          starts_at_local: a.startsAtLocal,
          duration_minutes: a.durationMinutes,
          schedule_source: "alux",
        })
        .eq("id", a.id);
      if (error) throw new Error(`schedule_write_failed: ${error.message}`);
      updated += 1;
    }

    return {
      updated,
      rationale: result.rationale,
      sources: result.sources,
      effect:
        updated > 0
          ? `Se propusieron horarios para ${updated} actividades del día.`
          : "No hubo horarios que proponer.",
      reversible: true,
      previous,
    };
  });

/**
 * restorePlanDaySchedule — Deshace una sugerencia devolviendo cada
 * actividad a su horario previo. Sólo toca los ítems indicados.
 */
export const restorePlanDaySchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const src = (raw ?? {}) as { previous?: unknown };
    if (!Array.isArray(src.previous)) throw new Error("invalid_previous");
    const previous = src.previous.slice(0, 200).map((v) => {
      const r = (v ?? {}) as Record<string, unknown>;
      if (typeof r.itemId !== "string" || !UUID_RE.test(r.itemId)) {
        throw new Error("invalid_item_id");
      }
      const time =
        typeof r.startsAtLocal === "string" && /^\d{1,2}:\d{2}/.test(r.startsAtLocal)
          ? r.startsAtLocal
          : null;
      const dur =
        typeof r.durationMinutes === "number" && r.durationMinutes > 0
          ? Math.round(r.durationMinutes)
          : null;
      const source =
        r.scheduleSource === "concierge" || r.scheduleSource === "alux" || r.scheduleSource === "traveler"
          ? (r.scheduleSource as string)
          : null;
      return { itemId: r.itemId, startsAtLocal: time, durationMinutes: dur, scheduleSource: source };
    });
    return { previous };
  })
  .handler(async ({ data, context }): Promise<{ restored: number }> => {
    let restored = 0;
    for (const p of data.previous) {
      const { error } = await context.supabase
        .from("travel_plan_items")
        .update({
          starts_at_local: p.startsAtLocal,
          duration_minutes: p.durationMinutes,
          schedule_source: p.scheduleSource,
        })
        .eq("id", p.itemId);
      if (error) throw new Error(`schedule_restore_failed: ${error.message}`);
      restored += 1;
    }
    return { restored };
  });
