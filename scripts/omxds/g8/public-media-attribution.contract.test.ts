/**
 * G8-F1D · DEF-G8F-02 — Exposición pública de ALT, caption y crédito.
 *
 * Contrato fail-closed: el ALT acreditado manda sobre el genérico, el
 * crédito nunca se inventa y la naturaleza conceptual/IA se declara.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  AI_CONCEPTUAL_CREDIT,
  attributionNatureLabel,
  emptyAttribution,
  isFilenameLike,
  resolveAttributedAlt,
  resolveAttributedCaption,
  resolveAttributedCredit,
  type PublicMediaAttribution,
} from "../../../src/lib/media/public-attribution";

function make(partial: Partial<PublicMediaAttribution>): PublicMediaAttribution {
  return { ...emptyAttribution("https://example.test/a.jpg"), ...partial };
}

describe("G8-F1D · prioridad de ALT", () => {
  test("1) override de slot gana", () => {
    const alt = resolveAttributedAlt(make({ alt: "ALT acreditado" }), {
      slotOverride: "ALT del slot",
      fallback: "Valladolid — foto 2",
    });
    expect(alt).toBe("ALT del slot");
  });

  test("2) ALT acreditado gana al fallback genérico", () => {
    const alt = resolveAttributedAlt(make({ alt: "Representación conceptual generada con IA" }), {
      fallback: "Valladolid — foto 2",
    });
    expect(alt).toBe("Representación conceptual generada con IA");
  });

  test("3) fallback genérico sólo sin metadata", () => {
    expect(resolveAttributedAlt(null, { fallback: "Valladolid — foto 2" })).toBe(
      "Valladolid — foto 2",
    );
    expect(resolveAttributedAlt(make({}), { fallback: "" })).toBe("");
  });

  test("un nombre de archivo no se acepta como ALT accesible", () => {
    expect(isFilenameLike("IMG_6663.jpeg")).toBe(true);
    expect(isFilenameLike("Plaza principal de Valladolid")).toBe(false);
    expect(resolveAttributedAlt(make({ alt: "IMG_6663.jpeg" }), { fallback: "Valladolid" })).toBe(
      "Valladolid",
    );
  });

  test("ALT en blanco no desplaza al fallback", () => {
    expect(resolveAttributedAlt(make({ alt: "   " }), { fallback: "Izamal" })).toBe("Izamal");
  });
});

describe("G8-F1D · crédito público", () => {
  test("crédito explícito se respeta tal cual", () => {
    expect(resolveAttributedCredit(make({ credit: "Foto: Juan Pérez" }))).toBe("Foto: Juan Pérez");
  });

  test("IA sin crédito expone el crédito conceptual oficial", () => {
    expect(resolveAttributedCredit(make({ aiGenerated: true }))).toBe(AI_CONCEPTUAL_CREDIT);
  });

  test("sin evidencia no se inventa crédito", () => {
    expect(resolveAttributedCredit(make({}))).toBeNull();
    expect(resolveAttributedCredit(null)).toBeNull();
  });

  test("caption nunca se inventa", () => {
    expect(resolveAttributedCaption(make({}))).toBeNull();
    expect(resolveAttributedCaption(make({ caption: " Centro histórico " }))).toBe(
      "Centro histórico",
    );
  });

  test("naturaleza declarada", () => {
    expect(attributionNatureLabel(make({ aiGenerated: true }))).toBe("Imagen conceptual");
    expect(attributionNatureLabel(make({ conceptual: true }))).toBe("Imagen conceptual");
    expect(attributionNatureLabel(make({ documentary: true }))).toBe("Fotografía documental");
    expect(attributionNatureLabel(make({}))).toBeNull();
  });
});

describe("G8-F1D · propagación en el pipeline", () => {
  const reads = readFileSync("src/lib/destinations/public-reads.functions.ts", "utf8");
  const adapter = readFileSync(
    "src/lib/experience-builder/adapters/destination-to-blocks.ts",
    "utf8",
  );
  const hero = readFileSync(
    "src/components/experience-builder/blocks/experience-hero/ExperienceHero.tsx",
    "utf8",
  );
  const gallery = readFileSync(
    "src/components/experience-builder/blocks/experience-gallery/ExperienceGallery.tsx",
    "utf8",
  );

  test("la lectura pública devuelve identidad y metadata del medio", () => {
    expect(reads).toContain("getDestinationGalleryMedia");
    expect(reads).toContain("media_asset_id");
    for (const field of ["alt_text", "caption", "credit", "metadata"]) {
      expect(reads).toContain(field);
    }
    // Compatibilidad: la lectura previa no se elimina.
    expect(reads).toContain("getDestinationGalleryUrls");
  });

  test("el hero público conserva `hero_media` acreditado", () => {
    expect(reads).toContain("hero_media");
  });

  test("el adaptador usa la atribución en vez del ALT genérico", () => {
    expect(adapter).toContain("resolveAttributedAlt");
    expect(adapter).toContain("resolveAttributedCredit");
    expect(adapter).not.toContain("alt: `${d.name} — foto ${i + 2}`");
  });

  test("los renderers exponen el crédito de forma accesible", () => {
    expect(hero).toContain("Crédito de la imagen");
    expect(gallery).toContain("Crédito de la imagen");
    expect(gallery).toContain("figcaption");
  });
});
