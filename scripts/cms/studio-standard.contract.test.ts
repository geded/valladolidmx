/**
 * Studio Standard v1.0 — contrato del Estándar Único de Construcción.
 *
 * Verifica que las plantillas declaradas cumplan las cinco declaraciones y que
 * el estándar siga siendo fail-closed para lo no declarado.
 */
import { describe, expect, it } from "vitest";
import {
  COMPOSITE_SECTION_REGISTRY,
  type CompositeSectionDef,
} from "@/lib/experience-builder/composite-sections";
import {
  SEO_LANDING_SURFACE_KEY,
  SURFACE_SLOT_REGISTRY,
  aluxIntentForSection,
  auditStudioStandard,
  commercialRailsForTemplate,
  getSurfaceSlots,
  slotOfNodeId,
  studioSectionSignals,
  surfaceReorderableSlots,
  surfaceSlotLabels,
} from "@/lib/experience-builder/studio-standard";

describe("Studio Standard · declaraciones", () => {
  it("toda plantilla declarada es editable y tiene secciones con nombre", () => {
    const rows = auditStudioStandard();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.sections).toBeGreaterThan(0);
      expect(row.editable).toBe(true);
    }
  });

  it("las secciones con catálogo CMS declaran también intención para Alux", () => {
    for (const [templateKey] of Object.entries(COMPOSITE_SECTION_REGISTRY)) {
      for (const signal of studioSectionSignals(templateKey)) {
        if (signal.cmsSource) {
          expect(signal.aluxIntent, `${templateKey}/${signal.key}`).not.toBeNull();
        }
      }
    }
  });

  it("sólo los carriles con contenido CMS admiten presencia contratada", () => {
    for (const templateKey of Object.keys({
      ...COMPOSITE_SECTION_REGISTRY,
      ...SURFACE_SLOT_REGISTRY,
    })) {
      for (const signal of studioSectionSignals(templateKey)) {
        if (signal.commercialSlots) {
          expect(signal.cmsSource, `${templateKey}/${signal.key}`).not.toBeNull();
        }
      }
    }
  });

  it("las claves de sección son únicas por plantilla", () => {
    for (const entry of Object.values(COMPOSITE_SECTION_REGISTRY)) {
      const keys = entry.sections.map((s: CompositeSectionDef) => s.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe("Studio Standard · superficie landing SEO", () => {
  it("declara la maqueta aprobada con su ancla de lienzo", () => {
    const entry = getSurfaceSlots(SEO_LANDING_SURFACE_KEY);
    expect(entry?.canvasId).toBe("__seo_landing_surface__");
    expect(entry?.orderKey).toBe("order");
  });

  it("conserva las etiquetas y el cuerpo reordenable aprobados", () => {
    expect(surfaceSlotLabels(SEO_LANDING_SURFACE_KEY)).toMatchObject({
      hero: "Portada",
      badges: "Señales de confianza",
      intro: "Por qué es extraordinario",
      offers: "Experiencias destacadas",
      infoGrid: "Información para tu visita",
      map: "Contexto territorial",
      aluxPlanner: "Alux",
      gallery: "Galería",
    });
    expect(surfaceReorderableSlots(SEO_LANDING_SURFACE_KEY)).toEqual([
      "intro",
      "offers",
      "infoGrid",
      "map",
    ]);
  });

  it("resuelve el slot desde el identificador persistido del nodo", () => {
    expect(slotOfNodeId("landing-zazil-tunich-hero")).toBe("hero");
    expect(slotOfNodeId("")).toBe("");
  });
});

describe("Studio Standard · resolvers transversales", () => {
  it("expone la intención declarada para Alux", () => {
    expect(aluxIntentForSection("vmx.home.premium-g4", "rutas")).toBe("planear-ruta");
    expect(aluxIntentForSection("vmx.home.premium-g4", "mapa")).toBe("ubicarse");
  });

  it("lista los carriles elegibles para presencia contratada", () => {
    const rails = commercialRailsForTemplate("vmx.home.premium-g4");
    expect(rails).toContain("experiencias");
    expect(rails).toContain("servicios");
    expect(rails).not.toContain("hero");
  });

  it("es fail-closed con plantillas no declaradas", () => {
    expect(studioSectionSignals("vmx.desconocido")).toEqual([]);
    expect(commercialRailsForTemplate("vmx.desconocido")).toEqual([]);
    expect(aluxIntentForSection("vmx.desconocido", "hero")).toBeNull();
    expect(surfaceReorderableSlots("vmx.desconocido")).toEqual([]);
  });
});
