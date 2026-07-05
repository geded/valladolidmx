/**
 * Trust Engine v1 · US-G.1 — Composer server functions.
 *
 * Elegibilidad + envío de reseñas por usuarios registrados.
 * Políticas soportadas (Ola Carril A · v2.5):
 *   A) verified_purchase  → hay order_items pagados del usuario para el
 *      subject (product o business). Auto-publica.
 *   B) managed_visit      → el usuario es participante activo de un
 *      concierge_case vinculado al subject (business). Auto-publica.
 *   D) declared_visitor   → declaración bajo protesta + fecha de visita.
 *      Va a moderación (`status='in_review'`).
 *
 * Frenos anti-abuso:
 *   - Requiere sesión (`requireSupabaseAuth`).
 *   - Índice único (autor, sujeto) — una reseña activa por sujeto.
 *   - Rating 1..5, body 30..2000 chars, title ≤ 120.
 *   - Policy D requiere `declaredVisit=true` + `visitDate` (ISO).
 *   - Fuente/weight/visit_type se calculan en servidor (no confiables
 *     desde cliente).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  PublicReviewSubjectKind,
  PublicReviewVerifiedSource,
} from "./public-reads.functions";

const ALLOWED_SUBJECT_KINDS: PublicReviewSubjectKind[] = [
  "business",
  "product",
  "destination",
  "tourism_region",
  "business_category",
  "event",
];

function normSubject(raw: unknown): PublicReviewSubjectKind {
  if (typeof raw !== "string" || !ALLOWED_SUBJECT_KINDS.includes(raw as PublicReviewSubjectKind)) {
    throw new Error(`Invalid subjectKind: ${String(raw)}`);
  }
  return raw as PublicReviewSubjectKind;
}
function normUuid(raw: unknown, label: string): string {
  if (typeof raw !== "string" || !/^[0-9a-f-]{36}$/i.test(raw)) {
    throw new Error(`Invalid ${label}`);
  }
  return raw;
}

export type EligibilityPolicy =
  | "verified_purchase"
  | "managed_visit"
  | "declared_visitor";

export interface ReviewEligibility {
  eligible: boolean;
  policy: EligibilityPolicy | null;
  hasExistingReview: boolean;
  requiresDeclaration: boolean;
  weight: number;
  reason: string | null;
}

/* ------------------------------------------------------------------ *
 * Shared eligibility resolver — used by both check + submit
 * ------------------------------------------------------------------ */
async function resolveEligibility(
  supabase: ReturnType<typeof getClient>,
  userId: string,
  subjectKind: PublicReviewSubjectKind,
  subjectId: string,
): Promise<ReviewEligibility> {
  // 1) Existing active review by this user for this subject
  const { data: existing, error: eErr } = await supabase
    .from("reviews")
    .select("id, status")
    .eq("author_user_id", userId)
    .eq("subject_kind", subjectKind)
    .eq("subject_id", subjectId)
    .is("deleted_at", null)
    .limit(1);
  if (eErr) throw new Error(eErr.message);
  const hasExistingReview = (existing ?? []).length > 0;

  // 2) verified_purchase — order_items JOIN orders (RLS scopes to caller)
  if (subjectKind === "product" || subjectKind === "business") {
    const filterCol = subjectKind === "product" ? "product_id" : "business_id";
    const { data: items, error: iErr } = await supabase
      .from("order_items")
      .select("id, orders!inner(user_id, status)")
      .eq(filterCol, subjectId)
      .eq("orders.user_id", userId)
      .in("orders.status", ["paid", "confirmed", "completed", "fulfilled"])
      .limit(1);
    if (iErr) throw new Error(iErr.message);
    if ((items ?? []).length > 0) {
      return {
        eligible: !hasExistingReview,
        policy: "verified_purchase",
        hasExistingReview,
        requiresDeclaration: false,
        weight: 1.0,
        reason: hasExistingReview ? "already_reviewed" : null,
      };
    }
  }

  // 3) managed_visit — user is active participant in a closed concierge_case
  //    linked to this subject (business today; product mapping in a later wave).
  if (subjectKind === "business") {
    const { data: cases, error: cErr } = await supabase
      .from("concierge_case_participants")
      .select(
        "case_id, is_active, concierge_cases!inner(id, status), concierge_case_links!inner(target_id, link_type)",
      )
      .eq("user_id", userId)
      .eq("is_active", true);
    if (!cErr && cases) {
      const match = (cases as unknown as Array<Record<string, unknown>>).some((row) => {
        const links = row["concierge_case_links"] as unknown;
        if (!Array.isArray(links)) return false;
        return links.some(
          (l) =>
            (l as { target_id?: string }).target_id === subjectId &&
            String((l as { link_type?: string }).link_type ?? "").includes("business"),
        );
      });
      if (match) {
        return {
          eligible: !hasExistingReview,
          policy: "managed_visit",
          hasExistingReview,
          requiresDeclaration: false,
          weight: 0.9,
          reason: hasExistingReview ? "already_reviewed" : null,
        };
      }
    }
  }

  // 4) declared_visitor — always available, requires declaration
  return {
    eligible: !hasExistingReview,
    policy: "declared_visitor",
    hasExistingReview,
    requiresDeclaration: true,
    weight: 0.6,
    reason: hasExistingReview ? "already_reviewed" : null,
  };
}

