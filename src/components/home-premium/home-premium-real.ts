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

type RowRec = Record<string, unknown>;

/**
 * Carriles del Home cuyo corpus publicado admite ajuste editorial explícito
 * desde el constructor (texto, imagen y enlace), sin crear contenido nuevo
 * ni sustituir el catálogo del CMS.
 */
export type HomeEditableRail =
  | "destinos"
  | "rutas"
  | "experiencias"
  | "stays"
  | "food"
  | "eventos";

export const HOME_RAIL_CONFIG_KEY: Record<HomeEditableRail, string> = {
  destinos: "destinos_items",
  rutas: "rutas_items",
  experiencias: "experiencias_items",
  stays: "servicios_stays",
  food: "servicios_food",
  eventos: "eventos_items",
};

/** Campos editables por carril. `href_override` cubre el enlace. */
const RAIL_EDITABLE_KEYS: Record<HomeEditableRail, readonly string[]> = {
  destinos: ["name", "note", "pueblo_magico", "media_url", "media_alt", "href_override"],
  rutas: [
    "title",
    "duration",
    "stops",
    "vibe",
    "description",
    "sequence",
    "media_url",
    "media_alt",
    "href_override",
  ],
  experiencias: ["title", "category", "summary", "media_url", "media_alt", "href_override"],
  stays: ["title", "destination", "category", "summary", "media_url", "media_alt", "href_override"],
  food: ["title", "destination", "category", "summary", "media_url", "media_alt", "href_override"],
  eventos: ["day", "title", "type", "detail", "media_url", "media_alt", "href_override"],
};

const savedRowsOf = (configured: unknown): RowRec[] =>
  Array.isArray(configured)
    ? configured.filter((row): row is RowRec => Boolean(row) && typeof row === "object")
    : [];

const normalizeHref = (value: unknown): string =>
  typeof value === "string" ? value.replace(/\/$/, "") : "";

/** Sólo se acepta un enlace interno canónico como override editorial. */
const isCanonicalInternalHref = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("/") && !value.includes("..");

/** Fila base de cada carril, derivada exclusivamente del corpus publicado. */
function railBaselineRows(rail: HomeEditableRail, real: HomeRealContent | undefined): RowRec[] {
  switch (rail) {
    case "destinos":
      return withValladolidFirst(real?.destinos ?? []).map((card, index) => {
        const media = mediaOf(card, "destination", index);
        return {
          name: card.title,
          note: card.subtitle,
          pueblo_magico: card.puebloMagico,
          href: card.href,
          demo: false,
          media_url: media.url,
          media_alt: media.alt,
        };
      });
    case "rutas": {
      const byTitle = new Map((real?.destinos ?? []).map((card) => [card.title, card]));
      return (real?.rutas ?? []).map((route, index) => {
        const cover = route.sequence
          .map((title) => byTitle.get(title))
          .find((card): card is Card => Boolean(card?.mediaUrl));
        const media = route.mediaUrl
          ? { url: route.mediaUrl, alt: route.title }
          : cover
            ? mediaOf(cover)
            : mediaOf({ title: route.title, mediaUrl: "" }, "route", index);
        return {
          id: route.id,
          title: route.title,
          duration: route.duration,
          stops: route.stops,
          vibe: route.vibe,
          description: route.description,
          href: route.href,
          sequence: route.sequence.map((label) => ({ label })),
          media_url: media.url,
          media_alt: media.alt,
        };
      });
    }
    case "experiencias":
      return (real?.experiencias ?? []).map((card, index) => {
        const media = mediaOf(card, "experience", index);
        return {
          title: card.title,
          category: card.category,
          summary: card.subtitle,
          href: card.href,
          media_url: media.url,
          media_alt: media.alt,
        };
      });
    case "stays":
    case "food":
      return (real?.[rail] ?? []).map((card, index) => {
        const media = mediaOf(card, rail === "stays" ? "hotel" : "restaurant", index);
        return {
          title: card.title,
          destination: card.category,
          category: rail === "stays" ? "Hospedaje" : "Gastronomía",
          summary: card.subtitle,
          href: card.href,
          media_url: media.url,
          media_alt: media.alt,
        };
      });
    case "eventos":
      return (real?.eventos ?? []).map((card) => ({
        day: card.day,
        title: card.title,
        type: card.category,
        detail: card.subtitle,
        href: card.href,
        media_url: card.mediaUrl,
        media_alt: card.mediaUrl.length > 0 ? card.title : "",
      }));
  }
}

/**
 * Proyección editable de un carril real del Home: el corpus publicado
 * conserva la autoridad sobre elegibilidad y existencia de cada tarjeta; el
 * Studio ajusta texto, imagen y enlace sobre esas mismas filas.
 */
