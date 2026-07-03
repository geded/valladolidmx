/**
 * Surface Kit · formatters neutros (Sub-ola 2.5a).
 * Sin dependencias de dominio; solo Intl.
 */
import type { PriceVM } from "./types";

export function formatPrice(
  price: PriceVM | null | undefined,
  locale = "es-MX",
): string | null {
  if (!price || price.amount == null) return null;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: price.currency || "MXN",
      maximumFractionDigits: 0,
    }).format(price.amount);
  } catch {
    return `${price.currency} ${price.amount}`;
  }
}

export function humanize(value: string): string {
  return value.replace(/[_-]+/g, " ").trim();
}

export function clampRating(rating: number): number {
  return Math.max(0, Math.min(5, Math.round(rating)));
}