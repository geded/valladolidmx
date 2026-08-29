/**
 * G8-R1-C+L · Contrato del resolutor canónico (C1) y de la plantilla
 * reusable `premium-seo-landing` (L1/L2).
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  CANONICAL_ENTITY_FAMILIES,
  canonicalFamilyPresetId,
  isPlaceEntityType,
  resolveCanonicalEntityTemplate,
} from "@/lib/experience-builder/canonical-entity-resolver";
import {
  SEO_LANDING_AUTHORITY,
  SEO_LANDING_BLOCK_COUNT,
  SEO_LANDING_SLOTS,
  SEO_LANDING_TEMPLATE_ID,
  buildSeoLandingComposition,
  buildSeoLandingFaqJsonLd,
  readSeoLandingChrome,
} from "@/lib/experience-builder/seo-landing/seo-landing-template";

const root = process.cwd();
const exists = (f: string) => fs.existsSync(path.join(root, f));
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8");

const BLUEPRINT = "docs/blueprint/19.46-G8-R1-C-L-RESOLVER-AND-SEO-LANDING-v1.0.md";
const PCA = "docs/governance/product-authorizations/PCA-2026-050.json";
const EVIDENCE = "docs/evidence/omxds-r1-cl/EVIDENCE-MANIFEST.md";
const PREVIEW = "src/routes/lovable/g8-r1cl-seo-landing-parity.tsx";

describe("C1 · resolutor canónico de 8 familias", () => {
  test("declara exactamente ocho familias canónicas", () => {
    expect(CANONICAL_ENTITY_FAMILIES.length).toBe(8);
    expect(CANONICAL_ENTITY_FAMILIES).toContain("place");
    expect(CANONICAL_ENTITY_FAMILIES).toContain("product_generic");
  });

  test("reconoce el tipo de entidad Lugar", () => {
    expect(isPlaceEntityType("place")).toBe(true);
    expect(isPlaceEntityType("Lugar")).toBe(true);
    expect(isPlaceEntityType("business")).toBe(false);
  });

  test("resuelve lugar con variante cerrada al preset aprobado", () => {
    const r = resolveCanonicalEntityTemplate({
      entityId: "p1",
      entityType: "place",
      placeType: "zona-arqueologica",
    });
    expect(r.canonicalFamily).toBe("place");
    expect(r.presetId).toBe("premium-entity-place");
    expect(r.variant).toBe("zona-arqueologica");
  });

  test("variante de lugar desconocida es fail-closed", () => {
    const r = resolveCanonicalEntityTemplate({
      entityId: "p2",
      entityType: "place",
      placeType: "inventado",
    });
    expect(r.source).toBe("standard");
    expect(r.presetId).toBeNull();
  });

  test("lugar sin elegibilidad premium cae a superficie estándar", () => {
    const r = resolveCanonicalEntityTemplate({
      entityId: "p3",
      entityType: "place",
      placeType: "cenote",
      premiumEligible: false,
    });
    expect(r.source).toBe("standard");
    expect(r.presetId).toBeNull();
  });

  test("hotel real resuelve a su preset de familia", () => {
    const r = resolveCanonicalEntityTemplate({
      entityId: "b1",
      entityType: "business",
      categorySlug: "hoteles",
    });
    expect(r.canonicalFamily).toBe("hotel");
    expect(r.presetId).toBe("premium-entity-hotel");
  });

  test("producto genérico se declara sin degradar la ficha", () => {
    const r = resolveCanonicalEntityTemplate({
      entityId: "pr1",
      entityType: "product",
      productType: "artesania",
    });
    expect(r.canonicalFamily).toBe("product_generic");
    expect(r.presetId).toBeNull();
  });

  test("entrada incompleta es fail-closed", () => {
    const r = resolveCanonicalEntityTemplate({ entityId: "", entityType: "" });
    expect(r.source).toBe("standard");
    expect(r.canonicalFamily).toBeNull();
  });

  test("preset por familia canónica", () => {
    expect(canonicalFamilyPresetId("place")).toBe("premium-entity-place");
    expect(canonicalFamilyPresetId("product_generic")).toBeNull();
    expect(canonicalFamilyPresetId("event")).toBe("premium-entity-event");
  });
});

describe("L1 · plantilla reusable premium-seo-landing", () => {
  test("declara 18 slots en orden narrativo (GAP-03)", () => {
    expect(SEO_LANDING_BLOCK_COUNT).toBe(18);
    expect(SEO_LANDING_SLOTS.map((s) => s.order)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1),
    );
  });

  test("GAP-03 · el Planificador Alux es slot contractual", () => {
    const slot = SEO_LANDING_SLOTS.find((s) => s.id === "aluxPlanner");
    expect(slot?.blockType).toBe("vmx.alux.planner");
    expect(slot?.omitWhenEmpty).toBe(true);
  });

  test("GAP-04 · la FAQ reutiliza el bloque neutral del Kit", () => {
    const slot = SEO_LANDING_SLOTS.find((s) => s.id === "faq");
    expect(slot?.blockType).toBe("vmx.kit.faq");
  });

  test("GAP-04 · el JSON-LD refleja sólo las preguntas visibles", () => {
    expect(buildSeoLandingFaqJsonLd(null)).toBeNull();
    expect(buildSeoLandingFaqJsonLd({ items: [{ question: "P", answer: "" }] })).toBeNull();
    const ld = buildSeoLandingFaqJsonLd({
      items: [
        { question: "P1", answer: "R1" },
        { question: "P2", answer: "R2" },
      ],
    }) as { mainEntity: unknown[] };
    expect(ld.mainEntity.length).toBe(2);
  });

  test("acredita la autoridad visual por SHA-256", () => {
    expect(SEO_LANDING_AUTHORITY.sha256).toBe(
      "61913a4fa92bdb1c671a392caabc0b08f55a6ec946ed737abcd9038e01113d9c",
    );
    expect(SEO_LANDING_AUTHORITY.revisionLabel).toBe("SEO.A3.M2");
  });

  test("slots vacíos se omiten (cero contenido inventado)", () => {
    const tree = buildSeoLandingComposition({ entityRef: "business:x", slots: {} });
    expect(tree.root.children.length).toBe(1);
    expect(tree.root.children[0]!.type).toBe("vmx.experience.hero");
  });

  test("slots reales generan nodos deterministas", () => {
    const tree = buildSeoLandingComposition({
      entityRef: "place:x",
      idPrefix: "t",
      // GAP-04: el slot `faq` sólo produce nodo con preguntas reales.
      slots: { hero: { title: "X" }, faq: { heading: "Y", items: [{ question: "P", answer: "R" }] } },

    });
    expect(tree.root.children.map((n) => n.id)).toEqual(["t-hero", "t-faq"]);
    expect(tree.root.children[0]!.config.variant).toBe("immersive");
  });

  test("el metadato editorial se persiste en chrome.seo.landing sin migración", () => {
    const tree = buildSeoLandingComposition({
      entityRef: "business:x",
      presentation: "cinematic",
      slots: { hero: { title: "X" } },
    });
    const chrome = readSeoLandingChrome(tree);
    expect(chrome?.template).toBe(SEO_LANDING_TEMPLATE_ID);
    // Regla Founder: Cinematográfica NO acreditada para premium-seo-landing.
    // Cualquier entrada distinta se normaliza fail-closed a Editorial.
    expect(chrome?.presentation).toBe("editorial");
    expect(chrome?.populatedSlots).toEqual(["hero"]);
  });

  test("chrome inválido es fail-closed", () => {
    expect(readSeoLandingChrome(null)).toBeNull();
    expect(readSeoLandingChrome({ root: { children: [] } })).toBeNull();
  });
});

describe("L2 · gobernanza y preview interna", () => {
  test("instrumentos de gobernanza existen", () => {
    for (const f of [BLUEPRINT, PCA, EVIDENCE, PREVIEW]) expect(exists(f)).toBe(true);
  });

  test("la preview es noindex y no pública", () => {
    const src = read(PREVIEW);
    expect(src).toContain("noindex,nofollow,noarchive");
    expect(src.includes("sitemap")).toBe(false);
  });

  test("la ruta interna está inventariada", () => {
    expect(read("src/lib/experience-builder/route-inventory.ts")).toContain(PREVIEW);
  });

  test("el manifiesto declara las invariantes", () => {
    const m = read(EVIDENCE);
    for (const claim of [
      "Cero publicación",
      "omxds_visual_v1_contracts_enabled = false",
      "cero migración",
      "cero contenido inventado",
    ])
      expect(m).toContain(claim);
  });
});
