/**
 * G8-Q2A · Lugares y Atractivos · Taxonomía estructural canónica.
 *
 * Espejo tipado de los catálogos sembrados por la migración de G8-Q2A.
 * Estructura únicamente: no contiene contenido turístico real ni clasifica
 * ningún registro existente (eso queda diferido a G8-Q2C).
 *
 * Regla vinculante: el tipo principal (`place_types`) y las categorías de
 * descubrimiento (`place_categories`) son autoridades separadas. `place_categories`
 * NO se deriva ni se vincula a `business_categories`, que es una taxonomía
 * exclusivamente comercial (Hoteles, Restaurantes, Transporte, Casas de
 * Vacaciones, …) y no gobierna museos, zonas arqueológicas ni patrimonio.
 */

export const PLACE_TYPE_SLUGS = [
  "zona-arqueologica",
  "cenote",
  "museo",
  "templo-convento",
  "monumento-historico",
  "calle-emblematica",
  "plaza-parque",
  "mercado-artesanal",
  "centro-cultural",
  "hacienda",
  "gruta",
  "area-natural",
  "mirador",
  "cuerpo-de-agua",
  "otro",
] as const;

export type PlaceTypeSlug = (typeof PLACE_TYPE_SLUGS)[number];

export const PLACE_CATEGORY_SLUGS = [
  "cultura",
  "patrimonio",
  "naturaleza",
  "arqueologia",
  "aventura",
  "artesanias",
  "gastronomia",
  "familia",
  "fotografia",
] as const;

export type PlaceCategorySlug = (typeof PLACE_CATEGORY_SLUGS)[number];

export const PLACE_AUTHORITY_KIND_SLUGS = [
  "autoridad-federal",
  "autoridad-estatal",
  "autoridad-municipal",
  "operador",
  "custodio",
  "propietario",
] as const;

export type PlaceAuthorityKindSlug = (typeof PLACE_AUTHORITY_KIND_SLUGS)[number];

/** La familia SEO de Lugares se gobierna en `seo_metadata` (entity_kind). */
export const PLACE_SEO_ENTITY_KIND = "point_of_interest" as const;

export function isPlaceTypeSlug(value: string): value is PlaceTypeSlug {
  return (PLACE_TYPE_SLUGS as readonly string[]).includes(value);
}

export function isPlaceCategorySlug(value: string): value is PlaceCategorySlug {
  return (PLACE_CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function isPlaceAuthorityKindSlug(value: string): value is PlaceAuthorityKindSlug {
  return (PLACE_AUTHORITY_KIND_SLUGS as readonly string[]).includes(value);
}

/**
 * G8-Q2A-R1 · Códigos cerrados de acceso al lugar.
 *
 * Se implementan como texto con CHECK cerrado en base de datos, nunca como enum
 * de PostgreSQL: la evolución del catálogo debe ser reversible.
 */
export const PLACE_ADMISSION_KINDS = ["gratuito", "pago", "mixto", "no_aplica"] as const;

export type PlaceAdmissionKind = (typeof PLACE_ADMISSION_KINDS)[number];

/** Relación entre un lugar y un producto del catálogo. */
export const PLACE_PRODUCT_RELATION_KINDS = [
  "oficial",
  "operado",
  "ofrecido",
  "recomendado",
] as const;

export type PlaceProductRelationKind = (typeof PLACE_PRODUCT_RELATION_KINDS)[number];

/** Relación entre un lugar y un evento. */
export const PLACE_EVENT_RELATION_KINDS = ["sede", "organizado", "asociado"] as const;

export type PlaceEventRelationKind = (typeof PLACE_EVENT_RELATION_KINDS)[number];

export function isPlaceAdmissionKind(value: string): value is PlaceAdmissionKind {
  return (PLACE_ADMISSION_KINDS as readonly string[]).includes(value);
}

export function isPlaceProductRelationKind(value: string): value is PlaceProductRelationKind {
  return (PLACE_PRODUCT_RELATION_KINDS as readonly string[]).includes(value);
}

export function isPlaceEventRelationKind(value: string): value is PlaceEventRelationKind {
  return (PLACE_EVENT_RELATION_KINDS as readonly string[]).includes(value);
}
