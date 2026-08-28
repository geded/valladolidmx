/**
 * G8-Q2B · Contratos de edición del CMS de Lugares y Atractivos.
 *
 * Capa pura y testeable (sin backend, sin React) que gobierna:
 *  - qué columnas de `points_of_interest` puede tocar el CMS;
 *  - qué columnas son protegidas y sólo se mueven por endpoint gobernado;
 *  - la validación fail-closed de coordenadas, precios, WhatsApp, URLs,
 *    horarios y relaciones.
 *
 * Regla vinculante: este archivo NO sustituye ni duplica
 * `place-contracts.ts` (contratos de datos Q2A/Q2A-R1). Extiende
 * exclusivamente la capa de edición administrativa de Q2B.
 */
import { z } from "zod";
import {
  PLACE_ADMISSION_KINDS,
  PLACE_EVENT_RELATION_KINDS,
  PLACE_PRODUCT_RELATION_KINDS,
} from "./place-taxonomy";

/* ─────────────────────────  Columnas gobernadas  ───────────────────────── */

/**
 * Campos administrativos protegidos: NUNCA se aceptan en el patch libre
 * del editor. Cada uno tiene (o tendrá) su propio endpoint gobernado.
 */
export const PLACE_PROTECTED_COLUMNS = [
  "id",
  "slug",
  "name",
  "destination_id",
  "place_type_id",
  "status",
  "published_at",
  "latitude",
  "longitude",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "deleted_at",
  "deleted_by",
  "is_demo_seed",
  "demo_seed_batch",
  "demo_source_url",
] as const;

export type PlaceProtectedColumn = (typeof PLACE_PROTECTED_COLUMNS)[number];

/** Columnas de contenido editables por staff desde el CMS de Q2B. */
export const PLACE_EDITABLE_COLUMNS = [
  "destination_zone_id",
  "official_name",
  "short_description",
  "description",
  "highlights",
  "amenities",
  "accessibility",
  "directions",
  "address_line",
  "google_place_id",
  "visit_duration_minutes",
  "best_time_to_visit",
  "admission_kind",
  "entry_fee_notes",
  "price_from",
  "price_to",
  "price_currency",
  "contact_phone",
  "contact_whatsapp",
  "contact_email",
  "contact_website",
  "social_links",
] as const;

export type PlaceEditableColumn = (typeof PLACE_EDITABLE_COLUMNS)[number];

export function isPlaceProtectedColumn(column: string): boolean {
  return (PLACE_PROTECTED_COLUMNS as readonly string[]).includes(column);
}

export function isPlaceEditableColumn(column: string): boolean {
  return (PLACE_EDITABLE_COLUMNS as readonly string[]).includes(column);
}

/* ──────────────────────────  Validadores base  ─────────────────────────── */

const E164 = /^\+[1-9]\d{7,14}$/u;
const HTTPS = /^https:\/\/[^\s]+$/u;
const CURRENCY = /^[A-Z]{3}$/u;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const placeSlugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(SLUG, "El slug debe ir en minúsculas, sin espacios ni acentos.");

export const whatsappSchema = z
  .string()
  .regex(E164, "El WhatsApp debe ir en formato internacional E.164 (ej. +5219851234567).");

export const httpsUrlSchema = z.string().regex(HTTPS, "La dirección debe iniciar con https://");

export const currencySchema = z
  .string()
  .regex(CURRENCY, "Usa un código ISO de 3 letras mayúsculas (MXN, USD, EUR).");

export const latitudeSchema = z
  .number()
  .min(-90, "La latitud debe estar entre -90 y 90.")
  .max(90, "La latitud debe estar entre -90 y 90.");

export const longitudeSchema = z
  .number()
  .min(-180, "La longitud debe estar entre -180 y 180.")
  .max(180, "La longitud debe estar entre -180 y 180.");

