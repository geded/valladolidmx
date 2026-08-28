/**
 * G8-Q2A · Contratos de datos de Lugares y Atractivos.
 *
 * Contratos de lectura/escritura del modelo. No hay CMS, ni rutas públicas,
 * ni reclamación en esta etapa (G8-Q2B/G8-Q2C).
 */
import { z } from "zod";
import {
  PLACE_ADMISSION_KINDS,
  PLACE_AUTHORITY_KIND_SLUGS,
  PLACE_CATEGORY_SLUGS,
  PLACE_EVENT_RELATION_KINDS,
  PLACE_PRODUCT_RELATION_KINDS,
  PLACE_TYPE_SLUGS,
} from "./place-taxonomy";


export const placeTypeSchema = z.object({
  id: z.string().uuid(),
  slug: z.enum(PLACE_TYPE_SLUGS),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
});

export const placeCategorySchema = z.object({
  id: z.string().uuid(),
  slug: z.enum(PLACE_CATEGORY_SLUGS),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
});

export const placeAuthorityKindSchema = z.object({
  id: z.string().uuid(),
  slug: z.enum(PLACE_AUTHORITY_KIND_SLUGS),
  name: z.string().min(1),
  sort_order: z.number().int(),
  is_active: z.boolean(),
});

export const placeHoursSchema = z.object({
  id: z.string().uuid(),
  place_id: z.string().uuid(),
  day_of_week: z.number().int().min(0).max(6),
  opens_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  is_closed: z.boolean(),
  notes: z.string().nullable().optional(),
});

export const placeMediaSchema = z.object({
  id: z.string().uuid(),
  place_id: z.string().uuid(),
  media_asset_id: z.string().uuid(),
  role: z.string().min(1),
  sort_order: z.number().int(),
});

export const placeAuthoritySchema = z
  .object({
    id: z.string().uuid(),
    place_id: z.string().uuid(),
    authority_kind_id: z.string().uuid(),
    business_id: z.string().uuid().nullable(),
    authority_name: z.string().min(1).nullable(),
    is_primary: z.boolean(),
    notes: z.string().nullable().optional(),
  })
  .refine((row) => row.business_id !== null || row.authority_name !== null, {
    message: "place_authorities requiere business_id o authority_name",
  });

/**
 * Ficha de Lugar. `place_type_id` es nullable por compatibilidad con los
 * registros históricos: G8-Q2A no reclasifica ningún lugar existente.
 */
export const placeRecordSchema = z.object({
  id: z.string().uuid(),
  destination_id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  official_name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  short_description: z.string().nullable().optional(),
  place_type_id: z.string().uuid().nullable(),
  highlights: z.array(z.string()).default([]),
  visit_duration_minutes: z.number().int().positive().nullable().optional(),
  best_time_to_visit: z.string().nullable().optional(),
  entry_fee_notes: z.string().nullable().optional(),
  price_from: z.number().nonnegative().nullable().optional(),
  price_currency: z.string().min(3).default("MXN"),
  accessibility: z.record(z.string(), z.unknown()).default({}),
  amenities: z.array(z.string()).default([]),
  contact_phone: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  contact_website: z.string().nullable().optional(),
  address_line: z.string().nullable().optional(),
  google_place_id: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  status: z.enum(["draft", "in_review", "approved", "published", "archived"]),
  // G8-Q2A-R1 · campos operativos añadidos por la remediación.
  directions: z.string().nullable().optional(),
  admission_kind: z.enum(PLACE_ADMISSION_KINDS).nullable().optional(),
  price_to: z.number().nonnegative().nullable().optional(),
  contact_whatsapp: z.string().nullable().optional(),
  social_links: z.record(z.string(), z.string()).default({}),
  published_at: z.string().nullable().optional(),
});

/**
 * Ficha de Lugar con la coherencia de rango de precio aplicada.
 * Se mantiene separada para no perder `placeRecordSchema.shape`.
 */
export const placeRecordCoherentSchema = placeRecordSchema.refine(
  (row) =>
    row.price_to === null ||
    row.price_to === undefined ||
    row.price_from === null ||
    row.price_from === undefined ||
    row.price_to >= row.price_from,
  { message: "price_to no puede ser menor que price_from" },
);

/** Alta de lugar: el tipo principal es obligatorio para todo lugar nuevo. */
export const createPlaceInputSchema = z.object({
  destination_id: z.string().uuid(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "slug canónico en minúsculas y guiones"),
  name: z.string().min(2),
  place_type_id: z.string().uuid(),
  description: z.string().optional(),
});

/** Actualización de detalle: nunca puede borrar un tipo ya asignado. */
export const updatePlaceDetailsInputSchema = z.object({
  place_id: z.string().uuid(),
  patch: z
    .record(z.string(), z.unknown())
    .refine((patch) => !("place_type_id" in patch) || Boolean(patch.place_type_id), {
      message: "place_type_id no puede vaciarse una vez asignado",
    }),
});

/** G8-Q2A-R1 · Relación gobernada entre un lugar y un producto del catálogo. */
export const placeProductLinkSchema = z.object({
  id: z.string().uuid(),
  place_id: z.string().uuid(),
  product_id: z.string().uuid(),
  relation_kind: z.enum(PLACE_PRODUCT_RELATION_KINDS),
  sort_order: z.number().int(),
  notes: z.string().nullable().optional(),
});

/** G8-Q2A-R1 · Relación gobernada entre un lugar y un evento. */
export const placeEventLinkSchema = z.object({
  id: z.string().uuid(),
  place_id: z.string().uuid(),
  event_id: z.string().uuid(),
  relation_kind: z.enum(PLACE_EVENT_RELATION_KINDS),
  sort_order: z.number().int(),
  notes: z.string().nullable().optional(),
});

export type PlaceProductLink = z.infer<typeof placeProductLinkSchema>;
export type PlaceEventLink = z.infer<typeof placeEventLinkSchema>;

export type PlaceType = z.infer<typeof placeTypeSchema>;
export type PlaceCategory = z.infer<typeof placeCategorySchema>;
export type PlaceAuthorityKind = z.infer<typeof placeAuthorityKindSchema>;
export type PlaceRecord = z.infer<typeof placeRecordSchema>;
export type CreatePlaceInput = z.infer<typeof createPlaceInputSchema>;
export type UpdatePlaceDetailsInput = z.infer<typeof updatePlaceDetailsInputSchema>;
