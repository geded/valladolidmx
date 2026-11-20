/**
 * cms/media-review.functions.ts — Aprobación editorial de imágenes.
 *
 * Delta mínimo y aditivo: reutiliza la máquina oficial Serie 14
 * (draft → in_review → approved → published → archived) aplicada dentro del
 * RPC `cms_media_transition` (SECURITY DEFINER), que además:
 *  - exige rol admin para aprobar/publicar,
 *  - registra la transición en `content_audit_log`,
 *  - avisa a los administradores en el centro de notificaciones cuando un
 *    editor envía una imagen a aprobación.
 *
 * No se usa `supabaseAdmin`, no se tocan políticas RLS ni el modelo de dominio.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ContentStatus } from "@/lib/cms/workflow";

interface TransitionMediaInput {
  mediaId: string;
  to: ContentStatus;
  notes?: string;
}

export const transitionMediaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: TransitionMediaInput) => {
    if (!d?.mediaId || !d?.to) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: row, error } = await db.rpc("cms_media_transition", {
      _media_id: data.mediaId,
      _to: data.to,
      _notes: data.notes ?? null,
    });
    if (error) throw error;

    // Entrega inmediata del canal push ya publicado por el RPC. No cambia el
    // flujo editorial: si falla, la entrega queda pendiente en el ledger.
    if (data.to === "in_review") {
      try {
        const { dispatchPendingPush } = await import("@/lib/notifications/push-dispatch.server");
        await dispatchPendingPush({ limit: 25 });
      } catch {
        /* el aviso al celular no bloquea el envío a aprobación */
      }
    }

    return { id: data.mediaId, to: data.to, status: row?.status ?? data.to };
  });

export const countMediaPendingReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("media_assets")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_review")
      .is("deleted_at", null);
    if (error) throw error;
    return { pending: count ?? 0 };
  });
