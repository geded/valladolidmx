import { createServerFn } from "@tanstack/react-start";
import type { Json } from "@/integrations/supabase/types";
import {
  createIneligibleBusinessPremiumResult,
  evaluateBusinessPremiumEligibility,
  type BusinessPremiumContact,
  type BusinessPremiumEligibilityResult,
  type BusinessPremiumLocation,
  type BusinessPremiumMediaItem,
} from "./business-premium-surface.contract";
import { toStablePublicMediaUrl } from "@/lib/media/stable-public-url";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: Json | null): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function positiveDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

interface PremiumMediaRow {
  id: string;
  role: string;
  media_assets: {
    id: string;
    kind: string;
    storage_bucket: string;
    storage_path: string;
    alt_text: string | null;
    alt_text_ai: string | null;
    caption: string | null;
    width: number | null;
    height: number | null;
    status: string;
    deleted_at: string | null;
    pipeline_status: string;
    review_state: string;
    metadata: Json;
    created_by: string | null;
    is_demo_seed: boolean;
  } | null;
}

function hasPortalProvenance(
  row: PremiumMediaRow,
  businessId: string,
  auditNotes: readonly string[],
): boolean {
  const asset = row.media_assets;
  if (!asset || !isRecord(asset.metadata)) return false;
  return (
    asset.metadata.source === "portal" &&
    asset.metadata.business_id === businessId &&
    asset.metadata.role === row.role &&
    nonEmpty(asset.created_by) &&
    asset.storage_path.startsWith(`${businessId}/`) &&
    auditNotes.some((notes) => notes.includes(asset.storage_path))
  );
}

function eligibleMediaRow(
  row: PremiumMediaRow,
  businessId: string,
  auditNotes: readonly string[],
): boolean {
  const asset = row.media_assets;
  return Boolean(
    asset &&
    (row.role === "cover" || row.role === "gallery") &&
    asset.kind === "image" &&
    asset.status === "published" &&
    asset.deleted_at === null &&
    !asset.is_demo_seed &&
    asset.pipeline_status === "ready" &&
    asset.review_state === "approved" &&
    (nonEmpty(asset.alt_text) || nonEmpty(asset.alt_text_ai)) &&
    positiveDimension(asset.width) &&
    positiveDimension(asset.height) &&
    hasPortalProvenance(row, businessId, auditNotes),
  );
}

