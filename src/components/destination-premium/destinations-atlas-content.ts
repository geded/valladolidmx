/**
 * G8 · Atlas de Destinos del Oriente Maya — contenido configurable.
 *
 * Toda la copia, el orden y la visibilidad de bloques del listado maestro
 * de destinos vive aquí para que el Constructor pueda editarla sin tocar
 * la superficie. Los datos del destino (nombre, medios, ubicación,
 * taxonomía y relaciones) siguen llegando del CMS.
 *
 * Fail-closed: cualquier campo ausente, vacío o de tipo inválido cae al
 * fixture aprobado; nunca se renderiza un hueco visual.
 */

export type AtlasMedia = { url: string; alt: string };

export type AtlasRoute = {
  id: string;
  title: string;
  description: string;
  duration: string;
  stops: readonly string[];
};

export type AtlasTimeBlock = {
  id: string;
  label: string;
  title: string;
  description: string;
};

export type DestinationsAtlasSectionKey =
  | "hero"
  | "alux"
  | "start_here"
  | "explorer"
  | "grid"
  | "routes"
  | "time_blocks"
  | "final_cta";

export type DestinationsAtlasContent = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    searchPlaceholder: string;
    media: AtlasMedia;
  };
  alux: {
    title: string;
    description: string;
    interests: readonly string[];
    durations: readonly string[];
    cta: string;
  };
  startHere: {
    kicker: string;
    title: string;
    description: string;
    featuredSlug: string;
    companionSlugs: readonly string[];
    disclaimer: string;
  };
  explorer: {
    kicker: string;
    title: string;
    description: string;
    originLabels: { valladolid: string; nearby: string; other: string };
  };
  grid: {
    kicker: string;
    title: string;
    description: string;
    pageSize: number;
    emptyMessage: string;
  };
  routes: { kicker: string; title: string; description: string; items: readonly AtlasRoute[] };
  timeBlocks: {
    kicker: string;
    title: string;
    description: string;
    items: readonly AtlasTimeBlock[];
  };
  finalCta: {
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
  };
  order: readonly DestinationsAtlasSectionKey[];
  sections: Partial<Record<DestinationsAtlasSectionKey, boolean>>;
};

export const DESTINATIONS_ATLAS_DEFAULT_ORDER: readonly DestinationsAtlasSectionKey[] = [
  "hero",
  "alux",
  "start_here",
  "explorer",
  "grid",
  "routes",
  "time_blocks",
  "final_cta",
];

