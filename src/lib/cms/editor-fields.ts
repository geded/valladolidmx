import type { EditorField } from "@/components/cms/EntityEditor";

export const REGION_FIELDS: EditorField[] = [
  { name: "name", label: "Nombre", type: "text", required: true },
  {
    name: "slug",
    label: "Slug",
    type: "text",
    required: true,
    helpText: "Identificador URL (sin espacios, sólo minúsculas y guiones).",
  },
  {
    name: "state_id",
    label: "Estado",
    type: "select",
    required: true,
    options: [],
    helpText: "Estado principal al que pertenece la región turística.",
  },
  {
    name: "tagline",
    label: "Frase corta",
    type: "text",
    helpText: "Una línea evocadora que resume la región.",
  },
  { name: "description", label: "Descripción", type: "textarea" },
];

export const CATEGORY_FIELDS: EditorField[] = [
  { name: "name", label: "Nombre", type: "text", required: true },
  { name: "slug", label: "Slug", type: "text", required: true },
  { name: "description", label: "Descripción", type: "textarea" },
  { name: "icon", label: "Ícono (clave)", type: "text" },
  { name: "sort_order", label: "Orden", type: "number" },
];

/**
 * ZONE_FIELDS — usado por `ZoneEditor` (Ola 1 · Etapa 4).
 * El selector de destino se inyecta en tiempo de render.
 */
export const ZONE_FIELDS: EditorField[] = [
  { name: "name", label: "Nombre", type: "text", required: true },
  {
    name: "slug",
    label: "Slug",
    type: "text",
    required: true,
    helpText: "Identificador URL (sin espacios, sólo minúsculas y guiones).",
  },
  {
    name: "destination_id",
    label: "Destino",
    type: "select",
    required: true,
    options: [],
  },
  { name: "description", label: "Descripción", type: "textarea" },
];

/**
 * DESTINATION_FIELDS — usado por el editor de Destinos (Ola 1 · Etapa 4).
 * El selector de región turística se inyecta en tiempo de render por
 * `DestinationEditor` (necesita cargar la lista desde el servidor), por eso
 * aquí `options` viene vacío.
 */
export const DESTINATION_FIELDS: EditorField[] = [
  { name: "name", label: "Nombre", type: "text", required: true },
  {
    name: "slug",
    label: "Slug",
    type: "text",
    required: true,
    helpText: "Identificador URL (sin espacios, sólo minúsculas y guiones).",
  },
  {
    name: "tourism_region_id",
    label: "Región turística",
    type: "select",
    required: true,
    options: [],
  },
  {
    name: "tagline",
    label: "Frase corta",
    type: "text",
    helpText: "Una línea evocadora que resume el destino.",
  },
  { name: "description", label: "Descripción", type: "textarea" },
  {
    name: "highlights",
    label: "Highlights",
    type: "tags",
    helpText: "Una idea por línea (o separadas por coma).",
  },
  {
    name: "hero_palette",
    label: "Paleta del hero",
    type: "select",
    required: true,
    options: [
      { value: "territorio", label: "Territorio" },
      { value: "selva", label: "Selva" },
      { value: "cenote", label: "Cenote" },
      { value: "atardecer", label: "Atardecer" },
    ],
  },
  { name: "latitude", label: "Latitud", type: "number" },
  { name: "longitude", label: "Longitud", type: "number" },
];

/**
 * BUSINESS_FIELDS — usado por `BusinessEditor` (Ola 1 · Etapa 4).
 * Los selects de destino y categoría se inyectan en tiempo de render
 * (necesitan cargar la lista desde el servidor).
 */
export const BUSINESS_FIELDS: EditorField[] = [
  { name: "display_name", label: "Nombre público", type: "text", required: true },
  { name: "legal_name", label: "Razón social", type: "text" },
  {
    name: "slug",
    label: "Slug",
    type: "text",
    required: true,
    helpText: "Identificador URL (sin espacios, sólo minúsculas y guiones).",
  },
  {
    name: "destination_id",
    label: "Destino",
    type: "select",
    required: true,
    options: [],
  },
  {
    name: "primary_category_id",
    label: "Categoría principal",
    type: "select",
    options: [],
  },
  {
    name: "tagline",
    label: "Frase corta",
    type: "text",
    helpText: "Una línea que resume la propuesta de la empresa.",
  },
  { name: "description", label: "Descripción", type: "textarea" },
];

/**
 * PRODUCT_FIELDS — usado por `ProductEditor` (Ola 1 · Etapa 4).
 * El selector de empresa se inyecta en tiempo de render.
 */
export const PRODUCT_FIELDS: EditorField[] = [
  { name: "name", label: "Nombre", type: "text", required: true },
  {
    name: "slug",
    label: "Slug",
    type: "text",
    required: true,
    helpText: "Identificador URL (sin espacios, sólo minúsculas y guiones).",
  },
  {
    name: "business_id",
    label: "Empresa",
    type: "select",
    required: true,
    options: [],
  },
  {
    name: "product_type",
    label: "Tipo",
    type: "select",
    required: true,
    options: [
      { value: "experiencia", label: "Experiencia" },
      { value: "hotel", label: "Hotel" },
      { value: "restaurante", label: "Restaurante" },
      { value: "evento", label: "Evento" },
      { value: "tour", label: "Tour" },
      { value: "transporte", label: "Transporte" },
      { value: "servicio", label: "Servicio" },
      { value: "artesanal", label: "Artesanal" },
    ],
  },
  { name: "tagline", label: "Frase corta", type: "text" },
  { name: "description", label: "Descripción", type: "textarea" },
  { name: "price_amount", label: "Precio", type: "number" },
  {
    name: "price_currency",
    label: "Moneda",
    type: "text",
    placeholder: "MXN",
    helpText: "Código ISO (MXN, USD, EUR…).",
  },
  { name: "duration_minutes", label: "Duración (min)", type: "number" },
  { name: "capacity", label: "Capacidad", type: "number" },
];

/**
 * EVENT_FIELDS — usado por `EventEditor`.
 *
 * Los combos de destino y empresa organizadora se inyectan en tiempo de
 * render (se cargan desde el servidor). Los atributos estructurados que
 * alimentan los filtros públicos viven en su panel dedicado.
 */
export const EVENT_FIELDS: EditorField[] = [
  { name: "title", label: "Título", type: "text", required: true },
  {
    name: "slug",
    label: "Slug",
    type: "text",
    required: true,
    helpText: "Identificador URL (sin espacios, sólo minúsculas y guiones).",
  },
  { name: "summary", label: "Resumen", type: "textarea" },
  { name: "body", label: "Cuerpo", type: "textarea" },
  { name: "destination_id", label: "Destino", type: "select", required: true, options: [] },
  {
    name: "business_id",
    label: "Organizador (empresa)",
    type: "select",
    options: [],
    helpText: "Opcional. Sólo empresas registradas en la plataforma.",
  },
  { name: "starts_at", label: "Inicio", type: "datetime", required: true },
  { name: "ends_at", label: "Fin", type: "datetime" },
  { name: "venue_name", label: "Sede", type: "text" },
  { name: "is_free", label: "Entrada libre", type: "boolean" },
  { name: "external_url", label: "URL externa", type: "text" },
  {
    name: "cover_media_id",
    label: "Portada (media id)",
    type: "text",
    helpText: "Identificador del medio aprobado que se usará como portada.",
  },
];
