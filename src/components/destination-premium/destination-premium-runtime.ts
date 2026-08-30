import type {
  PublicDestinationDTO,
  DestinationMapPointDTO,
} from "@/lib/destinations/public-reads.functions";
import type { PublicMediaAttribution } from "@/lib/media/public-attribution";
import type {
  DestinationPremiumContent,
  DestinationPremiumMedia,
} from "./destination-premium-content";

function mediaOf(item: PublicMediaAttribution): DestinationPremiumMedia {
  return { url: item.url, alt: item.alt ?? "" };
}

export function buildDestinationPremiumRuntime(input: {
  id: string;
  destination: PublicDestinationDTO;
  media: PublicMediaAttribution[];
  mapPoints: DestinationMapPointDTO[];
}): DestinationPremiumContent {
  const { destination, media, mapPoints } = input;
  const cover = media.find((item) => item.role === "cover") ?? null;
  const gallery = media.filter((item) => item.role === "gallery");
  const allMedia = [...(cover ? [cover] : []), ...gallery];
  const paragraphs = destination.description?.trim() ? [destination.description.trim()] : [];
  const mapItems = [
    ...(destination.latitude != null && destination.longitude != null
      ? [
          {
            id: `destination:${input.id}`,
            kind: "destination" as const,
            lat: destination.latitude,
            lng: destination.longitude,
            title: destination.name,
            subtitle: destination.tagline,
            badge: null,
          },
        ]
      : []),
    ...mapPoints.map((point) => ({
      id: point.id,
      kind: point.kind,
      lat: point.lat,
      lng: point.lng,
      title: point.title,
      subtitle: point.subtitle,
      badge: point.badge,
    })),
  ];

  return {
    slug: destination.slug,
    breadcrumbs: [
      { label: "Inicio", href: "/" },
      { label: "Oriente Maya de Yucatán", href: "/oriente-maya" },
      { label: destination.name },
    ],
    hero: {
      statusBadge: ["valladolid", "izamal", "espita"].includes(destination.slug)
        ? "Pueblo Mágico"
        : null,
      regionBadge: "Oriente Maya de Yucatán",
      title: destination.name,
      subtitle: destination.tagline ?? "Descubre este destino del Oriente Maya de Yucatán",
      description:
        destination.description?.trim() ||
        `Explora ${destination.name} y prepara tu recorrido por el Oriente Maya de Yucatán.`,
      primaryCta: { label: "Arma tu viaje", href: "/arma-tu-viaje" },
      secondaryCta: { label: "Explorar servicios", href: "#servicios-destino" },
      cover: cover ? mediaOf(cover) : { url: null, alt: "" },
      supporting: gallery.slice(0, 2).map(mediaOf),
    },
    services: [
      { key: "hoteles", label: "Hoteles", hint: "Dónde dormir", media: { url: null, alt: "" } },
      { key: "restaurantes", label: "Restaurantes", hint: "Dónde comer", media: { url: null, alt: "" } },
      { key: "que-hacer", label: "Qué hacer", hint: "Planes del día", media: { url: null, alt: "" } },
      { key: "casas-de-vacaciones", label: "Casas de vacaciones", hint: "Estancias completas", media: { url: null, alt: "" } },
      { key: "experiencias", label: "Experiencias", hint: "Cenotes y cultura viva", media: { url: null, alt: "" } },
      { key: "eventos", label: "Eventos", hint: "Agenda del destino", media: { url: null, alt: "" } },
    ],
    servicesNote: "Selecciona una categoría para descubrir opciones publicadas en este destino.",
    descubre: {
      kicker: "El destino",
      title: `Descubre ${destination.name}`,
      paragraphs,
      media: gallery.slice(0, 3).map(mediaOf),
    },
    gallery: {
      kicker: "Galería",
      title: `${destination.name} en imágenes`,
      note: "Fotografías acreditadas para uso público.",
      items: allMedia.map(mediaOf),
    },
    servicePreview: {
      actionLabel: "Ver todo",
      cardTitlePrefix: "",
      cardBody: "",
    },
    map: {
      heading: `Explora ${destination.name} y su territorio`,
      center: {
        lat: destination.latitude ?? 20.6896,
        lng: destination.longitude ?? -88.2011,
        zoom: 13,
      },
      points: mapItems,
    },
    nearby: {
      kicker: "Oriente Maya de Yucatán",
      title: `Cerca de ${destination.name}`,
      description: "",
      items: [],
    },
  };
}