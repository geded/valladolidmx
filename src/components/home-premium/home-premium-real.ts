/**
 * G8-R1-F1L-R2 · Fusión del corpus real sobre la estructura editorial de la
 * Home premium (`vmx.home.premium-g4`).
 *
 * Invariantes vinculantes:
 *   · La estructura editorial (títulos, kickers, CTAs) proviene del bloque.
 *   · TODA tarjeta proviene del corpus publicado y acreditado y lleva su URL
 *     canónica real. Sin URL canónica, la tarjeta no existe.
 *   · Sin fotografía propia acreditada, la Home usa exclusivamente la portada
 *     gobernada de su vertical o el fallback temporal exacto aprobado.
 *   · Una colección vacía oculta su sección; nunca se rellena con contenido
 *     demostrativo, simulado o de preview.
 */
import type { HomeRealContent } from "@/lib/experience-builder/smart-blocks.server";
import { decodeSlotMedia } from "@/lib/media/slot-media";
import {
  HOME_PREMIUM_MEDIA,
  type HomePremiumContent,
  type HomePremiumSectionKey,
} from "./home-premium-content";

type Card = HomeRealContent["destinos"][number];
type MediaCard = Pick<Card, "mediaUrl" | "title">;

/** Valladolid es la puerta de entrada territorial del Home, aunque el CMS
 * entregue los destinos en otro orden. Conserva intacto el orden relativo
 * del resto del corpus publicado. */
function withValladolidFirst(cards: readonly Card[]): Card[] {
  const valladolidIndex = cards.findIndex(
    (card) => card.href?.replace(/\/$/, "") === "/oriente-maya/valladolid",
  );
  if (valladolidIndex <= 0) return [...cards];
  return [
    cards[valladolidIndex],
    ...cards.slice(0, valladolidIndex),
    ...cards.slice(valladolidIndex + 1),
  ];
}

const GOVERNED_MEDIA_BASE = "/api/public/studio-media/governed/v1p1c";

const GOVERNED_VERTICAL_MEDIA = {
  destination: [HOME_PREMIUM_MEDIA.centro, HOME_PREMIUM_MEDIA.calle, HOME_PREMIUM_MEDIA.cenote],
  experience: ["experience-cover.jpg", "experience-gallery-1.jpg", "experience-gallery-2.jpg"],
  hotel: ["hotel-cover.jpg", "hotel-gallery-1.jpg", "hotel-gallery-2.jpg"],
  restaurant: ["restaurant-cover.jpg", "restaurant-gallery-1.jpg", "restaurant-gallery-2.jpg"],
  route: [HOME_PREMIUM_MEDIA.cenote, HOME_PREMIUM_MEDIA.centro, HOME_PREMIUM_MEDIA.calle],
} as const;

type GovernedVertical = keyof typeof GOVERNED_VERTICAL_MEDIA;

const mediaOf = (card: MediaCard, vertical?: GovernedVertical, index = 0) => {
  if (card.mediaUrl.length > 0) return { url: card.mediaUrl, alt: card.title };
  if (!vertical) return { url: "", alt: card.title };

  const assets = GOVERNED_VERTICAL_MEDIA[vertical];
  const asset = assets[index % assets.length];
  if (typeof asset !== "string") return asset;
  return {
    url: `${GOVERNED_MEDIA_BASE}/${asset}`,
    alt: `Imagen editorial gobernada de ${vertical === "hotel" ? "hospedaje" : vertical === "restaurant" ? "gastronomía" : "experiencias"} en el Oriente Maya`,
  };
};
const withoutMedia = <T extends { media: { url: string; alt: string } }>(item: T): T => ({
  ...item,
  media: { ...item.media, url: "" },
});

const APPROVED_HOME_PREVIEW_MEDIA = new Set<string>(
  Object.values(HOME_PREMIUM_MEDIA).map((media) => media.url),
);

/**
 * El runtime conserva únicamente medios estables o temporales expresamente
 * aprobados para la Home. Nunca admite demos ni URLs conceptuales arbitrarias.
 */
function withoutUnapprovedMedia(content: HomePremiumContent): HomePremiumContent {
  const preserveApproved = <T extends { media: { url: string; alt: string } }>(item: T): T =>
    isApprovedConfiguredMedia(item.media.url) ? item : withoutMedia(item);
  return {
    ...content,
    hero: {
      ...content.hero,
      slides: content.hero.slides.map(preserveApproved),
    },
    destinos: { ...content.destinos, items: content.destinos.items.map(preserveApproved) },
    rutas: { ...content.rutas, items: content.rutas.items.map(preserveApproved) },
    experiencias: {
      ...content.experiencias,
      items: content.experiencias.items.map(preserveApproved),
    },
    servicios: {
      ...content.servicios,
      stays: content.servicios.stays.map(preserveApproved),
      food: content.servicios.food.map(preserveApproved),
    },
    eventos: {
      ...content.eventos,
      media: isApprovedConfiguredMedia(content.eventos.media.url)
        ? content.eventos.media
        : { ...content.eventos.media, url: "" },
    },
    queHacer: { ...content.queHacer, items: content.queHacer.items.map(preserveApproved) },
  };
}

function isApprovedConfiguredMedia(url: string): boolean {
  const normalizedUrl = decodeSlotMedia(url).src;
  return (
    APPROVED_HOME_PREVIEW_MEDIA.has(normalizedUrl) ||
    (url.startsWith("/api/public/studio-media/") &&
      !url.includes("/conceptual-preview/") &&
      !url.includes("/demo-media/"))
  );
}

/** Fusiona el corpus real sobre el contenido editorial resuelto del bloque. */
export function mergeHomeRealContent(
  content: HomePremiumContent,
  real: HomeRealContent | undefined,
): HomePremiumContent {
  const safeContent = withoutUnapprovedMedia(content);
  if (!real) return safeContent;

  const destinationsWithMedia = real.destinos.filter((card) => card.mediaUrl.length > 0);
  const destinationByTitle = new Map(real.destinos.map((card) => [card.title, card]));
  const homeDestinations = withValladolidFirst(real.destinos);
  const firstEventWithMedia = real.eventos.find((card) => card.mediaUrl.length > 0);
  const realHeroSlides = destinationsWithMedia.slice(0, 3).map((card) => ({
    media: mediaOf(card),
    caption: card.title,
  }));

  return {
    ...safeContent,
    hero: {
      ...safeContent.hero,
      slides: realHeroSlides.length > 0 ? realHeroSlides : safeContent.hero.slides,
    },
    destinos: {
      ...safeContent.destinos,
      items: homeDestinations.map((card, index) => ({
        name: card.title,
        note: card.subtitle,
        media: mediaOf(card, "destination", index),
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
          media: route.mediaUrl
            ? { url: route.mediaUrl, alt: route.title }
            : cover
              ? mediaOf(cover)
              : mediaOf({ title: route.title, mediaUrl: "" }, "route", real.rutas.indexOf(route)),
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
      // La selección editorial explícita del constructor manda sobre la
      // portada inferida del primer evento. Sólo usamos el evento como
      // fallback cuando la composición publicada no configuró un medio.
      media:
        safeContent.eventos.media.url.length > 0
          ? safeContent.eventos.media
          : firstEventWithMedia
            ? mediaOf(firstEventWithMedia)
            : safeContent.eventos.media,
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
