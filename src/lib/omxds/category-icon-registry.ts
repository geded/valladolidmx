/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 *
 * AUTORIDAD ÚNICA de iconografía de navegación turística.
 * Prohibido crear mapas paralelos, fallbacks genéricos (`Layers`) o
 * claves PascalCase como autoridad visual. Cualquier cambio de símbolo o
 * color exige una nueva autorización gobernada (PCA).
 */

export type CategoryIconVariant = "compact" | "standard";

export interface CategoryGlyphProps {
  /** Color canónico del trazo dominante (ya resuelto light/dark). */
  primary: string;
  /** Color secundario acreditado — sólo acento textil. */
  secondary: string;
  /** `true` únicamente en variante `standard`. */
  textile: boolean;
}

export interface CategoryColorPair {
  /** Valor acreditado para fondos claros (contraste gráfico ≥ 3:1). */
  light: string;
  /** Valor acreditado para fondos oscuros (contraste gráfico ≥ 3:1). */
  dark: string;
}

export interface CategoryIconEntry {
  slug: string;
  /** Etiqueta canónica en español (siempre texto HTML en el DOM). */
  label: string;
  /** Descripción del símbolo dominante — contrato inmutable. */
  symbol: string;
  /** Nombre del token cromático principal. */
  primaryToken: string;
  /** Nombre del token cromático secundario (acento textil), si aplica. */
  secondaryToken: string | null;
  /** Trazo significativo — siempre variante operativa acreditada. */
  primary: CategoryColorPair;
  /** Acento textil — puede ser un tono de baja luminancia relativa. */
  secondary: CategoryColorPair;
}

/**
 * Paleta canónica G6-S1. Los tokens `mutedPink`, `limestoneGold`,
 * `waterTurquoise` y `antiqueGold` NO alcanzan 3:1 en fondos claros y por
 * eso sólo aparecen como acento; el trazo significativo usa su variante
 * operativa acreditada (sufijo `Operativo` en la documentación).
 */
export const CATEGORY_ICON_PALETTE = Object.freeze({
  cenoteTeal: { light: "#0F6E72", dark: "#5FD1D6" },
  deepTurquoise: { light: "#0B5E63", dark: "#4FC3C9" },
  turquoise: { light: "#0E7490", dark: "#67D3E8" },
  waterTurquoise: { light: "#7FD3D8", dark: "#7FD3D8" },
  cenoteBlue: { light: "#1560A8", dark: "#79B9F0" },
  terracotta: { light: "#A8442A", dark: "#E9906F" },
  valladolidMagenta: { light: "#9B2247", dark: "#F07AA0" },
  mutedPink: { light: "#D98BA6", dark: "#D98BA6" },
  indigo: { light: "#2B3A8F", dark: "#93A4F5" },
  deepIndigo: { light: "#22265E", dark: "#8F96E8" },
  antiqueGold: { light: "#C9A227", dark: "#C9A227" },
  antiqueGoldOperativo: { light: "#8A6A12", dark: "#E2BE63" },
  colonialGold: { light: "#8A6A12", dark: "#E2BE63" },
  limestoneGold: { light: "#D8C08A", dark: "#D8C08A" },
  limestoneGoldOperativo: { light: "#8A7434", dark: "#DCC489" },
  mustard: { light: "#96700E", dark: "#E0BC5A" },
  ceibaGreen: { light: "#2F6B3A", dark: "#86C98F" },
} as const satisfies Record<string, CategoryColorPair>);

const P = CATEGORY_ICON_PALETTE;

function entry(
  slug: string,
  label: string,
  symbol: string,
  primaryToken: keyof typeof P,
  secondaryToken: keyof typeof P | null,
): CategoryIconEntry {
  return {
    slug,
    label,
    symbol,
    primaryToken,
    secondaryToken,
    primary: P[primaryToken],
    secondary: P[secondaryToken ?? primaryToken],
  };
}

