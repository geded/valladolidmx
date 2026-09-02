/**
 * G8-D · Home Premium G4 — contenido canónico compartido.
 *
 * Fuente única de contenido de la Home Premium aprobada. Alimenta por igual:
 *  - la preview G4 (`/lovable/g4-home-premium-preview`);
 *  - el fixture de validación;
 *  - el canvas de Studio;
 *  - el renderer público de composiciones.
 *
 * No carga datos nuevos: los valores son deterministas y equivalentes a los
 * aprobados visualmente por el Founder (autoridad `HomePremiumBody`).
 */

import type { ExperienceMapDTO } from "@/lib/experience-builder/blocks/experience-map/types";

export type HomePremiumMedia = { url: string; alt: string };

/**
 * Medios conceptuales aprobados para visualizar la Home completa antes de
 * producción. Todos viven en Medios, están marcados como IA/temporales y el
 * resolutor real del CMS los sustituye en cuanto existe fotografía acreditada.
 */
export const HOME_PREMIUM_MEDIA = {
  plaza: {
    url: "/api/public/studio-media/conceptual-preview/2026-09-01/home-valladolid-editorial-preview.webp",
    alt: "Visual conceptual temporal de la plaza principal de Valladolid",
  },
  calle: {
    url: "/api/public/studio-media/conceptual-preview/2026-09-01/home-izamal-editorial-preview.webp",
    alt: "Visual conceptual temporal de arquitectura colonial del Oriente Maya",
  },
  centro: {
    url: "/api/public/studio-media/conceptual-preview/2026-09-01/valladolid-san-servacio-hero-preview.webp",
    alt: "Visual conceptual temporal del centro histórico de Valladolid",
  },
  cocina: {
    url: "/api/public/studio-media/2026/1788291772757-yp7xx5-restaurante-comal-cocina-maya-conceptual-v1.webp",
    alt: "Visual conceptual temporal de cocina yucateca del Oriente Maya",
  },
  patio: {
    url: "/api/public/studio-media/2026/1788291775648-7j8tiw-restaurante-patio-colonial-conceptual-v1.webp",
    alt: "Visual conceptual temporal de un patio colonial",
  },
  cenote: {
    url: "/api/public/studio-media/conceptual-preview/2026-09-01/oriente-maya-hero-naturaleza-v1.webp",
    alt: "Visual conceptual temporal de un cenote del Oriente Maya",
  },
} as const satisfies Record<string, HomePremiumMedia>;

export type HomePremiumSectionKey =
  | "destinos"
  | "pueblosMagicos"
  | "rutas"
  | "experiencias"
  | "servicios"
  | "eventos"
  | "queHacer"
  | "mapa";

export type HomePremiumRoute = {
  id: string;
  title: string;
  duration: string;
  stops: number;
  vibe: string;
  description: string;
  sequence: string[];
  media: HomePremiumMedia;
};

export type HomePremiumDestination = {
  name: string;
  note: string;
  media: HomePremiumMedia;
  puebloMagico: boolean;
  /** URL canónica real de la ficha. `null` ⇒ la tarjeta no se renderiza. */
  href: string | null;
};

export type HomePremiumExperience = {
  title: string;
  category: string;
  summary: string;
  media: HomePremiumMedia;
  href: string | null;
};

export type HomePremiumService = {
  title: string;
  destination: string;
  category: string;
  summary: string;
  media: HomePremiumMedia;
  href: string | null;
};

export type HomePremiumEvent = {
  day: string;
  title: string;
  type: string;
  detail: string;
  href: string | null;
};

export type HomePremiumEditorial = {
  kicker: string;
  title: string;
  body: string;
  media: HomePremiumMedia;
  href: string | null;
};

export type HomePremiumCategory = { slug: string; label: string; href: string };

