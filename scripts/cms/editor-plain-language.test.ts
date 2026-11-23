import { describe, expect, test } from "vitest";
import {
  BUSINESS_FIELDS,
  CATEGORY_FIELDS,
  DESTINATION_FIELDS,
  EVENT_FIELDS,
  PRODUCT_FIELDS,
  REGION_FIELDS,
  ZONE_FIELDS,
} from "../../src/lib/cms/editor-fields";
import {
  PLACE_EVENT_RELATION_KINDS,
  PLACE_EVENT_RELATION_LABELS,
  PLACE_PRODUCT_RELATION_KINDS,
  PLACE_PRODUCT_RELATION_LABELS,
} from "../../src/lib/places/place-taxonomy";

const ALL_FIELDS = [
  ...REGION_FIELDS,
  ...CATEGORY_FIELDS,
  ...ZONE_FIELDS,
  ...DESTINATION_FIELDS,
  ...BUSINESS_FIELDS,
  ...PRODUCT_FIELDS,
  ...EVENT_FIELDS,
];

describe("formularios del CMS · lenguaje de editor", () => {
  test("ningún campo se llama con palabras técnicas", () => {
    for (const field of ALL_FIELDS) {
      expect(field.label).not.toMatch(/\b(slug|hero|highlights|uuid|url|clave)\b/i);
    }
  });

  test("la dirección web explica qué es y cómo se escribe", () => {
    const slugFields = ALL_FIELDS.filter((f) => f.name === "slug");
    expect(slugFields.length).toBe(7);
    for (const field of slugFields) {
      expect(field.label).toBe("Dirección web");
      expect(field.helpText ?? "").toContain("minúsculas");
    }
  });

  test("cada relación de un lugar tiene nombre en español distinto del código", () => {
    for (const kind of PLACE_PRODUCT_RELATION_KINDS) {
      expect(PLACE_PRODUCT_RELATION_LABELS[kind]).toBeTruthy();
      expect(PLACE_PRODUCT_RELATION_LABELS[kind]).not.toBe(kind);
    }
    for (const kind of PLACE_EVENT_RELATION_KINDS) {
      expect(PLACE_EVENT_RELATION_LABELS[kind]).toBeTruthy();
      expect(PLACE_EVENT_RELATION_LABELS[kind]).not.toBe(kind);
    }
  });
});