export function buildHomeRailEditorRows(
  rail: HomeEditableRail,
  real: HomeRealContent | undefined,
  configured: unknown,
): RowRec[] {
  const saved = savedRowsOf(configured);
  return railBaselineRows(rail, real).map((base, index) => {
    const byHref = saved.find((row) => normalizeHref(row.href) === normalizeHref(base.href));
    const row = byHref ?? saved[index] ?? {};
    const out: RowRec = { ...base };
    for (const key of RAIL_EDITABLE_KEYS[rail]) {
      const value = row[key];
      if (value === undefined) continue;
      if (key === "href_override") {
        if (isCanonicalInternalHref(value)) out.href = value;
        continue;
      }
      if (typeof value === "string") {
        if (value.trim()) out[key] = value.trim();
        continue;
      }
      out[key] = value;
    }
    return out;
  });
}

/** Conserva únicamente los cambios editoriales explícitos sobre el corpus. */
export function compactHomeRailEditorOverrides(
  rail: HomeEditableRail,
  real: HomeRealContent | undefined,
  next: unknown,
): RowRec[] {
  const baseline = railBaselineRows(rail, real);
  const rows = savedRowsOf(next);
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

  return baseline.flatMap((base, index) => {
    const row = rows.find((c) => normalizeHref(c.href) === normalizeHref(base.href)) ?? rows[index];
    if (!row) return [];
    const override: RowRec = { href: base.href };
    for (const key of RAIL_EDITABLE_KEYS[rail]) {
      if (key === "href_override") continue;
      if (row[key] === undefined) continue;
      if (!same(row[key], base[key])) override[key] = row[key];
    }
    // El enlace editado llega en `href`; se guarda como override explícito.
    if (
      isCanonicalInternalHref(row.href) &&
      normalizeHref(row.href) !== normalizeHref(base.href) &&
      !rows.some((c) => normalizeHref(c.href) === normalizeHref(base.href))
    ) {
      override.href_override = row.href;
    }
    if (isCanonicalInternalHref(row.href_override)) override.href_override = row.href_override;
    return Object.keys(override).length > 1 ? [override] : [];
  });
}

/** Compatibilidad: puente original de Destinos. */
export function buildHomeDestinationEditorRows(
  real: HomeRealContent | undefined,
  configured: unknown,
) {
  return buildHomeRailEditorRows("destinos", real, configured) as Array<
    RowRec & { href: string; name: string; note: string; media_url: string; media_alt: string }
  >;
}

export function compactHomeDestinationEditorOverrides(
  real: HomeRealContent | undefined,
  next: unknown,
) {
  return compactHomeRailEditorOverrides("destinos", real, next);
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

/**
 * G9 · Máximo declarado por carril en el bloque editorial.
 *
 * El contrato ya expone `*_max_items`, pero el corpus real se fusionaba
 * completo y anulaba esa decisión editorial. Esta lectura permite que el
 * editor decida cuántas tarjetas se muestran en cada sección.
 */
export interface HomeRailLimits {
  readonly destinos?: number;
  readonly rutas?: number;
  readonly experiencias?: number;
  readonly servicios?: number;
  readonly eventos?: number;
  readonly categorias?: number;
  readonly queHacer?: number;
}

function positiveLimit(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded <= 0) return undefined;
  return Math.min(24, rounded);
}

export function readHomeRailLimits(config: unknown): HomeRailLimits {
  if (!config || typeof config !== "object") return {};
  const record = config as Record<string, unknown>;
  return {
    destinos: positiveLimit(record.destinos_max_items),
    rutas: positiveLimit(record.rutas_max_items),
    experiencias: positiveLimit(record.experiencias_max_items),
    servicios: positiveLimit(record.servicios_max_items),
    eventos: positiveLimit(record.eventos_max_items),
    categorias: positiveLimit(record.categorias_max_items),
    queHacer: positiveLimit(record.que_hacer_max_items),
  };
}

function limited<T>(items: readonly T[], max: number | undefined): T[] {
  return typeof max === "number" ? items.slice(0, max) : [...items];
}

function applyHomeRailLimits(
  content: HomePremiumContent,
  limits: HomeRailLimits | undefined,
): HomePremiumContent {
  if (!limits) return content;
  return {
    ...content,
    destinos: { ...content.destinos, items: limited(content.destinos.items, limits.destinos) },
    rutas: { ...content.rutas, items: limited(content.rutas.items, limits.rutas) },
    experiencias: {
      ...content.experiencias,
      items: limited(content.experiencias.items, limits.experiencias),
    },
    servicios: {
      ...content.servicios,
      stays: limited(content.servicios.stays, limits.servicios),
      food: limited(content.servicios.food, limits.servicios),
    },
    eventos: { ...content.eventos, items: limited(content.eventos.items, limits.eventos) },
    categorias: { ...content.categorias, items: limited(content.categorias.items, limits.categorias) },
    queHacer: { ...content.queHacer, items: limited(content.queHacer.items, limits.queHacer) },
  };
}

/** Fusiona el corpus real sobre el contenido editorial resuelto del bloque. */
export function mergeHomeRealContent(
  content: HomePremiumContent,
  real: HomeRealContent | undefined,
  destinationOverrides?: unknown,
  limits?: HomeRailLimits,
): HomePremiumContent {
  const safeContent = withoutUnapprovedMedia(content);
  if (!real) return applyHomeRailLimits(safeContent, limits);
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
    applyHomeRailLimits({
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
    }, limits),
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
