/**
 * Per-field typography overrides — Etapa 15.10.4d.
 *
 * A diferencia de `appearance.ts` (que aplica a un bloque completo), aquí
 * cada CAMPO de texto puede tener su propia tipografía, tamaño, color, peso,
 * alineación e interlínea. Se guarda en `config.__typography[fieldKey]`.
 *
 * El bloque decide qué campos honran esta overrides (ver `Hero.tsx`).
 */
import type { CSSProperties } from "react";

export interface FieldTypography {
  font_family?: string;    // "display" | "body" | "script" | "system" | ""
  font_size?: number;      // px (0/undefined = por defecto)
  font_weight?: number;    // 300..900
  line_height?: number;    // multiplicador (1.1, 1.4…)
  letter_spacing?: number; // px (puede ser negativo)
  color?: string;          // hex
  align?: string;          // left|center|right|justify
  italic?: boolean;
  uppercase?: boolean;
}

export const TYPO_FAMILIES: Array<{ value: string; label: string; css?: string }> = [
  { value: "", label: "Por defecto" },
  { value: "display", label: "Display (Fraunces)", css: '"Fraunces", serif' },
  { value: "body", label: "Cuerpo (Inter)", css: '"Inter", system-ui, sans-serif' },
  { value: "script", label: "Script (Tangerine)", css: '"Tangerine", cursive' },
  { value: "system", label: "Sistema", css: "system-ui, -apple-system, sans-serif" },
];

function familyCss(key?: string): string | undefined {
  if (!key) return undefined;
  return TYPO_FAMILIES.find((o) => o.value === key)?.css;
}

export function readFieldTypography(
  config: Record<string, unknown> | null | undefined,
  fieldKey: string,
): FieldTypography {
  const map = config?.__typography as Record<string, FieldTypography> | undefined;
  const t = map?.[fieldKey];
  return t && typeof t === "object" ? t : {};
}

export function typographyToStyle(t: FieldTypography): CSSProperties {
  const s: CSSProperties = {};
  const ff = familyCss(t.font_family);
  if (ff) s.fontFamily = ff;
  if (t.font_size) s.fontSize = `${t.font_size}px`;
  if (t.font_weight) s.fontWeight = t.font_weight;
  if (t.line_height) s.lineHeight = t.line_height;
  if (typeof t.letter_spacing === "number") s.letterSpacing = `${t.letter_spacing}px`;
  if (t.color) s.color = t.color;
  if (t.align) s.textAlign = t.align as CSSProperties["textAlign"];
  if (t.italic) s.fontStyle = "italic";
  if (t.uppercase) s.textTransform = "uppercase";
  return s;
}

export function hasTypography(t: FieldTypography): boolean {
  return Object.values(t).some((v) => v !== undefined && v !== "" && v !== 0 && v !== false);
}

/**
 * Valores tipográficos actuales por bloque y campo (heredados del CSS del
 * componente en desktop). Se muestran en el editor de tipografía como
 * referencia y como "usar valores actuales".
 */
export const BLOCK_FIELD_TYPOGRAPHY_DEFAULTS: Record<string, Record<string, FieldTypography>> = {
  "vmx.hero": {
    eyebrow: {
      font_family: "script",
      font_size: 40,
      font_weight: 400,
      line_height: 1.1,
      color: "#FFFFFF",
      align: "left",
      italic: false,
      uppercase: false,
    },
    title: {
      font_family: "display",
      font_size: 56,
      font_weight: 600,
      line_height: 1.05,
      color: "#FFFFFF",
      align: "left",
      italic: false,
      uppercase: false,
    },
    subtitle: {
      font_family: "body",
      font_size: 18,
      font_weight: 400,
      line_height: 1.5,
      color: "#FFFFFF",
      align: "left",
      italic: false,
      uppercase: false,
    },
  },

  // Sección genérica (layout.section) y todas las secciones vmx.section.*
  // usan SectionHeader (h2 36px desktop, subtitle 18px).
  "vmx.layout.section": {
    heading: { font_family: "display", font_size: 36, font_weight: 600, line_height: 1.15, color: "#0A0A0A", align: "left" },
    subheading: { font_family: "body", font_size: 18, font_weight: 400, line_height: 1.5, color: "#4B5563", align: "left" },
  },
  "vmx.section.destinos": {
    heading: { font_family: "display", font_size: 36, font_weight: 600, line_height: 1.15, color: "#0A0A0A", align: "left" },
  },
  "vmx.section.categorias": {
    heading: { font_family: "display", font_size: 36, font_weight: 600, line_height: 1.15, color: "#0A0A0A", align: "left" },
  },
  "vmx.section.rutas": {
    heading: { font_family: "display", font_size: 36, font_weight: 600, line_height: 1.15, color: "#0A0A0A", align: "left" },
  },
  "vmx.section.consejo-alux": {
    heading: { font_family: "display", font_size: 36, font_weight: 600, line_height: 1.15, color: "#0A0A0A", align: "left" },
  },
  "vmx.section.en-vivo": {
    heading: { font_family: "display", font_size: 36, font_weight: 600, line_height: 1.15, color: "#0A0A0A", align: "left" },
  },
  "vmx.section.empresas": {
    heading: { font_family: "display", font_size: 36, font_weight: 600, line_height: 1.15, color: "#0A0A0A", align: "left" },
  },
  "vmx.section.resenas": {
    heading: { font_family: "display", font_size: 36, font_weight: 600, line_height: 1.15, color: "#0A0A0A", align: "left" },
  },
  "vmx.section.arma-tu-viaje": {
    heading: { font_family: "display", font_size: 36, font_weight: 600, line_height: 1.15, color: "#FFFFFF", align: "left" },
    body: { font_family: "body", font_size: 18, font_weight: 400, line_height: 1.6, color: "#F5F5F5", align: "left" },
    cta_label: { font_family: "body", font_size: 14, font_weight: 600, color: "#FFFFFF" },
  },

  // Cockpit (títulos de KPI grid, alerts y activity stream)
  "vmx.cockpit.kpi-grid": {
    title: { font_family: "display", font_size: 22, font_weight: 600, line_height: 1.25, color: "#0A0A0A", align: "left" },
  },
  "vmx.cockpit.alerts": {
    title: { font_family: "display", font_size: 22, font_weight: 600, line_height: 1.25, color: "#0A0A0A", align: "left" },
  },
  "vmx.cockpit.activity-stream": {
    title: { font_family: "display", font_size: 22, font_weight: 600, line_height: 1.25, color: "#0A0A0A", align: "left" },
  },

  // Bloque genérico de botones — label del botón
  "vmx.actions.buttons": {
    heading: { font_family: "display", font_size: 24, font_weight: 600, line_height: 1.2, color: "#0A0A0A", align: "left" },
  },

  // Chrome global (header / footer)
  "vmx.chrome.header": {
    cta_label: { font_family: "body", font_size: 14, font_weight: 600, color: "#FFFFFF" },
  },
  "vmx.chrome.footer": {
    tagline: { font_family: "body", font_size: 14, font_weight: 400, line_height: 1.5, color: "#9CA3AF", align: "left" },
    legal_label: { font_family: "body", font_size: 12, font_weight: 400, color: "#9CA3AF" },
    privacy_label: { font_family: "body", font_size: 12, font_weight: 400, color: "#9CA3AF" },
  },
};

