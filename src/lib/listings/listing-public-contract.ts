/**
 * G8-R1 · R1-A · Contrato público tipado de los seis listados turísticos.
 *
 * VÍA CANÓNICA ÚNICA (tratamiento vinculante de H-R1-01):
 *  - Las consultas productivas vigentes de las rutas de listado son la
 *    ÚNICA fuente de verdad. Este módulo define su contrato tipado y el
 *    compositor puro que las proyecta al VM oficial de Tourism Card.
 *  - Prohibido introducir fixtures, contenido inventado o medios ajenos
 *    a la entidad. Este módulo NO conoce `listing-premium-content.ts`.
 *  - Studio, preview y ruta pública consumen este mismo DTO y la misma
 *    superficie reusable (`TourismListingSurface`).
 *
 * Módulo PURO: sin red, sin base de datos, sin React, sin flags.
 */
import type { MarketplaceBusinessCard } from "@/lib/catalog/marketplace-reads.functions";
import type { PublicEventCard } from "@/lib/events/public-reads.functions";
import type { Destination } from "@/types/territory";
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import {
  businessToTourismCard,
  eventToTourismCard,
  destinationToTourismCard,
} from "@/lib/experience-builder/adapters/tourism-listing-adapters";
import { ORIENTE_MAYA } from "@/config/regions";

export const LISTING_PUBLIC_CONTRACT_VERSION = "1.0.0" as const;
export const LISTING_PUBLIC_CONTRACT_EFFECTIVE_DATE = "2026-08-28" as const;

export const LISTING_FAMILY_IDS = [
  "hoteles",
  "restaurantes",
  "experiencias",
  "eventos",
  "casas-de-vacaciones",
  "que-hacer",
] as const;

export type ListingFamilyId = (typeof LISTING_FAMILY_IDS)[number];

/** Origen productivo real de cada familia. Nunca "fixture". */
export type ListingSource = "businesses" | "events" | "editorial";

export interface ListingFamilyContract {
  readonly id: ListingFamilyId;
  readonly label: string;
  /** Ruta pública canónica ya existente en el router. */
  readonly route: string;
  /** Origen productivo de los datos. */
  readonly source: ListingSource;
  /** Slugs de categoría aceptados por la lectura productiva vigente. */
  readonly categorySlugs: readonly string[];
  /** Categoría forzada para el eyebrow de la tarjeta. */
  readonly forcedCategorySlug: string | null;
  readonly hero: {
    readonly eyebrow: string;
    readonly title: string;
    readonly subtitle: string;
  };
  readonly emptyMessage: string;
  /** `false` cuando el copy vacío aprobado NO varía por destino. */
  readonly destinoAwareEmptyMessage?: boolean;
}

/**
 * Copys aprobados, idénticos a los que las rutas productivas ya emiten.
 * No son contenido de catálogo: son etiquetas de superficie.
 */
export const LISTING_FAMILY_CONTRACTS: Record<ListingFamilyId, ListingFamilyContract> = {
  hoteles: {
    id: "hoteles",
    label: "Hoteles",
    route: "/hoteles",
    source: "businesses",
    categorySlugs: ["hoteles", "hospedaje"],
    forcedCategorySlug: "hoteles",
    hero: {
      eyebrow: "Descansa en el Oriente Maya",
      title: "Hoteles",
      subtitle:
        "Haciendas restauradas, posadas familiares y refugios en el corazón del Oriente Maya.",
    },
    emptyMessage:
      "Aún no hay hoteles publicados. Vuelve pronto para descubrir hospedajes verificados.",
  },
  restaurantes: {
    id: "restaurantes",
    label: "Restaurantes",
    route: "/restaurantes",
    source: "businesses",
    categorySlugs: ["restaurantes", "gastronomia"],
    forcedCategorySlug: "restaurantes",
    hero: {
      eyebrow: "Sabores del Oriente Maya",
      title: "Restaurantes",
      subtitle: "Cocina yucateca, panuchos, recados y mesas de autor.",
    },
    emptyMessage:
      "Aún no hay restaurantes publicados. Vuelve pronto para descubrir cocinas verificadas.",
  },
  experiencias: {
    id: "experiencias",
    label: "Experiencias",
    route: "/experiencias",
    source: "businesses",
    categorySlugs: ["experiencias", "experiencias-tours", "tours"],
    forcedCategorySlug: "experiencias",
    hero: {
      eyebrow: "Vive el Oriente Maya",
      title: "Experiencias",
      subtitle:
        "Vivencias auténticas con comunidades, cocineros y guías locales del Oriente Maya.",
    },
    emptyMessage:
      "Aún no hay experiencias publicadas. Vuelve pronto para descubrir vivencias con guías locales.",
  },
  eventos: {
    id: "eventos",
    label: "Eventos",
    route: "/eventos",
    source: "events",
    categorySlugs: [],
    forcedCategorySlug: null,
    hero: {
      eyebrow: "Agenda cultural",
      title: "Eventos",
      subtitle: "Fiestas, festivales y celebraciones del calendario maya.",
    },
    emptyMessage: "Aún no hay eventos publicados en el calendario.",
  },
  "casas-de-vacaciones": {
    id: "casas-de-vacaciones",
    label: "Casas de vacaciones",
    route: "/casas-de-vacaciones",
    source: "businesses",
    categorySlugs: [
      "casas-de-vacaciones",
      "casas-vacacionales",
      "villas",
      "rentas-vacacionales",
      "airbnb",
      "casas",
    ],
    forcedCategorySlug: "casas-de-vacaciones",
    hero: {
      eyebrow: "Tu casa en el Oriente Maya",
      title: "Casas de vacaciones",
      subtitle: "Casas, villas y rentas vacacionales para explorar el Oriente Maya a tu ritmo.",
    },
    destinoAwareEmptyMessage: false,
    emptyMessage:
      "Aún estamos verificando casas de vacaciones. Mientras tanto, explora hoteles y haciendas del Oriente Maya.",
  },
  "que-hacer": {
    id: "que-hacer",
    label: "Qué hacer",
    route: "/que-hacer",
    source: "editorial",
    categorySlugs: [],
    forcedCategorySlug: null,
    hero: {
      eyebrow: "Planea tu viaje",
      title: "Qué hacer",
      subtitle: "Destinos y agenda viva del Oriente Maya para armar tus días.",
    },
    emptyMessage: "Aún no hay actividades publicadas para este momento.",
  },
};