/** Las 22 categorías canónicas — orden estable de catálogo. */
export const CATEGORY_ICON_REGISTRY: Readonly<Record<string, CategoryIconEntry>> = Object.freeze({
  hoteles: entry("hoteles", "Hoteles", "cama", "cenoteTeal", null),
  restaurantes: entry("restaurantes", "Restaurantes", "tenedor y cuchillo", "terracotta", null),
  destinos: entry("destinos", "Destinos", "pin", "valladolidMagenta", null),
  "casas-de-vacaciones": entry(
    "casas-de-vacaciones",
    "Casas de vacaciones",
    "casa",
    "turquoise",
    null,
  ),
  eventos: entry("eventos", "Eventos", "calendario", "indigo", "mutedPink"),
  experiencias: entry(
    "experiencias",
    "Experiencias",
    "brújula",
    "antiqueGoldOperativo",
    "antiqueGold",
  ),
  "que-hacer": entry(
    "que-hacer",
    "¿Qué hacer?",
    "lista con pin",
    "cenoteTeal",
    "valladolidMagenta",
  ),
  tours: entry("tours", "Tours", "señal direccional", "mustard", null),
  promociones: entry("promociones", "Promociones", "etiqueta", "valladolidMagenta", null),
  "zonas-arqueologicas": entry(
    "zonas-arqueologicas",
    "Zonas arqueológicas",
    "templo maya simplificado",
    "limestoneGoldOperativo",
    "limestoneGold",
  ),
  comunidades: entry(
    "comunidades",
    "Comunidades",
    "dos figuras humanas simplificadas",
    "deepTurquoise",
    null,
  ),
  cenotes: entry("cenotes", "Cenotes", "abertura circular con ondas", "cenoteBlue", null),
  rutas: entry("rutas", "Rutas", "recorrido entre dos puntos", "valladolidMagenta", null),
  artesanias: entry("artesanias", "Artesanías", "mano con pieza tejida", "terracotta", null),
  naturaleza: entry("naturaleza", "Naturaleza", "ceiba maya / ya’axché", "ceibaGreen", null),
  gastronomia: entry("gastronomia", "Gastronomía", "plato y cuchara", "terracotta", null),
  cultura: entry("cultura", "Cultura", "libro con motivo maya", "indigo", null),
  compras: entry("compras", "Compras", "bolsa", "valladolidMagenta", null),
  pueblos: entry("pueblos", "Pueblos", "casa y torre", "colonialGold", null),
  bienestar: entry("bienestar", "Bienestar", "hoja y ondas", "ceibaGreen", "waterTurquoise"),
  "vida-nocturna": entry("vida-nocturna", "Vida nocturna", "luna", "deepIndigo", null),
  mapas: entry("mapas", "Mapas", "mapa plegado", "turquoise", null),
});

export const CATEGORY_ICON_SLUGS = Object.keys(CATEGORY_ICON_REGISTRY);

/** Fondos acreditados para el gate de contraste gráfico (3:1). */
export const ACCREDITED_BACKGROUNDS = {
  light: ["#FFFFFF", "#FAF7F2"],
  dark: ["#12100E", "#1B1815"],
} as const;

/**
 * Resolución fail-closed: un slug desconocido devuelve `null`.
 * Nunca se sustituye por un símbolo genérico.
 */
export function resolveCategoryIcon(slug: string | null | undefined): CategoryIconEntry | null {
  if (!slug) return null;
  const found = CATEGORY_ICON_REGISTRY[slug] ?? null;
  if (!found && import.meta.env?.DEV) {
    console.warn(
      `[OMXDS G6-S1] Slug de categoría no registrado: "${slug}". No se renderiza ícono (fail-closed).`,
    );
  }
  return found;
}

export function isRegisteredCategory(slug: string | null | undefined): boolean {
  return Boolean(slug && slug in CATEGORY_ICON_REGISTRY);
}
