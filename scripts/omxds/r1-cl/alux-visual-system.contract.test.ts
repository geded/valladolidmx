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
  version: string;
  assets: Array<{
    role: string;
    path: string;
    canonicalPath: string;
    originalFilename: string;
    family?: string | null;
    size?: number;
    width: number;
    height: number;
    format: string;
    sha256: string;
    derivedFrom: string | null;
    transparent: boolean;
    usage: string;
  }>;
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

  test("conteo reconciliado: 45 derivadas + 1 original + 2 maestras = 48", () => {
    const by = (r: string) => manifest.assets.filter((a) => a.role === r);
    expect(manifest.assets.length).toBe(48);
    expect(by("original").length).toBe(1);
    expect(by("master").length).toBe(2);
    expect(by("derivative").length).toBe(45);
    const fam = (f: string) => by("derivative").filter((a) => a.family === f);
    expect(fam("alux-ia-full").length).toBe(18);
    expect(fam("alux-ia-avatar").length).toBe(27);
    for (const fmt of ["png", "webp", "avif"]) {
      expect(by("derivative").filter((a) => a.format === fmt).length).toBe(15);
    }
  });

  test("sólo existen los tamaños autorizados", () => {
    const sizes = (f: string) => [
      ...new Set(
        manifest.assets.filter((a) => a.role === "derivative" && a.family === f).map((a) => a.size),
      ),
    ].sort((x, y) => (x as number) - (y as number));
    expect(sizes("alux-ia-full")).toEqual([96, 128, 192, 256, 384, 512]);
    expect(sizes("alux-ia-avatar")).toEqual([32, 40, 44, 48, 64, 80, 96, 128, 192]);
  });

  test("cada entrada declara los campos obligatorios de trazabilidad", () => {
    for (const a of manifest.assets) {
      for (const k of [
        "originalFilename",
        "canonicalPath",
        "role",
        "width",
        "height",
        "format",
        "sha256",
        "derivedFrom",
        "transparent",
        "usage",
      ]) {
        expect(k in a).toBe(true);
      }
      expect(a.canonicalPath).toBe(a.path);
      if (a.role !== "original") expect(a.transparent).toBe(true);
    }
  });

  test("los nombres IMG_* son sólo procedencia, nunca rutas públicas", () => {
    for (const a of manifest.assets) {
      expect(a.canonicalPath.includes("IMG_")).toBe(false);
      expect(/^(IMG_\d+\.png|3a53f1cb-.*\.jpeg)$/.test(a.originalFilename)).toBe(true);
    }
  });

  test("las rutas canónicas son únicas", () => {
    const p = manifest.assets.map((a) => a.canonicalPath);
    expect(new Set(p).size).toBe(p.length);
  });

  test("el dock global usa la marca canónica, no un icono genérico", () => {
    const src = read("src/components/layout/AluxFloatingTrigger.tsx");
    expect(src).toContain("AluxMark");
  });
});
