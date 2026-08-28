/**
 * G8-Q2D-0 · Contenido de DEMOSTRACIÓN VISUAL de la futura ficha reusable
 * `premium-entity-place` (variante `zona-arqueologica`).
 *
 * ⚠️ DEMO VISUAL · NO PUBLICABLE.
 * Este fixture existe EXCLUSIVAMENTE para que el Founder pueda aprobar
 * visualmente la propuesta en la vista interna noindex
 * `/lovable/g8-place-premium-visual-approval`.
 *
 * Reglas conservadas:
 *  - Render-only: no hay lectura ni escritura de contenido real.
 *  - Sólo medios gobernados existentes vía la ruta pública estable
 *    `/api/public/studio-media/governed/v1p1c/*`; ninguno documenta
 *    realmente el lugar, por eso cada medio declara crédito visible y
 *    la marca `DEMO VISUAL`.
 *  - Ningún dato aquí se publica, persiste ni alimenta SEO.
 */

export interface PlacePremiumMedia {
  /** `null` = placeholder neutral: no existe fotografía acreditada del lugar. */
  url: string | null;
  alt: string;
  credit: string;
  /** Etiqueta corta del marcador neutral (sólo cuando `url` es `null`). */
  placeholderLabel?: string;
}


export interface PlacePremiumFact {
  key: string;
  label: string;
  value: string;
  hint?: string;
}

export interface PlacePremiumService {
  key: string;
  label: string;
  hint: string;
}

export interface PlacePremiumRelated {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  media: PlacePremiumMedia;
}

export interface PlacePremiumNearby {
  id: string;
  title: string;
  distance: string;
  tagline: string;
  media: PlacePremiumMedia;
}

export interface PlacePremiumMapPoint {
  id: string;
  kind: "destination" | "business";
  lat: number;
  lng: number;
  title: string;
  subtitle: string | null;
  badge: string | null;
}

export interface PlacePremiumContent {
  /** Marca obligatoria de demostración; se renderiza siempre. */
  demoNotice: string;
  slug: string;
  destinationSlug: string;
  breadcrumbs: { label: string; href?: string }[];
  identity: {
    eyebrow: string;
    title: string;
    subtitle: string;
    typeLabel: string;
    destinationLabel: string;
    regionLabel: string;
    badges: string[];
  };
  hero: {
    cover: PlacePremiumMedia;
    supporting: PlacePremiumMedia[];
    primaryCta: { label: string };
    secondaryCta: { label: string; href: string };
  };
  intro: {
    kicker: string;
    title: string;
    paragraphs: string[];
    pullQuote: string;
    media: PlacePremiumMedia[];
  };
  essentials: {
    kicker: string;
    title: string;
    description: string;
    facts: PlacePremiumFact[];
    recommendations: string[];
    accessibility: string[];
  };
  gallery: {
    kicker: string;
    title: string;
    note: string;
    items: PlacePremiumMedia[];
  };
  map: {
    heading: string;
    center: { lat: number; lng: number; zoom: number };
    points: PlacePremiumMapPoint[];
    directions: string[];
  };
  services: PlacePremiumService[];
  experiences: PlacePremiumRelated[];
  /** Vacío a propósito: demuestra el ocultamiento correcto de módulos. */
  events: PlacePremiumRelated[];
  nearby: PlacePremiumNearby[];
  trip: {
    title: string;
    description: string;
    actionLabel: string;
  };
  alux: {
    title: string;
    description: string;
    prompts: string[];
    actionLabel: string;
  };
}

const GOVERNED = "/api/public/studio-media/governed/v1p1c";
const DEMO_CREDIT = "DEMO VISUAL · imagen de biblioteca gobernada · no documenta el lugar";
const PLACEHOLDER_CREDIT =
  "Sin fotografía acreditada del lugar · marcador neutral · no representa otro sitio";

/**
 * Founder Review G8-Q2D-0: ninguna imagen de biblioteca puede representar a
 * Chichén Itzá. Mientras no exista fotografía acreditada del propio sitio, la
 * ficha usa marcadores neutrales (sin fotografía de otro lugar).
 */
function placeholderMedia(label: string): PlacePremiumMedia {
  return {
    url: null,
    alt: `Marcador neutral: ${label}. Sin fotografía acreditada del lugar.`,
    credit: PLACEHOLDER_CREDIT,
    placeholderLabel: label,
  };
}

