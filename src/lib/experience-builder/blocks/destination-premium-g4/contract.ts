/**
 * G8-E · `vmx.destination.premium-g4` — contrato de la plantilla compuesta
 * oficial del Micrositio de Destino Premium G4.
 *
 * Autoridad de render: `DestinationPremiumSurface`. El contrato declara
 * únicamente los campos editables; orden, layout y jerarquía visual
 * permanecen bloqueados por el preset `destino-premium-g4-approved`.
 */
import type { BlockContract, BlockFieldSchema, BlockSchema } from "../../block-contract";
import {
  DESTINATION_PREMIUM_G4_CONTRACT_VERSION,
  DESTINATION_PREMIUM_G4_VARIANT,
  destinationPremiumG4DefaultConfig,
} from "@/components/destination-premium/destination-premium-config";

const D = destinationPremiumG4DefaultConfig();

const text = (label: string, key: string, translatable = true): BlockFieldSchema => ({
  type: "text",
  label,
  translatable,
  default: D[key] as string,
});

const toggle = (label: string, key: string): BlockFieldSchema => ({
  type: "boolean",
  label,
  default: D[key] as boolean,
});

const mediaFields: Record<string, BlockFieldSchema> = {
  media_url: { type: "media", label: "Imagen acreditada" },
  media_alt: { type: "text", label: "Texto alternativo", translatable: true },
};

const list = (
  label: string,
  key: string,
  fields: Record<string, BlockFieldSchema>,
): BlockFieldSchema => ({
  type: "list",
  label,
  default: D[key],
  item: { type: "object", label, fields },
});

const schema: BlockSchema = {
  variant: {
    type: "select",
    label: "Variante",
    default: DESTINATION_PREMIUM_G4_VARIANT,
    options: [{ value: DESTINATION_PREMIUM_G4_VARIANT, label: "Destino Premium G4 (aprobada)" }],
    description: "Variante única aprobada. Orden y layout bloqueados por el preset.",
  },
  destination_slug: text("Destino (slug)", "destination_slug", false),

  // 1 · Hero
  hero_variant: {
    type: "select",
    label: "Hero · dirección visual",
    default: "editorial",
    options: [
      { value: "editorial", label: "Editorial" },
      { value: "cinematic", label: "Cinematográfico" },
    ],
  },
  hero_status_badge: text("Hero · estado editorial", "hero_status_badge"),
  hero_region_badge: text("Hero · región", "hero_region_badge"),
  hero_title: text("Hero · título", "hero_title"),
  hero_subtitle: text("Hero · subtítulo", "hero_subtitle"),
  hero_description: text("Hero · descripción", "hero_description"),
  hero_cta_label: text("Hero · CTA principal", "hero_cta_label"),
  hero_cta_href: text("Hero · destino del CTA principal", "hero_cta_href", false),
  hero_cta_secondary_label: text("Hero · CTA secundario", "hero_cta_secondary_label"),
  hero_cta_secondary_href: text(
    "Hero · destino del CTA secundario",
    "hero_cta_secondary_href",
    false,
  ),
  hero_media_url: { type: "media", label: "Hero · portada", default: D.hero_media_url },
  hero_media_alt: text("Hero · texto alternativo de portada", "hero_media_alt"),
  hero_supporting: list("Hero · imágenes de apoyo", "hero_supporting", { ...mediaFields }),

  // 2 · Servicios (categorías bordadas)
  servicios_items: list("Servicios del micrositio", "servicios_items", {
    slug: { type: "text", label: "Categoría (slug bordado)", translatable: false },
    label: { type: "text", label: "Etiqueta", translatable: true },
    hint: { type: "text", label: "Descriptor", translatable: true },
    ...mediaFields,
  }),
  servicios_note: text("Servicios · nota al pie", "servicios_note"),

  // 3 · Descubre
  descubre_kicker: text("Descubre · kicker", "descubre_kicker"),
  descubre_title: text("Descubre · título", "descubre_title"),
  descubre_paragraphs: list("Descubre · párrafos", "descubre_paragraphs", {
    text: { type: "text", label: "Párrafo", translatable: true },
  }),
  descubre_media: list("Descubre · imágenes", "descubre_media", { ...mediaFields }),

  // 4 · Galería
  galeria_layout: {
    type: "select",
    label: "Galería · disposición",
    default: "mosaico",
    options: [
      { value: "mosaico", label: "Mosaico" },
      { value: "carrusel", label: "Carrusel" },
      { value: "cuadricula", label: "Cuadrícula" },
      { value: "tira", label: "Tira" },
    ],
  },
  galeria_kicker: text("Galería · kicker", "galeria_kicker"),
  galeria_title: text("Galería · título", "galeria_title"),
  galeria_note: text("Galería · nota", "galeria_note"),
  galeria_items: list("Galería · imágenes", "galeria_items", { ...mediaFields }),

  // 5 · Vista de servicio
  servicio_action_label: text("Servicio · acción", "servicio_action_label"),
  servicio_card_prefix: text("Servicio · prefijo de tarjeta", "servicio_card_prefix"),
  servicio_card_body: text("Servicio · texto de tarjeta", "servicio_card_body"),

  // 6 · Mapa
  mapa_heading: text("Mapa · encabezado", "mapa_heading"),

  // 7 · Cerca del destino
  cercanos_kicker: text("Cercanos · kicker", "cercanos_kicker"),
  cercanos_title: text("Cercanos · título", "cercanos_title"),
  cercanos_description: text("Cercanos · descripción", "cercanos_description"),
  cercanos_items: list("Cercanos · destinos", "cercanos_items", {
    slug: { type: "text", label: "Slug del destino", translatable: false },
    name: { type: "text", label: "Nombre", translatable: false },
    distance: { type: "text", label: "Distancia y tiempo", translatable: true },
    tagline: { type: "text", label: "Descripción breve", translatable: true },
    ...mediaFields,
  }),

  // Visibilidad (orden bloqueado)
  show_descubre: toggle("Mostrar Descubre", "show_descubre"),
  show_galeria: toggle("Mostrar galería", "show_galeria"),
  show_servicio_preview: toggle("Mostrar vista de servicio", "show_servicio_preview"),
  show_mapa: toggle("Mostrar mapa", "show_mapa"),
  show_cercanos: toggle("Mostrar cercanos", "show_cercanos"),
};

export const DESTINATION_PREMIUM_G4_TRANSLATABLE_FIELDS = Object.entries(schema)
  .filter(([, def]) => def.translatable)
  .map(([field]) => field);

export const destinationPremiumG4Block: BlockContract = {
  type: "vmx.destination.premium-g4",
  category: "static",
  version: DESTINATION_PREMIUM_G4_CONTRACT_VERSION,
  display_name: "Micrositio de Destino Premium G4 (plantilla compuesta)",
  description:
    "Plantilla compuesta aprobada del micrositio de destino: hero, categorías bordadas, descubre, galería, vista de servicio, mapa oficial y destinos cercanos. Render único vía DestinationPremiumSurface.",
  schema,
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_seo: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["destination"] },
  i18n: { translatable_fields: DESTINATION_PREMIUM_G4_TRANSLATABLE_FIELDS },
  audit: ["Block.Registered", "Block.VersionPublished"],
};
