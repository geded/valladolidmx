/**
 * Surface Kit · ViewModel contracts (Sub-ola 2.5a).
 *
 * ViewModel-only: los tipos aquí definidos son las ÚNICAS entradas que
 * los primitives del Kit aceptan. El Kit NO importa tipos de entidad
 * (Business, Product, Marketplace) ni contextos de superficie.
 *
 * Las superficies (Business, Product, Event, Hotel, …) proveen mappers
 * `toKitVM(entity)` en su propio módulo y renderizan Kit primitives con
 * los VMs resultantes.
 */
import type { ReactNode } from "react";

/** Migas de pan neutras — el destino se resuelve en el mapper. */
export type CrumbVM = { label: string; href?: string };

/** Badge neutro reutilizable (verificado, plan, descuento, etc.). */
export type BadgeVM = {
  label: string;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  icon?: ReactNode;
};

/** Referencia mínima a un asset multimedia. */
export type MediaVM = { id?: string; url: string; alt?: string };

/** Precio normalizado. Kit hace el formateo con `format.ts`. */
export type PriceVM = { amount: number; currency: string };

/* ------------------------------------------------------------------ */
/* Primitive ViewModels                                                */
/* ------------------------------------------------------------------ */

export type ShellVM = {
  crumbs?: CrumbVM[];
  eyebrow?: string;
  title?: string;
  description?: string;
};

export type HeroVM = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badges?: BadgeVM[];
  /** Acciones libres (favorito, share, etc.) montadas por el mapper. */
  actions?: ReactNode;
};

export type GalleryVM = {
  cover?: MediaVM | null;
  items?: MediaVM[];
  /** Texto alternativo genérico si un item no trae alt propio. */
  fallbackAlt?: string;
  emptyLabel?: string;
};

export type RichTextVM = {
  heading?: string;
  body?: string | null;
  emptyLabel?: string;
};

export type PriceCtaVM = {
  price?: PriceVM | null;
  /** Etiqueta libre (modo de conversión ya humanizado, cadencia, etc.). */
  mode?: string;
  /** CTA(s) ya construidos por el mapper (ProductActions, etc.). */
  actions: ReactNode;
  fallbackLabel?: string;
  sticky?: boolean;
};

export type InfoRowVM = { label: string; value: ReactNode };
export type InfoTableVM = { rows: InfoRowVM[] };

export type ContactVM = {
  /** Tipo libre (whatsapp, phone, email, url, …) — sólo semántico. */
  type: string;
  label?: string;
  value: string;
  href?: string;
};

export type LocationVM = {
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  lat?: number;
  lng?: number;
};

export type ReviewVM = {
  id: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
};

export type FaqVM = { id: string; question: string; answer: string };

export type PromoVM = {
  id: string;
  title: string;
  description?: string | null;
  discountPercent?: number | null;
};

export type CardVM = {
  id: string;
  href?: string;
  eyebrow?: string;
  title: string;
  tagline?: string;
  media?: MediaVM | null;
  price?: PriceVM | null;
  badges?: BadgeVM[];
  /** Slot libre para CTAs por tarjeta (ProductActions, etc.). */
  actions?: ReactNode;
};

export type CardGridVM = {
  items: CardVM[];
  columns?: 1 | 2 | 3 | 4;
  emptyLabel?: string;
};