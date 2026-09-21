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

/**
 * Catálogo CMS del que se alimenta un carril. Fuente única declarativa:
 * el constructor no inventa contenido, sólo declara de dónde viene.
 */
export type CompositeCmsSource =
  | "destinations"
  | "routes"
  | "experiences"
  | "stays"
  | "food"
  | "events"
  | "places"
  | "products"
  | "businesses"
  | "categories"
  | "editorial";

/**
 * Intención de viaje que representa la sección. Alux la consume como señal de
 * contexto: no crea un modelo nuevo, sólo etiqueta la superficie.
 */
export type CompositeAluxIntent =
  | "orientarse"
  | "descubrir-destino"
  | "planear-ruta"
  | "elegir-experiencia"
  | "dormir"
  | "comer"
  | "agenda"
  | "ubicarse"
  | "conversar"
  | "mi-viaje";

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
  /** Catálogo CMS real que alimenta el carril, si la sección muestra fichas. */
  cmsSource?: CompositeCmsSource;
  /** Intención de viaje declarada para Alux. */
  aluxIntent?: CompositeAluxIntent;
  /**
   * `true` cuando el carril admite presencia contratada de empresas o
   * productos. El reparto lo resuelve `commercial-slots.ts` con sus reglas
   * aprobadas; aquí sólo se declara la elegibilidad de la sección.
   */
  commercialSlots?: boolean;
}

export interface CompositeSectionRegistryEntry {
  /** Clave de configuración donde se guarda el orden editable, si aplica. */
  orderKey?: string;
  sections: CompositeSectionDef[];
}

