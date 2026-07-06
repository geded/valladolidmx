/**
 * H-03 · Ola I3 — Adapter Destination → Bloques Oficiales.
 *
 * Mapea `PublicDestinationDTO` (BD, `getPublicDestinationBySlug`) y su
 * mock territorial a los DTOs de los bloques oficiales del Experience
 * Builder (I1.a-c / I2.a-d). Sin crear nuevos componentes ni contratos:
 * traduce el modelo territorial al contrato ya aprobado de cada bloque.
 *
 * Regla de Compatibilidad Evolutiva: si un dato del destino no encaja
 * en un bloque existente, se documenta en el Closure Report como
 * "candidato a evolución" antes de crear cualquier bloque nuevo.
 */
import type { PublicDestinationDTO } from "@/lib/destinations/public-reads.functions";
import type { ExperienceHeroDTO } from "@/lib/experience-builder/blocks/experience-hero/contract";
import type {
  ExperienceSubnavDTO,
  ExperienceSubnavAnchor,
} from "@/lib/experience-builder/blocks/experience-subnav/contract";
import type { ExperienceSectionDTO } from "@/lib/experience-builder/blocks/experience-section/contract";
import type { ExperienceInfoGridDTO } from "@/lib/experience-builder/blocks/experience-info-grid/contract";
import type { ExperienceCtaBarDTO } from "@/lib/experience-builder/blocks/experience-cta-bar/contract";
import type { InstitutionalBadgeItem } from "@/lib/experience-builder/blocks/experience-institutional-badges/contract";
import type { ExperienceGalleryDTO } from "@/lib/experience-builder/blocks/experience-gallery/contract";
import type {
  ExperienceMapDTO,
  ExperienceMapPoint,
} from "@/lib/experience-builder/blocks/experience-map/contract";
import { PUEBLOS_MAGICOS_AUTORIZADOS } from "@/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry";

/**
 * Modelo unificado consumido por los adapters. Se compone en la ruta a
 * partir de la BD (`PublicDestinationDTO`) y el mock territorial, de
 * forma que el adapter no dependa del origen — sólo del contrato final.
 */
export interface DestinationBlockInput {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  highlights: string[];
  heroUrl: string | null;
  galleryUrls: string[];
  latitude: number | null;
  longitude: number | null;
  mapPoints: ExperienceMapPoint[];
  regionSlug: string;
  regionName: string;
  relatedCounts: {
    hoteles: number;
    restaurantes: number;
    experiencias: number;
    otras: number;
    productos: number;
    eventos: number;
  };
}

