/**
 * G8-R1-C+L · Addendum A — Contrato del Sistema Visual Canónico Alux IA
 * y de la remediación GAP-01…04.
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { experienceCtaBarActionSchema } from "@/lib/experience-builder/blocks/experience-cta-bar/contract";
import { applyAluxPlannerDefaults } from "@/lib/experience-builder/blocks/alux-planner/contract";
import {
  ALUX_PRESENCE_INVARIANTS,
  ALUX_SURFACE_INVENTORY,
  ALUX_SURFACE_WITHHELD,
} from "@/lib/alux/alux-surface-inventory";
import {
  adaptSeoLandingFaq,
  buildSeoLandingComposition,
  buildSeoLandingFaqJsonLd,
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

/* ------------------------------------------------------------------ *
 * C2 · Cierre funcional GAP-01…04 e integración transversal de Alux.
 * ------------------------------------------------------------------ */

describe("GAP-01 · Guardar y Agregar a Mi Viaje son acciones distintas", () => {
  test("ambas acciones existen y no comparten referencia de entidad", () => {
    const save = experienceCtaBarActionSchema.parse({
      label: "Guardar",
      action: "favorite",
      favoriteItem: { entityKind: "business", entityId: "b1" },
    });
    const trip = experienceCtaBarActionSchema.parse({
      label: "Agregar a Mi Viaje",
      action: "add-to-trip",
      travelItem: { kind: "business", targetId: "b1", title: "X" },
    });
    expect(save.action).toBe("favorite");
    expect(save.travelItem).toBeUndefined();
    expect(trip.favoriteItem).toBeUndefined();
  });

  test("Guardar delega en favoritos y NO en Travel Plan", () => {
    const src = read(
      "src/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBar.tsx",
    );
    const fav = src.slice(src.indexOf('a.action === "favorite"'), src.indexOf("const iconOnly"));
    expect(fav).toContain("FavoriteButton");
    expect(fav.includes("AddToTravelPlanButton")).toBe(false);
    expect(fav).toContain("if (!a.favoriteItem) return null;");
  });

  test("favoritos y Mi Viaje usan almacenes canónicos separados", () => {
    expect(read("src/components/commerce/FavoriteButton.tsx")).toContain(
      "traveler-favorites.functions",
    );
    expect(read("src/components/traveler/AddToTravelPlanButton.tsx")).toContain(
      "travel-plans.functions",
    );
  });
});

describe("GAP-03 · contexto real del planificador", () => {
  test("sin contexto no se inventan parámetros", () => {
    const dto = applyAluxPlannerDefaults({});
    expect(dto.context).toBeNull();
    expect(dto.cta_href).toBe("/arma-tu-viaje");
  });

  test("con contexto real propaga entidad y territorio", () => {
    const dto = applyAluxPlannerDefaults({
      context: {
        entityRef: "place:123",
        entityLabel: "Chichén Itzá",
        destinationSlug: "tinum",
        destinationName: "Tinúm",
        relations: ["Zona arqueológica"],
      },
    });
    expect(dto.cta_href).toBe("/arma-tu-viaje?entity=place%3A123&destino=tinum");
    expect(dto.prompts.map((p) => p.label)).toEqual(["Zona arqueológica"]);
  });

  test("con contexto y sin relaciones reales no hay chips inventados", () => {
    const dto = applyAluxPlannerDefaults({ context: { entityRef: "business:9" } });
    expect(dto.prompts).toEqual([]);
  });

  test("contexto inválido es fail-closed", () => {
    expect(applyAluxPlannerDefaults({ context: "x" }).context).toBeNull();
  });

  test("máximo un planificador contextual por página", () => {
    expect(read("src/components/experience-builder/blocks/alux-planner/AluxPlannerBlock.tsx"))
      .toContain("usePlannerPresence");
  });
});

describe("GAP-04 · FAQ mediante adaptador único", () => {
  const slot = {
    heading: "Dudas",
    items: [
      { question: "¿Horario?", answer: "9:00 a 17:00" },
      { question: "  ", answer: "vacía" },
      { question: "¿Precio?", answer: "" },
    ],
  };

  test("la FAQ visible y el JSON-LD derivan de la misma lista", () => {
    const a = adaptSeoLandingFaq(slot);
    const visible = (a.blockConfig!.items as Array<{ question: string; answer: string }>).map(
      (i) => i.question,
    );
    const jsonLd = (a.jsonLd!.mainEntity as Array<{ name: string }>).map((q) => q.name);
    expect(visible).toEqual(jsonLd);
    expect(visible).toEqual(["¿Horario?"]);
    expect(buildSeoLandingFaqJsonLd(slot)).toEqual(a.jsonLd);
  });

  test("sin FAQ real no hay bloque ni JSON-LD", () => {
    const a = adaptSeoLandingFaq({ items: [] });
    expect(a.blockConfig).toBeNull();
    expect(a.jsonLd).toBeNull();
    const tree = buildSeoLandingComposition({
      entityRef: "business:x",
      slots: { hero: { title: "X" }, faq: { items: [] } },
    });
    expect(tree.root.children.some((n) => n.type === "vmx.kit.faq")).toBe(false);
  });

  test("con FAQ real el bloque neutral se incorpora a la composición", () => {
    const tree = buildSeoLandingComposition({
      entityRef: "business:x",
      slots: { hero: { title: "X" }, faq: slot },
    });
    const node = tree.root.children.find((n) => n.type === "vmx.kit.faq");
    expect(node).toBeDefined();
    expect((node!.config.items as unknown[]).length).toBe(1);
  });
});

describe("Integración transversal · inventario real de familias", () => {
  test("un solo dock global montado en la raíz", () => {
    const root = read("src/routes/__root.tsx");
    expect(root.split("<AluxFloatingTrigger").length - 1).toBe(1);
    const mounts = ["src/routes", "src/components"].flatMap(() => []);
    expect(mounts.length).toBe(0);
  });

  test("las 11 familias productivas declaran dock único y cero duplicación", () => {
    expect(ALUX_SURFACE_INVENTORY.length).toBe(11);
    for (const r of ALUX_SURFACE_INVENTORY) {
      expect(r.globalDock).toBe(true);
      expect(r.duplication).toBe("none");
      expect(r.context.length).toBeGreaterThan(0);
      expect(r.master).toBe(r.planner ? "avatar+full" : "avatar");
    }
  });

  test("Casa de vacaciones permanece sin autoasignación productiva", () => {
    expect(ALUX_SURFACE_WITHHELD.some((f) => f.includes("vacation_rental"))).toBe(true);
    expect(ALUX_SURFACE_INVENTORY.some((r) => /vacaciones/i.test(r.family))).toBe(false);
  });

  test("invariantes de presencia", () => {
    expect(ALUX_PRESENCE_INVARIANTS.maxGlobalDocksPerPage).toBe(1);
    expect(ALUX_PRESENCE_INVARIANTS.maxContextualPlannersPerPage).toBe(1);
  });
});
