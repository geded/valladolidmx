/**
 * G8-R1-F1C-A · Gate de contrato: autoridad de presentación y elegibilidad premium.
 * Ejecutar: bunx vitest run scripts/omxds/r1-f1c-a/presentation-authority.contract.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  COVER_MIN_HEIGHT,
  COVER_MIN_WIDTH,
  evaluateGovernedCover,
  layoutsDifferMaterially,
  presentationCapabilities,
  presentationLayout,
  PRESENTATION_CONTROL_COPY,
  renderableSlots,
  resolveEffectivePresentation,
  resolvePresentationSource,
  surfaceForcedPresentation,
  surfaceHasPresentationSelector,
  type GovernedCoverFacts,
} from "@/lib/omxds/presentation/entity-presentation";
import {
  evaluatePremiumEligibility,
  type PremiumEligibilityFacts,
} from "@/lib/omxds/presentation/premium-eligibility";
import { resolvePresentationFamily } from "@/lib/omxds/presentation/presentation-family";

const goodCover: GovernedCoverFacts = {
  belongsToEntity: true,
  reviewState: "approved",
  pipelineReady: true,
  hasDeclaredRights: true,
  hasCredit: true,
  hasHumanAlt: true,
  hasChecksum: true,
  isSignedTemporaryUrl: false,
  width: COVER_MIN_WIDTH,
  height: COVER_MIN_HEIGHT,
  isDemoSeed: false,
};

describe("portada gobernada (G8-M1)", () => {
  it("acepta una portada completa", () => {
    expect(evaluateGovernedCover(goodCover).eligible).toBe(true);
  });

  it("es fail-closed sin portada", () => {
    expect(evaluateGovernedCover(null)).toEqual({
      eligible: false,
      failures: ["cover_missing"],
    });
  });

  const breakers: [string, Partial<GovernedCoverFacts>, string][] = [
    ["sin aprobación", { reviewState: "unreviewed" }, "cover_not_approved"],
    ["sin derechos", { hasDeclaredRights: false }, "rights_not_declared"],
    ["ALT no humano", { hasHumanAlt: false }, "human_alt_missing"],
    ["sin checksum", { hasChecksum: false }, "checksum_missing"],
    ["URL firmada temporal", { isSignedTemporaryUrl: true }, "signed_temporary_url"],
    ["medio demo", { isDemoSeed: true }, "demo_media"],
    ["resolución baja", { width: 900, height: 600 }, "resolution_below_minimum"],
    ["pipeline incompleto", { pipelineReady: false }, "pipeline_not_ready"],
  ];

  for (const [name, patch, failure] of breakers) {
    it(`rechaza: ${name}`, () => {
      const result = evaluateGovernedCover({ ...goodCover, ...patch });
      expect(result.eligible).toBe(false);
      expect(result.failures).toContain(failure);
    });
  }
});

describe("resolución del modo efectivo", () => {
  it("cinematográfica sólo con aprobación y portada elegible", () => {
    expect(
      resolveEffectivePresentation({
        requestedMode: "cinematic",
        approvedMode: "cinematic",
        reviewState: "approved",
        coverEligible: true,
      }).mode,
    ).toBe("cinematic");
  });

  it("cae a editorial si la portada deja de ser elegible y retiene la solicitud", () => {
    const r = resolveEffectivePresentation({
      requestedMode: "cinematic",
      approvedMode: "cinematic",
      reviewState: "approved",
      coverEligible: false,
    });
    expect(r.mode).toBe("editorial");
    expect(r.fallbackApplied).toBe(true);
    expect(r.retainedRequest).toBe("cinematic");
    expect(r.reason).toBe("cover_not_eligible");
  });

  it("una solicitud pendiente nunca renderiza cinematográfica", () => {
    const r = resolveEffectivePresentation({
      requestedMode: "cinematic",
      approvedMode: "editorial",
      reviewState: "pending",
      coverEligible: true,
    });
    expect(r.mode).toBe("editorial");
    expect(r.reason).toBe("pending_review");
  });

  it("editorial es el default seguro", () => {
    expect(
      resolveEffectivePresentation({
        requestedMode: "editorial",
        approvedMode: "editorial",
        reviewState: "not_requested",
        coverEligible: false,
      }),
    ).toMatchObject({ mode: "editorial", fallbackApplied: false });
  });
});

describe("precedencia sobre el contrato histórico de Lugares", () => {
  it("la autoridad nueva gana", () => {
    expect(resolvePresentationSource(true, "cinematic")).toBe("entity_presentation_modes");
  });
  it("legacy sólo cuando no hay fila", () => {
    expect(resolvePresentationSource(false, "cinematic")).toBe("legacy_place_metadata");
  });
  it("default fail-closed", () => {
    expect(resolvePresentationSource(false, null)).toBe("default");
  });
});

describe("diferencia real de DOM entre modos", () => {
  it("orden, densidad y portada difieren materialmente", () => {
    expect(layoutsDifferMaterially()).toBe(true);
  });
  it("editorial antepone identidad y datos esenciales", () => {
    expect(presentationLayout("editorial").order[0]).toBe("identity");
  });
  it("cinematográfica antepone la portada a viewport completo", () => {
    const l = presentationLayout("cinematic");
    expect(l.order[0]).toBe("cover");
    expect(l.coverIsViewportHeight).toBe(true);
    expect(l.identityOverlaysCover).toBe(true);
  });
  it("un único H1 en ambos modos", () => {
    expect(presentationLayout("editorial").headingLevel).toBe(1);
    expect(presentationLayout("cinematic").headingLevel).toBe(1);
  });
  it("omite slots sin información real", () => {
    const slots = renderableSlots("editorial", { identity: true, narrative: true });
    expect(slots).toEqual(["identity", "narrative"]);
    expect(slots).not.toContain("map");
  });
});

describe("alcance del selector", () => {
  it("las fichas individuales lo exponen", () => {
    expect(surfaceHasPresentationSelector("business_detail")).toBe(true);
  });
  it("home, destino, listados y landing SEO no", () => {
    for (const s of ["home_premium", "destination_premium", "listing_premium", "seo_landing"])
      expect(surfaceHasPresentationSelector(s)).toBe(false);
  });
  it("la landing SEO queda forzada a editorial", () => {
    expect(surfaceForcedPresentation("seo_landing")).toBe("editorial");
  });
});

describe("facultades por rol", () => {
  it("el equipo de la empresa solicita pero no aprueba ni publica", () => {
    const c = presentationCapabilities("owner", true);
    expect(c.canRequestCinematic).toBe(true);
    expect(c.canApprove).toBe(false);
    expect(c.canChangeFamily).toBe(false);
    expect(c.canPublish).toBe(false);
  });
  it("staff aprueba", () => {
    expect(presentationCapabilities("editor", false).canApprove).toBe(true);
  });
  it("un tercero sin propiedad no tiene control", () => {
    expect(presentationCapabilities("owner", false).canChooseEditorial).toBe(false);
    expect(presentationCapabilities("traveler", true).canChooseEditorial).toBe(false);
    expect(presentationCapabilities("anon", false).canRequestCinematic).toBe(false);
  });
});

describe("copy del control sin lenguaje técnico", () => {
  it("no expone presets ni identificadores", () => {
    const text = JSON.stringify(PRESENTATION_CONTROL_COPY).toLowerCase();
    for (const banned of ["preset", "slug", "uuid", "contrato", "json", "omxds"])
      expect(text).not.toContain(banned);
  });
  it("declara el requisito de fotografía aprobada", () => {
    expect(PRESENTATION_CONTROL_COPY.cinematic.help).toContain("fotografía aprobada");
  });
});

describe("asignación automática de familia", () => {
  it("hotel resuelve por categoría", () => {
    const r = resolvePresentationFamily({
      entityId: "e1",
      entityType: "business",
      categorySlug: "hoteles",
    });
    expect(r.family).toBe("hotel");
  });
  it("empresa turística genérica tiene familia propia", () => {
    const r = resolvePresentationFamily({
      entityId: "e2",
      entityType: "business",
      categorySlug: "tour-operador",
    });
    expect(r.family).toBe("business_generic");
    expect(r.unknownClassification).toBe(false);
  });
  it("categoría desconocida cae a estándar fail-closed, no a genérica", () => {
    const r = resolvePresentationFamily({
      entityId: "e3",
      entityType: "business",
      categorySlug: "categoria-inexistente",
    });
    expect(r.family).toBeNull();
    expect(r.source).toBe("standard");
    expect(r.unknownClassification).toBe(true);
  });
  it("lugar delega en el contrato acreditado", () => {
    const r = resolvePresentationFamily({
      entityId: "e4",
      entityType: "place",
      placeType: "cenote",
    });
    expect(r.family).toBe("place");
  });
});

describe("elegibilidad premium determinista", () => {
  const base: PremiumEligibilityFacts = {
    kind: "business",
    editorialState: "approved",
    canonicalClassification: "hoteles",
    canonicalPath: "/oriente-maya/valladolid/hoteles/demo",
    hasRealContent: true,
    isDemoSeed: false,
    cover: goodCover,
    approvedGalleryCount: 3,
    hasValidLocation: true,
    hasRequiredRelations: true,
    hasAuditTrail: true,
  };

  it("aprueba una ficha completa sin publicarla", () => {
    const r = evaluatePremiumEligibility(base);
    expect(r.eligible).toBe(true);
    expect(r.publishes).toBe(false);
    expect(r.activatesFlag).toBe(false);
  });

  /**
   * G8-R1-F1L · P0 — familia ≠ medios. Los déficits de fotografía ya no
   * expulsan a la entidad de su familia premium: sólo bloquean el modo
   * Cinematográfico. El resto de requisitos sigue siendo bloqueante.
   */
  const mediaCases: [string, Partial<PremiumEligibilityFacts>, string][] = [
    ["galería insuficiente", { approvedGalleryCount: 1 }, "gallery_minimum"],
    ["sin portada", { cover: null }, "cover:cover_missing"],
  ];

  for (const [name, patch, missing] of mediaCases) {
    it(`mantiene familia premium en modo editorial: ${name}`, () => {
      const r = evaluatePremiumEligibility({ ...base, ...patch });
      expect(r.familyEligible).toBe(true);
      expect(r.cinematicEligible).toBe(false);
      expect(r.missing).toContain(missing);
    });
  }

  const cases: [string, Partial<PremiumEligibilityFacts>, string][] = [
    ["sin estado editorial", { editorialState: "draft" }, "editorial_state"],
    ["sin clasificación", { canonicalClassification: null }, "canonical_classification"],
    ["sin ruta canónica", { canonicalPath: null }, "canonical_path"],
    ["con contenido demo", { isDemoSeed: true }, "demo_content_present"],
    ["sin ubicación", { hasValidLocation: false }, "location"],
    ["sin relaciones", { hasRequiredRelations: false }, "required_relations"],
    ["sin bitácora", { hasAuditTrail: false }, "audit_trail"],
  ];

  for (const [name, patch, missing] of cases) {
    it(`rechaza: ${name}`, () => {
      const r = evaluatePremiumEligibility({ ...base, ...patch });
      expect(r.eligible).toBe(false);
      expect(r.missing).toContain(missing);
    });
  }

  it("evento exige menos galería que empresa, sin bajar el resto del estándar", () => {
    const r = evaluatePremiumEligibility({ ...base, kind: "event", approvedGalleryCount: 1 });
    expect(r.eligible).toBe(true);
  });

  it("producto no exige ubicación propia", () => {
    const r = evaluatePremiumEligibility({ ...base, kind: "product", hasValidLocation: false });
    expect(r.eligible).toBe(true);
  });
});
