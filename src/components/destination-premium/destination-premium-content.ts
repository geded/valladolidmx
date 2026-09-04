/**
 * G8-E · Contenido aprobado del Micrositio de Destino Premium G4.
 *
 * Fixture extraído literalmente de la autoridad visual interna
 * `/lovable/g4-destination-microsite-preview`. Sirve como fallback
 * fail-closed del preset `destino-premium-g4-approved`: cualquier campo
 * ausente en la composición cae aquí y nunca deja un hueco visual.
 *
 * Sólo medios gobernados existentes vía la ruta pública estable
 * `/api/public/studio-media/governed/v1p1c/*`. Sin URLs firmadas.
 */

import {
  PUEBLOS_MAGICOS_AUTORIZADOS,
  isPuebloMagicoDestination,
} from "@/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry";

export interface DestinationPremiumMedia {
  /** Cadena vacía representa marcador Editorial neutral; nunca una imagen sustituta. */
  url: string;
  alt: string;
}

export interface DestinationPremiumService {
  key: string;
  label: string;
  hint: string;
  media: DestinationPremiumMedia;
}

export interface DestinationPremiumNearby {
  slug: string;
  name: string;
  distance: string;
  tagline: string;
  media: DestinationPremiumMedia;
  /** Ruta canónica del destino. Ausente sólo en fixtures históricos. */
  href?: string | null;
}

export interface DestinationPremiumMapPoint {
  id: string;
  kind: "destination" | "business";
  lat: number;
  lng: number;
  title: string;
  subtitle: string | null;
  badge: string | null;
  /** Ruta canónica del punto cuando existe una ficha pública resoluble. */
  href?: string | null;
}

export interface DestinationPremiumContent {
  slug: string;
  breadcrumbs: { label: string; href?: string }[];
  hero: {
    statusBadge: string | null;
    regionBadge: string;
    title: string;
    subtitle: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    cover: DestinationPremiumMedia;
    supporting: DestinationPremiumMedia[];
  };
  services: DestinationPremiumService[];
  servicesNote: string;
  descubre: {
    kicker: string;
    title: string;
    paragraphs: string[];
    media: DestinationPremiumMedia[];
  };
  gallery: {
    kicker: string;
    title: string;
    note: string;
    items: DestinationPremiumMedia[];
  };
  servicePreview: {
    actionLabel: string;
    cardTitlePrefix: string;
    cardBody: string;
  };
  map: {
    heading: string;
    center: { lat: number; lng: number; zoom: number };
    points: DestinationPremiumMapPoint[];
  };
  nearby: {
    kicker: string;
    title: string;
    description: string;
    items: DestinationPremiumNearby[];
  };
}

export type DestinationPremiumSectionKey =
  | "hero"
  | "services"
  | "descubre"
  | "gallery"
  | "servicePreview"
  | "map"
  | "nearby";

export const DESTINATION_PREMIUM_SECTION_ORDER: DestinationPremiumSectionKey[] = [
  "hero",
  "services",
  "descubre",
  "gallery",
  "servicePreview",
  "map",
  "nearby",
];

/**
 * Lote 3B — Pueblo Mágico deja de tener lista propia: la autoridad es el
 * Institutional Badges Registry (`restrictedSlugs`). Se conservan los
 * nombres exportados para no romper consumidores existentes.
 */
export const PUEBLOS_MAGICOS = PUEBLOS_MAGICOS_AUTORIZADOS;
export const isPuebloMagico = (slug: string): boolean => isPuebloMagicoDestination(slug);

const GOVERNED = "/api/public/studio-media/governed/v1p1c";

