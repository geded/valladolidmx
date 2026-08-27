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

const GOVERNED = "/api/public/studio-media/governed/v1p1c";

export type HomePremiumMedia = { url: string; alt: string };

export const HOME_PREMIUM_MEDIA = {
  plaza: {
    url: `${GOVERNED}/destination-gallery-1.jpg`,
    alt: "Plaza principal de Valladolid con kiosco, palmeras y arcadas coloniales",
  },
  calle: {
    url: `${GOVERNED}/destination-gallery-2.jpg`,
    alt: "Calle colonial de Valladolid con fachadas pastel y puertas de madera",
  },
  centro: {
    url: `${GOVERNED}/destination-cover.jpg`,
    alt: "Centro histórico de Valladolid con arquitectura colonial bajo la luz cálida de la tarde",
  },
  cocina: {
    url: `${GOVERNED}/restaurant-cover.jpg`,
    alt: "Terraza de restaurante colonial con arcos de piedra y mesas iluminadas",
  },
  patio: {
    url: `${GOVERNED}/hotel-cover.jpg`,
    alt: "Patio de hotel boutique con piscina y arcos de piedra caliza",
  },
  cenote: {
    url: `${GOVERNED}/experience-cover.jpg`,
    alt: "Cenote de aguas turquesa dentro de una caverna de piedra caliza",
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
  demo: boolean;
};

export type HomePremiumExperience = {
  title: string;
  category: string;
  summary: string;
  media: HomePremiumMedia;
};

export type HomePremiumService = {
  title: string;
  destination: string;
  category: string;
  summary: string;
  media: HomePremiumMedia;
};

export type HomePremiumEvent = {
  day: string;
  title: string;
  type: string;
  detail: string;
};

export type HomePremiumEditorial = {
  kicker: string;
  title: string;
  body: string;
  media: HomePremiumMedia;
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
  "pueblosMagicos",
  "rutas",
  "experiencias",
  "servicios",
  "eventos",
  "queHacer",
  "mapa",
];

const MAP_DTO: ExperienceMapDTO = {
  variant: "multi",
  heading: "Paradas de la ruta en el territorio",
  center: { lat: 20.72, lng: -88.3, zoom: 10 },
  points: [
    {
      id: "valladolid",
      kind: "destination",
      lat: 20.6892,
      lng: -88.2018,
      title: "Valladolid",
      subtitle: "Inicio sugerido · Capital Turística del Oriente Maya de Yucatán",
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
    {
      id: "espita",
      kind: "destination",
      lat: 21.0117,
      lng: -88.3061,
      title: "Espita",
      subtitle: "Segunda parada · demo visual",
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
    {
      id: "izamal",
      kind: "destination",
      lat: 20.9308,
      lng: -89.0175,
      title: "Izamal",
      subtitle: "Tercera parada · demo visual",
      href: null,
      thumbUrl: null,
      badge: null,
      priceLabel: null,
    },
  ],
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
 * Contenido aprobado (autoridad visual G4). Determinista, sin red ni backend.
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
      { media: HOME_PREMIUM_MEDIA.centro, caption: "Centro histórico al atardecer" },
      { media: HOME_PREMIUM_MEDIA.cenote, caption: "Cenotes del Oriente Maya de Yucatán" },
    ],
  },
  categorias: {
    heading: "Explora por categoría",
    items: [
      { slug: "destinos", label: "Destinos", href: "#" },
      { slug: "hoteles", label: "Hoteles", href: "#" },
      { slug: "restaurantes", label: "Restaurantes", href: "#" },
      { slug: "experiencias", label: "Experiencias", href: "#" },
      { slug: "cenotes", label: "Cenotes", href: "#" },
      { slug: "zonas-arqueologicas", label: "Zonas arqueológicas", href: "#" },
      { slug: "eventos", label: "Eventos", href: "#" },
      { slug: "gastronomia", label: "Gastronomía", href: "#" },
      { slug: "pueblos", label: "Pueblos", href: "#" },
      { slug: "rutas", label: "Rutas", href: "#" },
      { slug: "artesanias", label: "Artesanías", href: "#" },
      { slug: "mapas", label: "Mapas", href: "#" },
    ],
  },
  alux: {
    eyebrow: "Planea con Alux",
    heading: "¿Qué quieres descubrir?",
    description:
      "Elige una pista. Alux propone un orden comprensible y lo conecta con el Travel Plan canónico; esta preview sólo simula la interacción local.",
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
      "Cada tarjeta es la entrada a su micrositio. Valladolid es la capital turística y el punto de partida sugerido; el resto se presenta como demo visual en esta preview.",
    action: "Todos los destinos",
    disclaimer:
      "Listado demostrativo de los destinos disponibles en esta preview. No se afirma cobertura, disponibilidad ni datos operativos; la apertura del micrositio es una acción local simulada.",
    items: [
      {
        name: "Valladolid",
        note: "Capital turística · punto de partida",
        media: HOME_PREMIUM_MEDIA.centro,
        puebloMagico: true,
        demo: false,
      },
      {
        name: "Izamal",
        note: "Ciudad amarilla · patrimonio vivo",
        media: HOME_PREMIUM_MEDIA.calle,
        puebloMagico: true,
        demo: true,
      },
      {
        name: "Espita",
        note: "Arquitectura y ritmo de pueblo",
        media: HOME_PREMIUM_MEDIA.plaza,
        puebloMagico: true,
        demo: true,
      },
      {
        name: "Temozón",
        note: "Artesanía y sabor del oriente",
        media: HOME_PREMIUM_MEDIA.cocina,
        puebloMagico: false,
        demo: true,
      },
    ],
  },
  pueblosMagicos: {
    kicker: "Distintivo territorial",
    title: "Pueblos Mágicos del Oriente Maya de Yucatán",
    description:
      "Valladolid, Izamal y Espita comparten un distintivo y tres formas distintas de vivir el oriente de Yucatán.",
    action: "Descubre los tres",
    badgeNote:
      "Badge exclusivamente textual: el distintivo gráfico oficial espera un asset acreditado y no se fabrica ni se imita en esta preview.",
    ctaLabel: "Crear ruta con Alux",
  },
  rutas: {
    kicker: "Elige un ritmo",
    title: "Rutas recomendadas por Alux",
    description:
      "Tres relatos compactos que convierten inspiración en una secuencia de paradas. Duraciones y contenidos son demostrativos; no afirman distancia, precio ni disponibilidad.",
    action: "3 propuestas",
    items: [
      {
        id: "essential",
        title: "Valladolid esencial",
        duration: "Medio día",
        stops: 4,
        vibe: "Historia, paseo y sabor",
        description: "Una primera lectura de la ciudad, del centro a una cocina tradicional.",
        sequence: ["Plaza principal", "San Servacio", "Calzada de los Frailes", "Cocina local"],
        media: HOME_PREMIUM_MEDIA.centro,
      },
      {
        id: "cenotes",
        title: "Cenotes y comunidades",
        duration: "Un día",
        stops: 4,
        vibe: "Naturaleza y cultura viva",
        description: "Una propuesta visual para ordenar agua, territorio y comunidades sin prisas.",
        sequence: ["Valladolid", "Cenote de la región", "Comunidad maya", "Regreso al centro"],
        media: HOME_PREMIUM_MEDIA.cenote,
      },
      {
        id: "pueblos",
        title: "Pueblos Mágicos del Oriente Maya de Yucatán",
        duration: "Dos días",
        stops: 3,
        vibe: "Patrimonio y vida local",
        description:
          "Tres escalas para comprender la identidad compartida y los matices del oriente.",
        sequence: ["Valladolid", "Espita", "Izamal"],
        media: HOME_PREMIUM_MEDIA.calle,
      },
    ],
  },
  experiencias: {
    kicker: "Experiencias",
    title: "Vive lo que da forma al territorio",
    description: "Una selección densa: un relato protagonista y tres maneras de continuar.",
    action: "Ver experiencias",
    items: [
      {
        title: "Inframundo Maya",
        category: "Cenote · Valladolid",
        summary: "Lectura del paisaje kárstico y descenso guiado a una caverna.",
        media: HOME_PREMIUM_MEDIA.cenote,
      },
      {
        title: "Calzada de los Frailes",
        category: "Caminata cultural",
        summary: "Fachadas restauradas, oficios y memoria urbana.",
        media: HOME_PREMIUM_MEDIA.calle,
      },
      {
        title: "Amanecer en la plaza",
        category: "Vida local",
        summary: "Arcadas, mercado y cocina de humo antes del mediodía.",
        media: HOME_PREMIUM_MEDIA.plaza,
      },
      {
        title: "Patios de piedra",
        category: "Arquitectura",
        summary: "Una mirada íntima a los espacios frescos de la ciudad.",
        media: HOME_PREMIUM_MEDIA.patio,
      },
    ],
  },
  servicios: {
    kicker: "Servicios para continuar",
    title: "Descansa bien, come con contexto",
    description:
      "Tarjetas compactas con lo necesario para decidir qué explorar después; sin precios ni disponibilidad simulados.",
    staysTitle: "Hospedaje",
    foodTitle: "Gastronomía",
    stays: [
      {
        title: "Hacienda San Servacio",
        destination: "Valladolid",
        category: "Hotel boutique · demo visual",
        summary: "Casona colonial con patio de arcos y piscina estilo cenote.",
        media: HOME_PREMIUM_MEDIA.patio,
      },
      {
        title: "Casa de piedra en el centro",
        destination: "Valladolid",
        category: "Hospedaje · demo visual",
        summary: "Muros gruesos y una ubicación pensada para recorrer la ciudad a pie.",
        media: HOME_PREMIUM_MEDIA.centro,
      },
    ],
    food: [
      {
        title: "Cocina de Zací",
        destination: "Valladolid",
        category: "Cocina yucateca · demo visual",
        summary: "Recetario de fuego lento servido en una terraza de arcos.",
        media: HOME_PREMIUM_MEDIA.cocina,
      },
      {
        title: "Mercado y cocinas de barrio",
        destination: "Valladolid",
        category: "Cocina local · demo visual",
        summary: "Una selección editorial para comprender sabores, horarios y rituales cotidianos.",
        media: HOME_PREMIUM_MEDIA.plaza,
      },
    ],
  },
  eventos: {
    kicker: "Agenda editorial",
    title: "El territorio también ocurre hoy",
    description:
      "Agenda compacta, sin imágenes ornamentales aisladas ni datos de disponibilidad no acreditados.",
    media: HOME_PREMIUM_MEDIA.plaza,
    items: [
      {
        day: "Fecha por confirmar",
        title: "Noche de Valladolid",
        type: "Música y memoria",
        detail:
          "Velada cultural en el centro histórico · demo visual, sin disponibilidad afirmada.",
      },
      {
        day: "Sin fecha acreditada",
        title: "Oficios de la Calzada",
        type: "Talleres y comunidad",
        detail: "Encuentro editorial con artesanos locales · demo visual.",
      },
      {
        day: "Agenda en preparación",
        title: "Sabores del oriente",
        type: "Gastronomía",
        detail: "Relato visual de productores y cocinas · demo visual.",
      },
    ],
  },
  queHacer: {
    kicker: "Qué hacer · inspiración",
    title: "Historias para mirar mejor",
    description:
      "Contenido transversal que prepara el viaje y contextualiza el territorio; no duplica experiencias ni tours.",
    action: "Abrir cuaderno editorial",
    items: [
      {
        kicker: "Patrimonio",
        title: "Leer una ciudad de piedra caliza",
        body: "Claves para mirar fachadas, dinteles y el trazado original del centro.",
        media: HOME_PREMIUM_MEDIA.centro,
      },
      {
        kicker: "Territorio",
        title: "El agua bajo el suelo",
        body: "Una introducción a los cenotes y su relación con la vida del Oriente Maya de Yucatán.",
        media: HOME_PREMIUM_MEDIA.cenote,
      },
      {
        kicker: "Cuaderno de viaje",
        title: "Viajar sin prisa",
        body: "Cómo combinar pueblos, cocina y naturaleza en una ruta de varios días.",
        media: HOME_PREMIUM_MEDIA.calle,
      },
    ],
  },
  mapa: {
    kicker: "Del relato al territorio",
    title: "Mira la ruta y sus paradas",
    description:
      "El mapa oficial se acompaña de la lista de puntos del bloque y del contexto de la ruta elegida. En móvil, el orden sigue siendo mapa → paradas.",
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
