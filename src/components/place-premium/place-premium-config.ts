/**
 * G8-Q2D-A · `premium-entity-place` — contrato de plantilla reusable de la
 * familia Lugar y Atractivo.
 *
 * Autoridad visual: aprobación Founder G8-Q2D-0 (`PlacePremiumSurface`).
 * Este módulo es PURO: sin red, sin base de datos, sin flags, sin React.
 *
 * Reglas vinculantes aprobadas por el Founder:
 *  - Seis variantes cerradas; una variante desconocida es fail-closed.
 *  - Dirección Cinematográfica por defecto en zona arqueológica, cenote y
 *    atractivo natural; Editorial por defecto en museo, patrimonio
 *    religioso y mercado/artesanal.
 *  - Regla fail-closed de medios: si se solicita `cinematic` y NO existe
 *    una portada gobernada aprobada, la superficie renderiza Editorial y
 *    el constructor muestra el aviso oficial. Nunca se usa una imagen de
 *    otro lugar para conservar el modo cinematográfico.
 *  - Al incorporar después una portada aprobada, el modo Cinematográfico
 *    se activa sin reconstruir la ficha (sólo cambia la resolución).
 */
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { PLACE_PREMIUM_DEMO_CONTENT, type PlacePremiumContent } from "./place-premium-content";

export const PLACE_PREMIUM_TEMPLATE_ID = "premium-entity-place" as const;
export const PLACE_PREMIUM_BLOCK_TYPE = "vmx.place.premium-q2d" as const;
export const PLACE_PREMIUM_VARIANT = "lugar-premium-q2d-approved" as const;
export const PLACE_PREMIUM_CONTRACT_VERSION = "1.0.0" as const;
export const PLACE_PREMIUM_EFFECTIVE_DATE = "2026-08-28" as const;

/** Aviso oficial del constructor cuando aplica el fallback de medios. */
export const PLACE_PREMIUM_FALLBACK_NOTICE =
  "El modo cinematográfico requiere una portada aprobada; se muestra Editorial temporalmente." as const;

export interface PlacePremiumVariantDefinition {
  /** Slug cerrado, espejo de `place_types` (G8-Q2A). */
  readonly slug: string;
  /** Etiqueta visible en el constructor. */
  readonly label: string;
  /** Dirección visual predeterminada aprobada por el Founder. */
  readonly defaultPresentation: PremiumPresentation;
  /** JSON-LD @type de la variante. */
  readonly jsonLdType: string;
}

/** Seis variantes cerradas (G8-Q2D-A). */
export const PLACE_PREMIUM_VARIANTS: readonly PlacePremiumVariantDefinition[] = [
  {
    slug: "zona-arqueologica",
    label: "Zona arqueológica",
    defaultPresentation: "cinematic",
    jsonLdType: "LandmarksOrHistoricalBuildings",
  },
  {
    slug: "cenote",
    label: "Cenote",
    defaultPresentation: "cinematic",
    jsonLdType: "TouristAttraction",
  },
  {
    slug: "area-natural",
    label: "Atractivo natural",
    defaultPresentation: "cinematic",
    jsonLdType: "TouristAttraction",
  },
  { slug: "museo", label: "Museo", defaultPresentation: "editorial", jsonLdType: "Museum" },
  {
    slug: "templo-convento",
    label: "Patrimonio religioso",
    defaultPresentation: "editorial",
    jsonLdType: "PlaceOfWorship",
  },
  {
    slug: "mercado-artesanal",
    label: "Mercado y artesanías",
    defaultPresentation: "editorial",
    jsonLdType: "Place",
  },
];

export type PlacePremiumVariantSlug = (typeof PLACE_PREMIUM_VARIANTS)[number]["slug"];

/** Fail-closed: variante desconocida → `null` (nunca preset genérico). */
export function getPlacePremiumVariant(
  slug: string | null | undefined,
): PlacePremiumVariantDefinition | null {
  if (typeof slug !== "string") return null;
  const normalized = slug.trim().toLowerCase();
  return PLACE_PREMIUM_VARIANTS.find((v) => v.slug === normalized) ?? null;
}

export interface PlacePresentationInput {
  /** Variante de la ficha. */
  readonly variant: string | null | undefined;
  /** Dirección solicitada por el editor (persistida en la composición). */
  readonly requested?: PremiumPresentation | null;
  /** ¿Existe portada gobernada, aprobada y atribuida? */
  readonly hasApprovedCover: boolean;
}

