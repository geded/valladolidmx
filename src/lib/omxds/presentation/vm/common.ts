/**
 * G4-SYSTEM-02 · Mappers ViewModel compartidos del runtime premium.
 *
 * Reglas vinculantes aplicadas:
 *  - ViewModel-only: este módulo NO importa entidades, contextos,
 *    clientes de datos ni contratos de dominio. Recibe fuentes planas
 *    y devuelve los view-models del runtime premium.
 *  - Una sola fuente de verdad: los mappers no reimplementan reglas de
 *    negocio; sólo normalizan y sanean para presentación.
 *  - Fail-closed en medios: sin ALT humano o con URL firmada, el medio
 *    se descarta (nunca se publica un medio no acreditado o inestable).
 */
import type { ReactNode } from "react";
import {
  buildTerritorialCrumbs,
  resolvePuebloMagicoBadge,
  type PremiumCrumb,
  type PremiumGalleryLayout,
} from "../premium-presentation";
import {
  isStableMediaUrl,
  sanitizePremiumMedia,
  type PremiumBadgeVM,
  type PremiumFactVM,
  type PremiumGalleryVM,
  type PremiumHeroVM,
  type PremiumMediaVM,
  type PremiumSurfaceFamily,
} from "../premium-view-models";

/* ------------------------------------------------------------------ *
 * Fuentes planas admitidas por los mappers.
 * ------------------------------------------------------------------ */

export interface PremiumMediaSource {
  url?: string | null;
  alt?: string | null;
}

export interface PremiumFactSource {
  label?: string | null;
  value?: string | null;
  icon?: ReactNode;
}

export interface PremiumBadgeSource {
  label?: string | null;
  assetUrl?: string | null;
  tone?: PremiumBadgeVM["tone"];
}

export interface PremiumDestinationRef {
  slug: string;
  label: string;
}

/** Fuente común a todas las familias del runtime. */
export interface PremiumEntitySource {
  title?: string | null;
  eyebrow?: string | null;
  subtitle?: string | null;
  cover?: PremiumMediaSource | null;
  gallery?: readonly (PremiumMediaSource | null | undefined)[];
  galleryLayout?: PremiumGalleryLayout;
  facts?: readonly (PremiumFactSource | null | undefined)[];
  badges?: readonly (PremiumBadgeSource | null | undefined)[];
  actions?: ReactNode;
  /** Destino territorial al que pertenece la entidad (para breadcrumb). */
  destination?: PremiumDestinationRef | null;
  /** Asset institucional acreditado del distintivo Pueblo Mágico. */
  puebloMagicoAssetUrl?: string | null;
}

/* ------------------------------------------------------------------ *
 * Normalizadores.
 * ------------------------------------------------------------------ */

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/** Devuelve el medio sólo si tiene URL estable y ALT humano. */
export function toPremiumMediaVM(source?: PremiumMediaSource | null): PremiumMediaVM | null {
  const url = text(source?.url);
  const alt = text(source?.alt);
  if (!url || !alt || !isStableMediaUrl(url)) return null;
  return { url, alt };
}

export function toPremiumMediaListVM(
  sources?: readonly (PremiumMediaSource | null | undefined)[],
): PremiumMediaVM[] {
  if (!sources || sources.length === 0) return [];
  return sanitizePremiumMedia(sources.map((item) => toPremiumMediaVM(item)));
}

export function toPremiumFactsVM(
  sources?: readonly (PremiumFactSource | null | undefined)[],
): PremiumFactVM[] {
  if (!sources) return [];
  const facts: PremiumFactVM[] = [];
  for (const source of sources) {
    const label = text(source?.label);
    const value = text(source?.value);
    if (!label || !value) continue;
    facts.push(source?.icon ? { label, value, icon: source.icon } : { label, value });
  }
  return facts;
}

export function toPremiumBadgesVM(
  sources?: readonly (PremiumBadgeSource | null | undefined)[],
): PremiumBadgeVM[] {
  if (!sources) return [];
  const badges: PremiumBadgeVM[] = [];
  for (const source of sources) {
    const label = text(source?.label);
    if (!label) continue;
    const assetUrl = text(source?.assetUrl);
    badges.push({
      label,
      assetUrl: assetUrl && isStableMediaUrl(assetUrl) ? assetUrl : null,
      tone: source?.tone ?? "institutional",
    });
  }
  return badges;
}

export function toPremiumGalleryVM(
  source: PremiumEntitySource,
  layout?: PremiumGalleryLayout,
): PremiumGalleryVM {
  const items = toPremiumMediaListVM(source.gallery);
  const resolved = layout ?? source.galleryLayout;
  return resolved
    ? { items, layout: resolved, emptyLabel: "Sin fotografías acreditadas" }
    : { items, emptyLabel: "Sin fotografías acreditadas" };
}

/**
 * Distintivos de la entidad + Pueblo Mágico cuando el destino pertenece
 * al registro institucional autorizado. Sin asset acreditado, el
 * distintivo queda en modo textual (nunca se imita el logotipo oficial).
 */
export function toPremiumEntityBadgesVM(source: PremiumEntitySource): PremiumBadgeVM[] {
  const badges = toPremiumBadgesVM(source.badges);
  const pueblo = resolvePuebloMagicoBadge(source.destination?.slug, source.puebloMagicoAssetUrl);
  if (pueblo && !badges.some((badge) => badge.label === pueblo.label)) {
    badges.unshift({ label: pueblo.label, assetUrl: pueblo.assetUrl, tone: "institutional" });
  }
  return badges;
}

/** Breadcrumb canónico Inicio → Oriente Maya de Yucatán → Destino → (…). */
export function toPremiumCrumbs(
  source: PremiumEntitySource,
  tail: readonly PremiumCrumb[] = [],
): PremiumCrumb[] {
  return buildTerritorialCrumbs(source.destination ?? null, tail);
}

/**
 * Hero compartido: única construcción de `PremiumHeroVM` del runtime.
 * Todas las familias delegan aquí para evitar duplicación.
 */
export function toPremiumHeroVM(
  family: PremiumSurfaceFamily,
  source: PremiumEntitySource,
  defaults: { eyebrow?: string } = {},
): PremiumHeroVM {
  const title = text(source.title) ?? "Sin título acreditado";
  const eyebrow = text(source.eyebrow) ?? defaults.eyebrow;
  const subtitle = text(source.subtitle);
  const badges = toPremiumEntityBadgesVM(source);
  const facts = toPremiumFactsVM(source.facts);

  const vm: PremiumHeroVM = { family, title, cover: toPremiumMediaVM(source.cover) };
  if (eyebrow) vm.eyebrow = eyebrow;
  if (subtitle) vm.subtitle = subtitle;
  if (badges.length > 0) vm.badges = badges;
  if (facts.length > 0) vm.facts = facts;
  if (source.actions) vm.actions = source.actions;
  return vm;
}

export type { PremiumCrumb, PremiumGalleryLayout };
