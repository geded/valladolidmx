import type { CSSProperties } from "react";
import type { TourismBrandDefinition } from "@/config/brand";
import { ALUX_PALETTE_KEYS, type AluxPalette } from "./alux-brand";

export type BrandPalette = TourismBrandDefinition["palette"];

export const BRAND_PALETTE_KEYS = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "accent",
  "accentForeground",
  "muted",
  "mutedForeground",
  "border",
  "ring",
  "territory",
  "territoryForeground",
] as const satisfies ReadonlyArray<keyof BrandPalette>;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function normalizeHexColor(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX_COLOR.test(value.trim())
    ? value.trim().toLowerCase()
    : fallback;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

export function contrastRatio(foreground: string, background: string): number {
  if (!HEX_COLOR.test(foreground) || !HEX_COLOR.test(background)) return 1;
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function paletteContrastChecks(palette: BrandPalette) {
  return [
    { label: "Texto general", ratio: contrastRatio(palette.foreground, palette.background) },
    { label: "Texto en tarjetas", ratio: contrastRatio(palette.cardForeground, palette.card) },
    {
      label: "Texto secundario general",
      ratio: contrastRatio(palette.mutedForeground, palette.background),
    },
    {
      label: "Texto secundario en tarjetas",
      ratio: contrastRatio(palette.mutedForeground, palette.card),
    },
    {
      label: "Texto secundario en superficie tenue",
      ratio: contrastRatio(palette.mutedForeground, palette.muted),
    },
    { label: "Botón principal", ratio: contrastRatio(palette.primaryForeground, palette.primary) },
    {
      label: "Botón secundario",
      ratio: contrastRatio(palette.secondaryForeground, palette.secondary),
    },
    { label: "Acento", ratio: contrastRatio(palette.accentForeground, palette.accent) },
    { label: "Territorio", ratio: contrastRatio(palette.territoryForeground, palette.territory) },
  ].map((check) => ({ ...check, pass: check.ratio >= 4.5 }));
}

export function aluxPaletteContrastChecks(palette: AluxPalette) {
  return [
    { label: "Acción principal de Alux", ratio: contrastRatio(palette.primaryForeground, palette.primary) },
    { label: "Superficie de Alux", ratio: contrastRatio(palette.surfaceForeground, palette.surface) },
    { label: "Acento de Alux", ratio: contrastRatio(palette.accentForeground, palette.accent) },
    { label: "Insignia de Alux", ratio: contrastRatio(palette.badgeForeground, palette.badge) },
  ].map((check) => ({ ...check, pass: check.ratio >= 4.5 }));
}

export function normalizeAluxPalette(value: unknown, fallback: AluxPalette): AluxPalette {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const palette = Object.fromEntries(
    ALUX_PALETTE_KEYS.map((key) => [key, normalizeHexColor(row[key], fallback[key])]),
  ) as unknown as AluxPalette;
  return aluxPaletteContrastChecks(palette).every((check) => check.pass) ? palette : fallback;
}

export function brandPaletteStyle(palette: BrandPalette): CSSProperties {
  return {
    "--background": palette.background,
    "--foreground": palette.foreground,
    "--card": palette.card,
    "--card-foreground": palette.cardForeground,
    "--primary": palette.primary,
    "--primary-foreground": palette.primaryForeground,
    "--secondary": palette.secondary,
    "--secondary-foreground": palette.secondaryForeground,
    "--accent": palette.accent,
    "--accent-foreground": palette.accentForeground,
    "--muted": palette.muted,
    "--muted-foreground": palette.mutedForeground,
    "--border": palette.border,
    "--input": palette.border,
    "--ring": palette.ring,
    "--selva": palette.territory,
    "--selva-foreground": palette.territoryForeground,
    "--brand-primary-strong": `color-mix(in oklab, ${palette.primary}, black 24%)`,
    "--brand-territory-deep": `color-mix(in oklab, ${palette.territory}, black 18%)`,
    "--brand-surface-soft": `color-mix(in oklab, ${palette.background}, ${palette.secondary} 45%)`,
  } as CSSProperties;
}

export function aluxPaletteStyle(palette: AluxPalette): CSSProperties {
  return {
    "--alux": palette.primary,
    "--alux-foreground": palette.primaryForeground,
    "--alux-surface": palette.surface,
    "--alux-surface-foreground": palette.surfaceForeground,
    "--alux-accent": palette.accent,
    "--alux-accent-foreground": palette.accentForeground,
    "--alux-border": palette.border,
    "--alux-ring": palette.ring,
    "--badge-alux": palette.badge,
    "--badge-alux-fg": palette.badgeForeground,
  } as CSSProperties;
}
