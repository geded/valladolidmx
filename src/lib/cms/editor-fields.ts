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
