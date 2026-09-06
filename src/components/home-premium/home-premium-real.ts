/**
 * G8-R1-F1L-R2 · Fusión del corpus real sobre la estructura editorial de la
 * Home premium (`vmx.home.premium-g4`).
 *
 * Invariantes vinculantes:
 *   · La estructura editorial (títulos, kickers, CTAs) proviene del bloque.
 *   · TODA tarjeta proviene del corpus publicado y acreditado y lleva su URL
 *     canónica real. Sin URL canónica, la tarjeta no existe.
 *   · Sin fotografía propia acreditada, la Home usa exclusivamente la portada
 *     gobernada y production-eligible de su vertical. Nunca usa previews.
 *   · Una colección vacía oculta su sección; nunca se rellena con contenido
 *     demostrativo, simulado o de preview.
 */
import type { HomeRealContent } from "@/lib/experience-builder/smart-blocks.server";
import type { HomePremiumContent, HomePremiumSectionKey } from "./home-premium-content";

type Card = HomeRealContent["destinos"][number];

const GOVERNED_MEDIA_BASE = "/api/public/studio-media/governed/v1p1c";

const GOVERNED_VERTICAL_MEDIA = {
  experience: ["experience-cover.jpg", "experience-gallery-1.jpg", "experience-gallery-2.jpg"],
  hotel: ["hotel-cover.jpg", "hotel-gallery-1.jpg", "hotel-gallery-2.jpg"],
  restaurant: ["restaurant-cover.jpg", "restaurant-gallery-1.jpg", "restaurant-gallery-2.jpg"],
} as const;

type GovernedVertical = keyof typeof GOVERNED_VERTICAL_MEDIA;

const mediaOf = (card: Card, vertical?: GovernedVertical, index = 0) => {
  if (card.mediaUrl.length > 0) return { url: card.mediaUrl, alt: card.title };
  if (!vertical) return { url: "", alt: card.title };

  const assets = GOVERNED_VERTICAL_MEDIA[vertical];
  const asset = assets[index % assets.length];
  return {
    url: `${GOVERNED_MEDIA_BASE}/${asset}`,
    alt: `Imagen editorial gobernada de ${vertical === "hotel" ? "hospedaje" : vertical === "restaurant" ? "gastronomía" : "experiencias"} en el Oriente Maya`,
  };
};
const withoutMedia = <T extends { media: { url: string; alt: string } }>(item: T): T => ({
  ...item,
  media: { ...item.media, url: "" },
});

/** El runtime público nunca usa medios del preset como fallback acreditado. */
function withoutPresetMedia(content: HomePremiumContent): HomePremiumContent {
  return {
    ...content,
    hero: {
      ...content.hero,
      slides: content.hero.slides.map((slide) => withoutMedia(slide)),
    },
    destinos: { ...content.destinos, items: content.destinos.items.map(withoutMedia) },
    rutas: { ...content.rutas, items: content.rutas.items.map(withoutMedia) },
    experiencias: { ...content.experiencias, items: content.experiencias.items.map(withoutMedia) },
    servicios: {
      ...content.servicios,
      stays: content.servicios.stays.map(withoutMedia),
      food: content.servicios.food.map(withoutMedia),
    },
    eventos: {
      ...content.eventos,
      media: isProductionEligibleConfiguredMedia(content.eventos.media.url)
        ? content.eventos.media
        : { ...content.eventos.media, url: "" },
    },
    queHacer: { ...content.queHacer, items: content.queHacer.items.map(withoutMedia) },
  };
}

/** El constructor sólo puede aportar a producción un medio estable ya gobernado. */
function isProductionEligibleConfiguredMedia(url: string): boolean {
  return (
    url.startsWith("/api/public/studio-media/") &&
    !url.includes("/conceptual-preview/") &&
    !url.includes("/demo-media/")
  );
}

