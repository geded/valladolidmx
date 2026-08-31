/**
 * G8-R1-F1L-R2 · Fusión del corpus real sobre la estructura editorial de la
 * Home premium (`vmx.home.premium-g4`).
 *
 * Invariantes vinculantes:
 *   · La estructura editorial (títulos, kickers, CTAs) proviene del bloque.
 *   · TODA tarjeta proviene del corpus publicado y acreditado y lleva su URL
 *     canónica real. Sin URL canónica, la tarjeta no existe.
 *   · Sin fotografía acreditada, `media.url` queda vacío y la superficie
 *     renderiza el marcador editorial neutral (`EditorialMediaFrame`).
 *   · Una colección vacía oculta su sección; nunca se rellena con contenido
 *     demostrativo, simulado o de preview.
 */
import type { HomeRealContent } from "@/lib/experience-builder/smart-blocks.server";
import type { HomePremiumContent, HomePremiumSectionKey } from "./home-premium-content";

type Card = HomeRealContent["destinos"][number];

const mediaOf = (card: Card) => ({ url: card.mediaUrl, alt: card.title });

/** Fusiona el corpus real sobre el contenido editorial resuelto del bloque. */
export function mergeHomeRealContent(
  content: HomePremiumContent,
  real: HomeRealContent | undefined,
): HomePremiumContent {
  if (!real) return content;

  const destinationsWithMedia = real.destinos.filter((card) => card.mediaUrl.length > 0);
  const destinationByTitle = new Map(real.destinos.map((card) => [card.title, card]));
  const firstEventWithMedia = real.eventos.find((card) => card.mediaUrl.length > 0);
  const realHeroSlides = destinationsWithMedia.slice(0, 3).map((card) => ({
    media: mediaOf(card),
    caption: card.title,
  }));

  return {
    ...content,
    hero: {
      ...content.hero,
      slides: realHeroSlides.length > 0 ? realHeroSlides : content.hero.slides,
    },
    destinos: {
      ...content.destinos,
      items: real.destinos.map((card) => ({
        name: card.title,
        note: card.subtitle,
        media: mediaOf(card),
        puebloMagico: card.puebloMagico,
        href: card.href,
      })),
    },
    rutas: {
      ...content.rutas,
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
      ...content.experiencias,
      items: real.experiencias.map((card) => ({
        title: card.title,
        category: card.category,
        summary: card.subtitle,
        media: mediaOf(card),
        href: card.href,
      })),
    },
    servicios: {
      ...content.servicios,
      stays: real.stays.map((card) => ({
        title: card.title,
        destination: card.category,
        category: "Hospedaje",
        summary: card.subtitle,
        media: mediaOf(card),
        href: card.href,
      })),
      food: real.food.map((card) => ({
        title: card.title,
        destination: card.category,
        category: "Gastronomía",
        summary: card.subtitle,
        media: mediaOf(card),
        href: card.href,
      })),
    },
    eventos: {
      ...content.eventos,
      media: firstEventWithMedia
        ? mediaOf(firstEventWithMedia)
        : { url: "", alt: content.eventos.media.alt },
      items: real.eventos.map((card) => ({
        day: card.day,
        title: card.title,
        type: card.category,
        detail: card.subtitle,
        href: card.href,
      })),
    },
    mapa: {
      ...content.mapa,
      dto: {
        ...content.mapa.dto,
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
