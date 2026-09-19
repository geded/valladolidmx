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
import type { MediaAssetInput } from "@/lib/media/resolve-source";
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

type DestinationEditorRow = {
  name: string;
  note: string;
  pueblo_magico: boolean;
  href: string;
  demo: boolean;
  media_url: string;
  media_alt: string;
};

/**
 * Proyección editable de los destinos reales del Home.
 *
 * El corpus publicado conserva la autoridad sobre elegibilidad y URL
 * canónica. El Studio puede guardar ajustes editoriales de texto e imagen
 * sobre esas mismas filas, sin crear destinos ni sustituir el catálogo CMS.
 */
export function buildHomeDestinationEditorRows(
  real: HomeRealContent | undefined,
  configured: unknown,
): DestinationEditorRow[] {
  const saved = Array.isArray(configured)
    ? configured.filter(
        (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object",
      )
    : [];
  const cards = withValladolidFirst(real?.destinos ?? []);

  return cards.map((card, index) => {
    const byHref = saved.find(
      (row) => typeof row.href === "string" && row.href.replace(/\/$/, "") === card.href,
    );
    const row = byHref ?? saved[index] ?? {};
    const fallbackMedia = mediaOf(card, "destination", index);
    const text = (key: string, fallback: string) =>
      typeof row[key] === "string" && row[key].trim() ? row[key].trim() : fallback;
    return {
      name: text("name", card.title),
      note: text("note", card.subtitle),
      pueblo_magico: typeof row.pueblo_magico === "boolean" ? row.pueblo_magico : card.puebloMagico,
      href: card.href,
      demo: false,
      media_url: text("media_url", fallbackMedia.url),
      media_alt: text("media_alt", fallbackMedia.alt),
    };
  });
}

/** Conserva únicamente los cambios editoriales explícitos sobre el corpus. */
export function compactHomeDestinationEditorOverrides(
  real: HomeRealContent | undefined,
  next: unknown,
): Array<Partial<DestinationEditorRow> & Pick<DestinationEditorRow, "href">> {
  const baseline = buildHomeDestinationEditorRows(real, undefined);
  const rows = Array.isArray(next)
    ? next.filter(
        (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object",
      )
    : [];
  const editableKeys = ["name", "note", "pueblo_magico", "media_url", "media_alt"] as const;

  return baseline.flatMap((base, index) => {
    const row =
      rows.find((candidate) => candidate.href === base.href) ?? rows[index] ?? ({} as const);
    const override: Partial<DestinationEditorRow> & Pick<DestinationEditorRow, "href"> = {
      href: base.href,
    };
    for (const key of editableKeys) {
      if (row[key] !== undefined && row[key] !== base[key]) override[key] = row[key] as never;
    }
    return Object.keys(override).length > 1 ? [override] : [];
  });
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

/**
 * H3·A4 · Adjunta, sin alterar ninguna URL canónica, el asset con sus
 * versiones ligeras a cada medio `{ url, alt }` del árbol de la Home. El
 * render sigue mostrando exactamente la misma imagen; `resolveMediaSource()`
 * decide después si puede ofrecer AVIF/WebP más livianos.
 */
function attachMediaAssets<T>(node: T, assets: Record<string, MediaAssetInput>): T {
  if (Array.isArray(node)) {
    return node.map((item) => attachMediaAssets(item, assets)) as unknown as T;
  }
  if (!node || typeof node !== "object") return node;
  const record = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    out[key] = attachMediaAssets(value, assets);
  }
  if (typeof record.url === "string" && typeof record.alt === "string" && !("asset" in record)) {
    const asset = assets[decodeSlotMedia(record.url).src];
    if (asset) out.asset = asset;
  }
  return out as T;
}

/** Fusiona el corpus real sobre el contenido editorial resuelto del bloque. */
export function mergeHomeRealContent(
  content: HomePremiumContent,
  real: HomeRealContent | undefined,
  destinationOverrides?: unknown,
): HomePremiumContent {
  const safeContent = withoutUnapprovedMedia(content);
  if (!real) return safeContent;
  const mediaAssets = real.mediaAssets ?? {};

  const destinationsWithMedia = real.destinos.filter((card) => card.mediaUrl.length > 0);
  const destinationByTitle = new Map(real.destinos.map((card) => [card.title, card]));
  const homeDestinations = withValladolidFirst(real.destinos);
  const destinationRows = buildHomeDestinationEditorRows(real, destinationOverrides);
  const firstEventWithMedia = real.eventos.find((card) => card.mediaUrl.length > 0);
  const realHeroSlides = destinationsWithMedia.slice(0, 3).map((card) => ({
    media: mediaOf(card),
    caption: card.title,
  }));

  return attachMediaAssets(
    {
      ...safeContent,
      hero: {
        ...safeContent.hero,
        slides: realHeroSlides.length > 0 ? realHeroSlides : safeContent.hero.slides,
      },
      destinos: {
        ...safeContent.destinos,
        items: homeDestinations.map((card, index) => {
          const row = destinationRows[index];
          return {
            name: row?.name ?? card.title,
            note: row?.note ?? card.subtitle,
            media: row
              ? { url: row.media_url, alt: row.media_alt }
              : mediaOf(card, "destination", index),
            puebloMagico: row?.pueblo_magico ?? card.puebloMagico,
            href: card.href,
          };
        }),
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
          businessId: card.businessId,
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
          businessId: card.businessId,
          title: card.title,
          destination: card.category,
          category: "Hospedaje",
          summary: card.subtitle,
          media: mediaOf(card, "hotel", index),
          href: card.href,
        })),
        food: real.food.map((card, index) => ({
          businessId: card.businessId,
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
          startsAt: card.startsAt,
          recurrence: card.recurrence,
          media: card.mediaUrl.length > 0 ? { url: card.mediaUrl, alt: card.title } : null,
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
    },
    mediaAssets,
  );
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
    hero: true,
    alux: true,
    destinos: content.destinos.items.length > 0,
    categorias: content.categorias.items.length > 0,
    pueblosMagicos: content.destinos.items.some((item) => item.puebloMagico),
    rutas: content.rutas.items.length > 0,
    experiencias: content.experiencias.items.length > 0,
    servicios: content.servicios.stays.length + content.servicios.food.length > 0,
    eventos: content.eventos.items.length > 0,
    queHacer: content.queHacer.items.length > 0,
    mapa: content.mapa.dto.points.length > 0,
    travelPlan: true,
  };

  const out: Partial<Record<HomePremiumSectionKey, boolean>> = {};
  (Object.keys(nonEmpty) as HomePremiumSectionKey[]).forEach((key) => {
    out[key] = declared[key] !== false && nonEmpty[key];
  });
  return out;
}
