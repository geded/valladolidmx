/**
 * G8-E · Contenido aprobado de los 6 listados turísticos Premium G5.
 *
 * Fixture extraído de la autoridad visual interna
 * `/lovable/g5-listing-readiness-preview` (D-05 fallback de medio y D-06
 * casas de vacaciones incluidos). Es el fallback fail-closed del preset
 * `listado-premium-g5-approved`.
 *
 * Autoridad de render: `TourismListingSurface` (Founder Discovery
 * Standard). Aquí no se construye ninguna URL derivada de medios.
 */
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";

const GOVERNED = "/api/public/studio-media/governed/v1p1c";

export type ListingFamilyId =
  | "hoteles"
  | "restaurantes"
  | "experiencias"
  | "eventos"
  | "casas-de-vacaciones"
  | "que-hacer";

export interface ListingPremiumFamily {
  id: ListingFamilyId;
  label: string;
  /** Ruta pública canónica que servirá este preset. */
  route: string;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    mediaUrl: string | null;
    mediaAlt: string | null;
  };
  items: TourismCardVM[];
}

export function listingCard(
  partial: Partial<TourismCardVM> & { id: string; name: string },
): TourismCardVM {
  return {
    entityKind: null,
    eyebrow: null,
    mapLabel: null,
    href: null,
    tagline: null,
    businessName: null,
    mediaUrl: null,
    mediaAlt: null,
    rating: null,
    location: null,
    territorialContext: "Valladolid · Oriente Maya",
    highlights: [],
    badges: [],
    institutionalBadges: [],
    dateLabel: null,
    availabilityLabel: null,
    priceAmount: null,
    priceCurrency: "MXN",
    priceHint: null,
    primaryAction: null,
    secondaryAction: null,
    ...partial,
  };
}

