/**
 * Surface Kit · ViewModel contracts (Sub-ola 2.5a).
 *
 * ViewModel-only: los tipos aqui definidos son las UNICAS entradas que
 * los primitives del Kit aceptan. El Kit NO importa tipos de entidad
 * (Business, Product, Marketplace) ni contextos de superficie.
 *
 * Las superficies (Business, Product, Event, Hotel, ...) proveen mappers
 * toKitVM(entity) en su propio modulo y renderizan Kit primitives con
 * los VMs resultantes.
 */
import type { ReactNode } from "react";

export type CrumbVM = { label: string; href?: string };

export type BadgeVM = {
  label: string;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  icon?: ReactNode;
};

export type MediaVM = { id?: string; url: string; alt?: string };

export type PriceVM = { amount: number; currency: string };

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
  actions?: ReactNode;
};

export type GalleryVM = {
  cover?: MediaVM | null;
  items?: MediaVM[];
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
  mode?: string;
  actions: ReactNode;
  fallbackLabel?: string;
  sticky?: boolean;
};

export type InfoRowVM = { label: string; value: ReactNode };
export type InfoTableVM = { rows: InfoRowVM[] };

export type ContactVM = {
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
  publishedAt?: string | null;
  language?: string | null;
  visitType?: string | null;
  verifiedSource?:
    | "verified_purchase"
    | "managed_visit"
    | "verified_visit"
    | "verified_redemption"
    | "declared_visitor"
    | null;
  businessResponse?: string | null;
  businessResponseAt?: string | null;
};

export type ReviewStatsVM = {
  count: number;
  average: number;
  verifiedCount: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
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
  actions?: ReactNode;
};

export type CardGridVM = {
  items: CardVM[];
  columns?: 1 | 2 | 3 | 4;
  emptyLabel?: string;
};