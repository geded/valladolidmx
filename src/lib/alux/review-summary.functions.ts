/**
 * Alux · Resumen oficial de reseñas de Google para una ficha publicada.
 *
 * Pública (el viajero no necesita cuenta) pero acotada: sólo acepta una
 * referencia `business|place|product:<uuid>` de una ficha publicada del
 * catálogo; nunca búsquedas libres. El navegador la pide una vez por ficha
 * al abrir Alux y la reutiliza durante la visita.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseReviewEntityRef, type AluxReviewSummaryResult } from "./review-summary-contract";

const InputSchema = z.object({ entityRef: z.string().min(3).max(160) });

export const getAluxReviewSummary = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<AluxReviewSummaryResult> => {
    const ref = parseReviewEntityRef(data.entityRef);
    if (!ref) return { available: false };
    try {
      const [{ supabaseAdmin }, { loadAluxReviewSummary }] = await Promise.all([
        import("@/integrations/supabase/client.server"),
        import("./review-summary.server"),
      ]);
      return await loadAluxReviewSummary(supabaseAdmin, ref);
    } catch (err) {
      console.error("[alux.review-summary]", err instanceof Error ? err.message : err);
      return { available: false };
    }
  });
