/**
 * G8-D · `vmx.home.premium-g4` — contrato de la plantilla compuesta oficial
 * de la Home Premium G4 (variante única `premium-g4-approved`).
 *
 * Autoridad de render: `HomePremiumSurface`. Este contrato sólo declara los
 * campos editables de las 12 secciones internas; el orden, el layout y la
 * jerarquía visual permanecen bloqueados por el preset.
 */
import type { BlockContract, BlockFieldSchema, BlockSchema } from "../../block-contract";
import {
  HOME_PREMIUM_G4_CONTRACT_VERSION,
  HOME_PREMIUM_G4_VARIANT,
  homePremiumG4DefaultConfig,
} from "@/components/home-premium/home-premium-config";

const D = homePremiumG4DefaultConfig();

const text = (label: string, key: string, translatable = true): BlockFieldSchema => ({
  type: "text",
  label,
  translatable,
  default: D[key] as string,
});

const link = (label: string, key: string): BlockFieldSchema => ({
  type: "text",
  label,
  description: "Enlace interno canónico (por ejemplo /arma-tu-viaje).",
  default: D[key] as string,
});

const limit = (label: string, key: string): BlockFieldSchema => ({
  type: "number",
  label,
  description: "Límite de elementos visibles.",
  default: D[key] as number,
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
    default: HOME_PREMIUM_G4_VARIANT,
    options: [{ value: HOME_PREMIUM_G4_VARIANT, label: "Premium G4 (aprobada)" }],
    description: "Variante única aprobada. Orden y layout bloqueados por el preset.",
  },

  // 1 · Hero editorial split
  hero_eyebrow: text("Hero · frase superior", "hero_eyebrow"),
  hero_title: text("Hero · título", "hero_title"),
  hero_subtitle: text("Hero · subtítulo", "hero_subtitle"),
  hero_cta_label: text("Hero · CTA principal", "hero_cta_label"),
  hero_cta_href: link("Hero · destino del CTA principal", "hero_cta_href"),
  hero_cta_secondary_label: text("Hero · CTA secundario", "hero_cta_secondary_label"),
  hero_cta_secondary_href: link("Hero · destino del CTA secundario", "hero_cta_secondary_href"),
  hero_slides: list("Hero · imágenes", "hero_slides", {
    caption: { type: "text", label: "Pie de foto", translatable: true },
    ...mediaFields,
  }),

  // 2 · Categorías bordadas
  categorias_heading: text("Categorías · encabezado", "categorias_heading"),
  categorias_max_items: limit("Categorías · máximo", "categorias_max_items"),
  categorias_items: list("Categorías visibles y ordenadas", "categorias_items", {
    slug: { type: "text", label: "Categoría (slug bordado)", translatable: false },
    label: { type: "text", label: "Etiqueta", translatable: true },
    href: { type: "text", label: "Enlace interno" },
  }),

  // 3 · Alux Planner
  alux_eyebrow: text("Alux · frase superior", "alux_eyebrow"),
  alux_heading: text("Alux · encabezado", "alux_heading"),
  alux_description: text("Alux · descripción", "alux_description"),
  alux_prompts: list("Alux · prompts sugeridos", "alux_prompts", {
    label: { type: "text", label: "Prompt", translatable: true },
  }),

  // 4 · Destinos curados
  destinos_kicker: text("Destinos · kicker", "destinos_kicker"),
  destinos_title: text("Destinos · título", "destinos_title"),
  destinos_description: text("Destinos · descripción", "destinos_description"),
  destinos_action: text("Destinos · acción", "destinos_action"),
  destinos_disclaimer: text("Destinos · nota al pie", "destinos_disclaimer"),
  destinos_max_items: limit("Destinos · máximo", "destinos_max_items"),
  destinos_items: list("Destinos curados", "destinos_items", {
    name: { type: "text", label: "Destino", translatable: false },
    note: { type: "text", label: "Nota editorial", translatable: true },
    pueblo_magico: { type: "boolean", label: "Pueblo Mágico" },
    demo: { type: "boolean", label: "Marcar como demo visual" },
    ...mediaFields,
  }),

  // 5 · Pueblos Mágicos
  pueblos_kicker: text("Pueblos Mágicos · kicker", "pueblos_kicker"),
  pueblos_title: text("Pueblos Mágicos · título", "pueblos_title"),
  pueblos_description: text("Pueblos Mágicos · descripción", "pueblos_description"),
  pueblos_action: text("Pueblos Mágicos · acción", "pueblos_action"),
  pueblos_badge_note: text("Pueblos Mágicos · nota del distintivo", "pueblos_badge_note"),
  pueblos_cta_label: text("Pueblos Mágicos · CTA", "pueblos_cta_label"),

  // 6 · Rutas
  rutas_kicker: text("Rutas · kicker", "rutas_kicker"),
  rutas_title: text("Rutas · título", "rutas_title"),
  rutas_description: text("Rutas · descripción", "rutas_description"),
  rutas_action: text("Rutas · acción", "rutas_action"),
  rutas_max_items: limit("Rutas · máximo", "rutas_max_items"),
  rutas_items: list("Rutas y paradas", "rutas_items", {
    id: { type: "text", label: "Identificador de ruta" },
    title: { type: "text", label: "Título", translatable: true },
    duration: { type: "text", label: "Duración", translatable: true },
    stops: { type: "number", label: "Número de paradas" },
    vibe: { type: "text", label: "Ambiente", translatable: true },
    description: { type: "text", label: "Descripción", translatable: true },
    sequence: {
      type: "list",
      label: "Paradas en orden",
      item: {
        type: "object",
        label: "Parada",
        fields: { label: { type: "text", label: "Parada", translatable: true } },
      },
    },
    ...mediaFields,
  }),

  // 7 · Experiencias
  experiencias_kicker: text("Experiencias · kicker", "experiencias_kicker"),
  experiencias_title: text("Experiencias · título", "experiencias_title"),
  experiencias_description: text("Experiencias · descripción", "experiencias_description"),
  experiencias_action: text("Experiencias · acción", "experiencias_action"),
  experiencias_max_items: limit("Experiencias · máximo", "experiencias_max_items"),
  experiencias_items: list("Experiencias curadas", "experiencias_items", {
    title: { type: "text", label: "Título", translatable: true },
    category: { type: "text", label: "Categoría", translatable: true },
    summary: { type: "text", label: "Resumen", translatable: true },
    ...mediaFields,
  }),

  // 8 · Hospedaje + gastronomía
  servicios_kicker: text("Servicios · kicker", "servicios_kicker"),
  servicios_title: text("Servicios · título", "servicios_title"),
  servicios_description: text("Servicios · descripción", "servicios_description"),
  servicios_stays_title: text("Servicios · título de hospedaje", "servicios_stays_title"),
  servicios_food_title: text("Servicios · título de gastronomía", "servicios_food_title"),
  servicios_max_items: limit("Servicios · máximo por columna", "servicios_max_items"),
  servicios_stays: list("Hospedaje curado", "servicios_stays", {
    title: { type: "text", label: "Nombre", translatable: false },
    destination: { type: "text", label: "Destino", translatable: false },
    category: { type: "text", label: "Categoría", translatable: true },
    summary: { type: "text", label: "Resumen", translatable: true },
    ...mediaFields,
  }),
  servicios_food: list("Gastronomía curada", "servicios_food", {
    title: { type: "text", label: "Nombre", translatable: false },
    destination: { type: "text", label: "Destino", translatable: false },
    category: { type: "text", label: "Categoría", translatable: true },
    summary: { type: "text", label: "Resumen", translatable: true },
    ...mediaFields,
  }),

  // 9 · Eventos
  eventos_kicker: text("Eventos · kicker", "eventos_kicker"),
  eventos_title: text("Eventos · título", "eventos_title"),
  eventos_description: text("Eventos · descripción", "eventos_description"),
  eventos_media_url: { type: "media", label: "Eventos · imagen", default: D.eventos_media_url },
  eventos_media_alt: text("Eventos · texto alternativo", "eventos_media_alt"),
  eventos_max_items: limit("Eventos · máximo", "eventos_max_items"),
  eventos_items: list("Agenda", "eventos_items", {
    day: { type: "text", label: "Día", translatable: true },
    title: { type: "text", label: "Título", translatable: true },
    type: { type: "text", label: "Tipo", translatable: true },
    detail: { type: "text", label: "Detalle", translatable: true },
  }),

  // 10 · Historias (Qué hacer)
  que_hacer_kicker: text("Historias · kicker", "que_hacer_kicker"),
  que_hacer_title: text("Historias · título", "que_hacer_title"),
  que_hacer_description: text("Historias · descripción", "que_hacer_description"),
  que_hacer_action: text("Historias · acción", "que_hacer_action"),
  que_hacer_max_items: limit("Historias · máximo", "que_hacer_max_items"),
  que_hacer_items: list("Historias editoriales", "que_hacer_items", {
    kicker: { type: "text", label: "Kicker", translatable: true },
    title: { type: "text", label: "Título", translatable: true },
    body: { type: "text", label: "Texto", translatable: true },
    ...mediaFields,
  }),

  // 11 · Mapa
  mapa_kicker: text("Mapa · kicker", "mapa_kicker"),
  mapa_title: text("Mapa · título", "mapa_title"),
  mapa_description: text("Mapa · descripción", "mapa_description"),

  // 12 · Travel Plan close
  travel_plan_eyebrow: text("Travel Plan · frase superior", "travel_plan_eyebrow"),
  travel_plan_title: text("Travel Plan · título", "travel_plan_title"),
  travel_plan_cta_add_label: text("Travel Plan · CTA agregar", "travel_plan_cta_add_label"),
  travel_plan_cta_added_label: text("Travel Plan · CTA agregado", "travel_plan_cta_added_label"),
  travel_plan_cta_alux_label: text("Travel Plan · CTA Alux", "travel_plan_cta_alux_label"),

  // Visibilidad de contenido opcional (orden bloqueado)
  show_destinos: toggle("Mostrar destinos", "show_destinos"),
  show_pueblos_magicos: toggle("Mostrar Pueblos Mágicos", "show_pueblos_magicos"),
  show_rutas: toggle("Mostrar rutas", "show_rutas"),
  show_experiencias: toggle("Mostrar experiencias", "show_experiencias"),
  show_servicios: toggle("Mostrar hospedaje y gastronomía", "show_servicios"),
  show_eventos: toggle("Mostrar eventos", "show_eventos"),
  show_que_hacer: toggle("Mostrar historias", "show_que_hacer"),
  show_mapa: toggle("Mostrar mapa", "show_mapa"),
};

export const HOME_PREMIUM_G4_TRANSLATABLE_FIELDS = Object.entries(schema)
  .filter(([, def]) => def.translatable)
  .map(([field]) => field);

export const homePremiumG4Block: BlockContract = {
  type: "vmx.home.premium-g4",
  category: "static",
  version: HOME_PREMIUM_G4_CONTRACT_VERSION,
  display_name: "Home Premium G4 (plantilla compuesta)",
  description:
    "Plantilla compuesta aprobada de la página principal: 12 secciones con orden y layout bloqueados y contenido totalmente editable. Render único vía HomePremiumSurface.",
  schema,
  capabilities: {
    soporta_i18n: true,
    soporta_preview: true,
    soporta_responsive: true,
    soporta_seo: true,
    soporta_cache: true,
  },
  constraints: { surfaces: ["home"] },
  i18n: { translatable_fields: HOME_PREMIUM_G4_TRANSLATABLE_FIELDS },
  audit: ["Block.Registered", "Block.VersionPublished"],
};
