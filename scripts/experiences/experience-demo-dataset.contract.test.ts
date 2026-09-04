import { describe, expect, test } from "bun:test";
import {
  EXPERIENCE_DEMO_ATTRIBUTE_AXES,
  buildExperienceDemoListingDTO,
  buildExperienceDemoVM,
  listExperienceDemoSlugs,
} from "../../src/lib/experiences/experience-demo-dataset";

describe("dataset DEMO de Experiencias", () => {
  const dto = buildExperienceDemoListingDTO();

  test("expone 8 experiencias rotuladas como demostración", () => {
    expect(dto.items.length).toBe(8);
    expect(dto.provenance).toBe("demo_preview");
    expect(listExperienceDemoSlugs().every((slug) => slug.startsWith("demo-"))).toBe(true);
  });

  test("cada experiencia tiene hero y tarjeta con imagen distinta del gestor de Medios", () => {
    for (const slug of listExperienceDemoSlugs()) {
      const vm = buildExperienceDemoVM(slug)!;
      const card = dto.items.find((item) => item.id === slug)!;
      expect(vm.cover?.url).toBeTruthy();
      expect(card.mediaUrl).toBeTruthy();
      expect(vm.cover!.url).not.toBe(card.mediaUrl);
      expect(vm.cover!.url.startsWith("/api/public/studio-media/")).toBe(true);
      expect(card.mediaUrl!.startsWith("/api/public/studio-media/")).toBe(true);
    }
  });

  test("ninguna experiencia DEMO habilita reserva en línea", () => {
    for (const slug of listExperienceDemoSlugs()) {
      expect(buildExperienceDemoVM(slug)!.commerce.canBookOnline).toBe(false);
    }
  });

  test("los ejes DEMO tienen valores en las tarjetas y están rotulados", () => {
    for (const axis of EXPERIENCE_DEMO_ATTRIBUTE_AXES) {
      expect(axis.demo).toBe(true);
      const withValues = dto.items.filter((item) => item.filterAttributes?.[axis.key]);
      expect(withValues.length).toBeGreaterThan(1);
    }
  });

  test("el filtro por destino reduce resultados", () => {
    const espita = buildExperienceDemoListingDTO("espita");
    expect(espita.items.length).toBeGreaterThan(0);
    expect(espita.items.length).toBeLessThan(dto.items.length);
  });
});
