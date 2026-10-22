/**
 * H3·A4 · Derivación al subir — lado navegador.
 *
 * Se llama DESPUÉS de que el original quedó subido y registrado. Nunca
 * lanza errores ni bloquea al editor: cualquier fallo se ignora y la foto
 * conserva su original (el proceso por lotes la optimiza después).
 */
import { supabase } from "@/integrations/supabase/client";
import { registerDerivedVariants, signDerivedVariantUploads } from "./derived-variants.functions";
import {
  DERIVE_ON_UPLOAD_QUALITY,
  MAX_DERIVED_VARIANT_BYTES,
  pickMediaAssetId,
  plannedDerivedWidths,
} from "./derive-on-upload";

function toWebp(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b && b.type === "image/webp" ? b : null), "image/webp", DERIVE_ON_UPLOAD_QUALITY);
    } catch {
      resolve(null);
    }
  });
}

async function run(file: Blob, assetId: string) {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return;
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return;
  const bmp = await createImageBitmap(file);
  try {
    const widths = plannedDerivedWidths(bmp.width);
    if (widths.length === 0) return;
    const blobs: Array<{ width: number; height: number; blob: Blob }> = [];
    for (const width of widths) {
      const height = Math.max(1, Math.round((bmp.height * width) / bmp.width));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, 0, 0, width, height);
      const blob = await toWebp(canvas);
      // Safari antiguo no codifica WebP: se omite y queda para el lote.
      if (!blob || blob.size > MAX_DERIVED_VARIANT_BYTES) return;
      blobs.push({ width, height, blob });
    }
    const signed = await signDerivedVariantUploads({
      data: { assetId, widths: blobs.map((b) => b.width) },
    });
    const done: Array<{ width: number; height: number; bytes: number }> = [];
    for (const b of blobs) {
      const ticket = signed.uploads.find((u) => u.width === b.width);
      if (!ticket) continue;
      const { error } = await supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, b.blob, {
          contentType: "image/webp",
          upsert: true,
        });
      if (!error) done.push({ width: b.width, height: b.height, bytes: b.blob.size });
    }
    if (done.length > 0) await registerDerivedVariants({ data: { assetId, variants: done } });
  } finally {
    bmp.close?.();
  }
}

/**
 * Lanza la derivación en segundo plano. Acepta el resultado de cualquier
 * registro oficial (`{mediaAssetId}`, `{media_asset_id}`, `{id}`).
 */
export function deriveVariantsInBackground(file: Blob, registerResult: unknown): void {
  const assetId = pickMediaAssetId(registerResult);
  if (!assetId) return;
  void run(file, assetId).catch((err) => {
    /* fail-safe: la foto conserva su original; el lote la optimiza después. */
    console.warn("[media] versiones ligeras omitidas:", err instanceof Error ? err.message : err);
  });
}