export type HomePremiumContent = {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: { label: string; to: string };
    secondaryCta: { label: string; to: string };
    slides: { media: HomePremiumMedia; caption: string }[];
  };
  categorias: { heading: string; items: HomePremiumCategory[] };
  alux: {
    eyebrow: string;
    heading: string;
    description: string;
    prompts: string[];
  };
  destinos: {
    kicker: string;
    title: string;
    description: string;
    action: string;
    disclaimer: string;
    items: HomePremiumDestination[];
  };
  pueblosMagicos: {
    kicker: string;
    title: string;
    description: string;
    action: string;
    badgeNote: string;
    ctaLabel: string;
  };
  rutas: {
    kicker: string;
    title: string;
    description: string;
    action: string;
    items: HomePremiumRoute[];
  };
  experiencias: {
    kicker: string;
    title: string;
    description: string;
    action: string;
    items: HomePremiumExperience[];
  };
  servicios: {
    kicker: string;
    title: string;
    description: string;
    staysTitle: string;
    foodTitle: string;
    stays: HomePremiumService[];
    food: HomePremiumService[];
  };
  eventos: {
    kicker: string;
    title: string;
    description: string;
    media: HomePremiumMedia;
    items: HomePremiumEvent[];
  };
  queHacer: {
    kicker: string;
    title: string;
    description: string;
    action: string;
    items: HomePremiumEditorial[];
  };
  mapa: {
    kicker: string;
    title: string;
    description: string;
    dto: ExperienceMapDTO;
  };
  travelPlan: {
    eyebrow: string;
    title: string;
    ctaAddLabel: string;
    ctaAddedLabel: string;
    ctaAluxLabel: string;
  };
};

export const HOME_PREMIUM_SECTION_LABELS: Record<HomePremiumSectionKey, string> = {
  destinos: "Destinos del Oriente Maya de Yucatán",
  pueblosMagicos: "Pueblos Mágicos",
  rutas: "Rutas recomendadas por Alux",
  experiencias: "Experiencias",
  servicios: "Hospedaje y gastronomía",
  eventos: "Eventos",
  queHacer: "Qué hacer",
  mapa: "Mapa",
};

export const HOME_PREMIUM_DEFAULT_ORDER: HomePremiumSectionKey[] = [
  "destinos",
  "rutas",
  "pueblosMagicos",
  "experiencias",
  "servicios",
  "eventos",
  "queHacer",
  "mapa",
];

/**
 * G8-R1-F1L-R2 · El mapa de la Home no declara puntos fijos: sus paradas son
 * el corpus territorial real resuelto por `resolveTerritoryMapPointsQuery`.
 */
const MAP_DTO: ExperienceMapDTO = {
  variant: "multi",
  heading: "Paradas del territorio",
  center: { lat: 20.72, lng: -88.3, zoom: 10 },
  points: [],
  capabilities: {
    showDistance: false,
    showDirections: false,
    clustering: false,
    syncList: false,
    staticFallback: true,
    allowInteractiveToggle: true,
  },
  emptyMessage: null,
};

/**
 * Estructura editorial aprobada (autoridad visual G4).
 *
 * G8-R1-F1L-R2 · Contiene EXCLUSIVAMENTE el andamiaje editorial (títulos,
 * kickers, descripciones y CTAs a rutas canónicas). Ninguna tarjeta, medio,
 * ruta, duración o evento se declara aquí: todas las colecciones nacen
 * vacías y sólo el resolutor real del CMS las llena con entidades
 * publicadas, acreditadas y con URL canónica. Una colección vacía oculta
 * su sección; nunca se rellena con contenido demostrativo.
 */