export function getTypographyDefaults(
  blockType: string | undefined,
): Record<string, FieldTypography> | undefined {
  if (!blockType) return undefined;
  return BLOCK_FIELD_TYPOGRAPHY_DEFAULTS[blockType];
}

export function familyLabel(key?: string): string {
  if (!key) return "Por defecto";
  return TYPO_FAMILIES.find((o) => o.value === key)?.label ?? key;
}

/**
 * Mapa por tipo de bloque: campo del schema → selector CSS que debe recibir
 * los estilos tipográficos cuando el usuario define overrides.
 * El renderer inserta un <style> con reglas atadas a un data-attribute único
 * del nodo para que no se filtren entre bloques.
 */
export const BLOCK_FIELD_SELECTORS: Record<string, Record<string, string>> = {
  "vmx.hero": {
    // Hero ya aplica per-field inline en su componente. Se mantiene el
    // mapa vacío para no duplicar reglas.
  },
  "vmx.layout.section": {
    heading: "h2",
    subheading: "header p",
  },
  "vmx.section.destinos":       { heading: "h2" },
  "vmx.section.categorias":     { heading: "h2" },
  "vmx.section.rutas":          { heading: "h2" },
  "vmx.section.consejo-alux":   { heading: "h2" },
  "vmx.section.en-vivo":        { heading: "h2" },
  "vmx.section.empresas":       { heading: "h2" },
  "vmx.section.resenas":        { heading: "h2" },
  "vmx.section.arma-tu-viaje":  { heading: "h2", body: "p", cta_label: "a" },
  "vmx.cockpit.kpi-grid":       { title: "h2, h3" },
  "vmx.cockpit.alerts":         { title: "h2, h3" },
  "vmx.cockpit.activity-stream":{ title: "h2, h3" },
  "vmx.actions.buttons":        { heading: "h2, h3" },
  "vmx.chrome.header":          { cta_label: "a" },
  "vmx.chrome.footer":          { tagline: "p:first-of-type", legal_label: "small, .legal", privacy_label: ".privacy" },
};

function cssProps(t: FieldTypography): string {
  const lines: string[] = [];
  const fam = TYPO_FAMILIES.find((o) => o.value === t.font_family)?.css;
  if (fam) lines.push(`font-family:${fam};`);
  if (t.font_size) lines.push(`font-size:${t.font_size}px;`);
  if (t.font_weight) lines.push(`font-weight:${t.font_weight};`);
  if (t.line_height) lines.push(`line-height:${t.line_height};`);
  if (typeof t.letter_spacing === "number") lines.push(`letter-spacing:${t.letter_spacing}px;`);
  if (t.color) lines.push(`color:${t.color};`);
  if (t.align) lines.push(`text-align:${t.align};`);
  if (t.italic) lines.push(`font-style:italic;`);
  if (t.uppercase) lines.push(`text-transform:uppercase;`);
  return lines.join("");
}

/**
 * Genera reglas CSS `[data-eb-typo="scopeId"] <selector> { … }` a partir de
 * los overrides tipográficos de un nodo. Devuelve "" si no hay reglas.
 */
export function buildScopedTypographyCss(
  scopeId: string,
  blockType: string,
  overrides: Record<string, FieldTypography>,
): string {
  const map = BLOCK_FIELD_SELECTORS[blockType];
  if (!map) return "";
  const parts: string[] = [];
  for (const [field, typo] of Object.entries(overrides)) {
    const sel = map[field];
    if (!sel || !typo || !hasTypography(typo)) continue;
    const decls = cssProps(typo);
    if (!decls) continue;
    // `!important` para vencer utilidades de Tailwind del componente.
    const withBang = decls.replace(/;$/g, "").split(";").map((d) => (d ? `${d} !important` : d)).join(";") + ";";
    parts.push(`[data-eb-typo="${scopeId}"] ${sel}{${withBang}}`);
  }
  return parts.join("");
}
