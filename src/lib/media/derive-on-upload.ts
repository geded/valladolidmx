/**
 * H3·A4 · Reglas compartidas (cliente + servidor) de la derivación al subir.
 * Contrato probado en `scripts/media/derive-on-upload.contract.test.ts`.
 */
export const DERIVE_ON_UPLOAD_ENGINE = "browser-canvas";
export const DERIVE_ON_UPLOAD_FORMAT = "webp";
/** Anchos oficiales: celular, tablet, computadora. */
export const DERIVE_ON_UPLOAD_WIDTHS = [400, 800, 1200] as const;
export const DERIVE_ON_UPLOAD_QUALITY = 0.78;
/** Techo por variante (una de 1200 px nunca necesita más). */
export const MAX_DERIVED_VARIANT_BYTES = 1024 * 1024;

export function isAllowedDerivedWidth(w: unknown): w is number {
  return (DERIVE_ON_UPLOAD_WIDTHS as readonly number[]).includes(w as number);
}

/** Nunca se amplía: sólo anchos menores o iguales al original. */
export function plannedDerivedWidths(originalWidth: number): number[] {
  if (!Number.isFinite(originalWidth) || originalWidth <= 0) return [];
  return DERIVE_ON_UPLOAD_WIDTHS.filter((w) => w <= originalWidth);
}

export function derivedVariantPath(assetId: string, width: number): string {
  return `${assetId}/${DERIVE_ON_UPLOAD_ENGINE}/${DERIVE_ON_UPLOAD_FORMAT}/${width}.${DERIVE_ON_UPLOAD_FORMAT}`;
}

/** Extrae el id del asset de las distintas respuestas de registro. */
export function pickMediaAssetId(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  for (const k of ["mediaAssetId", "media_asset_id", "assetId", "id"]) {
    if (typeof r[k] === "string" && (r[k] as string).length > 0) return r[k] as string;
  }
  return null;
}
