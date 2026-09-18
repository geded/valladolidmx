/**
 * Registro general de secciones internas de plantillas compuestas.
 *
 * Varias plantillas Premium aprobadas se publican como un ÚNICO bloque
 * compuesto (Inicio, micrositio de destino, listados turísticos G5). Sin este
 * registro, el Experience Builder las presenta como "sección 1 de 1" y no
 * permite trabajar sección por sección ni reordenar.
 *
 * Reglas vinculantes:
 *  - Toda plantilla compuesta nueva DEBE declarar aquí sus secciones internas
 *    como parte de su cierre (Definition of Done). Sin declaración, la
 *    plantilla no se considera terminada.
 *  - Este registro NO cambia el render público: sólo describe qué campos de
 *    la configuración pertenecen a cada sección, cuál es su interruptor de
 *    visibilidad y si su posición es reordenable.
 *  - Fail-closed: un bloque sin declaración sigue comportándose exactamente
 *    como hoy (una sola sección).
 */

export interface CompositeSectionDef {
  /** Clave estable de la sección dentro del bloque compuesto. */
  key: string;
  /** Nombre visible para el editor. */
  label: string;
  /** Prefijos de campos de configuración que pertenecen a esta sección. */
  prefixes: string[];
  /** Clave booleana de visibilidad en la configuración, si existe. */
  visibilityKey?: string;
  /**
   * `true` cuando la sección participa del orden editable del bloque.
   * Las secciones fijas (hero, cierre) no se pueden arrastrar.
   */
  reorderable?: boolean;
}

export interface CompositeSectionRegistryEntry {
  /** Clave de configuración donde se guarda el orden editable, si aplica. */
  orderKey?: string;
  sections: CompositeSectionDef[];
}

export const COMPOSITE_SECTION_REGISTRY: Record<string, CompositeSectionRegistryEntry> = {
  "vmx.home.premium-g4": {
    orderKey: "home_section_order",
    sections: [
      { key: "hero", label: "Portada (hero)", prefixes: ["hero_"] },
      { key: "alux", label: "Alux", prefixes: ["alux_"], reorderable: true },
      {
        key: "categorias",
        label: "Explora por categoría",
        prefixes: ["categorias_"],
        reorderable: true,
      },
      {
        key: "destinos",
        label: "Destinos del Oriente Maya",
        prefixes: ["destinos_"],
        visibilityKey: "show_destinos",
        reorderable: true,
      },
      {
        key: "rutas",
        label: "Rutas recomendadas",
        prefixes: ["rutas_"],
        visibilityKey: "show_rutas",
        reorderable: true,
      },
      {
        key: "pueblosMagicos",
        label: "Pueblos Mágicos",
        prefixes: ["pueblos_"],
        visibilityKey: "show_pueblos_magicos",
        reorderable: true,
      },
      {
        key: "experiencias",
        label: "Experiencias",
        prefixes: ["experiencias_"],
        visibilityKey: "show_experiencias",
        reorderable: true,
      },
      {
        key: "servicios",
        label: "Hospedaje y gastronomía",
        prefixes: ["servicios_"],
        visibilityKey: "show_servicios",
        reorderable: true,
      },
      {
        key: "eventos",
        label: "Eventos",
        prefixes: ["eventos_"],
        visibilityKey: "show_eventos",
        reorderable: true,
      },
      {
        key: "queHacer",
        label: "Qué hacer",
        prefixes: ["que_hacer_"],
        visibilityKey: "show_que_hacer",
        reorderable: true,
      },
      {
        key: "mapa",
        label: "Mapa del territorio",
        prefixes: ["mapa_"],
        visibilityKey: "show_mapa",
        reorderable: true,
      },
      { key: "travelPlan", label: "Mi Viaje", prefixes: ["travel_plan_"] },
    ],
  },
  "vmx.destination.premium-g4": {
    orderKey: "destination_section_order",
    sections: [
      {
        key: "hero",
        label: "Portada del destino",
        prefixes: ["hero_", "destination_slug"],
      },
      {
        key: "descubre",
        label: "Descubre",
        prefixes: ["descubre_"],
        visibilityKey: "show_descubre",
        reorderable: true,
      },
      {
        key: "services",
        label: "Servicios del destino",
        prefixes: ["servicios_"],
        reorderable: true,
      },
      {
        key: "gallery",
        label: "Galería",
        prefixes: ["galeria_"],
        visibilityKey: "show_galeria",
        reorderable: true,
      },
      {
        key: "servicePreview",
        label: "Vista previa de servicio",
        prefixes: ["servicio_"],
        visibilityKey: "show_servicio_preview",
        reorderable: true,
      },
      { key: "routes", label: "Rutas del destino", prefixes: ["rutas_"], reorderable: true },
      {
        key: "map",
        label: "Mapa",
        prefixes: ["mapa_"],
        visibilityKey: "show_mapa",
        reorderable: true,
      },
      {
        key: "nearby",
        label: "Destinos cercanos",
        prefixes: ["cercanos_"],
        visibilityKey: "show_cercanos",
        reorderable: true,
      },
    ],
  },
  "vmx.place.premium-q2d": {
    orderKey: "place_section_order",
    sections: [
      {
        key: "hero",
        label: "Portada del lugar",
        prefixes: ["hero_", "identity_", "presentation_mode"],
      },
      { key: "alux", label: "Alux", prefixes: ["alux_"], reorderable: true },
      { key: "gallery", label: "Galería", prefixes: ["gallery"], reorderable: true },
      { key: "intro", label: "Relato del lugar", prefixes: ["intro"], reorderable: true },
      { key: "essentials", label: "Lo esencial", prefixes: ["essentials"], reorderable: true },
      { key: "map", label: "Ubicación y mapa", prefixes: ["map"], reorderable: true },
      { key: "services", label: "Servicios", prefixes: ["services"], reorderable: true },
      { key: "experiences", label: "Experiencias", prefixes: ["experiences"], reorderable: true },
      { key: "events", label: "Eventos", prefixes: ["events"], reorderable: true },
      {
        key: "nearbyBusinesses",
        label: "Qué hay cerca",
        prefixes: ["nearbyBusinesses"],
        reorderable: true,
      },
      { key: "nearby", label: "Lugares cercanos", prefixes: ["nearbyPlaces"], reorderable: true },
      { key: "trip", label: "Mi Viaje", prefixes: ["trip"], reorderable: true },
    ],
  },
  "vmx.listing.premium-g5": {
    sections: [
      { key: "hero", label: "Portada del listado", prefixes: ["hero_"] },
      {
        key: "territorio",
        label: "Territorio y familia",
        prefixes: ["family", "destination_slug", "destination_label"],
      },
      {
        key: "resultados",
        label: "Resultados y tarjetas",
        prefixes: ["items", "columns", "empty_message", "show_add_to_trip", "show_favorite"],
      },
      { key: "carriles", label: "Carriles de descubrimiento", prefixes: ["discovery_rails"] },
    ],
  },
};