export const PLACE_PREMIUM_PLACE_PLACEHOLDERS = {
  cover: placeholderMedia("Portada del lugar"),
  apoyo1: placeholderMedia("Vista de apoyo 1"),
  apoyo2: placeholderMedia("Vista de apoyo 2"),
  gal1: placeholderMedia("Galería 1"),
  gal2: placeholderMedia("Galería 2"),
  gal3: placeholderMedia("Galería 3"),
  gal4: placeholderMedia("Galería 4"),
} as const satisfies Record<string, PlacePremiumMedia>;

export const PLACE_PREMIUM_DEMO_MEDIA = {
  selva: {
    url: `${GOVERNED}/experience-cover.jpg`,
    alt: "Cenote abierto de aguas turquesa en una caverna de piedra caliza con raíces colgantes",
    credit: DEMO_CREDIT,
  },
  plaza: {
    url: `${GOVERNED}/destination-gallery-1.jpg`,
    alt: "Plaza principal con kiosco, palmeras y arcadas coloniales en tonos ocre y crema",
    credit: DEMO_CREDIT,
  },
  bici: {
    url: `${GOVERNED}/experience-gallery-2.jpg`,
    alt: "Recorrido en bicicleta por calles coloniales con balcones de hierro y adoquín",
    credit: DEMO_CREDIT,
  },
  cena: {
    url: `${GOVERNED}/restaurant-cover.jpg`,
    alt: "Terraza de restaurante con arcos de piedra iluminada con velas al anochecer",
    credit: DEMO_CREDIT,
  },
} as const satisfies Record<string, PlacePremiumMedia>;

const M = PLACE_PREMIUM_DEMO_MEDIA;
const P = PLACE_PREMIUM_PLACE_PLACEHOLDERS;


