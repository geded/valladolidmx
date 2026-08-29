/**
 * G8-R1-C+L · Addendum A — Contrato del Sistema Visual Canónico Alux IA
 * y de la remediación GAP-01…04.
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { experienceCtaBarActionSchema } from "@/lib/experience-builder/blocks/experience-cta-bar/contract";
import {
  SEO_LANDING_BLOCK_COUNT,
  SEO_LANDING_CONTRACT_VERSION,
  SEO_LANDING_SLOTS,
} from "@/lib/experience-builder/seo-landing/seo-landing-template";

const root = process.cwd();
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8");
const manifest = JSON.parse(read("public/brand/alux/manifest.json")) as {
  assets: Array<{ role: string; path: string; sha256: string; format?: string }>;
  rules: string[];
};

describe("GAP-01 · Agregar a Mi Viaje", () => {
  test("la acción canónica existe en el contrato de la barra", () => {
    const parsed = experienceCtaBarActionSchema.parse({
      label: "Agregar a Mi Viaje",
      action: "add-to-trip",
      travelItem: { kind: "business", targetId: "b1", title: "X" },
    });
    expect(parsed.action).toBe("add-to-trip");
    expect(parsed.travelItem?.targetId).toBe("b1");
  });

  test("la barra delega en la acción canónica de Travel Plan", () => {
    const src = read(
      "src/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBar.tsx",
    );
    expect(src).toContain("AddToTravelPlanButton");
    // Fail-closed: sin entidad real no se renderiza.
    expect(src).toContain("if (!a.travelItem) return null;");
  });
});

describe("GAP-02/03/04 · renderer y contrato de la landing", () => {
  test("el mapa tiene caso en el renderer, en Studio y en producción", () => {
    const src = read("src/lib/experience-builder/composition-renderer.tsx");
    expect(src).toContain('PRODUCTION_COMPONENT_MAP["vmx.experience.map"]');
    expect(src).toContain('(STUDIO_PREVIEW_MAP as any)["vmx.experience.map"]');
  });

  test("la landing declara 18 slots y versión 1.1.0", () => {
    expect(SEO_LANDING_BLOCK_COUNT).toBe(18);
    expect(SEO_LANDING_CONTRACT_VERSION).toBe("1.1.0");
  });

  test("no se creó un bloque FAQ duplicado", () => {
    const lib = read("src/lib/experience-builder/block-library.ts");
    expect(lib.includes('"vmx.experience.faq"')).toBe(false);
    expect(SEO_LANDING_SLOTS.find((s) => s.id === "faq")?.blockType).toBe("vmx.kit.faq");
  });
});

describe("E/F/G/H · Sistema visual canónico Alux IA", () => {
  test("existe un único componente canónico de marca", () => {
    const src = read("src/components/alux/AluxMark.tsx");
    expect(src).toContain("/brand/alux/");
    expect(src).toContain("Alux, concierge IA de Valladolid.mx");
  });

  test("el original queda declarado como inmutable", () => {
    const original = manifest.assets.filter((a) => a.role === "original");
    expect(original.length).toBe(1);
    expect(manifest.rules.join(" ")).toContain("Original inmutable");
  });

  test("cada activo declara checksum SHA-256 y ruta bajo /brand/alux/", () => {
    for (const a of manifest.assets) {
      expect(a.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(a.path.startsWith("/brand/alux/")).toBe(true);
      expect(fs.existsSync(path.join(root, "public", a.path.replace(/^\//, "")))).toBe(true);
    }
  });

  test("existen derivadas en los tres formatos", () => {
    for (const fmt of ["png", "webp", "avif"]) {
      expect(manifest.assets.some((a) => a.format === fmt)).toBe(true);
    }
  });

  test("el dock global usa la marca canónica, no un icono genérico", () => {
    const src = read("src/components/layout/AluxFloatingTrigger.tsx");
    expect(src).toContain("AluxMark");
  });
});
