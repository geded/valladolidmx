import type { PublicDestinationDTO } from "@/lib/destinations/public-reads.functions";
import type { ExperienceMapPoint } from "@/lib/experience-builder/blocks/experience-map/contract";
import type { PublicMediaAttribution } from "@/lib/media/public-attribution";
import type {
  DestinationPremiumContent,
  DestinationPremiumMedia,
} from "./destination-premium-content";

export interface DestinationPremiumNearbySource {
  title: string;
  subtitle: string;
  href: string;
  mediaUrl: string;
}

function mediaOf(item: PublicMediaAttribution): DestinationPremiumMedia {
  return { url: item.url, alt: item.alt ?? "" };
}

export function buildDestinationPremiumRuntime(input: {
  id: string;
  destination: PublicDestinationDTO;
  media: PublicMediaAttribution[];
  mapPoints: ExperienceMapPoint[];
  nearbyDestinations?: DestinationPremiumNearbySource[];
}): DestinationPremiumContent {
  const { destination, media, mapPoints, nearbyDestinations = [] } = input;
  const cover = media.find((item) => item.role === "cover") ?? null;
  const gallery = media.filter((item) => item.role === "gallery");
  const approvedConceptual =
    destination.slug === "valladolid" && !cover
      ? [
          {
            url: "/api/public/studio-media/conceptual-preview/2026-09-01/valladolid-san-servacio-hero-preview.webp",
            alt: "Visual conceptual temporal de Valladolid, reemplazable en Medios",
          },
          {
            url: "/api/public/studio-media/conceptual-preview/2026-09-01/home-valladolid-editorial-preview.webp",
            alt: "Visual conceptual temporal del centro de Valladolid, reemplazable en Medios",
          },
        ]
      : [];
  const allMedia = [
    ...(cover ? [mediaOf(cover)] : approvedConceptual.slice(0, 1)),
    ...gallery.map(mediaOf),
    ...approvedConceptual.slice(1),
  ];
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
      kind: "business" as const,
      lat: point.lat,
      lng: point.lng,
      title: point.title,
      subtitle: point.subtitle ?? null,
      badge: point.badge ?? null,
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
      cover: allMedia[0] ?? { url: "", alt: "" },
      supporting: allMedia.slice(1, 3),
    },
    services: [
      { key: "hoteles", label: "Hoteles", hint: "Dónde dormir", media: { url: "", alt: "" } },
      {
        key: "restaurantes",
        label: "Restaurantes",
        hint: "Dónde comer",
        media: { url: "", alt: "" },
      },
      { key: "que-hacer", label: "Qué hacer", hint: "Planes del día", media: { url: "", alt: "" } },
      {
        key: "casas-de-vacaciones",
        label: "Casas de vacaciones",
        hint: "Estancias completas",
        media: { url: "", alt: "" },
      },
      {
        key: "experiencias",
        label: "Experiencias",
        hint: "Cenotes y cultura viva",
        media: { url: "", alt: "" },
      },
      { key: "eventos", label: "Eventos", hint: "Agenda del destino", media: { url: "", alt: "" } },
    ],
    servicesNote: "Selecciona una categoría para descubrir opciones publicadas en este destino.",
    descubre: {
      kicker: "El destino",
      title: `Descubre ${destination.name}`,
      paragraphs,
      media: allMedia.slice(1, 4),
    },
    gallery: {
      kicker: "Galería",
      title: `${destination.name} en imágenes`,
      note: cover
        ? "Fotografías acreditadas para uso público."
        : "Visuales conceptuales temporales, reemplazables desde Medios.",
      items: allMedia,
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
      description: "Continúa el recorrido por los destinos publicados del territorio.",
      items: nearbyDestinations
        .filter((item) => item.href !== `/oriente-maya/${destination.slug}`)
        .slice(0, 5)
        .map((item) => ({
          slug: item.href.split("/").filter(Boolean).at(-1) ?? item.title.toLowerCase(),
          name: item.title,
          distance: "",
          tagline: item.subtitle,
          media: { url: item.mediaUrl, alt: item.title },
          href: item.href,
        })),
    },
  };
}
