/**
 * G8-R1-F1L · P0 — Pruebas de regresión de la regla vinculante familia ≠ medios.
 *
 * Cubre: entidad CON portada, entidad SIN portada y pérdida posterior de la
 * aprobación de portada, para destino, hotel, restaurante, evento, experiencia,
 * tour y lugar.
 */
import { describe, expect, it } from "vitest";
import {
  resolveCanonicalPresentation,
  DESTINATION_PREMIUM_PRESET_ID,
  type CanonicalPresentationInput,
} from "@/lib/omxds/presentation/canonical-presentation";
import type { GovernedCoverFacts } from "@/lib/omxds/presentation/entity-presentation";

const APPROVED_COVER: GovernedCoverFacts = {
  belongsToEntity: true,
  reviewState: "approved",
  pipelineReady: true,
  hasDeclaredRights: true,
  hasCredit: true,
  hasHumanAlt: true,
  hasChecksum: true,
  isSignedTemporaryUrl: false,
  width: 2400,
  height: 1350,
  isDemoSeed: false,
};

const CASES: ReadonlyArray<{
  label: string;
  input: CanonicalPresentationInput;
  family: string;
  presetId: string;
}> = [
  {
    label: "destino",
    input: { entityId: "d1", entityType: "destination" },
    family: "destination",
    presetId: DESTINATION_PREMIUM_PRESET_ID,
  },
  {
    label: "hotel",
    input: { entityId: "b1", entityType: "business", categorySlug: "hoteles" },
    family: "hotel",
    presetId: "premium-entity-hotel",
  },
  {
    label: "restaurante",
    input: { entityId: "b2", entityType: "business", categorySlug: "restaurantes" },
    family: "restaurant",
    presetId: "premium-entity-restaurant",
  },
  {
    label: "evento",
    input: { entityId: "e1", entityType: "event" },
    family: "event",
    presetId: "premium-entity-event",
  },
  {
    label: "experiencia",
    input: { entityId: "p1", entityType: "product", productType: "experience" },
    family: "experience",
    presetId: "premium-entity-experience",
  },
  {
    label: "tour",
    input: { entityId: "p2", entityType: "product", productType: "tour" },
    family: "tour",
    presetId: "premium-entity-tour",
  },
];

describe("G8-R1-F1L·P0 · familia ≠ medios", () => {
  for (const c of CASES) {
    it(`${c.label}: CON portada aprobada mantiene familia y habilita Cinematográfica`, () => {
      const r = resolveCanonicalPresentation({
        ...c.input,
        cover: APPROVED_COVER,
        approvedMode: "cinematic",
        reviewState: "approved",
      });
      expect(r.family).toBe(c.family);
      expect(r.presetId).toBe(c.presetId);
      expect(r.surface).toBe("premium");
      expect(r.presentationMode).toBe("cinematic");
      expect(r.usesNeutralMarker).toBe(false);
      expect(r.fallbackReason).toBeNull();
    });

    it(`${c.label}: SIN portada conserva la misma familia premium en Editorial neutral`, () => {
      const r = resolveCanonicalPresentation({ ...c.input, cover: null });
      expect(r.family).toBe(c.family);
      expect(r.presetId).toBe(c.presetId);
      expect(r.surface).toBe("premium");
      expect(r.presentationMode).toBe("editorial");
      expect(r.usesNeutralMarker).toBe(true);
      expect(r.familyDeterminedBy).toBe("classification");
    });

    it(`${c.label}: pérdida posterior de aprobación cae a Editorial sin cambiar familia`, () => {
      const r = resolveCanonicalPresentation({
        ...c.input,
        cover: { ...APPROVED_COVER, reviewState: "rejected" },
        approvedMode: "cinematic",
        reviewState: "approved",
      });
      expect(r.family).toBe(c.family);
      expect(r.presetId).toBe(c.presetId);
      expect(r.surface).toBe("premium");
      expect(r.presentationMode).toBe("editorial");
      expect(r.fallbackReason).toBe("cover_not_eligible");
      expect(r.coverFailures).toContain("cover_not_approved");
    });
  }

  it("lugar: variante conocida sin portada conserva premium-entity-place", () => {
    const r = resolveCanonicalPresentation({
      entityId: "pl1",
      entityType: "place",
      placeType: "cenote",
      cover: null,
    });
    expect(r.family).toBe("place");
    expect(r.surface).toBe("premium");
    expect(r.presentationMode).toBe("editorial");
    expect(r.usesNeutralMarker).toBe(true);
  });

  it("medio demo nunca acredita Cinematográfica", () => {
    const r = resolveCanonicalPresentation({
      entityId: "b1",
      entityType: "business",
      categorySlug: "hoteles",
      cover: { ...APPROVED_COVER, isDemoSeed: true },
      approvedMode: "cinematic",
      reviewState: "approved",
    });
    expect(r.presentationMode).toBe("editorial");
    expect(r.coverFailures).toContain("demo_media");
    expect(r.presetId).toBe("premium-entity-hotel");
  });

  it("sólo el contexto explícito degrada a superficie estándar", () => {
    const r = resolveCanonicalPresentation({
      entityId: "b1",
      entityType: "business",
      categorySlug: "hoteles",
      cover: APPROVED_COVER,
      forceStandardSurface: true,
    });
    expect(r.surface).toBe("standard");
    expect(r.presetId).toBeNull();
  });

  it("clasificación sin modelo productivo resuelve estándar fail-closed", () => {
    const r = resolveCanonicalPresentation({
      entityId: "b9",
      entityType: "business",
      categorySlug: "categoria-inexistente",
    });
    expect(r.surface).toBe("standard");
    expect(r.presetId).toBeNull();
  });
});
