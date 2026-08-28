import { describe, expect, test } from "bun:test";
import {
  createPlaceInputSchema,
  placeAuthoritySchema,
  placeRecordSchema,
  updatePlaceDetailsInputSchema,
} from "@/lib/places/place-contracts";
import {
  PLACE_AUTHORITY_KIND_SLUGS,
  PLACE_CATEGORY_SLUGS,
  PLACE_SEO_ENTITY_KIND,
  PLACE_TYPE_SLUGS,
  isPlaceCategorySlug,
  isPlaceTypeSlug,
} from "@/lib/places/place-taxonomy";

const uuid = "00000000-0000-4000-8000-000000000001";

describe("G8-Q2A · taxonomía estructural", () => {
  test("el catálogo de tipos cubre la taxonomía aprobada", () => {
    for (const slug of ["zona-arqueologica", "cenote", "museo", "mercado-artesanal"]) {
      expect(isPlaceTypeSlug(slug)).toBe(true);
    }
    expect(new Set(PLACE_TYPE_SLUGS).size).toBe(PLACE_TYPE_SLUGS.length);
    expect(PLACE_TYPE_SLUGS).toContain("otro");
  });

  test("las categorías de descubrimiento son autoridad separada del tipo", () => {
    for (const slug of ["cultura", "naturaleza", "patrimonio", "artesanias"]) {
      expect(isPlaceCategorySlug(slug)).toBe(true);
    }
    // Ninguna categoría comercial de business_categories entra al catálogo de Lugares.
    for (const commercial of ["hoteles", "restaurantes", "transporte", "casas-de-vacaciones"]) {
      expect(isPlaceCategorySlug(commercial)).toBe(false);
    }
    expect(new Set(PLACE_CATEGORY_SLUGS).size).toBe(PLACE_CATEGORY_SLUGS.length);
  });

  test("las autoridades admiten relación múltiple y tipos no comerciales", () => {
    expect(PLACE_AUTHORITY_KIND_SLUGS).toContain("autoridad-federal");
    expect(PLACE_AUTHORITY_KIND_SLUGS).toContain("operador");
    expect(PLACE_AUTHORITY_KIND_SLUGS).toContain("custodio");
  });

  test("el SEO de Lugares se gobierna en seo_metadata", () => {
    expect(PLACE_SEO_ENTITY_KIND).toBe("point_of_interest");
    const shape = Object.keys(placeRecordSchema.shape);
    for (const forbidden of ["seo_title", "seo_description", "seo_keywords"]) {
      expect(shape).not.toContain(forbidden);
    }
  });
});

describe("G8-Q2A · compatibilidad con registros históricos", () => {
  test("un lugar histórico sin tipo sigue siendo válido", () => {
    const parsed = placeRecordSchema.safeParse({
      id: uuid,
      destination_id: uuid,
      slug: "cenote-zaci",
      name: "Cenote Zací",
      place_type_id: null,
      status: "published",
      price_currency: "MXN",
    });
    expect(parsed.success).toBe(true);
  });

  test("todo lugar nuevo exige tipo principal", () => {
    expect(
      createPlaceInputSchema.safeParse({
        destination_id: uuid,
        slug: "nuevo-lugar",
        name: "Nuevo lugar",
      }).success,
    ).toBe(false);
    expect(
      createPlaceInputSchema.safeParse({
        destination_id: uuid,
        slug: "nuevo-lugar",
        name: "Nuevo lugar",
        place_type_id: uuid,
      }).success,
    ).toBe(true);
  });

  test("no se puede borrar un tipo ya asignado", () => {
    expect(
      updatePlaceDetailsInputSchema.safeParse({ place_id: uuid, patch: { place_type_id: null } })
        .success,
    ).toBe(false);
    expect(
      updatePlaceDetailsInputSchema.safeParse({ place_id: uuid, patch: { short_description: "x" } })
        .success,
    ).toBe(true);
  });

  test("una autoridad requiere identidad verificable", () => {
    expect(
      placeAuthoritySchema.safeParse({
        id: uuid,
        place_id: uuid,
        authority_kind_id: uuid,
        business_id: null,
        authority_name: null,
        is_primary: true,
      }).success,
    ).toBe(false);
  });
});