export function getCompositeSections(blockType: string): CompositeSectionRegistryEntry | null {
  return COMPOSITE_SECTION_REGISTRY[blockType] ?? null;
}

/** Campos comunes que no pertenecen a ninguna sección concreta. */
const GLOBAL_FIELD_KEYS = new Set(["variant"]);

export function fieldBelongsToSection(field: string, section: CompositeSectionDef): boolean {
  if (GLOBAL_FIELD_KEYS.has(field)) return false;
  if (section.visibilityKey === field) return true;
  return section.prefixes.some((prefix) =>
    prefix.endsWith("_") ? field.startsWith(prefix) : field === prefix,
  );
}

/**
 * Ordena las secciones declaradas según el orden guardado en configuración.
 * Fail-closed: claves desconocidas se ignoran y las faltantes se añaden con
 * el orden aprobado del registro.
 */
export function orderedCompositeSections(
  entry: CompositeSectionRegistryEntry,
  config: Record<string, unknown> | null | undefined,
): CompositeSectionDef[] {
  const { orderKey, sections } = entry;
  if (!orderKey) return sections;
  const saved = config?.[orderKey];
  if (!Array.isArray(saved)) return sections;
  const reorderable = sections.filter((s) => s.reorderable);
  const valid = saved.filter(
    (key): key is string =>
      typeof key === "string" && reorderable.some((section) => section.key === key),
  );
  const unique = Array.from(new Set(valid));
  const resolved = [
    ...unique,
    ...reorderable.filter((s) => !unique.includes(s.key)).map((s) => s.key),
  ];
  let cursor = 0;
  return sections.map((section) => {
    if (!section.reorderable) return section;
    const key = resolved[cursor++];
    return sections.find((s) => s.key === key) ?? section;
  });
}

/** Devuelve el nuevo arreglo de orden tras mover una sección reordenable. */
export function nextCompositeOrder(
  entry: CompositeSectionRegistryEntry,
  config: Record<string, unknown> | null | undefined,
  fromKey: string,
  toKey: string,
): string[] | null {
  if (!entry.orderKey) return null;
  const ordered = orderedCompositeSections(entry, config);
  const current = ordered.filter((s) => s.reorderable).map((s) => s.key);
  const from = current.indexOf(fromKey);
  const to = current.indexOf(toKey);
  if (from < 0 || to < 0 || from === to) return null;
  const next = [...current];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as string);
  let cursor = 0;
  return ordered.map((section) => (section.reorderable ? (next[cursor++] as string) : section.key));
}