export const DESTINATION_PREMIUM_MEDIA = {
  cover: {
    url: `${GOVERNED}/destination-cover.jpg`,
    alt: "Torre de la catedral de San Servacio en tonos amarillo y blanco sobre la plaza central de Valladolid, Yucatán al atardecer dorado",
  },
  plaza: {
    url: `${GOVERNED}/destination-gallery-1.jpg`,
    alt: "Plaza principal de Valladolid con kiosco, bancas, palmeras y arcadas coloniales de herradura en tonos ocre y crema",
  },
  calle: {
    url: `${GOVERNED}/destination-gallery-2.jpg`,
    alt: "Calle colonial colorida de Valladolid con fachadas pastel en terracota, ocre y amarillo, puertas de madera y buganvilia",
  },
  cenote: {
    url: `${GOVERNED}/experience-cover.jpg`,
    alt: "Cenote abierto de aguas turquesa en una caverna de piedra caliza con raíces colgantes y plataforma de madera cerca de Valladolid, Yucatán",
  },
  piramide: {
    url: `${GOVERNED}/experience-gallery-1.jpg`,
    alt: "Templo pirámide maya cubierto de vegetación con piedras talladas y selva de fondo bajo la luz dorada de la mañana",
  },
  bici: {
    url: `${GOVERNED}/experience-gallery-2.jpg`,
    alt: "Tour en bicicleta por calles coloniales coloridas de Valladolid con fachadas ocre y terracota, balcones de hierro y adoquín",
  },
  hotel: {
    url: `${GOVERNED}/hotel-cover.jpg`,
    alt: "Patio central con piscina estilo cenote y arcos de piedra en un hotel boutique colonial de Valladolid, Yucatán",
  },
  habitacion: {
    url: `${GOVERNED}/hotel-gallery-1.jpg`,
    alt: "Habitación colonial con vigas de madera, cama de hierro forjado y tina de piedra junto a ventana con vegetación tropical",
  },
  terraza: {
    url: `${GOVERNED}/hotel-gallery-2.jpg`,
    alt: "Terraza con vista a la torre de la catedral colonial de Valladolid al atardecer, con sillas tejidas y luces colgantes",
  },
  restaurante: {
    url: `${GOVERNED}/restaurant-cover.jpg`,
    alt: "Terraza de restaurante colonial con arcos de piedra y cenas iluminadas con velas frente a un cenote en Valladolid, Yucatán",
  },
  cochinita: {
    url: `${GOVERNED}/restaurant-gallery-1.jpg`,
    alt: "Cochinita pibil tradicional yucateca servida en plato de cerámica artesanal con cebolla morada, habanero y tortillas",
  },
  comedor: {
    url: `${GOVERNED}/restaurant-gallery-2.jpg`,
    alt: "Comedor interior colonial con patio central, columnas de piedra, mesas de madera y lámparas tejidas en Valladolid, Yucatán",
  },
} as const;

const M = DESTINATION_PREMIUM_MEDIA;

