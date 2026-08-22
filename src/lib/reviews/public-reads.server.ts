/**
 * Trust Engine v1 · US-G.2 — Runtime helpers for public review reads.
 *
 * Server-only module: keeps `public-reads.functions.ts` a thin wrapper so the
 * TanStack server-fn splitter cannot drop runtime siblings.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicReviewSubjectKind =
  | "business"
  | "product"
  | "destination"
  | "tourism_region"
  | "business_category"
  | "event";

export type PublicReviewSort = "recent" | "highest" | "lowest" | "helpful";

export type PublicReviewVerifiedSource =
  | "verified_purchase"
  | "managed_visit"
  | "verified_visit"
  | "verified_redemption"
  | "declared_visitor";

export interface PublicReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  language: string;
  authorDisplayName: string | null;
  verifiedSource: PublicReviewVerifiedSource | null;
  visitDate: string | null;
  visitType: string | null;
  publishedAt: string | null;
  helpfulCount: number;
  businessResponse: string | null;
  businessResponseAt: string | null;
}

export interface PublicReviewStats {
  count: number;
  average: number;
  verifiedCount: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface ListPublicReviewsResult {
  items: PublicReviewItem[];
  nextCursor: string | null;
}

const SAFE_COLUMNS =
  "id, rating, title, body, language, author_display_name, verified_source, visit_date, visit_type, published_at, helpful_count, business_response, business_response_at";

function serverPublicClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase public env vars missing (SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY)");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function normalizeSubjectKind(raw: unknown): PublicReviewSubjectKind {
  const allowed: PublicReviewSubjectKind[] = [
    "business",
    "product",
    "destination",
    "tourism_region",
    "business_category",
    "event",
  ];
  if (typeof raw !== "string" || !allowed.includes(raw as PublicReviewSubjectKind)) {
    throw new Error(`Invalid subjectKind: ${String(raw)}`);
  }
  return raw as PublicReviewSubjectKind;
}

export function normalizeUuid(raw: unknown, label: string): string {
  if (typeof raw !== "string" || !/^[0-9a-f-]{36}$/i.test(raw)) {
    throw new Error(`Invalid ${label}: ${String(raw)}`);
  }
  return raw;
}

export async function fetchPublicReviews(data: {
  subjectKind: PublicReviewSubjectKind;
  subjectId: string;
  limit: number;
  cursor: string | null;
  sort: PublicReviewSort;
}): Promise<ListPublicReviewsResult> {
  const supabase = serverPublicClient();
  let q = supabase
    .from("reviews")
    .select(SAFE_COLUMNS)
    .eq("subject_kind", data.subjectKind)
    .eq("subject_id", data.subjectId)
    .eq("status", "published")
    .is("deleted_at", null);

  switch (data.sort) {
    case "highest":
      q = q.order("rating", { ascending: false }).order("published_at", { ascending: false });
      break;
    case "lowest":
      q = q.order("rating", { ascending: true }).order("published_at", { ascending: false });
      break;
    case "helpful":
      q = q
        .order("helpful_count", { ascending: false })
        .order("published_at", { ascending: false });
      break;
    case "recent":
    default:
      q = q
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false });
      break;
  }

  if (data.cursor && (data.sort === "recent" || data.sort === "highest" || data.sort === "lowest")) {
    q = q.lt("published_at", data.cursor);
  }

  q = q.limit(data.limit);

  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);

  const items: PublicReviewItem[] = (rows ?? []).map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return {
      id: String(row.id),
      rating: Number(row.rating ?? 0),
      title: (row.title as string | null) ?? null,
      body: (row.body as string | null) ?? null,
      language: (row.language as string | null) ?? "es",
      authorDisplayName: (row.author_display_name as string | null) ?? null,
      verifiedSource: (row.verified_source as PublicReviewVerifiedSource | null) ?? null,
      visitDate: (row.visit_date as string | null) ?? null,
      visitType: (row.visit_type as string | null) ?? null,
      publishedAt: (row.published_at as string | null) ?? null,
      helpfulCount: Number(row.helpful_count ?? 0),
      businessResponse: (row.business_response as string | null) ?? null,
      businessResponseAt: (row.business_response_at as string | null) ?? null,
    };
  });

  const last = items[items.length - 1];
  const nextCursor = items.length === data.limit && last?.publishedAt ? last.publishedAt : null;

  return { items, nextCursor };
}

export async function fetchReviewStats(data: {
  subjectKind: PublicReviewSubjectKind;
  subjectId: string;
}): Promise<PublicReviewStats> {
  const supabase = serverPublicClient();
  const { data: raw, error } = await supabase.rpc("get_review_stats", {
    _subject_kind: data.subjectKind,
    _subject_id: data.subjectId,
  });
  if (error) throw new Error(error.message);

  const src = (raw ?? {}) as Record<string, unknown>;
  const dist = (src.distribution ?? {}) as Record<string, unknown>;
  return {
    count: Number(src.count ?? 0),
    average: Number(src.average ?? 0),
    verifiedCount: Number(src.verifiedCount ?? 0),
    distribution: {
      "1": Number(dist["1"] ?? 0),
      "2": Number(dist["2"] ?? 0),
      "3": Number(dist["3"] ?? 0),
      "4": Number(dist["4"] ?? 0),
      "5": Number(dist["5"] ?? 0),
    },
  };
}
