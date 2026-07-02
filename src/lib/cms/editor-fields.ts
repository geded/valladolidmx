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
  { name: "description", label: "Descripción", type: "textarea" },
  {
    name: "sort_order",
    label: "Orden",
    type: "number",
    helpText: "Posición relativa en listados.",
  },
];

export const CATEGORY_FIELDS: EditorField[] = [
  { name: "name", label: "Nombre", type: "text", required: true },
  { name: "slug", label: "Slug", type: "text", required: true },
  { name: "description", label: "Descripción", type: "textarea" },
  { name: "icon", label: "Ícono (clave)", type: "text" },
  { name: "sort_order", label: "Orden", type: "number" },
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
