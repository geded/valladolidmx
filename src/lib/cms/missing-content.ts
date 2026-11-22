/**
 * missing-content — Filtro «Le falta» de los listados del CMS: ayuda al
 * editor a encontrar qué fichas completar hoy. Sólo lectura.
 */
export type MissingContentKey = "photo" | "description" | "location" | "zone";

export const MISSING_CONTENT_LABELS: Record<MissingContentKey, string> = {
  photo: "Sin foto de portada",
  description: "Sin descripción",
  location: "Sin ubicación en el mapa",
  zone: "Sin barrio",
};

export const MISSING_CONTENT_BY_LIST = {
  businesses: ["photo", "description", "location", "zone"],
  products: ["photo", "description"],
  places: ["photo", "description", "location", "zone"],
} as const satisfies Record<string, readonly MissingContentKey[]>;

export type MissingContentList = keyof typeof MISSING_CONTENT_BY_LIST;

export function missingContentOptions(list: MissingContentList) {
  return MISSING_CONTENT_BY_LIST[list].map((value) => ({
    value,
    label: MISSING_CONTENT_LABELS[value],
  }));
}

/** Valida el valor recibido por el servidor para una lista concreta. */
export function parseMissingContent(
  list: MissingContentList,
  value: unknown,
): MissingContentKey | null {
  const allowed = MISSING_CONTENT_BY_LIST[list] as readonly string[];
  return typeof value === "string" && allowed.includes(value)
    ? (value as MissingContentKey)
    : null;
}
