/**
 * 19.23 · V1-P1 · Destination Governed Assets Enablement.
 *
 * Elegibilidad Premium POR DESTINO, evaluada fail-closed y sin depender
 * del flag global `omxds_visual_v1_contracts_enabled`. La habilitación
 * es consecuencia exclusiva del conjunto gobernado completo:
 *
 *  - destino publicado y no demo seed;
 *  - portada gobernada aprobada;
 *  - mínimo dos imágenes de galería gobernadas aprobadas;
 *  - derechos declarados y checksum SHA-256 presente;
 *  - ALT humano no vacío;
 *  - `pipeline_status = ready` y `review_state = approved`;
 *  - geografía válida;
 *  - auditoría de reclasificación y de vinculación presente;
 *  - fuente estable de medios (proxy canónico), nunca URL firmada.
 *
 * Prohibido hardcodear slug o UUID: la allowlist vive únicamente en la
 * migración autorizada.
 */
import { createServerFn } from "@tanstack/react-start";
import type { Json } from "@/integrations/supabase/types";

/** Bucket servido por el proxy público canónico `/api/public/studio-media/*`. */
const STABLE_MEDIA_BUCKET = "studio-media";
const STABLE_MEDIA_PREFIX = "/api/public/studio-media/";

export interface DestinationPremiumMediaItem {
  id: string;
  role: "cover" | "gallery";
  /** URL pública estable (no firmada), apta para OG/JSON-LD. */
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface DestinationPremiumEligibilityResult {
  eligible: boolean;
  reasons: string[];
  cover: DestinationPremiumMediaItem | null;
  gallery: DestinationPremiumMediaItem[];
}

export function createIneligibleDestinationPremiumResult(
  reasons: string[],
): DestinationPremiumEligibilityResult {
  return { eligible: false, reasons, cover: null, gallery: [] };
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function positiveDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRecord(value: Json | null): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface DestinationMediaRow {
  role: string;
  sort_order: number;
  media_assets: {
    id: string;
    kind: string;
    storage_bucket: string;
    storage_path: string;
    alt_text: string | null;
    width: number | null;
    height: number | null;
    status: string;
    deleted_at: string | null;
    pipeline_status: string;
    review_state: string;
    original_checksum: string | null;
    metadata: Json;
    is_demo_seed: boolean;
  } | null;
}

/** Derechos declarados en el metadato gobernado del asset. */
function hasDeclaredRights(metadata: Json): boolean {
  if (!isRecord(metadata)) return false;
  return (
    metadata.rights_status === "declared" &&
    nonEmpty(metadata.rights_holder) &&
    nonEmpty(metadata.license)
  );
}

function stableUrl(bucket: string, path: string): string | null {
  if (bucket !== STABLE_MEDIA_BUCKET) return null;
  const normalized = path.replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return null;
  return `${STABLE_MEDIA_PREFIX}${normalized}`;
}

function toGovernedItem(row: DestinationMediaRow): DestinationPremiumMediaItem | null {
  const asset = row.media_assets;
  if (!asset) return null;
  if (row.role !== "cover" && row.role !== "gallery") return null;
  const ok =
    asset.kind === "image" &&
    asset.status === "published" &&
    asset.deleted_at === null &&
    !asset.is_demo_seed &&
    asset.pipeline_status === "ready" &&
    asset.review_state === "approved" &&
    nonEmpty(asset.alt_text) &&
    nonEmpty(asset.original_checksum) &&
    positiveDimension(asset.width) &&
    positiveDimension(asset.height) &&
    hasDeclaredRights(asset.metadata);
  if (!ok) return null;
  const url = stableUrl(asset.storage_bucket, asset.storage_path);
  if (!url) return null;
  return {
    id: asset.id,
    role: row.role,
    url,
    alt: asset.alt_text as string,
    width: asset.width as number,
    height: asset.height as number,
  };
}

export const getDestinationPremiumEligibility = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input || typeof input.slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(input.slug)) {
      throw new Error("invalid_destination_slug");
    }
    return input;
  })
  .handler(async ({ data }): Promise<DestinationPremiumEligibilityResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: destination, error: destinationError } = await supabaseAdmin
        .from("destinations")
        .select("id, status, is_demo_seed, latitude, longitude")
        .eq("slug", data.slug)
        .maybeSingle();
      if (destinationError)
        return createIneligibleDestinationPremiumResult(["eligibility_read_failed"]);
      if (!destination) return createIneligibleDestinationPremiumResult(["destination_not_found"]);

      const reasons: string[] = [];
      if (destination.status !== "published") reasons.push("destination_not_published");
      if (destination.is_demo_seed) reasons.push("destination_is_demo_seed");
      const hasGeography =
        typeof destination.latitude === "number" &&
        Number.isFinite(destination.latitude) &&
        typeof destination.longitude === "number" &&
        Number.isFinite(destination.longitude);
      if (!hasGeography) reasons.push("geography_missing");

      const [mediaResult, auditResult] = await Promise.all([
        supabaseAdmin
          .from("destination_media")
          .select(
            "role, sort_order, media_assets:media_asset_id(id, kind, storage_bucket, storage_path, alt_text, width, height, status, deleted_at, pipeline_status, review_state, original_checksum, metadata, is_demo_seed)",
          )
          .eq("destination_id", destination.id)
          .in("role", ["cover", "gallery"])
          .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("content_audit_log")
          .select("action, metadata")
          .eq("entity_kind", "destination")
          .eq("entity_id", destination.id)
          .in("action", ["destination.reclassify", "media.link"]),
      ]);
      if (mediaResult.error || auditResult.error)
        return createIneligibleDestinationPremiumResult(["eligibility_read_failed"]);

      const rows = (mediaResult.data ?? []) as unknown as DestinationMediaRow[];
      const governed = rows
        .map(toGovernedItem)
        .filter((item): item is DestinationPremiumMediaItem => item !== null);
      const cover = governed.find((item) => item.role === "cover") ?? null;
      const gallery = governed.filter((item) => item.role === "gallery");
      if (!cover) reasons.push("governed_cover_missing");
      if (gallery.length < 2) reasons.push("governed_gallery_insufficient");

      const audits = auditResult.data ?? [];
      const hasReclassificationAudit = audits.some(
        (row) => row.action === "destination.reclassify",
      );
      const linkedAssetIds = new Set(
        audits
          .filter((row) => row.action === "media.link")
          .map((row) => (isRecord(row.metadata) ? String(row.metadata.media_asset_id ?? "") : ""))
          .filter(nonEmpty),
      );
      if (!hasReclassificationAudit) reasons.push("reclassification_audit_missing");
      const allLinked =
        governed.length > 0 && governed.every((item) => linkedAssetIds.has(item.id));
      if (!allLinked) reasons.push("media_link_audit_missing");

      if (reasons.length > 0) return createIneligibleDestinationPremiumResult(reasons);
      return { eligible: true, reasons: [], cover, gallery };
    } catch {
      return createIneligibleDestinationPremiumResult(["eligibility_read_failed"]);
    }
  });