export const PLACE_PREMIUM_DEMO_CONTENT: PlacePremiumContent = {
  demoNotice:
    "DEMO VISUAL · NO PUBLICABLE — textos y fotografías de demostración para evaluar la propuesta visual. Ningún dato proviene de contenido publicado ni se guarda.",
  slug: "chichen-itza",
  destinationSlug: "tinum",
  breadcrumbs: [
    { label: "Inicio", href: "/" },
    { label: "Oriente Maya", href: "/oriente-maya" },
    { label: "Tinum" },
    { label: "Chichén Itzá" },
  ],
  identity: {
    eyebrow: "Lugar y atractivo",
    title: "Chichén Itzá",
    subtitle: "Zona arqueológica del Oriente Maya de Yucatán",
    typeLabel: "Zona arqueológica",
    destinationLabel: "Tinum",
    regionLabel: "Oriente Maya de Yucatán",
    badges: ["Zona arqueológica", "Destino: Tinum", "DEMO VISUAL"],
  },
  hero: {
    cover: P.cover,
    supporting: [P.apoyo1, P.apoyo2],

    primaryCta: { label: "Agregar a Mi Viaje" },
    secondaryCta: { label: "Ver galería", href: "#galeria-lugar" },
  },
  intro: {
    kicker: "Historia y contexto",
    title: "El corazón ceremonial de la llanura de Tinum",
    paragraphs: [
      "Texto de demostración. Esta columna editorial existe para evaluar el ritmo de lectura tipo revista territorial: párrafos largos, respiración amplia y fotografías integradas en el flujo de la historia, no como bloque separado.",
      "Texto de demostración. La ficha de un lugar comienza por el contexto: qué significó para la región, qué se ve hoy y por qué merece un lugar en el itinerario de quien despierta en el Oriente Maya.",
      "Texto de demostración. El contenido definitivo será redactado y acreditado por el equipo editorial en la fase Q2D-A, con fuentes verificables y sin afirmaciones inventadas.",
    ],
    pullQuote:
      "Texto de demostración: una cita editorial destacada para probar la jerarquía tipográfica serif del sistema premium.",
    media: [P.apoyo1, P.apoyo2],
  },
  essentials: {
    kicker: "Lo esencial",
    title: "Antes de ir",
    description:
      "Datos operativos de demostración. En producción provendrán del CMS de Lugares y atractivos, nunca del código.",
    facts: [
      { key: "horarios", label: "Horarios", value: "8:00 – 17:00", hint: "Todos los días (demo)" },
      {
        key: "admision",
        label: "Admisión",
        value: "Cuota por definir",
        hint: "Valor de demostración",
      },
      {
        key: "duracion",
        label: "Duración sugerida",
        value: "3 a 4 horas",
        hint: "Recorrido completo (demo)",
      },
      {
        key: "mejor-hora",
        label: "Mejor momento",
        value: "Primeras horas",
        hint: "Menos calor y menos gente (demo)",
      },
    ],
    recommendations: [
      "Lleva agua, sombrero y calzado cómodo (demo).",
      "Reserva tu transporte con anticipación en temporada alta (demo).",
      "Contrata guía certificado para entender el contexto (demo).",
    ],
    accessibility: [
      "Accesos principales en superficie plana (demo).",
      "Sanitarios y áreas de descanso en el acceso (demo).",
      "Algunas estructuras no son accesibles en silla de ruedas (demo).",
    ],
  },
  gallery: {
    kicker: "Galería",
    title: "Cómo se ve",
    note: "Imágenes de biblioteca gobernada usadas como marcador visual. Cada una muestra su crédito y no documenta el lugar.",
    items: [M.piramide, M.selva, M.camino, M.plaza],
  },
  map: {
    heading: "Ubicación y cómo llegar",
    center: { lat: 20.6843, lng: -88.5678, zoom: 11 },
    points: [
      {
        id: "demo-place",
        kind: "destination",
        lat: 20.6843,
        lng: -88.5678,
        title: "Chichén Itzá (demo)",
        subtitle: "Zona arqueológica · Tinum",
        badge: "DEMO",
      },
      {
        id: "demo-destination",
        kind: "destination",
        lat: 20.6896,
        lng: -88.2011,
        title: "Valladolid (demo)",
        subtitle: "Base de viaje sugerida",
        badge: null,
      },
    ],
    directions: [
      "Desde Valladolid: ~40 minutos por carretera federal (demo).",
      "Desde Tinum: ~15 minutos (demo).",
      "Estacionamiento en el acceso principal (demo).",
    ],
  },
  services: [
    { key: "guias", label: "Guías certificados", hint: "Recorridos con contexto (demo)" },
    { key: "estacionamiento", label: "Estacionamiento", hint: "Acceso principal (demo)" },
    { key: "sanitarios", label: "Sanitarios", hint: "En zona de acceso (demo)" },
    { key: "alimentos", label: "Alimentos y bebidas", hint: "Servicios cercanos (demo)" },
  ],
  experiences: [
    {
      id: "exp-1",
      title: "Recorrido guiado al amanecer",
      eyebrow: "Experiencia",
      description:
        "Contenido de demostración para evaluar la tarjeta de experiencias relacionadas.",
      media: M.bici,
    },
    {
      id: "exp-2",
      title: "Ruta arqueológica y cenote",
      eyebrow: "Experiencia",
      description: "Contenido de demostración para evaluar la densidad del carrusel de tarjetas.",
      media: M.selva,
    },
    {
      id: "exp-3",
      title: "Cena yucateca después del recorrido",
      eyebrow: "Experiencia",
      description: "Contenido de demostración para evaluar tres columnas en escritorio.",
      media: M.cena,
    },
  ],
  events: [],
  nearby: [
    {
      id: "near-1",
      title: "Valladolid",
      distance: "40 min",
      tagline: "Base de viaje del Oriente Maya (demo)",
      media: M.plaza,
    },
    {
      id: "near-2",
      title: "Cenote cercano",
      distance: "20 min",
      tagline: "Parada natural sugerida (demo)",
      media: M.selva,
    },
  ],
  trip: {
    title: "Agregar a Mi Viaje",
    description:
      "En producción, este control guarda el lugar en el plan del viajero. En esta vista de aprobación no persiste nada.",
    actionLabel: "Agregar a Mi Viaje",
  },
  alux: {
    title: "Alux, tu copiloto de viaje",
    description:
      "Alux acompaña antes de pedir datos: propone horarios, combina el lugar con experiencias cercanas y explica por qué lo sugiere.",
    prompts: [
      "¿A qué hora conviene llegar?",
      "¿Qué hago cerca el mismo día?",
      "¿Cómo llego desde Valladolid?",
    ],
    actionLabel: "Preguntar a Alux",
  },
};

export type PlacePremiumSectionKey =
  | "hero"
  | "identity"
  | "intro"
  | "essentials"
  | "gallery"
  | "map"
  | "services"
  | "experiences"
  | "events"
  | "nearby"
  | "trip"
  | "alux";

/** Orden canónico propuesto para la variante `zona-arqueologica`. */
export const PLACE_PREMIUM_SECTION_ORDER: readonly PlacePremiumSectionKey[] = [
  "hero",
  "identity",
  "intro",
  "essentials",
  "gallery",
  "map",
  "services",
  "experiences",
  "events",
  "nearby",
  "trip",
  "alux",
];