export const DESTINATIONS_ATLAS_CONTENT: DestinationsAtlasContent = {
  hero: {
    eyebrow: "Oriente Maya de Yucatán",
    title: "Descubre los destinos del Oriente Maya de Yucatán",
    description:
      "Valladolid es tu punto de partida para descubrir pueblos con historia, cenotes sagrados, zonas arqueológicas, comunidades mayas y la costa del Golfo.",
    searchPlaceholder: "¿Qué lugar quieres descubrir?",
    media: {
      url: "/api/public/studio-media/conceptual-preview/2026-09-01/oriente-maya-hero-territorio-v1.webp",
      alt: "Territorio del Oriente Maya visto desde Valladolid",
    },
  },
  alux: {
    title: "¿Qué quieres descubrir en el Oriente Maya?",
    description:
      "Dime qué te mueve y cuántos días tienes: te propongo destinos por cercanía y afinidad, y los guardo en Mi Viaje.",
    interests: [
      "Cultura maya",
      "Cenotes y naturaleza",
      "Pueblos con historia",
      "Gastronomía",
      "Costa y tranquilidad",
    ],
    durations: ["Medio día", "Un día", "Fin de semana", "Varios días"],
    cta: "Crear mi ruta con Alux",
  },
  startHere: {
    kicker: "Punto de partida",
    title: "Empieza por Valladolid",
    description:
      "Desde Valladolid llegas en poco tiempo a comunidades, cenotes y zonas arqueológicas del territorio.",
    featuredSlug: "valladolid",
    companionSlugs: [],
    disclaimer:
      "Los destinos acompañantes se seleccionan desde CMS por proximidad y diversidad territorial.",
  },
  explorer: {
    kicker: "Explorador territorial",
    title: "Ubica cada destino en el territorio",
    description:
      "Recorre el mapa y las tarjetas de forma sincronizada para entender distancias reales antes de armar tu ruta.",
    originLabels: {
      valladolid: "Desde Valladolid",
      nearby: "Cerca de mí",
      other: "Desde otro destino",
    },
  },
  grid: {
    kicker: "Atlas completo",
    title: "Todos los destinos",
    description: "Filtra por tipo de territorio, interés, distinción y cercanía.",
    pageSize: 12,
    emptyMessage: "No encontramos destinos con esos criterios. Prueba con otros filtros.",
  },
  routes: {
    kicker: "Rutas sugeridas",
    title: "Combina destinos en una ruta",
    description: "Tres combinaciones administrables para aprovechar el territorio sin prisas.",
    items: [
      {
        id: "pueblos-magicos",
        title: "Ruta de Pueblos Mágicos",
        description: "Valladolid, Izamal y Espita: arquitectura colonial, artesanía y vida local.",
        duration: "Fin de semana",
        stops: ["Valladolid", "Izamal", "Espita"],
      },
      {
        id: "cenotes-comunidades",
        title: "Cenotes y comunidades",
        description: "Agua sagrada y anfitriones mayas a menos de una hora de Valladolid.",
        duration: "Un día",
        stops: ["Valladolid", "Ek Balam", "Temozón"],
      },
      {
        id: "costa-flamencos",
        title: "Costa y flamencos",
        description: "Manglares, salineras rosadas y atardeceres frente al Golfo.",
        duration: "Varios días",
        stops: ["Valladolid", "Río Lagartos", "Las Coloradas"],
      },
    ],
  },
  timeBlocks: {
    kicker: "Planea con lo que tienes",
    title: "Según el tiempo que tienes",
    description: "Elige el alcance realista de tu recorrido.",
    items: [
      {
        id: "medio-dia",
        label: "Medio día",
        title: "Centro de Valladolid y un cenote",
        description: "Calzada de los Frailes, San Bernardino y un cenote urbano.",
      },
      {
        id: "un-dia",
        label: "Un día",
        title: "Valladolid + un destino cercano",
        description: "Suma una zona arqueológica o una comunidad maya en el mismo día.",
      },
      {
        id: "fin-de-semana",
        label: "Fin de semana",
        title: "Tres destinos con calma",
        description: "Duerme en Valladolid y explora pueblos, cenotes y costa.",
      },
    ],
  },
  finalCta: {
    title: "Arma tu ruta por el Oriente Maya",
    description:
      "Alux ordena tus destinos por tiempo y distancia; guárdalos en Mi Viaje y ajústalos cuando quieras.",
    primaryLabel: "Crear mi ruta con Alux",
    secondaryLabel: "Ver Mi Viaje",
  },
  order: DESTINATIONS_ATLAS_DEFAULT_ORDER,
  sections: {},
};

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function list<T>(value: unknown, fallback: readonly T[]): readonly T[] {
  return Array.isArray(value) && value.length > 0 ? (value as readonly T[]) : fallback;
}

/** Fusión fail-closed de la configuración del Constructor con el fixture. */
export function resolveDestinationsAtlasContent(
  input?: Partial<Record<string, unknown>>,
): DestinationsAtlasContent {
  const base = DESTINATIONS_ATLAS_CONTENT;
  if (!input) return base;
  const hero = (input.hero ?? {}) as Record<string, unknown>;
  const alux = (input.alux ?? {}) as Record<string, unknown>;
  const startHere = (input.startHere ?? {}) as Record<string, unknown>;
  const grid = (input.grid ?? {}) as Record<string, unknown>;
  const pageSize = typeof grid.pageSize === "number" && grid.pageSize > 0 ? grid.pageSize : base.grid.pageSize;
  return {
    ...base,
    hero: {
      eyebrow: str(hero.eyebrow, base.hero.eyebrow),
      title: str(hero.title, base.hero.title),
      description: str(hero.description, base.hero.description),
      searchPlaceholder: str(hero.searchPlaceholder, base.hero.searchPlaceholder),
      media: {
        url: str((hero.media as AtlasMedia | undefined)?.url, base.hero.media.url),
        alt: str((hero.media as AtlasMedia | undefined)?.alt, base.hero.media.alt),
      },
    },
    alux: {
      title: str(alux.title, base.alux.title),
      description: str(alux.description, base.alux.description),
      interests: list<string>(alux.interests, base.alux.interests),
      durations: list<string>(alux.durations, base.alux.durations),
      cta: str(alux.cta, base.alux.cta),
    },
    startHere: {
      ...base.startHere,
      kicker: str(startHere.kicker, base.startHere.kicker),
      title: str(startHere.title, base.startHere.title),
      description: str(startHere.description, base.startHere.description),
      featuredSlug: str(startHere.featuredSlug, base.startHere.featuredSlug),
      companionSlugs: list<string>(startHere.companionSlugs, base.startHere.companionSlugs),
    },
    grid: {
      kicker: str(grid.kicker, base.grid.kicker),
      title: str(grid.title, base.grid.title),
      description: str(grid.description, base.grid.description),
      pageSize,
      emptyMessage: str(grid.emptyMessage, base.grid.emptyMessage),
    },
    order: list<DestinationsAtlasSectionKey>(input.order, base.order),
    sections: (input.sections as DestinationsAtlasContent["sections"]) ?? base.sections,
  };
}