export function toDestinationBlockInput(
  dbData: PublicDestinationDTO | null | undefined,
  mock:
    | { name?: string; tagline?: string | null; highlights?: readonly string[] }
    | null
    | undefined,
  ctx: {
    slug: string;
    regionSlug: string;
    regionName: string;
    counts?: DestinationBlockInput["relatedCounts"];
    galleryUrls?: string[];
    mapPoints?: ExperienceMapPoint[];
  },
): DestinationBlockInput {
  return {
    slug: ctx.slug,
    name: dbData?.name ?? mock?.name ?? ctx.slug,
    tagline: dbData?.tagline ?? mock?.tagline ?? null,
    description: dbData?.description ?? null,
    highlights: (dbData?.highlights?.length ? dbData.highlights : mock?.highlights ?? []) as string[],
    heroUrl: dbData?.hero_url ?? null,
    galleryUrls: ctx.galleryUrls ?? [],
    latitude: dbData?.latitude ?? null,
    longitude: dbData?.longitude ?? null,
    mapPoints: ctx.mapPoints ?? [],
    regionSlug: ctx.regionSlug,
    regionName: ctx.regionName,
    relatedCounts: ctx.counts ?? {
      hoteles: 0, restaurantes: 0, experiencias: 0, otras: 0, productos: 0, eventos: 0,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */
export function destinationToHeroDTO(d: DestinationBlockInput): ExperienceHeroDTO {
  // U-VISUAL · V4.2 — Tourist Hero `immersive` para micrositios de
  // destino. Airbnb-style: imagen contenida con `rounded-3xl` + overlay,
  // no full-bleed (evita el edge-to-edge sin esquinas del `cinematic`).
  // Evolución vía `variant` del contrato oficial (Tourist Hero Policy).
  // Sin heroUrl → `editorial`.
  if (d.heroUrl) {
    const encoded = encodeURIComponent(d.slug);
    return {
      variant: "immersive",
      eyebrow: `Descubre ${d.regionName}`,
      title: d.name,
      description: d.tagline || null,
      media: { url: d.heroUrl, alt: d.name, overlay: 0.45 },
      badges: [],
      meta: [{ iconKey: "map-pin", label: d.regionName }],
      ctaPrimary: {
        label: "Explorar el destino",
        action: "navigate",
        href: `/oriente-maya/${encoded}#descubre`,
        emphasis: "primary",
      },
      ctaSecondary: {
        label: "Ver en el mapa",
        action: "navigate",
        href: `/oriente-maya/${encoded}#ubicacion`,
        emphasis: "secondary",
      },
    };
  }
  return {
    variant: "editorial",
    eyebrow: d.regionName,
    title: d.name,
    description: d.tagline || null,
    media: null,
    badges: [],
    meta: [{ iconKey: "map-pin", label: `${d.regionName}` }],
    ctaPrimary: null,
    ctaSecondary: null,
  };
}

/* ------------------------------------------------------------------ *
 * Institutional Badges — deriva distintivos oficiales del destino.
 * Founder Design Principle (identidad cultural + distintivos
 * institucionales) + Institutional Badges Rule (jamás hardcodeados en
 * plantillas; el registry autoriza).
 * ------------------------------------------------------------------ */
export function destinationToBadgeItems(
  d: DestinationBlockInput,
): InstitutionalBadgeItem[] {
  const items: InstitutionalBadgeItem[] = [];
  const slug = d.slug.toLowerCase();
  if ((PUEBLOS_MAGICOS_AUTORIZADOS as readonly string[]).includes(slug)) {
    items.push({
      kind: "pueblo-magico",
      slug: `pueblo-magico:${slug}`,
      source: "destination",
    });
  }
  items.push({
    kind: "oriente-maya",
    slug: `oriente-maya:${slug}`,
    source: "destination",
  });
  if (slug === "valladolid") {
    items.push({
      kind: "despierta-en-valladolid",
      slug: `despierta:${slug}`,
      source: "destination",
    });
  }
  return items;
}

/* ------------------------------------------------------------------ *
 * Subnav — anclas dinámicas según secciones disponibles.
 * ------------------------------------------------------------------ */
export function destinationToSubnavDTO(d: DestinationBlockInput): ExperienceSubnavDTO {
  const anchors: ExperienceSubnavAnchor[] = [];
  if (d.description || d.highlights.length > 0) {
    anchors.push({ id: "resumen", label: "Resumen" });
  }
  const c = d.relatedCounts;
  const total =
    c.hoteles + c.restaurantes + c.experiencias + c.otras + c.eventos + c.productos;
  if (total > 0) {
    // H-03 · I3.b — sección unificada de descubrimiento contextual
    // orquestada por `vmx.experience.related-collection`.
    anchors.push({ id: "descubre", label: "Sigue descubriendo" });
  }
  return {
    variant: "pill",
    sticky: true,
    scrollOffset: 80,
    ariaLabel: "Secciones del destino",
    anchors,
    capabilities: { scrollSpy: true, collapseOnMobile: true, showIcons: false },
  };
}

/* ------------------------------------------------------------------ *
 * Section — descripción larga.
 * ------------------------------------------------------------------ */
export function destinationToDescriptionSectionDTO(
  d: DestinationBlockInput,
): ExperienceSectionDTO | null {
  if (!d.description) return null;
  return {
    variant: "editorial",
    eyebrow: null,
    title: `Sobre ${d.name}`,
    lead: null,
    body: d.description,
    media: null,
    attribution: null,
    ctas: [],
    align: "left",
    tone: "default",
    ariaLabel: `Sobre ${d.name}`,
    capabilities: { anchor: true, seoHeading: true, richText: false },
  };
}

/* ------------------------------------------------------------------ *
 * Info-grid — "Lo esencial" derivado de highlights.
 * ------------------------------------------------------------------ */
export function destinationToHighlightsInfoGridDTO(
  d: DestinationBlockInput,
): ExperienceInfoGridDTO | null {
  if (!d.highlights.length) return null;
  return {
    variant: "cards",
    heading: "Lo esencial",
    columns: Math.min(2, Math.max(1, d.highlights.length)),
    items: d.highlights.map((h) => ({
      iconKey: "sparkles",
      label: "Highlight",
      value: h,
      tone: "default",
    })),
    ariaLabel: "Lo esencial del destino",
    capabilities: { copyable: false, livePricing: false, liveAvailability: false },
  };
}

/* ------------------------------------------------------------------ *
 * CTA Bar — barra inferior persistente (móvil), acción territorial.
 * ------------------------------------------------------------------ */
export function destinationToCtaBarDTO(d: DestinationBlockInput): ExperienceCtaBarDTO {
  return {
    variant: "bar",
    label: d.name,
    meta: d.tagline || null,
    actions: [
      {
        label: "Explorar experiencias",
        action: "navigate",
        href: `/oriente-maya/${encodeURIComponent(d.slug)}#descubre`,
        emphasis: "primary",
      },
    ],
    revealAfterScroll: 480,
    desktopPosition: "bottom",
    ariaLabel: `Acciones del destino ${d.name}`,
    capabilities: {
      hideOnScrollDown: false,
      showPriceBadge: false,
      showFavorite: false,
      showShare: false,
    },
  };
}