export const LISTING_PREMIUM_G5_FAMILIES: ListingPremiumFamily[] = [
  {
    id: "hoteles",
    label: "Hoteles",
    route: "/hoteles",
    hero: {
      eyebrow: "Dónde dormir",
      title: "Hoteles en el Oriente Maya",
      subtitle: "Casonas coloniales, haciendas y hospedaje boutique.",
      mediaUrl: `${GOVERNED}/hotel-cover.jpg`,
      mediaAlt: "Hoteles en Valladolid, Yucatán",
    },
    items: [
      listingCard({
        id: "h1",
        entityKind: "hotel",
        name: "Hacienda San Servacio Boutique",
        tagline: "Casona del siglo XVIII a dos calles de la catedral.",
        mediaUrl: `${GOVERNED}/hotel-cover.jpg`,
        mediaAlt: "Patio colonial con alberca estilo cenote",
        highlights: ["Alberca estilo cenote", "Desayuno yucateco"],
        location: { label: "Centro Histórico", distanceKm: 0.4 },
      }),
      listingCard({
        id: "h2",
        entityKind: "hotel",
        name: "Posada Calzada de los Frailes",
        tagline: "Habitaciones alrededor de un patio de piedra.",
        mediaUrl: `${GOVERNED}/hotel-gallery-1.jpg`,
        mediaAlt: "Habitación colonial con vigas de madera",
        location: { label: "Sisal", distanceKm: 1.1 },
      }),
      listingCard({
        id: "h3",
        entityKind: "hotel",
        name: "Hospedaje sin portada gobernada",
        tagline: "Caso de prueba para el fallback visual de medios (D-05).",
        location: { label: "Valladolid", distanceKm: null },
      }),
    ],
  },
  {
    id: "restaurantes",
    label: "Restaurantes",
    route: "/restaurantes",
    hero: {
      eyebrow: "Dónde comer",
      title: "Cocina del Oriente Maya",
      subtitle: "Fondas, terrazas y cocina de autor yucateca.",
      mediaUrl: `${GOVERNED}/restaurant-cover.jpg`,
      mediaAlt: "Restaurantes en Valladolid, Yucatán",
    },
    items: [
      listingCard({
        id: "r1",
        entityKind: "restaurant",
        name: "Terraza de los Arcos",
        tagline: "Cocina yucateca contemporánea frente a un cenote.",
        mediaUrl: `${GOVERNED}/restaurant-cover.jpg`,
        mediaAlt: "Terraza colonial iluminada con velas",
        priceAmount: 480,
        priceHint: "por persona",
      }),
      listingCard({
        id: "r2",
        entityKind: "restaurant",
        name: "Fonda del Mercado",
        tagline: "Desayunos tradicionales y recados de la región.",
        mediaUrl: `${GOVERNED}/restaurant-gallery-1.jpg`,
        mediaAlt: "Cochinita pibil servida en cerámica artesanal",
      }),
    ],
  },
  {
    id: "experiencias",
    label: "Experiencias",
    route: "/experiencias",
    hero: {
      eyebrow: "Qué hacer",
      title: "Experiencias para vivir el destino",
      subtitle: "Cenotes, bicicleta y recorridos guiados.",
      mediaUrl: `${GOVERNED}/experience-cover.jpg`,
      mediaAlt: "Experiencias en Valladolid, Yucatán",
    },
    items: [
      listingCard({
        id: "e1",
        entityKind: "experience",
        name: "Cenotes escondidos al amanecer",
        tagline: "Recorrido guiado de tres horas en grupo pequeño.",
        mediaUrl: `${GOVERNED}/experience-cover.jpg`,
        mediaAlt: "Cenote abierto de aguas turquesa",
        priceAmount: 950,
        availabilityLabel: "Sale todos los días",
      }),
      listingCard({
        id: "e2",
        entityKind: "experience",
        name: "Valladolid en bicicleta",
        tagline: "Calles coloniales, mercados y barrios históricos.",
        mediaUrl: `${GOVERNED}/experience-gallery-2.jpg`,
        mediaAlt: "Tour en bicicleta por calles coloniales",
      }),
    ],
  },
  {
    id: "eventos",
    label: "Eventos",
    route: "/eventos",
    hero: {
      eyebrow: "Agenda",
      title: "Qué pasa esta temporada",
      subtitle: "Fiestas, ferias y encuentros culturales.",
      mediaUrl: null,
      mediaAlt: null,
    },
    items: [
      listingCard({
        id: "v1",
        entityKind: "event",
        name: "Noche de la Calzada",
        tagline: "Música en vivo y talleres artesanales.",
        dateLabel: "Sábado 14 · 19:00 h",
        mediaUrl: `${GOVERNED}/destination-gallery-2.jpg`,
        mediaAlt: "Calle colonial iluminada",
      }),
      listingCard({
        id: "v2",
        entityKind: "event",
        name: "Feria del cacao",
        tagline: "Productores del oriente de Yucatán.",
        dateLabel: "Domingo 22 · 10:00 h",
      }),
    ],
  },
  {
    id: "casas-de-vacaciones",
    label: "Casas de vacaciones",
    route: "/casas-de-vacaciones",
    hero: {
      eyebrow: "Hospedaje independiente",
      title: "Casas de vacaciones",
      subtitle: "Casas, villas y rentas completas a tu ritmo.",
      mediaUrl: `${GOVERNED}/hotel-gallery-2.jpg`,
      mediaAlt: "Casas de vacaciones en Valladolid, Yucatán",
    },
    items: [
      listingCard({
        id: "c1",
        entityKind: "hotel",
        eyebrow: "Casa de vacaciones",
        name: "Casa Buganvilia",
        tagline: "Casa colonial completa con patio y alberca privada.",
        mediaUrl: `${GOVERNED}/hotel-gallery-2.jpg`,
        mediaAlt: "Terraza con vista a la catedral colonial",
        highlights: ["3 recámaras", "Alberca privada", "Cocina equipada"],
        priceAmount: 3200,
        priceHint: "por noche",
      }),
      listingCard({
        id: "c2",
        entityKind: "hotel",
        eyebrow: "Casa de vacaciones",
        name: "Villa Sisal",
        tagline: "Villa con jardín y hamacas, ideal para grupos.",
        mediaUrl: `${GOVERNED}/hotel-gallery-1.jpg`,
        mediaAlt: "Habitación colonial con vigas de madera",
      }),
    ],
  },
  {
    id: "que-hacer",
    label: "Qué hacer",
    route: "/que-hacer",
    hero: {
      eyebrow: "Planes del día",
      title: "Qué hacer en el Oriente Maya",
      subtitle: "Cenotes, zonas arqueológicas, cultura viva y naturaleza.",
      mediaUrl: `${GOVERNED}/destination-gallery-1.jpg`,
      mediaAlt: "Plaza principal de Valladolid con kiosco y arcadas coloniales",
    },
    items: [
      listingCard({
        id: "q1",
        entityKind: "experience",
        name: "Ruta de cenotes de Valladolid",
        tagline: "Zací, Suytun, Oxman y Xkeken en un mismo día.",
        mediaUrl: `${GOVERNED}/experience-cover.jpg`,
        mediaAlt: "Cenote abierto de aguas turquesa",
      }),
      listingCard({
        id: "q2",
        entityKind: "experience",
        name: "Ek' Balam al amanecer",
        tagline: "La ciudad del jaguar negro y su cenote Xcanché.",
        mediaUrl: `${GOVERNED}/experience-gallery-1.jpg`,
        mediaAlt: "Templo pirámide maya cubierto de vegetación",
      }),
      listingCard({
        id: "q3",
        entityKind: "experience",
        name: "Calzada de los Frailes a pie",
        tagline: "Paseo colonial entre talleres, cafés y fachadas pastel.",
        mediaUrl: `${GOVERNED}/destination-gallery-2.jpg`,
        mediaAlt: "Calle colonial colorida de Valladolid",
      }),
    ],
  },
];

export function listingFamily(id: string): ListingPremiumFamily {
  return (
    LISTING_PREMIUM_G5_FAMILIES.find((f) => f.id === id) ??
    (LISTING_PREMIUM_G5_FAMILIES[0] as ListingPremiumFamily)
  );
}
