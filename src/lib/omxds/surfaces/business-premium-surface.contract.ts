import {
  createOmxdsSurfaceContract,
  type OmxdsSurfaceContract,
  type OmxdsSurfaceOmission,
} from "./surface-contract";
import type {
  BusinessSurfaceContractInput,
  BusinessSurfaceProvenanceKind,
} from "./business-surface.contract";

export const BUSINESS_PREMIUM_ELIGIBILITY_REASONS = [
  "eligibility_read_failed",
  "no_active_premium_grant",
  "verification_missing",
  "cover_missing",
  "gallery_incomplete",
  "content_incomplete",
  "location_missing",
  "contact_missing",
  "seo_incomplete",
  "accessibility_gate_failed",
] as const;

export type BusinessPremiumEligibilityReason =
  (typeof BUSINESS_PREMIUM_ELIGIBILITY_REASONS)[number];

export interface BusinessPremiumMediaItem {
  id: string;
  role: "cover" | "gallery";
  url: string;
  /**
   * 19.24 — Ruta pública estable canónica (`/api/public/studio-media/...`)
   * cuando el asset vive en el bucket gobernado. Única fuente admitida
   * para metadatos indexables (OG / JSON-LD). `null` = omitir imagen.
   */
  stableUrl?: string | null;
  alt: string;
  caption: string | null;
  width: number;
  height: number;
}

export interface BusinessPremiumLocation {
  addressLine1: string;
  addressLine2: string | null;
  latitude: number;
  longitude: number;
}

export interface BusinessPremiumContact {
  type: string;
  value: string;
  label: string | null;
}

export interface BusinessPremiumEligibilityFacts {
  planSlug: string | null;
  hasActiveGrant: boolean;
  isDefaultPlan: boolean;
  isPublished: boolean;
  hasVerificationDocument: boolean;
  hasAdminPublicationAudit: boolean;
  hasCompleteDescription: boolean;
  hasCategory: boolean;
  location: BusinessPremiumLocation | null;
  contact: BusinessPremiumContact | null;
  media: readonly BusinessPremiumMediaItem[];
  seoReady: boolean;
  accessibilityReady: boolean;
}

export interface BusinessPremiumEligibilityResult {
  eligible: boolean;
  reasons: readonly BusinessPremiumEligibilityReason[];
  planSlug: "premium" | "elite" | null;
  cover: BusinessPremiumMediaItem | null;
  gallery: readonly BusinessPremiumMediaItem[];
  location: BusinessPremiumLocation | null;
  contact: BusinessPremiumContact | null;
}

function resolveEligiblePlan(facts: BusinessPremiumEligibilityFacts): "premium" | "elite" | null {
  if (
    facts.hasActiveGrant &&
    !facts.isDefaultPlan &&
    (facts.planSlug === "premium" || facts.planSlug === "elite")
  )
    return facts.planSlug;
  return null;
}

export function evaluateBusinessPremiumEligibility(
  facts: BusinessPremiumEligibilityFacts,
): BusinessPremiumEligibilityResult {
  const reasons: BusinessPremiumEligibilityReason[] = [];
  const planSlug = resolveEligiblePlan(facts);
  const cover = facts.media.find((item) => item.role === "cover") ?? null;
  const gallery = facts.media.filter((item) => item.role === "gallery");

  if (!planSlug) reasons.push("no_active_premium_grant");
  if (!facts.isPublished || !facts.hasVerificationDocument || !facts.hasAdminPublicationAudit)
    reasons.push("verification_missing");
  if (!cover) reasons.push("cover_missing");
  if (gallery.length < 2) reasons.push("gallery_incomplete");
  if (!facts.hasCompleteDescription || !facts.hasCategory) reasons.push("content_incomplete");
  if (!facts.location) reasons.push("location_missing");
  if (!facts.contact) reasons.push("contact_missing");
  if (!facts.seoReady) reasons.push("seo_incomplete");
  if (!facts.accessibilityReady) reasons.push("accessibility_gate_failed");

  return {
    eligible: reasons.length === 0,
    reasons,
    planSlug,
    cover,
    gallery,
    location: facts.location,
    contact: facts.contact,
  };
}

export function createIneligibleBusinessPremiumResult(
  reasons: readonly BusinessPremiumEligibilityReason[] = ["no_active_premium_grant"],
): BusinessPremiumEligibilityResult {
  return {
    eligible: false,
    reasons,
    planSlug: null,
    cover: null,
    gallery: [],
    location: null,
    contact: null,
  };
}

export interface BusinessPremiumSurfaceContractResolution {
  contract: OmxdsSurfaceContract;
  eligibility: BusinessPremiumEligibilityResult;
}

export function createBusinessPremiumSurfaceContract(
  input: BusinessSurfaceContractInput,
  eligibility: BusinessPremiumEligibilityResult,
  provenanceKind: BusinessSurfaceProvenanceKind = "governed_source",
): BusinessPremiumSurfaceContractResolution | null {
  if (!eligibility.eligible || !eligibility.cover || eligibility.gallery.length < 2) return null;
  if (
    ![input.id, input.slug, input.displayName, input.destinationSlug, input.categorySlug].every(
      (value) => value.trim().length > 0,
    )
  )
    return null;

  const omissions: OmxdsSurfaceOmission[] = [
    "offer",
    "price",
    "availability",
    "policies",
    "schedule",
    "reservation",
    "reputation",
    "delivery",
  ];
  if (input.relatedCount === 0) omissions.push("collection");

  const contract = createOmxdsSurfaceContract({
    contractVersion: "i3-0",
    entityId: `business:${input.id}`,
    family: "business",
    title: input.displayName,
    state: "ready",
    provenance: {
      kind: provenanceKind,
      reference:
        provenanceKind === "fixture"
          ? `fixture:fictional:i3-d:${input.slug}`
          : `business:${input.id}:premium-eligibility-v1`,
    },
    actions: [
      {
        id: "contact",
        label: `Contactar a ${input.displayName}`,
        role: "dominant",
        href: `/oriente-maya/${encodeURIComponent(input.destinationSlug)}/${encodeURIComponent(input.categorySlug)}/${encodeURIComponent(input.slug)}#contacto`,
      },
    ],
    omissions,
  });

  return contract ? { contract, eligibility } : null;
}