export const HOME_PREMIUM_G4_CONTENT: HomePremiumContent = {
  hero: {
    eyebrow: "Revista territorial · Oriente Maya de Yucatán",
    title: "Valladolid, Capital Turística del Oriente Maya de Yucatán",
    subtitle:
      "Historias, rutas y lugares reunidos con una mirada editorial para inspirar el viaje y convertirlo, paso a paso, en un itinerario con Alux.",
    primaryCta: { label: "Explorar Oriente Maya de Yucatán", to: "/oriente-maya" },
    secondaryCta: { label: "Arma tu viaje", to: "/arma-tu-viaje" },
    slides: [
      { media: HOME_PREMIUM_MEDIA.centro, caption: "Centro histórico de Valladolid" },
      { media: HOME_PREMIUM_MEDIA.cenote, caption: "Cenotes del Oriente Maya de Yucatán" },
    ],
  },
  categorias: {
    heading: "Explora por categoría",
    items: [
      { slug: "destinos", label: "Destinos", href: "/oriente-maya" },
      { slug: "hoteles", label: "Hoteles", href: "/hoteles" },
      { slug: "restaurantes", label: "Restaurantes", href: "/restaurantes" },
      { slug: "experiencias", label: "Experiencias", href: "/experiencias" },
      { slug: "casas-de-vacaciones", label: "Casas de vacaciones", href: "/casas-de-vacaciones" },
      {
        slug: "lugares",
        label: "Lugares y sitios de interés",
        href: "/oriente-maya/valladolid/lugares",
      },
      { slug: "que-hacer", label: "Qué hacer", href: "/que-hacer" },
      { slug: "eventos", label: "Eventos", href: "/eventos" },
      { slug: "promociones", label: "Promociones", href: "/promociones" },
      { slug: "rutas", label: "Arma tu viaje", href: "/arma-tu-viaje" },
      { slug: "blog", label: "Blog", href: "/blog" },
      { slug: "mapas", label: "Mapa", href: "#mapa" },
    ],
  },
  alux: {
    eyebrow: "Planea con Alux",
    heading: "¿Qué quieres descubrir?",
    description:
      "Elige una pista y Alux propone un orden comprensible sobre los destinos publicados, conectado con tu Travel Plan canónico.",
    prompts: [
      "Tengo medio día",
      "Viajo en pareja",
      "Quiero cenotes y gastronomía",
      "Busco cultura viva",
    ],
  },
  destinos: {
    kicker: "Territorio",
    title: "Explora los destinos del Oriente Maya de Yucatán",
    description:
      "Cada tarjeta abre el micrositio del destino. Valladolid es la capital turística y el punto de partida sugerido.",
    action: "Todos los destinos",
    disclaimer:
      "Destinos publicados en el CMS del Oriente Maya de Yucatán. La ficha de cada destino concentra su información acreditada.",
    items: [],
  },
  pueblosMagicos: {
    kicker: "Distintivo territorial",
    title: "Pueblos Mágicos del Oriente Maya de Yucatán",
    description:
      "Valladolid, Izamal y Espita comparten un distintivo y tres formas distintas de vivir el oriente de Yucatán.",
    action: "Descubre los tres",
    badgeNote:
      "Distintivo textual: el emblema gráfico oficial se incorpora únicamente cuando existe un asset acreditado.",
    ctaLabel: "Crear ruta con Alux",
  },
  rutas: {
    kicker: "Elige un ritmo",
    title: "Rutas recomendadas por Alux",
    description:
      "Secuencias construidas sobre los destinos publicados del Oriente Maya de Yucatán.",
    action: "Propuestas de Alux",
    items: [],
  },
  experiencias: {
    kicker: "Experiencias",
    title: "Hay experiencias que no te puedes perder",
    description: "Experiencias publicadas por empresas acreditadas del territorio.",
    action: "Ver experiencias",
    items: [],
  },
  servicios: {
    kicker: "Servicios para continuar",
    title: "Descansa bien, come con contexto",
    description:
      "Hospedaje y gastronomía publicados en el CMS, con su ficha canónica para consultar el detalle.",
    staysTitle: "Hospedaje",
    foodTitle: "Gastronomía",
    stays: [],
    food: [],
  },
  eventos: {
    kicker: "Agenda editorial",
    title: "El territorio también ocurre hoy",
    description: "Eventos publicados con fecha acreditada en el CMS.",
    media: HOME_PREMIUM_MEDIA.plaza,
    items: [],
  },
  queHacer: {
    kicker: "Qué hacer · inspiración",
    title: "Historias para mirar mejor",
    description:
      "Contenido editorial publicado que prepara el viaje y contextualiza el territorio.",
    action: "Abrir cuaderno editorial",
    items: [],
  },
  mapa: {
    kicker: "Del relato al territorio",
    title: "Mira el territorio y sus paradas",
    description:
      "El mapa oficial reúne los puntos reales publicados. En móvil, el orden sigue siendo mapa → paradas.",
    dto: MAP_DTO,
  },
  travelPlan: {
    eyebrow: "Tu Travel Plan canónico",
    title: "Tu ruta empieza a tomar forma",
    ctaAddLabel: "Agregar a mi viaje",
    ctaAddedLabel: "Guardada en mi viaje",
    ctaAluxLabel: "Personalizar con Alux",
  },
};
