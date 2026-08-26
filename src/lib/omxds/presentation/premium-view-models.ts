/**
 * G4-SYSTEM-01 · Premium Runtime · View-Models.
 *
 * ViewModel-only, como el Surface Kit: las primitivas premium NO
 * importan entidades, contextos ni contratos de dominio. Cada familia
 * (home, destino, hotel, restaurante, experiencia, evento, casa de
 * vacaciones, ruta) provee su mapper y renderiza estas primitivas.
 */
import type { ReactNode } from "react";
import type { PremiumCrumb, PremiumGalleryLayout } from "./premium-presentation";

export type { PremiumCrumb, PremiumGalleryLayout };

/** Familias servidas por el runtime; reflejan las superficies existentes. */
export const PREMIUM_SURFACE_FAMILIES = [
  "home",
  "territory",
  "destination",
  "hotel",
  "restaurant",
  "experience",
  "event",
  "vacation-home",
  "route",
] as const;
export type PremiumSurfaceFamily = (typeof PREMIUM_SURFACE_FAMILIES)[number];

export interface PremiumMediaVM {
  url: string;
  /** ALT humano obligatorio: sin ALT no se publica media en el runtime. */
  alt: string;
}

export interface PremiumFactVM {
  label: string;
  value: string;
  icon?: ReactNode;
}

export interface PremiumBadgeVM {
  label: string;
  /** Asset acreditado; sin él, el badge se dibuja como texto. */
  assetUrl?: string | null;
  tone?: "neutral" | "primary" | "institutional";
}

export interface PremiumHeroVM {
  family: PremiumSurfaceFamily;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  cover: PremiumMediaVM | null;
  badges?: PremiumBadgeVM[];
  facts?: PremiumFactVM[];
  actions?: ReactNode;
}

export interface PremiumGalleryVM {
  items: PremiumMediaVM[];
  layout?: PremiumGalleryLayout;
  emptyLabel?: string;
}

export interface PremiumCardVM {
  id: string;
  title: string;
  eyebrow?: string;
  tagline?: string;
  media?: PremiumMediaVM | null;
  badges?: PremiumBadgeVM[];
  href?: string;
  meta?: string;
  actions?: ReactNode;
}

export interface PremiumSectionVM {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Sólo se aceptan medios con ALT humano no vacío (fail-closed). */
export function sanitizePremiumMedia(
  items: readonly (PremiumMediaVM | null | undefined)[],
): PremiumMediaVM[] {
  return items.filter(
    (item): item is PremiumMediaVM =>
      !!item && typeof item.url === "string" && item.url.trim().length > 0 && !!item.alt?.trim(),
  );
}

/** Rechaza URLs firmadas: el runtime sólo consume medios estables. */
export function isStableMediaUrl(url: unknown): boolean {
  if (typeof url !== "string" || url.trim() === "") return false;
  return !/[?&](token|X-Amz-Signature|signature|expires)=/i.test(url);
}
