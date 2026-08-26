/**
 * Trust Engine v1 · US-G.2 — Lectura pública de reseñas (thin wrapper).
 *
 * Toda la lógica de runtime vive en `./public-reads.server`.
 */
import { createServerFn } from "@tanstack/react-start";
import {
  fetchPublicReviews,
  fetchReviewStats,
  normalizeSubjectKind,
  normalizeUuid,
  type ListPublicReviewsResult,
  type PublicReviewSort,
  type PublicReviewStats,
} from "./public-reads.server";

export type {
  ListPublicReviewsResult,
  PublicReviewItem,
  PublicReviewSort,
  PublicReviewStats,
  PublicReviewSubjectKind,
  PublicReviewVerifiedSource,
} from "./public-reads.server";

export const listPublicReviews = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => {
    const data = (raw ?? {}) as {
      subjectKind?: unknown;
      subjectId?: unknown;
      limit?: unknown;
      cursor?: unknown;
      sort?: unknown;
    };
    const limitRaw = typeof data.limit === "number" ? data.limit : 20;
    const limit = Math.max(1, Math.min(50, Math.floor(limitRaw)));
    const sortRaw = typeof data.sort === "string" ? data.sort : "recent";
    const allowedSort: PublicReviewSort[] = ["recent", "highest", "lowest", "helpful"];
    const sort = (
      allowedSort.includes(sortRaw as PublicReviewSort) ? sortRaw : "recent"
    ) as PublicReviewSort;
    return {
      subjectKind: normalizeSubjectKind(data.subjectKind),
      subjectId: normalizeUuid(data.subjectId, "subjectId"),
      limit,
      cursor: typeof data.cursor === "string" && data.cursor ? data.cursor : null,
      sort,
    };
  })
  .handler(async ({ data }): Promise<ListPublicReviewsResult> => fetchPublicReviews(data));

export const getReviewStats = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => {
    const data = (raw ?? {}) as { subjectKind?: unknown; subjectId?: unknown };
    return {
      subjectKind: normalizeSubjectKind(data.subjectKind),
      subjectId: normalizeUuid(data.subjectId, "subjectId"),
    };
  })
  .handler(async ({ data }): Promise<PublicReviewStats> => fetchReviewStats(data));
