/**
 * Ola A16 · Memoria territorial persistente (Alux Concierge).
 *
 * Server fn PÚBLICA (anon) que lee `alux_public_sessions` por
 * `session_key` (identificador anónimo generado en cliente y guardado
 * en `localStorage`) y devuelve un resumen operativo para:
 *   1) inyectar `[HISTORIAL TERRITORIAL]` en el prompt de sugerencias.
 *   2) renderizar un chip "Retomar donde te quedaste en …" en el
 *      concierge cuando el visitante regresa a la Home.
 *
 * Fuente de verdad exclusiva del concierge — nunca expone PII.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  sessionKey: z.string().min(8).max(128),
});

export interface AluxTerritorialVisit {
  slug: string;
  label?: string | null;
  count: number;
  first_seen: string;
  last_seen: string;
}

export interface AluxTerritorialMemory {
  known: boolean;
  is_returning: boolean;
  destination_visit_count: number;
  distinct_destinations: number;
  last_destination_slug: string | null;
  last_category_slug: string | null;
  visited_destinations: AluxTerritorialVisit[];
  top_categories: Array<{ slug: string; count: number }>;
  cross_device: boolean;
}

const EMPTY: AluxTerritorialMemory = {
  known: false,
  is_returning: false,
  destination_visit_count: 0,
  distinct_destinations: 0,
  last_destination_slug: null,
  last_category_slug: null,
  visited_destinations: [],
  top_categories: [],
  cross_device: false,
};

export const getAluxTerritorialMemory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<AluxTerritorialMemory> => {
    // Autorización = conocer el `session_key` (identificador opaco del
    // navegador). Usamos admin sólo para leer esa fila específica.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("alux_public_sessions")
      .select(
        "visited_destinations, visited_categories, destination_visit_count, last_destination_slug, last_category_slug, traveler_user_id, last_seen_at",
      )
      .eq("session_key", data.sessionKey)
      .maybeSingle();
    if (!row) return EMPTY;

    // A17 · Si la sesión está vinculada a un viajero autenticado,
    // fusionamos el historial de TODAS sus sesiones (cross-device).
    type Row = {
      visited_destinations: unknown;
      visited_categories: unknown;
      destination_visit_count: number | null;
      last_destination_slug: string | null;
      last_category_slug: string | null;
      last_seen_at: string | null;
    };
    let rows: Row[] = [row as unknown as Row];
    let crossDevice = false;
    const travelerId = (row as { traveler_user_id: string | null }).traveler_user_id;
    if (travelerId) {
      const { data: all } = await supabaseAdmin
        .from("alux_public_sessions")
        .select(
          "visited_destinations, visited_categories, destination_visit_count, last_destination_slug, last_category_slug, last_seen_at",
        )
        .eq("traveler_user_id", travelerId);
      if (all && all.length > 0) {
        rows = all as unknown as Row[];
        crossDevice = all.length > 1;
      }
    }

    // Fusionar visitas por slug (max count, min first_seen, max last_seen).
    const visitMap = new Map<string, AluxTerritorialVisit>();
    const catMap = new Map<string, number>();
    let totalCount = 0;
    let latestSeen: string = "";
    let latestDest: string | null = null;
    let latestCat: string | null = null;
    for (const r of rows) {
      totalCount += r.destination_visit_count ?? 0;
      const seen = r.last_seen_at ?? "";
      if (seen > latestSeen) {
        latestSeen = seen;
        latestDest = r.last_destination_slug ?? latestDest;
        latestCat = r.last_category_slug ?? latestCat;
      }
      const vArr = Array.isArray(r.visited_destinations)
        ? (r.visited_destinations as AluxTerritorialVisit[])
        : [];
      for (const v of vArr) {
        if (!v || typeof v.slug !== "string") continue;
        const prev = visitMap.get(v.slug);
        if (!prev) {
          visitMap.set(v.slug, { ...v, count: v.count ?? 1 });
        } else {
          visitMap.set(v.slug, {
            slug: v.slug,
            label: prev.label ?? v.label ?? null,
            count: (prev.count ?? 0) + (v.count ?? 0),
            first_seen:
              (prev.first_seen ?? "") < (v.first_seen ?? "") && prev.first_seen
                ? prev.first_seen
                : v.first_seen ?? prev.first_seen,
            last_seen:
              (prev.last_seen ?? "") > (v.last_seen ?? "") ? prev.last_seen : v.last_seen,
          });
        }
      }
      const cArr = Array.isArray(r.visited_categories)
        ? (r.visited_categories as Array<{ slug: string; count?: number }>)
        : [];
      for (const c of cArr) {
        if (!c || typeof c.slug !== "string") continue;
        catMap.set(c.slug, (catMap.get(c.slug) ?? 0) + (c.count ?? 1));
      }
    }

    const visits = Array.from(visitMap.values()).sort((a, b) =>
      (b.last_seen ?? "").localeCompare(a.last_seen ?? ""),
    );
    const topCats = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([slug, count]) => ({ slug, count }));

    return {
      known: true,
      is_returning: totalCount >= 2 || visits.length >= 2,
      destination_visit_count: totalCount,
      distinct_destinations: visits.length,
      last_destination_slug: latestDest,
      last_category_slug: latestCat,
      visited_destinations: visits.slice(0, 8),
      top_categories: topCats,
      cross_device: crossDevice,
    };
  });