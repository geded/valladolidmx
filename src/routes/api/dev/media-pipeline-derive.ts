/**
 * H3·A4 · M0 · Worker dev-only del Media Pipeline.
 *
 * ⚠️  Este endpoint SOLO responde en `NODE_ENV !== 'production'` y
 *     además requiere el header `x-dev-media-pipeline-secret` con el
 *     valor de `MEDIA_PIPELINE_DEV_SECRET` (env). En producción
 *     retorna 404 siempre.
 *
 * Contrato mínimo M0:
 *   POST /api/dev/media-pipeline/derive
 *   body: { assetId: string, engine: 'cloudflare' | 'sharp',
 *           formats?: MediaVariantFormat[], widths?: number[],
 *           usageContext?: MediaUsageContext }
 *
 * Comportamiento:
 *   · Registra intención (variantes 'pending') en `media_asset_variants`.
 *   · NO sube binarios reales durante M0 (feature flag apagado).
 *   · Es idempotente: repetir la llamada no crea duplicados gracias al
 *     UNIQUE (asset_id, format, width, engine).
 *   · Registra evento de observabilidad en el log del server.
 *
 * La generación real de variantes (Cloudflare Image Resizing vs sharp)
 * se ejercita desde el harness de benchmark (`scripts/media-benchmark/`)
 * y NO desde producción.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/dev/media-pipeline-derive")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env.NODE_ENV === "production") {
          return new Response("Not Found", { status: 404 });
        }
        const secret = process.env.MEDIA_PIPELINE_DEV_SECRET;
        if (!secret || request.headers.get("x-dev-media-pipeline-secret") !== secret) {
          return new Response("Forbidden", { status: 403 });
        }

        const body = (await request.json().catch(() => null)) as {
          assetId?: string;
          engine?: "cloudflare" | "sharp";
          formats?: string[];
          widths?: number[];
          usageContext?: string;
        } | null;

        if (!body?.assetId || !body?.engine) {
          return Response.json(
            { error: "assetId and engine are required" },
            { status: 400 },
          );
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Verificación defensiva: flag apagado ⇒ no operar.
        const { data: flagRow } = await supabaseAdmin
          .from("platform_settings")
          .select("value")
          .eq("key", "media_pipeline_enabled")
          .maybeSingle();
        const enabled =
          typeof flagRow?.value === "boolean"
            ? flagRow.value
            : flagRow?.value === "true";
        if (!enabled) {
          return Response.json(
            {
              status: "noop",
              reason: "media_pipeline_enabled is false (M0 safeguard)",
            },
            { status: 200 },
          );
        }

        const formats = (body.formats ?? ["avif", "webp", "jpeg"]).filter((f) =>
          ["avif", "webp", "jpeg", "png"].includes(f),
        );
        const widths = (body.widths ?? [400, 800, 1200, 1600, 2000]).filter(
          (w) => Number.isFinite(w) && w > 0 && w <= 4096,
        );

        const rows = formats.flatMap((format) =>
          widths.map((width) => ({
            asset_id: body.assetId!,
            format,
            width,
            engine: body.engine,
            usage_context: body.usageContext ?? "generic",
            bucket: "media-derived",
            path: `dev/${body.assetId}/${body.engine}/${format}/${width}.${format}`,
            status: "pending" as const,
          })),
        );

        const { data, error } = await supabaseAdmin
          .from("media_asset_variants")
          .upsert(rows, {
            onConflict: "asset_id,format,width,engine",
            ignoreDuplicates: false,
          })
          .select("id, format, width, engine, status");

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json({ status: "queued", variants: data });
      },
    },
  },
});