export const DESTINATION_PREMIUM_G4_CONTENT: DestinationPremiumContent = {
  slug: "valladolid",
  breadcrumbs: [
    { label: "Inicio", href: "/" },
    { label: "Oriente Maya de Yucatán", href: "/oriente-maya" },
    { label: "Valladolid" },
  ],
  hero: {
    statusBadge: "Pueblo Mágico",
    regionBadge: "Oriente Maya de Yucatán",
    title: "Valladolid",
    subtitle: "Capital Turística del Oriente Maya de Yucatán",
    description: "Despierta aquí. Descubre desde Valladolid todo el Oriente Maya de Yucatán.",
    primaryCta: { label: "Arma tu viaje", href: "/arma-tu-viaje" },
    secondaryCta: { label: "Ver galería", href: "#galeria-destino" },
    cover: M.cover,
    supporting: [M.plaza, M.calle],
  },
  services: [
    { key: "hoteles", label: "Hoteles", hint: "Dónde dormir", media: M.hotel },
    { key: "restaurantes", label: "Restaurantes", hint: "Dónde comer", media: M.restaurante },
    { key: "que-hacer", label: "Qué hacer", hint: "Planes del día", media: M.plaza },
    {
      key: "casas-de-vacaciones",
      label: "Casas de vacaciones",
      hint: "Estancias completas",
      media: M.habitacion,
    },
    {
      key: "experiencias",
      label: "Experiencias",
      hint: "Tours, cenotes y cultura viva",
      media: M.cenote,
    },
    { key: "eventos", label: "Eventos", hint: "Qué pasa esta semana", media: M.terraza },
    { key: "promociones", label: "Promociones", hint: "Ofertas verificadas", media: M.cochinita },
  ],
  servicesNote:
    "Tours forma parte de Experiencias (subtipo interno); no es una categoría pública independiente.",
  descubre: {
    kicker: "El destino",
    title: "Descubre Valladolid",
    paragraphs: [
      "Fundada en 1543 sobre el asentamiento maya de Zací, Valladolid conserva un centro histórico de calles empedradas, casonas de arcos de herradura y fachadas en ocre, terracota y añil. Su plaza principal, custodiada por la catedral de San Servacio y el Parque Francisco Cantón, sigue siendo el corazón social de la ciudad al caer la tarde.",
      "La cocina yucateca se vive aquí en su versión más honesta: cochinita pibil de horno de tierra, lomitos de Valladolid, longaniza ahumada y xtabentún. A pocos minutos del centro se abren los cenotes Zací, Suytun, Oxman y Xkeken, y en su territorio conviven talleres de bordado, comunidades mayas vivas y haciendas henequeneras.",
      "Por su ubicación, Valladolid es la base natural para recorrer el Oriente Maya de Yucatán: Chichén Itzá, Ek' Balam, Izamal, Río Lagartos y Las Coloradas están al alcance de una jornada.",
    ],
    media: [M.calle, M.cochinita, M.cenote],
  },
  gallery: {
    kicker: "Galería",
    title: "Valladolid en imágenes",
    note: "Fotografías gobernadas existentes servidas por ruta pública estable. Sin URLs firmadas.",
    items: [M.cover, M.plaza, M.calle, M.cenote, M.piramide, M.comedor],
  },
  servicePreview: {
    actionLabel: "Ver todo",
    cardTitlePrefix: "Ficha de ejemplo",
    cardBody: "Contenido ilustrativo de maquetación. No representa datos publicados.",
  },
  map: {
    heading: "Explora Valladolid y su territorio",
    center: { lat: 20.6896, lng: -88.2011, zoom: 13 },
    points: [
      {
        id: "valladolid-centro",
        kind: "destination",
        lat: 20.6896,
        lng: -88.2011,
        title: "Centro histórico de Valladolid",
        subtitle: "Parque Francisco Cantón · San Servacio",
        badge: "Pueblo Mágico",
      },
      {
        id: "cenote-zaci",
        kind: "business",
        lat: 20.6907,
        lng: -88.1962,
        title: "Cenote Zací",
        subtitle: "Cenote urbano",
        badge: null,
      },
      {
        id: "calzada-frailes",
        kind: "business",
        lat: 20.6852,
        lng: -88.2072,
        title: "Calzada de los Frailes",
        subtitle: "Paseo colonial",
        badge: null,
      },
      {
        id: "convento-sisal",
        kind: "business",
        lat: 20.6836,
        lng: -88.2098,
        title: "Convento de San Bernardino de Sisal",
        subtitle: "Patrimonio · s. XVI",
        badge: null,
      },
      {
        id: "ek-balam",
        kind: "destination",
        lat: 20.8917,
        lng: -88.1347,
        title: "Ek' Balam",
        subtitle: "Zona arqueológica",
        badge: null,
      },
      {
        id: "chichen-itza",
        kind: "destination",
        lat: 20.6843,
        lng: -88.5678,
        title: "Chichén Itzá",
        subtitle: "Patrimonio de la Humanidad",
        badge: null,
      },
    ],
  },
  nearby: {
    kicker: "Oriente Maya de Yucatán",
    title: "Cerca de Valladolid",
    description: "Desde aquí se alcanza el resto del territorio en menos de dos horas.",
    items: [
      {
        slug: "chichen-itza",
        name: "Chichén Itzá",
        distance: "45 km · 40 min",
        tagline: "Maravilla del mundo y observatorio maya.",
        media: M.piramide,
      },
      {
        slug: "ek-balam",
        name: "Ek' Balam",
        distance: "28 km · 30 min",
        tagline: "La ciudad del jaguar negro y su cenote Xcanché.",
        media: M.bici,
      },
      {
        slug: "cenotes",
        name: "Ruta de cenotes",
        distance: "5–25 km",
        tagline: "Zací, Suytun, Oxman y Xkeken en un mismo día.",
        media: M.cenote,
      },
      {
        slug: "izamal",
        name: "Izamal",
        distance: "75 km · 1 h 10",
        tagline: "La ciudad amarilla, tres culturas en una plaza.",
        media: M.calle,
      },
      {
        slug: "rio-lagartos",
        name: "Río Lagartos y Las Coloradas",
        distance: "105 km · 1 h 40",
        tagline: "Flamencos, manglar y lagunas rosadas.",
        media: M.comedor,
      },
    ],
  },
};
