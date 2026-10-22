/**
 * H3·A4 · Derivación al subir (engine `browser-canvas`).
 *
 * El navegador del editor genera versiones WebP ligeras justo después de
 * subir el original y este módulo las autoriza y registra. El original
 * jamás se toca (Founder Immutable Original). Fail-safe: cualquier error
 * deja la foto con su original y el proceso por lotes la optimiza después.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DERIVE_ON_UPLOAD_ENGINE,
  DERIVE_ON_UPLOAD_FORMAT,
  isAllowedDerivedWidth,
  MAX_DERIVED_VARIANT_BYTES,
  derivedVariantPath,
} from "./derive-on-upload";

const DERIVED_BUCKET = "media-derived";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertCanDeriveAsset(ctx: { supabase: any; userId: string }, assetId: string) {
  const { data: editorial } = await ctx.supabase.rpc("is_editor_or_admin", {
    _user_id: ctx.userId,
  });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: asset } = await supabaseAdmin
    .from("media_assets")
    .select("id, created_by, deleted_at, kind")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset || asset.deleted_at || asset.kind !== "image") throw new Error("not_found");
  if (!editorial && asset.created_by !== ctx.userId) throw new Error("forbidden");
  return supabaseAdmin;
}

export const signDerivedVariantUploads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { assetId: string; widths: number[] }) => {
    if (!d?.assetId || typeof d.assetId !== "string") throw new Error("invalid_input");
    const widths = Array.from(new Set((d.widths ?? []).filter(isAllowedDerivedWidth)));
    if (widths.length === 0) throw new Error("invalid_widths");
    return { assetId: d.assetId, widths };
  })
  .handler(async ({ data, context }) => {
    const admin = await assertCanDeriveAsset(context, data.assetId);
    const out: Array<{ width: number; path: string; token: string }> = [];
    for (const width of data.widths) {
      const path = derivedVariantPath(data.assetId, width);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: signed, error } = await (admin.storage as any)
        .from(DERIVED_BUCKET)
        .createSignedUploadUrl(path, { upsert: true });
      if (error || !signed) throw new Error("sign_failed");
      out.push({ width, path: signed.path as string, token: signed.token as string });
    }
    return { bucket: DERIVED_BUCKET, uploads: out };
  });

export const registerDerivedVariants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      assetId: string;
      variants: Array<{ width: number; height: number; bytes: number }>;
    }) => {
      if (!d?.assetId || !Array.isArray(d.variants) || d.variants.length === 0)
        throw new Error("invalid_input");
      const variants = d.variants.filter(
        (v) =>
          isAllowedDerivedWidth(v.width) &&
          Number.isFinite(v.height) &&
          v.height > 0 &&
          v.height <= 8000 &&
          Number.isFinite(v.bytes) &&
          v.bytes > 0 &&
          v.bytes <= MAX_DERIVED_VARIANT_BYTES,
      );
      if (variants.length === 0) throw new Error("invalid_variants");
      return { assetId: d.assetId, variants };
    },
  )
  .handler(async ({ data, context }) => {
    const admin = await assertCanDeriveAsset(context, data.assetId);
    // Sólo registra variantes cuyo binario realmente existe en el bucket.
    const folder = derivedVariantPath(data.assetId, 0).replace(/\/[^/]+$/, "");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listed } = await (admin.storage as any).from(DERIVED_BUCKET).list(folder);
    const present = new Set(((listed ?? []) as Array<{ name: string }>).map((o) => o.name));
    const rows = data.variants
      .map((v) => ({ v, path: derivedVariantPath(data.assetId, v.width) }))
      .filter(({ path }) => present.has(path.split("/").pop()!))
      .map(({ v, path }) => ({
        asset_id: data.assetId,
        format: DERIVE_ON_UPLOAD_FORMAT,
        width: v.width,
        height: Math.round(v.height),
        bytes: Math.round(v.bytes),
        bucket: DERIVED_BUCKET,
        path,
        engine: DERIVE_ON_UPLOAD_ENGINE,
        usage_context: "generic",
        status: "ready",
        is_current: true,
        variant_key: `${data.assetId}:${DERIVE_ON_UPLOAD_ENGINE}:${DERIVE_ON_UPLOAD_FORMAT}:${v.width}`,
      }));
    if (rows.length === 0) return { registered: 0 };
    const { error } = await admin
      .from("media_asset_variants")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(rows as any, { onConflict: "asset_id,format,width,engine" });
    if (error) throw new Error("register_failed");
    // No degrada un asset que ya estuviera listo por el proceso por lotes.
    await admin
      .from("media_assets")
      .update({ pipeline_status: "ready", pipeline_engine: DERIVE_ON_UPLOAD_ENGINE })
      .eq("id", data.assetId)
      .or("pipeline_status.is.null,pipeline_status.neq.ready");
    return { registered: rows.length };
  });
