/**
 * G4-SYSTEM-01 · Premium Presentation Contract.
 *
 * Eje ÚNICO de presentación del runtime visual premium. Editorial y
 * Cinematográfica son dos variantes de PRESENTACIÓN sobre los mismos
 * view-models y los mismos datos: nunca dos modelos de datos, nunca
 * dos plantillas paralelas.
 *
 * Reglas vinculantes aplicadas:
 *  - Fail-closed: rol desconocido ⇒ `visitor`; presentación desconocida
 *    ⇒ presentación publicada; sin presentación publicada ⇒ default.
 *  - El selector NO es público: sólo admin / propietario / editor
 *    autorizado pueden solicitar override. El visitante recibe siempre
 *    la variante publicada.
 *  - Nombre territorial visible obligatorio: "Oriente Maya de Yucatán".
 *  - Pueblos Mágicos: el registro autorizado es el registry institucional
 *    existente; el distintivo gráfico sólo se usa si hay asset acreditado
 *    configurado. Sin asset ⇒ distintivo textual.
 *  - No introduce persistencia, datos, flags ni mapas nuevos.
 */
import { PUEBLOS_MAGICOS_AUTORIZADOS } from "@/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry";

/* ------------------------------------------------------------------ *
 * Presentación
 * ------------------------------------------------------------------ */

export const PREMIUM_PRESENTATIONS = ["editorial", "cinematic"] as const;
export type PremiumPresentation = (typeof PREMIUM_PRESENTATIONS)[number];

export const DEFAULT_PREMIUM_PRESENTATION: PremiumPresentation = "editorial";

export const PREMIUM_PRESENTATION_LABELS: Record<PremiumPresentation, string> = {
  editorial: "Editorial",
  cinematic: "Cinematográfica",
};

export const PREMIUM_GALLERY_LAYOUTS = ["mosaico", "carrusel", "cuadricula", "tira"] as const;
export type PremiumGalleryLayout = (typeof PREMIUM_GALLERY_LAYOUTS)[number];

export const DEFAULT_PREMIUM_GALLERY_LAYOUT: PremiumGalleryLayout = "mosaico";

export function isPremiumPresentation(value: unknown): value is PremiumPresentation {
  return typeof value === "string" && (PREMIUM_PRESENTATIONS as readonly string[]).includes(value);
}

export function isPremiumGalleryLayout(value: unknown): value is PremiumGalleryLayout {
  return (
    typeof value === "string" && (PREMIUM_GALLERY_LAYOUTS as readonly string[]).includes(value)
  );
}

/* ------------------------------------------------------------------ *
 * Actores — quién puede seleccionar la presentación.
 * ------------------------------------------------------------------ */

export const PREMIUM_PRESENTATION_ACTORS = ["visitor", "editor", "owner", "admin"] as const;
export type PremiumPresentationActor = (typeof PREMIUM_PRESENTATION_ACTORS)[number];

/** Fail-closed: cualquier valor no reconocido degrada a `visitor`. */
export function normalizePresentationActor(value: unknown): PremiumPresentationActor {
  return typeof value === "string" &&
    (PREMIUM_PRESENTATION_ACTORS as readonly string[]).includes(value)
    ? (value as PremiumPresentationActor)
    : "visitor";
}

/** El selector jamás se ofrece al visitante. */
export function canSelectPremiumPresentation(actor: unknown): boolean {
  return normalizePresentationActor(actor) !== "visitor";
}

export interface PremiumPresentationResolution {
  presentation: PremiumPresentation;
  /** Origen efectivo de la decisión, auditable. */
  source: "override" | "published" | "default";
  /** Si el actor puede ver y usar el selector interno. */
  selectorAvailable: boolean;
}

/**
 * Resuelve la presentación efectiva de una superficie.
 * El override sólo se honra si el actor está autorizado.
 */
export function resolvePremiumPresentation(input: {
  published?: unknown;
  requested?: unknown;
  actor?: unknown;
}): PremiumPresentationResolution {
  const selectorAvailable = canSelectPremiumPresentation(input.actor);
  const published = isPremiumPresentation(input.published)
    ? input.published
    : DEFAULT_PREMIUM_PRESENTATION;
  const publishedSource: PremiumPresentationResolution["source"] = isPremiumPresentation(
    input.published,
  )
    ? "published"
    : "default";

  if (selectorAvailable && isPremiumPresentation(input.requested)) {
    return { presentation: input.requested, source: "override", selectorAvailable };
  }
  return { presentation: published, source: publishedSource, selectorAvailable };
}

/* ------------------------------------------------------------------ *
 * Territorio y breadcrumb canónico.
 * ------------------------------------------------------------------ */

/** Nombre territorial VISIBLE. Prohibido usar "Oriente Maya" a secas. */
export const TERRITORY_LABEL = "Oriente Maya de Yucatán";
export const TERRITORY_HREF = "/oriente-maya";
export const HOME_LABEL = "Inicio";
export const HOME_HREF = "/";

export interface PremiumCrumb {
  label: string;
  href?: string;
}

/** Inicio → Oriente Maya de Yucatán → Destino → (…). */
export function buildTerritorialCrumbs(
  destination?: { slug: string; label: string } | null,
  tail: readonly PremiumCrumb[] = [],
): PremiumCrumb[] {
  const crumbs: PremiumCrumb[] = [
    { label: HOME_LABEL, href: HOME_HREF },
    { label: TERRITORY_LABEL, href: TERRITORY_HREF },
  ];
  if (destination) {
    crumbs.push({ label: destination.label, href: `${TERRITORY_HREF}/${destination.slug}` });
  }
  for (const crumb of tail) crumbs.push({ label: crumb.label, href: crumb.href });
  return crumbs;
}

/* ------------------------------------------------------------------ *
 * Pueblos Mágicos — registro autorizado reutilizado, sin duplicar.
 * ------------------------------------------------------------------ */

export const PUEBLO_MAGICO_LABEL = "Pueblo Mágico";

export function isPuebloMagico(slug: unknown): boolean {
  return (
    typeof slug === "string" &&
    (PUEBLOS_MAGICOS_AUTORIZADOS as readonly string[]).includes(slug.trim().toLowerCase())
  );
}

export interface PuebloMagicoBadge {
  label: string;
  /** Asset oficial acreditado; `null` mientras no exista configuración. */
  assetUrl: string | null;
  /** `asset` sólo cuando hay archivo acreditado; en otro caso, texto. */
  mode: "asset" | "text";
}

/**
 * Distintivo Pueblo Mágico. Sin asset acreditado configurado NUNCA se
 * dibuja ni se imita el logotipo oficial: sólo estado editorial textual.
 */
export function resolvePuebloMagicoBadge(
  slug: unknown,
  accreditedAssetUrl?: string | null,
): PuebloMagicoBadge | null {
  if (!isPuebloMagico(slug)) return null;
  const asset =
    typeof accreditedAssetUrl === "string" && accreditedAssetUrl.trim().length > 0
      ? accreditedAssetUrl.trim()
      : null;
  return { label: PUEBLO_MAGICO_LABEL, assetUrl: asset, mode: asset ? "asset" : "text" };
}
