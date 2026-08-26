export const PREMIUM_PRESENTATIONS = ["editorial", "cinematic"] as const;

export type PremiumPresentation = (typeof PREMIUM_PRESENTATIONS)[number];

export const DEFAULT_PREMIUM_PRESENTATION: PremiumPresentation = "editorial";

export function isPremiumPresentation(value: unknown): value is PremiumPresentation {
  return typeof value === "string" && PREMIUM_PRESENTATIONS.includes(value as PremiumPresentation);
}

export function resolvePremiumPresentation(
  publishedValue: unknown,
  fallback: PremiumPresentation = DEFAULT_PREMIUM_PRESENTATION,
): PremiumPresentation {
  return isPremiumPresentation(publishedValue) ? publishedValue : fallback;
}

export function canManagePremiumPresentation(roles: readonly string[]): boolean {
  return roles.some((role) => ["admin", "owner", "editor"].includes(role));
}
