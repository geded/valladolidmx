import { describe, expect, test } from "bun:test";
import {
  createBusinessPremiumSurfaceContract,
  evaluateBusinessPremiumEligibility,
  type BusinessPremiumEligibilityFacts,
  type BusinessPremiumMediaItem,
} from "../../../src/lib/omxds/surfaces/business-premium-surface.contract";
import type { BusinessSurfaceContractInput } from "../../../src/lib/omxds/surfaces/business-surface.contract";

const fictionalMedia: BusinessPremiumMediaItem[] = [
  {
    id: "00000000-0000-4000-8000-000000000041",
    role: "cover",
    url: "/fixtures/fictional/i3-d/cover.webp",
    alt: "Portada de Posada Ceiba Ficticia",
    caption: null,
    width: 1600,
    height: 900,
  },
  {
    id: "00000000-0000-4000-8000-000000000042",
    role: "gallery",
    url: "/fixtures/fictional/i3-d/gallery-1.webp",
    alt: "Patio ficticio",
    caption: "Escenario enteramente ficticio",
    width: 1200,
    height: 800,
  },
  {
    id: "00000000-0000-4000-8000-000000000043",
    role: "gallery",
    url: "/fixtures/fictional/i3-d/gallery-2.webp",
    alt: "Jardín ficticio",
    caption: null,
    width: 1200,
    height: 800,
  },
];

const fictionalFacts: BusinessPremiumEligibilityFacts = {
  planSlug: "premium",
  hasActiveGrant: true,
  isDefaultPlan: false,
  isPublished: true,
  hasVerificationDocument: true,
  hasAdminPublicationAudit: true,
  hasCompleteDescription: true,
  hasCategory: true,
  location: {
    addressLine1: "Calle Ficticia 41",
    addressLine2: null,
    latitude: 20.0041,
    longitude: -88.0041,
  },
  contact: { type: "phone", value: "+52 000 000 0041", label: "Teléfono ficticio" },
  media: fictionalMedia,
  seoReady: true,
  accessibilityReady: true,
};

const fictionalBusiness: BusinessSurfaceContractInput = {
  id: "00000000-0000-4000-8000-000000000040",
  slug: "posada-ceiba-ficticia",
  displayName: "Posada Ceiba Ficticia",
  destinationSlug: "destino-ficticio",
  categorySlug: "servicio",
  coverUrl: null,
  latitude: null,
  longitude: null,
  verified: false,
  relatedCount: 2,
};

describe("I3-D Business Premium conservative eligibility", () => {
  test("requires an effective Premium grant plus every governed evidence gate", () => {
    const result = evaluateBusinessPremiumEligibility(fictionalFacts);
    expect(result.eligible).toBe(true);
    expect(result.planSlug).toBe("premium");
    expect(result.reasons).toEqual([]);
    expect(result.cover?.role).toBe("cover");
    expect(result.gallery).toHaveLength(2);
  });

  test("accepts Elite as the higher effective visibility entitlement", () => {
    expect(
      evaluateBusinessPremiumEligibility({ ...fictionalFacts, planSlug: "elite" }).eligible,
    ).toBe(true);
  });

  test("fails closed when plan, verification, media, content, SEO or accessibility is absent", () => {
    const result = evaluateBusinessPremiumEligibility({
      ...fictionalFacts,
      planSlug: "premium",
      hasActiveGrant: false,
      hasVerificationDocument: false,
      media: [],
      hasCompleteDescription: false,
      location: null,
      contact: null,
      seoReady: false,
      accessibilityReady: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "no_active_premium_grant",
        "verification_missing",
        "cover_missing",
        "gallery_incomplete",
        "content_incomplete",
        "location_missing",
        "contact_missing",
        "seo_incomplete",
        "accessibility_gate_failed",
      ]),
    );
  });

  test("does not accept a default plan or a plan name without a real grant", () => {
    expect(
      evaluateBusinessPremiumEligibility({ ...fictionalFacts, isDefaultPlan: true }).eligible,
    ).toBe(false);
    expect(
      evaluateBusinessPremiumEligibility({
        ...fictionalFacts,
        planSlug: "premium",
        hasActiveGrant: false,
      }).eligible,
    ).toBe(false);
  });

  test("creates family Business with one internal non-commercial dominant CTA", () => {
    const eligibility = evaluateBusinessPremiumEligibility(fictionalFacts);
    const resolution = createBusinessPremiumSurfaceContract(
      fictionalBusiness,
      eligibility,
      "fixture",
    );
    expect(resolution?.contract.family).toBe("business");
    expect(resolution?.contract.provenance.reference).toBe(
      "fixture:fictional:i3-d:posada-ceiba-ficticia",
    );
    expect(resolution?.contract.actions).toHaveLength(1);
    expect(resolution?.contract.actions[0]).toMatchObject({
      id: "contact",
      role: "dominant",
      href: "/oriente-maya/destino-ficticio/servicio/posada-ceiba-ficticia#contacto",
    });
    expect(resolution?.contract.omissions).toEqual(
      expect.arrayContaining([
        "offer",
        "price",
        "availability",
        "reservation",
        "reputation",
        "delivery",
      ]),
    );
  });

  test("never creates Premium from an ineligible result", () => {
    const ineligible = evaluateBusinessPremiumEligibility({
      ...fictionalFacts,
      hasAdminPublicationAudit: false,
    });
    expect(
      createBusinessPremiumSurfaceContract(fictionalBusiness, ineligible, "fixture"),
    ).toBeNull();
  });
});