export const COMPOSITE_SECTION_REGISTRY: Record<string, CompositeSectionRegistryEntry> = {
  "vmx.home.premium-g4": {
    orderKey: "home_section_order",
    // El orden declarado aquí DEBE coincidir con `HOME_PREMIUM_DEFAULT_ORDER`
    // (autoridad de la plantilla aprobada). Si difiere, el panel Estructura
    // muestra una secuencia distinta a la del lienzo y arrastrar una sección
    // reacomoda varias.
    sections: [
      { key: "hero", label: "Portada (hero)", prefixes: ["hero_"], aluxIntent: "orientarse" },
      {
        key: "alux",
        label: "Alux",
        prefixes: ["alux_"],
        reorderable: true,
        aluxIntent: "conversar",
      },
      {
        key: "destinos",
        label: "Destinos del Oriente Maya",
        prefixes: ["destinos_"],
        visibilityKey: "show_destinos",
        reorderable: true,
        cmsSource: "destinations",
        aluxIntent: "descubrir-destino",
      },
      {
        key: "experienciasAcceso",
        label: "Acceso a Experiencias",
        // El acceso reutiliza los MISMOS textos aprobados de Experiencias
        // (kicker, título, descripción, acción y destino). No se crean campos
        // nuevos: se declaran aquí para que la sección sea editable.
        prefixes: [
          "experiencias_acceso_",
          "experiencias_kicker",
          "experiencias_title",
          "experiencias_description",
          "experiencias_action",
          "experiencias_action_href",
        ],
        reorderable: true,
        aluxIntent: "elegir-experiencia",
      },

      {
        key: "categorias",
        label: "Explora por categoría",
        prefixes: ["categorias_"],
        reorderable: true,
        cmsSource: "categories",
        aluxIntent: "orientarse",
      },
      {
        key: "eventos",
        label: "Eventos",
        prefixes: ["eventos_"],
        visibilityKey: "show_eventos",
        reorderable: true,
        cmsSource: "events",
        aluxIntent: "agenda",
        commercialSlots: true,
      },
      {
        key: "experiencias",
        label: "Experiencias",
        prefixes: ["experiencias_"],
        visibilityKey: "show_experiencias",
        reorderable: true,
        cmsSource: "experiences",
        aluxIntent: "elegir-experiencia",
        commercialSlots: true,
      },
      {
        key: "rutas",
        label: "Rutas recomendadas",
        prefixes: ["rutas_"],
        visibilityKey: "show_rutas",
        reorderable: true,
        cmsSource: "routes",
        aluxIntent: "planear-ruta",
      },
      {
        key: "mapa",
        label: "Mapa del territorio",
        prefixes: ["mapa_"],
        visibilityKey: "show_mapa",
        reorderable: true,
        aluxIntent: "ubicarse",
      },
      {
        key: "travelPlan",
        label: "Mi Viaje",
        prefixes: ["travel_plan_"],
        aluxIntent: "mi-viaje",
      },
      {
        key: "pueblosMagicos",
        label: "Pueblos Mágicos",
        prefixes: ["pueblos_"],
        visibilityKey: "show_pueblos_magicos",
        reorderable: true,
        cmsSource: "destinations",
        aluxIntent: "descubrir-destino",
      },
      {
        key: "servicios",
        label: "Hospedaje y gastronomía",
        prefixes: ["servicios_"],
        visibilityKey: "show_servicios",
        reorderable: true,
        cmsSource: "stays",
        aluxIntent: "dormir",
        commercialSlots: true,
      },
      {
        key: "queHacer",
        label: "Qué hacer",
        prefixes: ["que_hacer_"],
        visibilityKey: "show_que_hacer",
        reorderable: true,
        cmsSource: "places",
        aluxIntent: "elegir-experiencia",
        commercialSlots: true,
      },
    ],
  },
  "vmx.destination.premium-g4": {
    orderKey: "destination_section_order",
    sections: [
      {
        key: "hero",
        label: "Portada del destino",
        prefixes: ["hero_", "destination_slug"],
        aluxIntent: "descubrir-destino",
      },
      {
        key: "descubre",
        label: "Descubre",
        prefixes: ["descubre_"],
        visibilityKey: "show_descubre",
        reorderable: true,
        cmsSource: "places",
        aluxIntent: "descubrir-destino",
        commercialSlots: true,
      },
      {
        key: "services",
        label: "Servicios del destino",
        prefixes: ["servicios_"],
        reorderable: true,
        cmsSource: "businesses",
        aluxIntent: "dormir",
        commercialSlots: true,
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
        cmsSource: "businesses",
        aluxIntent: "dormir",
        commercialSlots: true,
      },
      {
        key: "routes",
        label: "Rutas del destino",
        prefixes: ["rutas_"],
        reorderable: true,
        cmsSource: "routes",
        aluxIntent: "planear-ruta",
      },
      {
        key: "map",
        label: "Mapa",
        prefixes: ["mapa_"],
        visibilityKey: "show_mapa",
        reorderable: true,
        aluxIntent: "ubicarse",
      },
      {
        key: "nearby",
        label: "Destinos cercanos",
        prefixes: ["cercanos_"],
        visibilityKey: "show_cercanos",
        reorderable: true,
        cmsSource: "destinations",
        aluxIntent: "descubrir-destino",
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
        aluxIntent: "orientarse",
      },
      {
        key: "alux",
        label: "Alux",
        prefixes: ["alux_"],
        reorderable: true,
        aluxIntent: "conversar",
      },
      { key: "gallery", label: "Galería", prefixes: ["gallery"], reorderable: true },
      { key: "intro", label: "Relato del lugar", prefixes: ["intro"], reorderable: true },
      { key: "essentials", label: "Lo esencial", prefixes: ["essentials"], reorderable: true },
      {
        key: "map",
        label: "Ubicación y mapa",
        prefixes: ["map"],
        reorderable: true,
        aluxIntent: "ubicarse",
      },
      {
        key: "services",
        label: "Servicios",
        prefixes: ["services"],
        reorderable: true,
        cmsSource: "businesses",
        aluxIntent: "dormir",
        commercialSlots: true,
      },
      {
        key: "experiences",
        label: "Experiencias",
        prefixes: ["experiences"],
        reorderable: true,
        cmsSource: "experiences",
        aluxIntent: "elegir-experiencia",
        commercialSlots: true,
      },
      {
        key: "events",
        label: "Eventos",
        prefixes: ["events"],
        reorderable: true,
        cmsSource: "events",
        aluxIntent: "agenda",
        commercialSlots: true,
      },
      {
        key: "nearbyBusinesses",
        label: "Qué hay cerca",
        prefixes: ["nearbyBusinesses"],
        reorderable: true,
        cmsSource: "businesses",
        aluxIntent: "comer",
        commercialSlots: true,
      },
      {
        key: "nearby",
        label: "Lugares cercanos",
        prefixes: ["nearbyPlaces"],
        reorderable: true,
        cmsSource: "places",
        aluxIntent: "descubrir-destino",
      },
      {
        key: "trip",
        label: "Mi Viaje",
        prefixes: ["trip"],
        reorderable: true,
        aluxIntent: "mi-viaje",
      },
    ],
  },
  "vmx.listing.premium-g5": {
    sections: [
      {
        key: "hero",
        label: "Portada del listado",
        prefixes: ["hero_"],
        aluxIntent: "orientarse",
      },
      {
        key: "territorio",
        label: "Territorio y familia",
        prefixes: ["family", "destination_slug", "destination_label"],
        aluxIntent: "ubicarse",
      },
      {
        key: "resultados",
        label: "Resultados y tarjetas",
        prefixes: ["items", "columns", "empty_message", "show_add_to_trip", "show_favorite"],
        cmsSource: "businesses",
        aluxIntent: "elegir-experiencia",
        commercialSlots: true,
      },
      {
        key: "carriles",
        label: "Carriles de descubrimiento",
        prefixes: ["discovery_rails"],
        cmsSource: "editorial",
        aluxIntent: "descubrir-destino",
        commercialSlots: true,
      },
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
 *
 * Semántica ABSOLUTA, idéntica a la que aplican los renderers aprobados
 * (`home-premium-config`, `destination-premium-config`, `place-premium-config`):
 * el arreglo guardado describe la secuencia completa de secciones, incluidas
 * las no reordenables. Antes esta función reinterpretaba el arreglo como
 * "huecos" reordenables sobre el orden del registro, por lo que el panel
 * Estructura mostraba una secuencia distinta a la del lienzo y arrastrar una
 * sección reacomodaba varias. Fail-closed: claves desconocidas se ignoran y
 * las faltantes se añaden con el orden aprobado del registro.
 */
export function orderedCompositeSections(
  entry: CompositeSectionRegistryEntry,
  config: Record<string, unknown> | null | undefined,
): CompositeSectionDef[] {
  const { orderKey, sections } = entry;
  if (!orderKey) return sections;
  const saved = config?.[orderKey];
  if (!Array.isArray(saved)) return sections;
  const valid = saved.filter(
    (key): key is string =>
      typeof key === "string" && sections.some((section) => section.key === key),
  );
  const unique = Array.from(new Set(valid));
  if (unique.length === 0) return sections;
  const resolved = [...unique, ...sections.filter((s) => !unique.includes(s.key)).map((s) => s.key)];
  return resolved
    .map((key) => sections.find((s) => s.key === key))
    .filter((section): section is CompositeSectionDef => Boolean(section));
}

/**
 * Devuelve el nuevo arreglo de orden tras mover una sección reordenable.
 * El arreglo resultante conserva la secuencia absoluta completa, de modo que
 * el lienzo y la página publicada reproducen exactamente lo que el editor ve
 * en el panel Estructura.
 */
export function nextCompositeOrder(
  entry: CompositeSectionRegistryEntry,
  config: Record<string, unknown> | null | undefined,
  fromKey: string,
  toKey: string,
): string[] | null {
  if (!entry.orderKey) return null;
  const ordered = orderedCompositeSections(entry, config);
  const from = ordered.findIndex((s) => s.key === fromKey);
  const to = ordered.findIndex((s) => s.key === toKey);
  if (from < 0 || to < 0 || from === to) return null;
  if (!ordered[from]?.reorderable || !ordered[to]?.reorderable) return null;
  const next = ordered.map((s) => s.key);
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as string);
  return next;
}
