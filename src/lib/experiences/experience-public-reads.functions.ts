/**
 * Experiencias · Server function pública del listado maestro.
 *
 * Lee exclusivamente registros reales administrables (CMS). El modo
 * `includeInReview` sólo lo activan las superficies internas `/lovable/*`
 * (noindex) para revisar contenido en estado "en revisión".
 */
import { createServerFn } from "@tanstack/react-start";
import type { ExperiencesListingResult } from "./experience-public-reads.server";

export const getExperiencesListing = createServerFn({ method: "GET" })
  .inputValidator((data: { destino?: unknown; includeInReview?: unknown } | undefined) => ({
    destino: typeof data?.destino === "string" && data.destino.trim() ? data.destino : null,
    includeInReview: data?.includeInReview === true,
  }))
  .handler(async ({ data }): Promise<ExperiencesListingResult> => {
    const { listExperiencesListing } = await import("./experience-public-reads.server");
    return listExperiencesListing(data);
  });
