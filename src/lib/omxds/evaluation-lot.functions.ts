/**
 * G8-R1-F1G · Lectura pública del lote de evaluación.
 *
 * Devuelve únicamente slugs (dato ya público por definición de la ruta) para
 * que las superficies públicas puedan emitir `noindex, nofollow` mientras el
 * lote está en evaluación. No expone estado, procedencia ni motivos.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { EMPTY_EVALUATION_LOT, EVALUATION_LOT_ID, type EvaluationLotSlugs } from "./evaluation-lot";

const TTL_MS = 60_000;
let cache: { at: number; value: EvaluationLotSlugs } | null = null;

export const getEvaluationLotSlugs = createServerFn({ method: "GET" }).handler(
  async (): Promise<EvaluationLotSlugs> => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
    try {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) return EMPTY_EVALUATION_LOT;
      const sb = createClient<Database>(url, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const pick = (rows: Array<{ slug: string | null }> | null) =>
        (rows ?? [])
          .map((r) => r.slug)
          .filter((s): s is string => typeof s === "string" && s.length > 0);

      const [d, b, p, e, pl] = await Promise.all([
        sb.from("destinations").select("slug").eq("demo_seed_batch", EVALUATION_LOT_ID),
        sb.from("businesses").select("slug").eq("demo_seed_batch", EVALUATION_LOT_ID),
        sb.from("products").select("slug").eq("demo_seed_batch", EVALUATION_LOT_ID),
        sb.from("events").select("slug").eq("demo_seed_batch", EVALUATION_LOT_ID),
        sb.from("points_of_interest").select("slug").eq("demo_seed_batch", EVALUATION_LOT_ID),
      ]);

      const value: EvaluationLotSlugs = {
        destination: pick(d.data),
        business: pick(b.data),
        product: pick(p.data),
        event: pick(e.data),
        place: pick(pl.data),
      };
      cache = { at: Date.now(), value };
      return value;
    } catch {
      return EMPTY_EVALUATION_LOT;
    }
  },
);