export function isListingFamilyId(value: unknown): value is ListingFamilyId {
  return (
    typeof value === "string" && (LISTING_FAMILY_IDS as readonly string[]).includes(value as string)
  );
}

/** Fail-closed: familia desconocida cae a `hoteles`, nunca a un fixture. */
export function listingFamilyContract(id: unknown): ListingFamilyContract {
  return LISTING_FAMILY_CONTRACTS[isListingFamilyId(id) ? id : "hoteles"];
}

/** DTO público único que consumen ruta pública, Studio y preview. */
export interface PublicListingDTO {
  readonly contractVersion: string;
  readonly family: ListingFamilyId;
  readonly label: string;
  readonly route: string;
  readonly source: ListingSource;
  /** Trazabilidad probatoria: siempre lecturas reales. */
  readonly provenance: "real_reads";
  readonly hero: {
    readonly eyebrow: string;
    readonly title: string;
    readonly subtitle: string;
    readonly metaLabel: string | null;
  };
  readonly items: readonly TourismCardVM[];
  readonly destinationSlug: string | null;
  readonly destinationLabel: string | null;
  readonly emptyMessage: string;
}

export interface ListingFeedInput {
  readonly businesses?: readonly MarketplaceBusinessCard[];
  readonly events?: readonly PublicEventCard[];
  readonly destinations?: readonly Destination[];
}

export interface BuildPublicListingInput extends ListingFeedInput {
  readonly family: unknown;
  readonly destino?: string | null;
  readonly destinationLabelOf?: (slug: string) => string;
}

function humanize(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Compositor puro: proyecta los feeds productivos al DTO único.
 * No inventa elementos: si el feed viene vacío, `items` es `[]`.
 */
export function buildPublicListing(input: BuildPublicListingInput): PublicListingDTO {
  const contract = listingFamilyContract(input.family);
  const destino = input.destino?.trim() || null;
  const labelOf = input.destinationLabelOf ?? humanize;
  const destinationLabel = destino ? labelOf(destino) : null;

  const allowed = new Set(contract.categorySlugs);
  let items: TourismCardVM[] = [];

  if (contract.source === "businesses") {
    items = (input.businesses ?? [])
      .filter((b) => allowed.has(b.category_slug))
      .filter((b) => !destino || b.destination_slug === destino)
      .map((b) =>
        businessToTourismCard(b, {
          destinationLabel: labelOf(b.destination_slug),
          regionLabel: ORIENTE_MAYA.name,
          forcedCategorySlug: contract.forcedCategorySlug,
        }),
      );
  } else if (contract.source === "events") {
    items = (input.events ?? [])
      .filter((e) => !destino || e.destination_slug === destino)
      .map(eventToTourismCard);
  } else {
    items = [
      ...(input.destinations ?? []).map(destinationToTourismCard),
      ...(input.events ?? []).map(eventToTourismCard),
    ];
  }

  const heroTitle =
    destino && contract.source !== "editorial"
      ? `${contract.hero.title} en ${destinationLabel}`
      : contract.hero.title;

  const emptyMessage =
    destino && contract.source === "businesses" && contract.destinoAwareEmptyMessage !== false
      ? `Aún no hay ${contract.label.toLowerCase()} publicados en ${destinationLabel}.`
      : contract.emptyMessage;

  return {
    contractVersion: LISTING_PUBLIC_CONTRACT_VERSION,
    family: contract.id,
    label: contract.label,
    route: contract.route,
    source: contract.source,
    provenance: "real_reads",
    hero: {
      eyebrow: contract.hero.eyebrow,
      title: heroTitle,
      subtitle: contract.hero.subtitle,
      metaLabel: destinationLabel ?? ORIENTE_MAYA.name,
    },
    items,
    destinationSlug: destino,
    destinationLabel,
    emptyMessage,
  };
}

/** Listado vacío válido: usado por Studio sin red. Nunca contiene fixtures. */
export function emptyPublicListing(family: unknown, destino?: string | null): PublicListingDTO {
  return buildPublicListing({ family, destino: destino ?? null });
}