export interface PlacePresentationResolution {
  /** Dirección efectivamente renderizada. */
  readonly presentation: PremiumPresentation;
  /** Dirección solicitada (o el default de la variante). */
  readonly requested: PremiumPresentation;
  /** `true` cuando se aplicó la regla fail-closed de medios. */
  readonly fallbackApplied: boolean;
  /** Aviso para el constructor (`null` cuando no hay fallback). */
  readonly builderNotice: string | null;
  readonly reason: string;
}

/**
 * Regla fail-closed de medios aprobada por el Founder.
 * Sin portada gobernada aprobada nunca se renderiza el hero cinematográfico.
 */
export function resolvePlacePresentation(
  input: PlacePresentationInput,
): PlacePresentationResolution {
  const variant = getPlacePremiumVariant(input.variant);
  const fallbackDefault: PremiumPresentation = variant?.defaultPresentation ?? "editorial";
  const requested: PremiumPresentation =
    input.requested === "cinematic" || input.requested === "editorial"
      ? input.requested
      : fallbackDefault;

  if (requested === "cinematic" && !input.hasApprovedCover) {
    return {
      presentation: "editorial",
      requested,
      fallbackApplied: true,
      builderNotice: PLACE_PREMIUM_FALLBACK_NOTICE,
      reason: "cinematic sin portada gobernada aprobada",
    };
  }

  return {
    presentation: requested,
    requested,
    fallbackApplied: false,
    builderNotice: null,
    reason: variant
      ? `dirección ${requested} para la variante ${variant.slug}`
      : "variante no reconocida · dirección editorial segura",
  };
}

type Cfg = Record<string, unknown>;

const str = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

/** ¿La configuración declara una portada gobernada y aprobada? */
export function hasApprovedGovernedCover(config: Cfg = {}): boolean {
  const url = config.hero_media_url;
  return typeof url === "string" && url.trim().length > 0 && config.hero_media_approved === true;
}

export interface PlacePremiumResolved {
  readonly content: PlacePremiumContent;
  readonly variant: string;
  readonly presentation: PremiumPresentation;
  readonly requestedPresentation: PremiumPresentation;
  readonly fallbackApplied: boolean;
  readonly builderNotice: string | null;
}

/** Configuración inicial del bloque al crear la composición. */
export function placePremiumDefaultConfig(variant: string = "zona-arqueologica"): Cfg {
  const def = getPlacePremiumVariant(variant) ?? PLACE_PREMIUM_VARIANTS[0];
  return {
    variant: def.slug,
    /** Persistible: dirección elegida por el editor. */
    presentation_mode: def.defaultPresentation,
    hero_media_url: "",
    hero_media_alt: "",
    hero_media_credit: "",
    hero_media_approved: false,
  };
}

/**
 * Puente entre la configuración editable y el contenido que consume
 * `PlacePremiumSurface`. Fail-closed: cualquier campo ausente o inválido
 * cae al contenido aprobado de la autoridad visual.
 */
export function resolvePlacePremiumQ2d(config: Cfg = {}): PlacePremiumResolved {
  const base = PLACE_PREMIUM_DEMO_CONTENT;
  const variant =
    getPlacePremiumVariant(typeof config.variant === "string" ? config.variant : null)?.slug ??
    "zona-arqueologica";
  const approvedCover = hasApprovedGovernedCover(config);

  const resolution = resolvePlacePresentation({
    variant,
    requested: (config.presentation_mode as PremiumPresentation | undefined) ?? null,
    hasApprovedCover: approvedCover,
  });

  const content: PlacePremiumContent = {
    ...base,
    identity: {
      ...base.identity,
      eyebrow: str(config.identity_eyebrow, base.identity.eyebrow),
      title: str(config.identity_title, base.identity.title),
      subtitle: str(config.identity_subtitle, base.identity.subtitle),
    },
    hero: {
      ...base.hero,
      cover: approvedCover
        ? {
            url: str(config.hero_media_url, ""),
            alt: str(config.hero_media_alt, base.hero.cover.alt),
            credit: str(config.hero_media_credit, base.hero.cover.credit),
          }
        : { ...base.hero.cover, url: null },
    },
  };

  return {
    content,
    variant,
    presentation: resolution.presentation,
    requestedPresentation: resolution.requested,
    fallbackApplied: resolution.fallbackApplied,
    builderNotice: resolution.builderNotice,
  };
}
