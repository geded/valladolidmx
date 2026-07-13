/**
 * traveler/travel-plan-geo.functions.ts — CV5.1.2 · Itinerario Mapa.
 *
 * Enriquecimiento geo del expediente del viajero. NO escribe, NO expone
 * datos de otros usuarios. Sólo lee coordenadas de recursos públicos
 * (business_locations primary, destinations) para pines en el mapa.
 *
 * Reglas Founder:
 *  - Reutiliza los `target_id` que YA existen en `travel_plan_items`.
 *  - No modifica el snapshot inmutable del item.
 *  - RLS estándar; publishable client sirve para lecturas públicas.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PlanItemGeo {
  item_id: string;
  lat: number;
  lng: number;
}

interface Input {
  items: Array<{ id: string; kind: string; target_id: string | null }>;
}

export const getPlanItemsGeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown): Input => {
    if (!raw || typeof raw !== "object") return { items: [] };
    const src = (raw as { items?: unknown }).items;
    if (!Array.isArray(src)) return { items: [] };
    const items: Input["items"] = [];
    for (const it of src) {
      if (!it || typeof it !== "object") continue;
      const r = it as Record<string, unknown>;
      const id = typeof r.id === "string" && UUID_RE.test(r.id) ? r.id : null;
      const kind = typeof r.kind === "string" ? r.kind : null;
      const target =
        typeof r.target_id === "string" && UUID_RE.test(r.target_id)
          ? r.target_id
          : null;
      if (!id || !kind) continue;
      items.push({ id, kind, target_id: target });
    }
    return { items: items.slice(0, 200) };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const out: PlanItemGeo[] = [];

    const bizIds = new Set<string>();
    const destIds = new Set<string>();
    const byBiz = new Map<string, string[]>(); // biz_id -> item_ids
    const byDest = new Map<string, string[]>();

    for (const it of data.items) {
      if (!it.target_id) continue;
      if (it.kind === "business") {
        bizIds.add(it.target_id);
        (byBiz.get(it.target_id) ?? byBiz.set(it.target_id, []).get(it.target_id)!).push(
          it.id,
        );
      } else if (it.kind === "destination") {
        destIds.add(it.target_id);
        (byDest.get(it.target_id) ?? byDest.set(it.target_id, []).get(it.target_id)!).push(
          it.id,
        );
      }
    }

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
        const bid = (l as { business_id: string }).business_id;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const prev = best.get(bid);
        const primary = Boolean((l as { is_primary?: boolean }).is_primary);
        if (!prev || (primary && !prev.primary)) {
          best.set(bid, { lat, lng, primary });
        }
      }
      for (const [bid, geo] of best) {
        for (const itemId of byBiz.get(bid) ?? []) {
          out.push({ item_id: itemId, lat: geo.lat, lng: geo.lng });
        }
      }
    }

    if (destIds.size > 0) {
      const { data: dests } = await supabase
        .from("destinations")
        .select("id, latitude, longitude")
        .in("id", Array.from(destIds));
      for (const d of dests ?? []) {
        const lat = Number((d as { latitude: unknown }).latitude);
        const lng = Number((d as { longitude: unknown }).longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const did = (d as { id: string }).id;
        for (const itemId of byDest.get(did) ?? []) {
          out.push({ item_id: itemId, lat, lng });
        }
      }
    }

    return { geo: out };
  });