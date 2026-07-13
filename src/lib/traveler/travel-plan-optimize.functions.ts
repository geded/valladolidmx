/**
 * traveler/travel-plan-optimize.functions.ts — CV5.3 · Itinerario Inteligente v1.
 *
 * `optimizePlanDay` — reordena los items de un día del plan usando las
 * coordenadas reales de negocios/destinos (nearest-neighbor desde el
 * primer item con geo). Es Explainable by Default:
 *
 *   - rationale: texto editorial
 *   - sources: fuentes de datos usadas
 *   - effect: cambio aplicado
 *   - reversible: siempre true (el cliente guarda el orden previo y
 *     revierte con reorderPlanItems)
 *
 * No modifica snapshots, sólo `position`. Reutiliza RLS estándar del
 * viajero (solo puede reordenar su propio plan).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Input {
  planId: string;
  dayIndex: number | null;
}

export interface OptimizeDayResult {
  updated: number;
  previousOrder: string[]; // orden previo GLOBAL del plan (para deshacer)
  newOrder: string[]; // orden nuevo GLOBAL del plan
  rationale: string;
  sources: string[];
  effect: string;
  reversible: true;
  reasoning: {
    itemsInDay: number;
    itemsWithGeo: number;
    strategy: "nearest_neighbor" | "no_change";
  };
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const optimizePlanDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown): Input => {
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
  .handler(async ({ data, context }): Promise<OptimizeDayResult> => {
    const { supabase } = context;

    // Todos los items del plan (para reconstruir el orden global).
    const { data: allRows, error: aErr } = await supabase
      .from("travel_plan_items")
      .select("id, position, day_index, item_kind, target_id")
      .eq("plan_id", data.planId)
      .order("position", { ascending: true });
    if (aErr) throw new Error(`optimize_read_failed: ${aErr.message}`);

    type Row = {
      id: string;
      position: number;
      day_index: number | null;
      item_kind: string;
      target_id: string | null;
    };
    const rows = (allRows ?? []) as Row[];
    const previousOrder = rows.map((r) => r.id);

    const dayItems = rows.filter((r) => (r.day_index ?? null) === data.dayIndex);
    if (dayItems.length < 2) {
      return {
        updated: 0,
        previousOrder,
        newOrder: previousOrder,
        rationale:
          "Este día tiene una sola actividad; no hay nada que optimizar todavía.",
        sources: [],
        effect: "sin cambios",
        reversible: true,
        reasoning: { itemsInDay: dayItems.length, itemsWithGeo: 0, strategy: "no_change" },
      };
    }

    // Recolectar geo de businesses y destinations del día.
    const bizIds = new Set<string>();
    const destIds = new Set<string>();
    for (const r of dayItems) {
      if (!r.target_id) continue;
      if (r.item_kind === "business") bizIds.add(r.target_id);
      else if (r.item_kind === "destination") destIds.add(r.target_id);
    }
    const geoByItem = new Map<string, { lat: number; lng: number }>();

    if (bizIds.size > 0) {
      const { data: locs } = await supabase
        .from("business_locations")
        .select("business_id, latitude, longitude, is_primary")
        .in("business_id", Array.from(bizIds))
        .is("deleted_at", null);
      const best = new Map<string, { lat: number; lng: number; primary: boolean }>();
      for (const l of locs ?? []) {
        const lat = Number((l as { latitude: unknown }).latitude);
        const lng = Number((l as { longitude: unknown }).longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const bid = (l as { business_id: string }).business_id;
        const primary = Boolean((l as { is_primary?: boolean }).is_primary);
        const prev = best.get(bid);
        if (!prev || (primary && !prev.primary)) best.set(bid, { lat, lng, primary });
      }
      for (const r of dayItems) {
        if (r.item_kind !== "business" || !r.target_id) continue;
        const g = best.get(r.target_id);
        if (g) geoByItem.set(r.id, { lat: g.lat, lng: g.lng });
      }
    }
    if (destIds.size > 0) {
      const { data: dests } = await supabase
        .from("destinations")
        .select("id, latitude, longitude")
        .in("id", Array.from(destIds));
      for (const r of dayItems) {
        if (r.item_kind !== "destination" || !r.target_id) continue;
        const d = (dests ?? []).find(
          (x) => (x as { id: string }).id === r.target_id,
        );
        if (!d) continue;
        const lat = Number((d as { latitude: unknown }).latitude);
        const lng = Number((d as { longitude: unknown }).longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          geoByItem.set(r.id, { lat, lng });
        }
      }
    }

    const withGeo = dayItems.filter((r) => geoByItem.has(r.id));
    if (withGeo.length < 2) {
      return {
        updated: 0,
        previousOrder,
        newOrder: previousOrder,
        rationale:
          "Necesitamos al menos dos paradas con coordenadas para trazar la ruta más eficiente.",
        sources: [],
        effect: "sin cambios",
        reversible: true,
        reasoning: {
          itemsInDay: dayItems.length,
          itemsWithGeo: withGeo.length,
          strategy: "no_change",
        },
      };
    }

    // Nearest-neighbor desde el primer item con geo del día (respetando su intención).
    const visited = new Set<string>();
    const optimizedGeo: Row[] = [];
    let current = withGeo[0];
    optimizedGeo.push(current);
    visited.add(current.id);
    let totalKm = 0;
    while (optimizedGeo.length < withGeo.length) {
      const from = geoByItem.get(current.id)!;
      let bestNext: Row | null = null;
      let bestKm = Infinity;
      for (const cand of withGeo) {
        if (visited.has(cand.id)) continue;
        const to = geoByItem.get(cand.id)!;
        const d = haversineKm(from, to);
        if (d < bestKm) {
          bestKm = d;
          bestNext = cand;
        }
      }
      if (!bestNext) break;
      totalKm += bestKm;
      optimizedGeo.push(bestNext);
      visited.add(bestNext.id);
      current = bestNext;
    }

    // Items del día sin geo mantienen su orden relativo original al final.
    const withoutGeo = dayItems.filter((r) => !geoByItem.has(r.id));
    const optimizedDay = [...optimizedGeo, ...withoutGeo];

    // Reconstruir orden global: reemplazar el bloque del día por optimizedDay.
    const optimizedDayIds = optimizedDay.map((r) => r.id);
    const optimizedDaySet = new Set(optimizedDayIds);
    const newOrder: string[] = [];
    let dayInserted = false;
    for (const r of rows) {
      if (optimizedDaySet.has(r.id)) {
        if (!dayInserted) {
          for (const id of optimizedDayIds) newOrder.push(id);
          dayInserted = true;
        }
        continue;
      }
      newOrder.push(r.id);
    }

    // Escribir posiciones (mismo patrón que reorderPlanItems).
    let updated = 0;
    for (let i = 0; i < newOrder.length; i++) {
      const { error } = await supabase
        .from("travel_plan_items")
        .update({ position: i })
        .eq("id", newOrder[i])
        .eq("plan_id", data.planId);
      if (error) throw new Error(`optimize_write_failed: ${error.message}`);
      updated += 1;
    }

    const dayLabel =
      data.dayIndex === null ? "las actividades sin día asignado" : `el Día ${data.dayIndex + 1}`;
    return {
      updated,
      previousOrder,
      newOrder,
      rationale: `Reordené ${withGeo.length} paradas de ${dayLabel} usando la ruta más corta (vecino más cercano · ~${totalKm.toFixed(1)} km).`,
      sources: ["business_locations", "destinations"],
      effect: `Nuevo orden aplicado a ${dayLabel}. Puedes deshacerlo en cualquier momento.`,
      reversible: true,
      reasoning: {
        itemsInDay: dayItems.length,
        itemsWithGeo: withGeo.length,
        strategy: "nearest_neighbor",
      },
    };
  });