export const getBusinessPremiumEligibility = createServerFn({ method: "GET" })
  .validator((input: { businessId: string }) => {
    if (!input || !UUID_PATTERN.test(input.businessId)) throw new Error("invalid_business_id");
    return input;
  })
  .handler(async ({ data }): Promise<BusinessPremiumEligibilityResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [
        businessResult,
        planResult,
        publicationAuditResult,
        mediaResult,
        mediaAuditResult,
        locationResult,
        contactResult,
      ] = await Promise.all([
        supabaseAdmin
          .from("businesses")
          .select(
            "id, status, description, primary_category_id, verification_document_url, is_demo_seed",
          )
          .eq("id", data.businessId)
          .is("deleted_at", null)
          .maybeSingle(),
        supabaseAdmin
          .from("business_effective_visibility")
          .select("plan_slug, grant_id, is_default, expires_at")
          .eq("business_id", data.businessId)
          .maybeSingle(),
        supabaseAdmin
          .from("permissions_audit_log")
          .select("id")
          .eq("action", "business_published")
          .eq("scope_type", "business")
          .eq("scope_id", data.businessId)
          .not("actor_user_id", "is", null)
          .limit(1),
        supabaseAdmin
          .from("business_media")
          .select(
            "id, role, media_assets:media_assets(id, kind, storage_bucket, storage_path, alt_text, alt_text_ai, caption, width, height, status, deleted_at, pipeline_status, review_state, metadata, created_by, is_demo_seed)",
          )
          .eq("business_id", data.businessId)
          .in("role", ["cover", "gallery"])
          .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("content_audit_log")
          .select("notes")
          .eq("entity_kind", "business")
          .eq("entity_id", data.businessId)
          .eq("action", "media.create"),
        supabaseAdmin
          .from("business_locations")
          .select("address_line1, address_line2, latitude, longitude, is_primary")
          .eq("business_id", data.businessId)
          .is("deleted_at", null)
          .order("is_primary", { ascending: false })
          .limit(1),
        supabaseAdmin
          .from("business_contacts")
          .select("contact_type, value, label")
          .eq("business_id", data.businessId)
          .eq("is_public", true)
          .is("deleted_at", null)
          .order("sort_order", { ascending: true })
          .limit(1),
      ]);

      const results = [
        businessResult,
        planResult,
        publicationAuditResult,
        mediaResult,
        mediaAuditResult,
        locationResult,
        contactResult,
      ];
      if (results.some((result) => result.error))
        return createIneligibleBusinessPremiumResult(["eligibility_read_failed"]);

      const business = businessResult.data;
      if (!business || business.is_demo_seed)
        return createIneligibleBusinessPremiumResult(["verification_missing"]);

      const locationRow = locationResult.data?.[0] ?? null;
      const location: BusinessPremiumLocation | null =
        locationRow &&
        nonEmpty(locationRow.address_line1) &&
        typeof locationRow.latitude === "number" &&
        Number.isFinite(locationRow.latitude) &&
        typeof locationRow.longitude === "number" &&
        Number.isFinite(locationRow.longitude)
          ? {
              addressLine1: locationRow.address_line1,
              addressLine2: locationRow.address_line2,
              latitude: locationRow.latitude,
              longitude: locationRow.longitude,
            }
          : null;
      const contactRow = contactResult.data?.[0] ?? null;
      const contact: BusinessPremiumContact | null =
        contactRow && nonEmpty(contactRow.contact_type) && nonEmpty(contactRow.value)
          ? {
              type: contactRow.contact_type,
              value: contactRow.value,
              label: contactRow.label,
            }
          : null;

      const auditNotes = (mediaAuditResult.data ?? []).map((row) => row.notes).filter(nonEmpty);
      const eligibleRows = ((mediaResult.data ?? []) as unknown as PremiumMediaRow[]).filter(
        (row) => eligibleMediaRow(row, data.businessId, auditNotes),
      );
      const signedMedia = await Promise.all(
        eligibleRows.map(async (row): Promise<BusinessPremiumMediaItem | null> => {
          const asset = row.media_assets;
          if (!asset || (row.role !== "cover" && row.role !== "gallery")) return null;
          const { data: signed, error } = await supabaseAdmin.storage
            .from(asset.storage_bucket)
            .createSignedUrl(asset.storage_path, 3600);
          if (error || !nonEmpty(signed?.signedUrl)) return null;
          return {
            id: asset.id,
            role: row.role,
            url: signed.signedUrl,
            // 19.24 — Ruta pública estable para metadatos indexables.
            stableUrl: toStablePublicMediaUrl(asset.storage_bucket, asset.storage_path),
            alt: nonEmpty(asset.alt_text) ? asset.alt_text : (asset.alt_text_ai ?? ""),
            caption: asset.caption,
            width: asset.width ?? 0,
            height: asset.height ?? 0,
          };
        }),
      );
      const media = signedMedia.filter((item): item is BusinessPremiumMediaItem => item !== null);
      const plan = planResult.data;
      const hasCurrentGrant = Boolean(
        plan?.grant_id && (!plan.expires_at || new Date(plan.expires_at).getTime() > Date.now()),
      );
      const cover = media.find((item) => item.role === "cover") ?? null;

      return evaluateBusinessPremiumEligibility({
        planSlug: plan?.plan_slug ?? null,
        hasActiveGrant: hasCurrentGrant,
        isDefaultPlan: Boolean(plan?.is_default),
        isPublished: business.status === "published",
        hasVerificationDocument: nonEmpty(business.verification_document_url),
        hasAdminPublicationAudit: (publicationAuditResult.data?.length ?? 0) > 0,
        hasCompleteDescription:
          nonEmpty(business.description) && business.description.trim().length >= 80,
        hasCategory: nonEmpty(business.primary_category_id),
        location,
        contact,
        media,
        seoReady: Boolean(cover && location),
        // Gate global: el artefacto sólo puede publicarse si validate:i1 y el evidence I3-D pasan.
        accessibilityReady: true,
      });
    } catch {
      return createIneligibleBusinessPremiumResult(["eligibility_read_failed"]);
    }
  });
