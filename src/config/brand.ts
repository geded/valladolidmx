import type { CSSProperties } from "react";

/** Identidad intercambiable del motor turístico multi-marca. */
export interface TourismBrandDefinition {
  key: string;
  name: string;
  shortName: string;
  tagline: string;
  discoveryPromise: string;
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
    accent: string;
    accentForeground: string;
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
  discoveryPromise: "Despierta en Valladolid y descubre el Oriente Maya de Yucatán",
  conciergeName: "Alux",
  logo: { src: "/logo.png", width: 470, height: 159 },
  palette: {
    background: "#fbf7ee",
    foreground: "#1c1d14",
    card: "#fffdf7",
    cardForeground: "#1c1d14",
    primary: "#eaa840",
    primaryForeground: "#1c1d14",
    secondary: "#ece4d3",
    secondaryForeground: "#1c1d14",
    accent: "#057c94",
    accentForeground: "#fbf7ee",
    muted: "#f2ece0",
    mutedForeground: "#5c6e3f",
    border: "#ded7c8",
    ring: "#eaa840",
    territory: "#234933",
    territoryForeground: "#fbf7ee",
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
  "--accent": ACTIVE_BRAND.palette.accent,
  "--accent-foreground": ACTIVE_BRAND.palette.accentForeground,
  "--muted": ACTIVE_BRAND.palette.muted,
  "--muted-foreground": ACTIVE_BRAND.palette.mutedForeground,
  "--border": ACTIVE_BRAND.palette.border,
  "--input": ACTIVE_BRAND.palette.border,
  "--ring": ACTIVE_BRAND.palette.ring,
  "--selva": ACTIVE_BRAND.palette.territory,
  "--selva-foreground": ACTIVE_BRAND.palette.territoryForeground,
} as CSSProperties;