// Local helper to get a well-typed client reference from middleware context
function getClient(ctx: { supabase: unknown }) {
  return ctx.supabase as {
    from: (t: string) => {
      select: (cols: string) => any;
      insert: (row: Record<string, unknown>) => any;
    };
  };
}

/* ------------------------------------------------------------------ *
 * checkReviewEligibility
 * ------------------------------------------------------------------ */
export const checkReviewEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const d = (raw ?? {}) as { subjectKind?: unknown; subjectId?: unknown };
    return {
      subjectKind: normSubject(d.subjectKind),
      subjectId: normUuid(d.subjectId, "subjectId"),
    };
  })
  .handler(async ({ data, context }): Promise<ReviewEligibility> => {
    const supabase = getClient(context as { supabase: unknown });
    return resolveEligibility(
      supabase as never,
      (context as { userId: string }).userId,
      data.subjectKind,
      data.subjectId,
    );
  });

/* ------------------------------------------------------------------ *
 * submitReview
 * ------------------------------------------------------------------ */
export interface SubmitReviewResult {
  id: string;
  status: "in_review" | "published";
  policy: EligibilityPolicy;
  verifiedSource: PublicReviewVerifiedSource;
}

const POLICY_TO_SOURCE: Record<EligibilityPolicy, PublicReviewVerifiedSource> = {
  verified_purchase: "verified_purchase",
  managed_visit: "managed_visit",
  declared_visitor: "declared_visitor",
};

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const d = (raw ?? {}) as Record<string, unknown>;
    const rating = Number(d.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("rating must be an integer 1..5");
    }
    const body = typeof d.body === "string" ? d.body.trim() : "";
    if (body.length < 30 || body.length > 2000) {
      throw new Error("body must be 30..2000 chars");
    }
    const title =
      typeof d.title === "string" && d.title.trim().length > 0
        ? d.title.trim().slice(0, 120)
        : null;
    const visitDate =
      typeof d.visitDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.visitDate)
        ? d.visitDate
        : null;
    const declaredVisit = d.declaredVisit === true;
    const authorDisplayName =
      typeof d.authorDisplayName === "string" && d.authorDisplayName.trim().length > 0
        ? d.authorDisplayName.trim().slice(0, 80)
        : null;
    return {
      subjectKind: normSubject(d.subjectKind),
      subjectId: normUuid(d.subjectId, "subjectId"),
      rating,
      title,
      body,
      visitDate,
      declaredVisit,
      authorDisplayName,
    };
  })
  .handler(async ({ data, context }): Promise<SubmitReviewResult> => {
    const supabase = getClient(context as { supabase: unknown });
    const userId = (context as { userId: string }).userId;

    const elig = await resolveEligibility(
      supabase as never,
      userId,
      data.subjectKind,
      data.subjectId,
    );
    if (!elig.eligible || !elig.policy) {
      throw new Error(elig.reason ?? "not_eligible");
    }
    if (elig.requiresDeclaration) {
      if (!data.declaredVisit) throw new Error("declaration_required");
      if (!data.visitDate) throw new Error("visit_date_required");
    }

    const autoPublish =
      elig.policy === "verified_purchase" || elig.policy === "managed_visit";
    const nowIso = new Date().toISOString();

    const insertRow: Record<string, unknown> = {
      subject_kind: data.subjectKind,
      subject_id: data.subjectId,
      author_user_id: userId,
      author_display_name: data.authorDisplayName,
      rating: data.rating,
      title: data.title,
      body: data.body,
      language: "es",
      status: autoPublish ? "published" : "in_review",
      published_at: autoPublish ? nowIso : null,
      verified_source: POLICY_TO_SOURCE[elig.policy],
      visit_date: data.visitDate,
      visit_type: elig.policy === "managed_visit" ? "managed" : elig.policy === "verified_purchase" ? "purchased" : "declared",
      weight: elig.weight,
      created_by: userId,
      updated_by: userId,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("reviews")
      .insert(insertRow)
      .select("id, status")
      .single();
    if (insErr) {
      if (String(insErr.message).includes("reviews_unique_author_subject")) {
        throw new Error("already_reviewed");
      }
      throw new Error(insErr.message);
    }
    return {
      id: String((inserted as { id: string }).id),
      status: (inserted as { status: "in_review" | "published" }).status,
      policy: elig.policy,
      verifiedSource: POLICY_TO_SOURCE[elig.policy],
    };
  });