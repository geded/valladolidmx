/**
 * G8-R1-F1I-R1 · DEF-F1I-001 — Lectura server-side de empresas publicadas
 * NO elegibles para descubrimiento público.
 *
 * Devuelve únicamente slugs (dato ya público por definición de la ruta) para
 * que la ficha directa y la de sus productos emitan `noindex, nofollow`
 * mientras la revisión de fuente no esté aprobada. No expone estado,
 * procedencia ni motivos. Al aprobarse la ficha, la lista deja de incluirla
 * y el `noindex` desaparece sin cambio de código.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PUBLIC_APPROVED_REVIEW_STATE } from "./public-eligibility";

const TTL_MS = 60_000;
let cache: { at: number; value: readonly string[] } | null = null;

export const getNonDiscoverableBusinessSlugs = createServerFn({ method: "GET" }).handler(
  async (): Promise<readonly string[]> => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
    try {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) return [];
      const sb = createClient<Database>(url, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data } = await sb
        .from("businesses")
        .select("slug, source_review_state")
        .eq("status", "published")
        .is("deleted_at", null)
        .neq("source_review_state", PUBLIC_APPROVED_REVIEW_STATE);
      const value = ((data ?? []) as Array<{ slug: string | null }>)
        .map((r) => r.slug)
        .filter((s): s is string => typeof s === "string" && s.length > 0);
      cache = { at: Date.now(), value };
      return value;
    } catch {
      return [];
    }
  },
);
