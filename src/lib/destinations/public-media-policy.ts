import type { PublicMediaAttribution } from "@/lib/media/public-attribution";

export const DESTINATION_MEDIA_POLICY_VERSION = "G8-R1-F1K" as const;

export interface DestinationMediaFacts {
  storage_bucket: string;
  storage_path: string;
  status?: string | null;
  deleted_at?: string | null;
  is_demo_seed?: boolean | null;
  review_state?: string | null;
  pipeline_status?: string | null;
  original_checksum?: string | null;
  alt_text?: string | null;
  credit?: string | null;
  metadata?: unknown;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Autoridad pública fail-closed G8-M1. Un medio rechazado nunca se firma ni
 * alcanza el DTO público; la ficha conserva su contenido y usa Editorial.
 */
export function isAccreditedDestinationMedia(media: DestinationMediaFacts | null): boolean {
  if (!media) return false;
  const metadata =
    typeof media.metadata === "object" && media.metadata !== null && !Array.isArray(media.metadata)
      ? (media.metadata as Record<string, unknown>)
      : {};
  // La carga gobernada (G8-M1 · `buildRightsMetadata`) escribe los derechos en
  // `metadata.rights`. Se acepta esa forma vigente y la histórica plana.
  const rights =
    typeof metadata.rights === "object" && metadata.rights !== null && !Array.isArray(metadata.rights)
      ? (metadata.rights as Record<string, unknown>)
      : {};
  const rightsDeclared =
    (metadata.rights_status === "declared" &&
      nonEmpty(metadata.rights_holder) &&
      nonEmpty(metadata.license)) ||
    (rights.rights_confirmed === true &&
      nonEmpty(rights.license) &&
      (nonEmpty(rights.author) || nonEmpty(rights.credit)));
  const prohibitedOrigin =
    media.storage_bucket === "demo-media" ||
    media.is_demo_seed === true ||
    metadata.ai_generated === true ||
    metadata.conceptual === true ||
    metadata.temporary === true ||
    metadata.fixture === true ||
    metadata.source === "fixture" ||
    rights.ai_generated === true ||
    rights.conceptual === true ||
    /imagen\s+generada\s*[·-]?\s*demo/i.test(media.credit ?? "");

  // El pipeline automático está apagado por gobernanza: `disabled` es un
  // estado válido del original acreditado, igual que `ready`.
  const pipelineOk =
    media.pipeline_status === "ready" ||
    media.pipeline_status === "disabled" ||
    media.pipeline_status == null;

  return (
    !prohibitedOrigin &&
    media.status === "published" &&
    media.deleted_at == null &&
    media.review_state === "approved" &&
    pipelineOk &&
    nonEmpty(media.original_checksum) &&
    nonEmpty(media.alt_text) &&
    nonEmpty(media.credit) &&
    rightsDeclared
  );
}

export function hasForbiddenDestinationMedia(media: PublicMediaAttribution): boolean {
  return (
    media.aiGenerated === true ||
    media.conceptual === true ||
    media.temporary === true ||
    /demo-media|imagen\s+generada\s*[·-]?\s*demo|fixture/i.test(
      `${media.url} ${media.credit ?? ""}`,
    )
  );
}
