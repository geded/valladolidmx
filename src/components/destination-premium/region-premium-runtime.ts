/**
 * G8-R1-F1L-R2 · Portada regional `/oriente-maya` sobre la autoridad premium
 * aprobada `DestinationPremiumSurface` (familia `premium-g4`).
 *
 * No es una superficie paralela: adapta el corpus real de la Región al mismo
 * contrato de contenido que la ficha de destino. Sin fotografía acreditada,
 * los medios quedan vacíos y la superficie usa el marcador editorial neutral
 * (Familia ≠ medios · P0).
 */
import { ORIENTE_MAYA } from "@/config/regions";
import type { DestinationPremiumContent } from "./destination-premium-content";

export interface RegionDestinationInput {
  slug: string;
  name: string;
  tagline?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const PUEBLOS_MAGICOS = ["valladolid", "izamal", "espita"];

export function buildRegionPremiumRuntime(input: {
  destinations: RegionDestinationInput[];
}): DestinationPremiumContent {
  const destinations = input.destinations;

  return {
    slug: ORIENTE_MAYA.slug,
    breadcrumbs: [{ label: "Inicio", href: "/" }, { label: ORIENTE_MAYA.name }],
    hero: {
      statusBadge: null,
      regionBadge: "Región",
      title: ORIENTE_MAYA.name,
      subtitle: ORIENTE_MAYA.short_description,
      description: "",
      primaryCta: { label: "Arma tu viaje", href: "/arma-tu-viaje" },
      secondaryCta: { label: "Ver destinos", href: "#servicios-destino" },
      cover: { url: "", alt: "" },
      supporting: [],
    },
    services: destinations.slice(0, 8).map((destination) => ({
      key: destination.slug,
      label: destination.name,
      hint: PUEBLOS_MAGICOS.includes(destination.slug)
        ? "Pueblo Mágico"
        : (destination.tagline ?? "Destino del Oriente Maya"),
      media: { url: "", alt: "" },
    })),
    servicesNote: "Selecciona un destino para descubrir su oferta publicada.",
    descubre: {
      kicker: "La región",
      title: `Descubre el ${ORIENTE_MAYA.name}`,
      paragraphs: [ORIENTE_MAYA.short_description],
      media: [],
    },
    gallery: { kicker: "Galería", title: "", note: "", items: [] },
    servicePreview: { actionLabel: "Ver destino", cardTitlePrefix: "", cardBody: "" },
    map: {
      heading: "Explora el territorio",
      center: { lat: 20.6896, lng: -88.2011, zoom: 9 },
      points: destinations
        .filter((destination) => destination.latitude != null && destination.longitude != null)
        .map((destination) => ({
          id: `destination:${destination.slug}`,
          kind: "destination" as const,
          lat: destination.latitude as number,
          lng: destination.longitude as number,
          title: destination.name,
          subtitle: destination.tagline ?? null,
          badge: PUEBLOS_MAGICOS.includes(destination.slug) ? "Pueblo Mágico" : null,
        })),
    },
    nearby: {
      kicker: ORIENTE_MAYA.name,
      title: "Destinos de la región",
      description: "",
      items: destinations.map((destination) => ({
        slug: destination.slug,
        name: destination.name,
        distance: "",
        tagline: destination.tagline ?? "",
        media: { url: "", alt: "" },
      })),
    },
  };
}
