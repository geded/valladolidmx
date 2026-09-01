import type { CSSProperties } from "react";

/** Identidad intercambiable del motor turístico multi-marca. */
export interface TourismBrandDefinition {
  key: string;
  name: string;
  shortName: string;
  tagline: string;
  conciergeName: string;
  logo: { src: string; width: number; height: number };
  palette: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    ring: string;
    territory: string;
    territoryForeground: string;
  };
}

/**
 * Único punto de sustitución para Valladolid.mx, Caribe Mexicano u otra marca.
 * Las plantillas nunca deben codificar estos valores directamente.
 */
export const ACTIVE_BRAND: TourismBrandDefinition = {
  key: "valladolidmx",
  name: "Valladolid.mx",
  shortName: "Valladolid",
  tagline: "Oriente Maya de Yucatán",
  conciergeName: "Alux",
  logo: { src: "/logo.png", width: 470, height: 159 },
  palette: {
    background: "oklch(0.977 0.013 86.8)",
    foreground: "oklch(0.227 0.017 112.9)",
    card: "oklch(0.993 0.008 86.8)",
    cardForeground: "oklch(0.227 0.017 112.9)",
    primary: "oklch(0.777 0.14 74.9)",
    primaryForeground: "oklch(0.227 0.017 112.9)",
    secondary: "oklch(0.921 0.024 85.8)",
    secondaryForeground: "oklch(0.227 0.017 112.9)",
    muted: "oklch(0.945 0.018 85.8)",
    mutedForeground: "oklch(0.511 0.073 125.9)",
    border: "oklch(0.88 0.022 85.8)",
    ring: "oklch(0.777 0.14 74.9)",
    territory: "oklch(0.37 0.058 157)",
    territoryForeground: "oklch(0.977 0.013 86.8)",
  },
};

export const ACTIVE_BRAND_THEME_STYLE = {
  "--background": ACTIVE_BRAND.palette.background,
  "--foreground": ACTIVE_BRAND.palette.foreground,
  "--card": ACTIVE_BRAND.palette.card,
  "--card-foreground": ACTIVE_BRAND.palette.cardForeground,
  "--primary": ACTIVE_BRAND.palette.primary,
  "--primary-foreground": ACTIVE_BRAND.palette.primaryForeground,
  "--secondary": ACTIVE_BRAND.palette.secondary,
  "--secondary-foreground": ACTIVE_BRAND.palette.secondaryForeground,
  "--muted": ACTIVE_BRAND.palette.muted,
  "--muted-foreground": ACTIVE_BRAND.palette.mutedForeground,
  "--border": ACTIVE_BRAND.palette.border,
  "--input": ACTIVE_BRAND.palette.border,
  "--ring": ACTIVE_BRAND.palette.ring,
  "--selva": ACTIVE_BRAND.palette.territory,
  "--selva-foreground": ACTIVE_BRAND.palette.territoryForeground,
} as CSSProperties;