/** Ubicación obligatoria fail-closed (Geolocation Mandatory Rule). */
export const placeLocationSchema = z.object({
  place_id: z.string().uuid(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export type PlaceLocationInput = z.infer<typeof placeLocationSchema>;

/* ─────────────────────────  Alta gobernada  ────────────────────────────── */

export const createPlaceCmsSchema = z.object({
  destination_id: z.string().uuid(),
  /**
   * Addendum Q2B: la zona es opcional, pero cuando se envía el servidor
   * verifica que pertenezca al destino (fail-closed).
   */
  destination_zone_id: z.string().uuid().nullable().optional(),
  slug: placeSlugSchema,
  name: z.string().trim().min(2).max(180),
  place_type_id: z.string().uuid(),
  description: z.string().trim().max(4000).optional(),
});

export type CreatePlaceCmsInput = z.infer<typeof createPlaceCmsSchema>;

/* ─────────────────────────  Patch de contenido  ────────────────────────── */

export const placeDetailsPatchSchema = z
  .object({
    destination_zone_id: z.string().uuid().nullable().optional(),
    official_name: z.string().trim().max(180).nullable().optional(),
    short_description: z.string().trim().max(320).nullable().optional(),
    description: z.string().trim().max(8000).nullable().optional(),
    highlights: z.array(z.string().trim().min(1).max(180)).max(12).optional(),
    amenities: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
    accessibility: z.record(z.string(), z.unknown()).optional(),
    directions: z.string().trim().max(2000).nullable().optional(),
    address_line: z.string().trim().max(320).nullable().optional(),
    google_place_id: z.string().trim().max(180).nullable().optional(),
    visit_duration_minutes: z.number().int().positive().max(2880).nullable().optional(),
    best_time_to_visit: z.string().trim().max(320).nullable().optional(),
    admission_kind: z.enum(PLACE_ADMISSION_KINDS).nullable().optional(),
    entry_fee_notes: z.string().trim().max(1000).nullable().optional(),
    price_from: z.number().nonnegative().max(1_000_000).nullable().optional(),
    price_to: z.number().nonnegative().max(1_000_000).nullable().optional(),
    price_currency: currencySchema.optional(),
    contact_phone: z.string().trim().max(40).nullable().optional(),
    contact_whatsapp: whatsappSchema.nullable().optional(),
    contact_email: z.string().trim().email("Correo inválido.").nullable().optional(),
    contact_website: httpsUrlSchema.nullable().optional(),
    social_links: z.record(z.string(), httpsUrlSchema).optional(),
  })
  .strict()
  .refine(
    (patch) =>
      patch.price_to === null ||
      patch.price_to === undefined ||
      patch.price_from === null ||
      patch.price_from === undefined ||
      patch.price_to >= patch.price_from,
    { message: "El precio máximo no puede ser menor que el mínimo." },
  );

export type PlaceDetailsPatch = z.infer<typeof placeDetailsPatchSchema>;

export const updatePlaceCmsSchema = z.object({
  place_id: z.string().uuid(),
  /** Marca de concurrencia optimista: `updated_at` leído por el editor. */
  expected_updated_at: z.string().min(1),
  patch: placeDetailsPatchSchema,
});

export type UpdatePlaceCmsInput = z.infer<typeof updatePlaceCmsSchema>;

/* ─────────────────────────  Horarios y relaciones  ─────────────────────── */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/u;

export const placeHoursRowSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    is_closed: z.boolean(),
    opens_at: z.string().regex(TIME, "Usa formato HH:MM.").nullable(),
    closes_at: z.string().regex(TIME, "Usa formato HH:MM.").nullable(),
    notes: z.string().trim().max(240).nullable().optional(),
  })
  .refine((row) => row.is_closed || (row.opens_at !== null && row.closes_at !== null), {
    message: "Un día abierto necesita hora de apertura y cierre.",
  })
  .refine(
    (row) => row.is_closed || !row.opens_at || !row.closes_at || row.closes_at > row.opens_at,
    { message: "La hora de cierre debe ser posterior a la de apertura." },
  );

export const setPlaceHoursSchema = z.object({
  place_id: z.string().uuid(),
  hours: z.array(placeHoursRowSchema).max(7),
});

export const setPlaceCategoriesSchema = z.object({
  place_id: z.string().uuid(),
  category_ids: z.array(z.string().uuid()).max(9),
});

export const setPlaceProductsSchema = z.object({
  place_id: z.string().uuid(),
  relations: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        relation_kind: z.enum(PLACE_PRODUCT_RELATION_KINDS),
        sort_order: z.number().int().min(0).max(9999).default(100),
      }),
    )
    .max(50),
});

export const setPlaceEventsSchema = z.object({
  place_id: z.string().uuid(),
  relations: z
    .array(
      z.object({
        event_id: z.string().uuid(),
        relation_kind: z.enum(PLACE_EVENT_RELATION_KINDS),
        sort_order: z.number().int().min(0).max(9999).default(100),
      }),
    )
    .max(50),
});

export const setPlaceAuthoritiesSchema = z.object({
  place_id: z.string().uuid(),
  authorities: z
    .array(
      z
        .object({
          authority_kind_id: z.string().uuid(),
          business_id: z.string().uuid().nullable(),
          authority_name: z.string().trim().max(180).nullable(),
          is_primary: z.boolean().default(false),
          notes: z.string().trim().max(320).nullable().optional(),
        })
        .refine((row) => Boolean(row.business_id) || Boolean(row.authority_name), {
          message: "Indica una empresa relacionada o el nombre de la autoridad.",
        }),
    )
    .max(12),
});

/* ─────────────────────────────  Medios  ────────────────────────────────── */

export const PLACE_MEDIA_ROLES = ["cover", "gallery"] as const;
export type PlaceMediaRole = (typeof PLACE_MEDIA_ROLES)[number];

export const attachPlaceMediaSchema = z.object({
  place_id: z.string().uuid(),
  media_asset_id: z.string().uuid(),
  role: z.enum(PLACE_MEDIA_ROLES),
});

export const detachPlaceMediaSchema = z.object({
  place_id: z.string().uuid(),
  media_id: z.string().uuid(),
});

export const reorderPlaceMediaSchema = z.object({
  place_id: z.string().uuid(),
  ordered_media_ids: z.array(z.string().uuid()).max(60),
});

/* ─────────────────────────  Publicación fail-closed  ───────────────────── */

export const PLACE_PUBLISHABLE_STATUSES = ["published"] as const;

export interface PlacePublishGuardInput {
  latitude: number | null;
  longitude: number | null;
  placeTypeId: string | null;
  shortDescription: string | null;
  hasUnapprovedMedia: boolean;
}

/**
 * Reglas mínimas fail-closed para dejar el estado `draft`.
 * Devuelve la lista de motivos de bloqueo (vacía = puede avanzar).
 */
export function placeAdvanceBlockers(input: PlacePublishGuardInput): string[] {
  const blockers: string[] = [];
  if (input.latitude === null || input.longitude === null)
    blockers.push("Falta la ubicación: latitud y longitud son obligatorias.");
  if (!input.placeTypeId) blockers.push("Falta el tipo de lugar.");
  if (!input.shortDescription || input.shortDescription.trim().length < 20)
    blockers.push("Falta una descripción corta de al menos 20 caracteres.");
  return blockers;
}

/** Bloqueos adicionales aplicables únicamente a la publicación. */
export function placePublishBlockers(input: PlacePublishGuardInput): string[] {
  const blockers = placeAdvanceBlockers(input);
  if (input.hasUnapprovedMedia)
    blockers.push("Hay imágenes sin aprobación editorial: apruébalas antes de publicar el lugar.");
  return blockers;
}
