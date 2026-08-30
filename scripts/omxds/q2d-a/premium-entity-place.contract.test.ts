/**
 * G8-Q2D-A · Contrato de la plantilla reusable `premium-entity-place`.
 *
 * Verifica gobernanza, seis variantes cerradas, defaults por variante, la
 * regla fail-closed de medios, la persistencia del selector y el registro en
 * el Experience Builder sin superficie pública.
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  PLACE_PREMIUM_BLOCK_TYPE,
  PLACE_PREMIUM_FALLBACK_NOTICE,
  PLACE_PREMIUM_TEMPLATE_ID,
  PLACE_PREMIUM_VARIANTS,
  getPlacePremiumVariant,
  hasApprovedGovernedCover,
  placePremiumDefaultConfig,
  resolvePlacePremiumQ2d,
  resolvePlacePresentation,
} from "@/components/place-premium/place-premium-config";
import { PAGE_KIND_REGISTRY } from "@/lib/experience-builder/page-kind-registry";
import {
  PREMIUM_TEMPLATE_PRESETS,
  isPremiumPresetCompatible,
  listPremiumTemplatePresetsForKind,
} from "@/lib/experience-builder/premium-template-registry";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const BLUEPRINT = "docs/blueprint/19.43-G8-Q2D-A-PREMIUM-ENTITY-PLACE-TEMPLATE-v1.0.md";
const PCA = "docs/governance/product-authorizations/PCA-2026-047.json";
const EVIDENCE = "docs/evidence/omxds-q2d-a/EVIDENCE-MANIFEST.md";

describe("G8-Q2D-A · gobernanza", () => {
  test("el instrumento existe, está aprobado y no declara rutas públicas", () => {
    const pca = JSON.parse(read(PCA));
    expect(pca.id).toBe("PCA-2026-047");
    expect(pca.status).toBe("Approved");
    expect(pca.blueprint).toBe(BLUEPRINT);
    expect(pca.public_routes).toEqual([]);
    expect(pca.required_tests).toContain("bun run validate:q2d:a");
  });

  test("el blueprint y la evidencia documentan la regla fail-closed", () => {
    for (const file of [BLUEPRINT, EVIDENCE]) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
      expect(read(file)).toContain("fail-closed");
    }
  });
});

describe("G8-Q2D-A · variantes cerradas", () => {
  test("son exactamente seis con los slugs aprobados", () => {
    expect(PLACE_PREMIUM_VARIANTS.map((v) => v.slug)).toEqual([
      "zona-arqueologica",
      "cenote",
      "area-natural",
      "museo",
      "templo-convento",
      "mercado-artesanal",
    ]);
  });

  test("las direcciones por defecto respetan la aprobación Founder", () => {
    const bySlug = Object.fromEntries(
      PLACE_PREMIUM_VARIANTS.map((v) => [v.slug, v.defaultPresentation]),
    );
    expect(bySlug["zona-arqueologica"]).toBe("cinematic");
    expect(bySlug.cenote).toBe("cinematic");
    expect(bySlug["area-natural"]).toBe("cinematic");
    expect(bySlug.museo).toBe("editorial");
    expect(bySlug["templo-convento"]).toBe("editorial");
    expect(bySlug["mercado-artesanal"]).toBe("editorial");
  });

  test("una variante desconocida es fail-closed", () => {
    expect(getPlacePremiumVariant("hotel-boutique")).toBeNull();
    expect(getPlacePremiumVariant(null)).toBeNull();
    expect(
      resolvePlacePresentation({ variant: "hotel-boutique", hasApprovedCover: true }).presentation,
    ).toBe("editorial");
  });
});

describe("G8-Q2D-A · regla fail-closed de medios", () => {
  test("cinematográfico sin portada aprobada cae a Editorial con aviso", () => {
    const r = resolvePlacePresentation({
      variant: "zona-arqueologica",
      requested: "cinematic",
      hasApprovedCover: false,
    });
    expect(r.presentation).toBe("editorial");
    expect(r.fallbackApplied).toBe(true);
    expect(r.builderNotice).toBe(PLACE_PREMIUM_FALLBACK_NOTICE);
  });

  test("con portada aprobada el modo cinematográfico se activa sin reconstruir", () => {
    const r = resolvePlacePresentation({
      variant: "cenote",
      requested: "cinematic",
      hasApprovedCover: true,
    });
    expect(r.presentation).toBe("cinematic");
    expect(r.fallbackApplied).toBe(false);
    expect(r.builderNotice).toBeNull();
  });

  test("una portada sin aprobación gobernada no cuenta como acreditada", () => {
    expect(hasApprovedGovernedCover({ hero_media_url: "https://x/y.jpg" })).toBe(false);
    expect(
      hasApprovedGovernedCover({ hero_media_url: "https://x/y.jpg", hero_media_approved: true }),
    ).toBe(true);
  });

  test("sin portada aprobada la ficha nunca hereda una imagen ajena", () => {
    const resolved = resolvePlacePremiumQ2d({
      variant: "zona-arqueologica",
      presentation_mode: "cinematic",
      hero_media_url: "https://ejemplo/otro-lugar.jpg",
      hero_media_approved: false,
    });
    expect(resolved.presentation).toBe("editorial");
    expect(resolved.content.hero.cover.url).toBeNull();
    expect(resolved.builderNotice).toBe(PLACE_PREMIUM_FALLBACK_NOTICE);
  });
});

describe("G8-Q2D-A · selector persistible y registro", () => {
  test("la configuración por defecto persiste la dirección de la variante", () => {
    expect(placePremiumDefaultConfig("museo").presentation_mode).toBe("editorial");
    expect(placePremiumDefaultConfig("cenote").presentation_mode).toBe("cinematic");
    expect(placePremiumDefaultConfig("desconocida").variant).toBe("zona-arqueologica");
  });

  test("existe pageKind=place con JSON-LD Place", () => {
    const kind = PAGE_KIND_REGISTRY.find((k) => k.kind === "place");
    expect(kind).toBeDefined();
    expect(kind?.defaults?.jsonLdType).toBe("Place");
  });

  test("los seis presets son compatibles sólo con pageKind=place", () => {
    const presets = PREMIUM_TEMPLATE_PRESETS.filter((p) => p.family === "place");
    expect(presets).toHaveLength(6);
    expect(presets.every((p) => p.blockType === PLACE_PREMIUM_BLOCK_TYPE)).toBe(true);
    expect(listPremiumTemplatePresetsForKind("place")).toHaveLength(6);
    expect(isPremiumPresetCompatible(PLACE_PREMIUM_TEMPLATE_ID, "destination")).toBe(false);
    expect(isPremiumPresetCompatible(PLACE_PREMIUM_TEMPLATE_ID, "place")).toBe(true);
  });

  test("el bloque se renderiza con la autoridad visual aprobada y sin rutas públicas", () => {
    const renderer = read("src/lib/experience-builder/composition-renderer.tsx");
    expect(renderer).toContain(`"${PLACE_PREMIUM_BLOCK_TYPE}": PlacePremiumQ2dRender`);
    expect(renderer).toContain("PlacePremiumSurface");
    const policy = read("src/lib/experience-builder/editorial-builder-policy.ts");
    expect(policy).toContain(PLACE_PREMIUM_BLOCK_TYPE);
    expect(policy).toContain("lugar-premium-q2d-approved");
  });
});
