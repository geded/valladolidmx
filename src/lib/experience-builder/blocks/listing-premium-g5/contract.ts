/**
 * G8-E · `vmx.listing.premium-g5` — contrato de la plantilla compuesta
 * oficial de los 6 listados turísticos Premium G5.
 *
 * Autoridad de render: `TourismListingSurface` vía `ListingPremiumSurface`
 * (Founder Discovery Standard). El preset bloquea el layout de listado;
 * el contenido, la curaduría y las columnas son editables.
 */
import type { BlockContract, BlockFieldSchema, BlockSchema } from "../../block-contract";
import {
  LISTING_PREMIUM_G5_CONTRACT_VERSION,
  LISTING_PREMIUM_G5_FAMILY_OPTIONS,
  LISTING_PREMIUM_G5_VARIANT,
  listingPremiumG5DefaultConfig,
} from "@/components/listing-premium/listing-premium-config";

const D = listingPremiumG5DefaultConfig();

const text = (label: string, key: string, translatable = true): BlockFieldSchema => ({
  type: "text",
  label,
  translatable,
  default: D[key] as string,
});

const schema: BlockSchema = {
  variant: {
    type: "select",
    label: "Variante",
    default: LISTING_PREMIUM_G5_VARIANT,
    options: [{ value: LISTING_PREMIUM_G5_VARIANT, label: "Listado Premium G5 (aprobada)" }],
    description: "Variante única aprobada. Layout de listado bloqueado por el preset.",
  },
  family: {
    type: "select",
    label: "Familia turística",
    default: "hoteles",
    options: LISTING_PREMIUM_G5_FAMILY_OPTIONS,
    description: "Determina la ruta pública servida y el contenido aprobado por defecto.",
  },
  hero_eyebrow: text("Hero · frase superior", "hero_eyebrow"),
  hero_title: text("Hero · título", "hero_title"),
  hero_subtitle: text("Hero · subtítulo", "hero_subtitle"),
  hero_media_url: { type: "media", label: "Hero · portada", default: D.hero_media_url },
  hero_media_alt: text("Hero · texto alternativo", "hero_media_alt"),
  columns: {
    type: "number",
    label: "Columnas del listado (1–3)",
    default: 3,
    description: "1 = lista; 2 o 3 = cuadrícula.",
  },
  destination_slug: text("Destino (slug)", "destination_slug", false),
  destination_label: text("Destino (etiqueta)", "destination_label", false),
  empty_message: text("Mensaje sin resultados", "empty_message"),
  show_add_to_trip: { type: "boolean", label: "Mostrar “Agregar a mi viaje”", default: false },
  show_favorite: { type: "boolean", label: "Mostrar favoritos", default: false },
  items: {
    type: "list",
    label: "Fichas curadas",
    default: D.items,
    item: {
      type: "object",
      label: "Ficha",
      fields: {
        id: { type: "text", label: "Identificador", translatable: false },
        name: { type: "text", label: "Nombre", translatable: false },
        eyebrow: { type: "text", label: "Frase superior", translatable: true },
        tagline: { type: "text", label: "Descripción breve", translatable: true },
        media_url: { type: "media", label: "Imagen acreditada" },
        media_alt: { type: "text", label: "Texto alternativo", translatable: true },
        price_hint: { type: "text", label: "Nota de precio", translatable: true },
        date_label: { type: "text", label: "Fecha", translatable: true },
        availability_label: { type: "text", label: "Disponibilidad", translatable: true },
      },
    },
  },
};

export const LISTING_PREMIUM_G5_TRANSLATABLE_FIELDS = Object.entries(schema)
  .filter(([, def]) => def.translatable)
  .map(([field]) => field);

export const listingPremiumG5Block: BlockContract = {
  type: "vmx.listing.premium-g5",
  category: "static",
  version: LISTING_PREMIUM_G5_CONTRACT_VERSION,
  display_name: "Listado Turístico Premium G5 (plantilla compuesta)",
  description:
    "Plantilla compuesta aprobada de listados turísticos (hoteles, restaurantes, experiencias, eventos, casas de vacaciones y qué hacer). Render único vía TourismListingSurface.",
  schema,
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_seo: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["landing", "destination"] },
  i18n: { translatable_fields: LISTING_PREMIUM_G5_TRANSLATABLE_FIELDS },
  audit: ["Block.Registered", "Block.VersionPublished"],
};