/** Fusiona el corpus real sobre el contenido editorial resuelto del bloque. */
export function mergeHomeRealContent(
  content: HomePremiumContent,
  real: HomeRealContent | undefined,
): HomePremiumContent {
  const safeContent = withoutPresetMedia(content);
  if (!real) return safeContent;

  const destinationsWithMedia = real.destinos.filter((card) => card.mediaUrl.length > 0);
  const destinationByTitle = new Map(real.destinos.map((card) => [card.title, card]));
  const firstEventWithMedia = real.eventos.find((card) => card.mediaUrl.length > 0);
  const realHeroSlides = destinationsWithMedia.slice(0, 3).map((card) => ({
    media: mediaOf(card),
    caption: card.title,
  }));

  return {
    ...safeContent,
    hero: {
      ...safeContent.hero,
      slides: realHeroSlides,
    },
    destinos: {
      ...safeContent.destinos,
      items: real.destinos.map((card) => ({
        name: card.title,
        note: card.subtitle,
        media: mediaOf(card),
        puebloMagico: card.puebloMagico,
        href: card.href,
      })),
    },
    rutas: {
      ...safeContent.rutas,
      items: real.rutas.map((route) => {
        const cover = route.sequence
          .map((title) => destinationByTitle.get(title))
          .find((card): card is Card => Boolean(card?.mediaUrl));
        return {
          ...route,
          media: cover ? mediaOf(cover) : { url: "", alt: route.title },
        };
      }),
    },
    experiencias: {
      ...safeContent.experiencias,
      items: real.experiencias.map((card, index) => ({
        title: card.title,
        category: card.category,
        summary: card.subtitle,
        media: mediaOf(card, "experience", index),
        href: card.href,
      })),
    },
    servicios: {
      ...safeContent.servicios,
      stays: real.stays.map((card, index) => ({
        title: card.title,
        destination: card.category,
        category: "Hospedaje",
        summary: card.subtitle,
        media: mediaOf(card, "hotel", index),
        href: card.href,
      })),
      food: real.food.map((card, index) => ({
        title: card.title,
        destination: card.category,
        category: "Gastronomía",
        summary: card.subtitle,
        media: mediaOf(card, "restaurant", index),
        href: card.href,
      })),
    },
    eventos: {
      ...safeContent.eventos,
      media: firstEventWithMedia ? mediaOf(firstEventWithMedia) : safeContent.eventos.media,
      items: real.eventos.map((card) => ({
        day: card.day,
        title: card.title,
        type: card.category,
        detail: card.subtitle,
        href: card.href,
      })),
    },
    mapa: {
      ...safeContent.mapa,
      dto: {
        ...safeContent.mapa.dto,
        points: real.mapPoints.map((point) => ({
          id: point.id,
          kind: point.kind,
          lat: point.lat,
          lng: point.lng,
          title: point.title,
          subtitle: point.subtitle,
          href: point.href,
          thumbUrl: null,
          badge: null,
          priceLabel: null,
        })),
      },
    },
  };
}

/**
 * Visibilidad efectiva: una sección sin contenido real acreditado se oculta.
 * Nunca se muestra un área vacía ni un mensaje de error "smart".
 */
export function resolveHomeSectionVisibility(
  content: HomePremiumContent,
  declared: Partial<Record<HomePremiumSectionKey, boolean>>,
): Partial<Record<HomePremiumSectionKey, boolean>> {
  const nonEmpty: Record<HomePremiumSectionKey, boolean> = {
    destinos: content.destinos.items.length > 0,
    pueblosMagicos: content.destinos.items.some((item) => item.puebloMagico),
    rutas: content.rutas.items.length > 0,
    experiencias: content.experiencias.items.length > 0,
    servicios: content.servicios.stays.length + content.servicios.food.length > 0,
    eventos: content.eventos.items.length > 0,
    queHacer: content.queHacer.items.length > 0,
    mapa: content.mapa.dto.points.length > 0,
  };

  const out: Partial<Record<HomePremiumSectionKey, boolean>> = {};
  (Object.keys(nonEmpty) as HomePremiumSectionKey[]).forEach((key) => {
    out[key] = declared[key] !== false && nonEmpty[key];
  });
  return out;
}
