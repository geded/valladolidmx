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
import { createClient } from "@supabase/supabase-js";
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
};

export const getAluxTerritorialMemory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<AluxTerritorialMemory> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return EMPTY;
    const supabase = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    // Nota: la fila puede no ser visible al rol anon si RLS lo restringe;
    // en ese caso fallback silencioso a EMPTY (memoria no disponible).
    const { data: row } = await supabase
      .from("alux_public_sessions")
      .select(
        "visited_destinations, visited_categories, destination_visit_count, last_destination_slug, last_category_slug",
      )
      .eq("session_key", data.sessionKey)
      .maybeSingle();
    if (!row) return EMPTY;

    const visits = (Array.isArray(row.visited_destinations)
      ? (row.visited_destinations as AluxTerritorialVisit[])
      : []
    ).filter((v) => v && typeof v.slug === "string");
    const cats = (Array.isArray(row.visited_categories)
      ? (row.visited_categories as Array<{ slug: string; count?: number }>)
      : []
    ).filter((v) => v && typeof v.slug === "string");

    visits.sort((a, b) => (b.last_seen ?? "").localeCompare(a.last_seen ?? ""));
    const topCats = [...cats]
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 5)
      .map((c) => ({ slug: c.slug, count: c.count ?? 1 }));

    const visitCount = (row.destination_visit_count as number | null) ?? 0;

    return {
      known: true,
      is_returning: visitCount >= 2 || visits.length >= 2,
      destination_visit_count: visitCount,
      distinct_destinations: visits.length,
      last_destination_slug: (row.last_destination_slug as string | null) ?? null,
      last_category_slug: (row.last_category_slug as string | null) ?? null,
      visited_destinations: visits.slice(0, 8),
      top_categories: topCats,
    };
  });