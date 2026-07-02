/**
 * Appearance overrides — permite ajustar tipografía, tamaño y color de
 * cualquier bloque desde el Inspector sin tocar su componente. Se guardan
 * en `config.__appearance` para no colisionar con el schema del bloque.
 */
import type { CSSProperties } from "react";

export interface BlockAppearance {
  font_family?: string;         // "display" | "body" | "script" | "system" | ""
  font_scale?: number;          // multiplicador (1 = tal cual)
  text_align?: string;          // left|center|right
  text_color?: string;          // hex/oklch
  bg_color?: string;            // hex/transparent
  padding_y?: number;           // px
  padding_x?: number;           // px
  min_height?: number;          // px (0 = auto)
  max_width?: number;           // px (0 = auto)
  radius?: number;              // px
}

export const FONT_FAMILY_OPTIONS: Array<{ value: string; label: string; css?: string }> = [
  { value: "", label: "Por defecto" },
  { value: "display", label: "Display (Fraunces)", css: '"Fraunces", serif' },
  { value: "body", label: "Cuerpo (Inter)", css: '"Inter", system-ui, sans-serif' },
  { value: "script", label: "Script (Tangerine)", css: '"Tangerine", cursive' },
  { value: "system", label: "Sistema", css: 'system-ui, -apple-system, sans-serif' },
];

function familyCss(key?: string): string | undefined {
  if (!key) return undefined;
  return FONT_FAMILY_OPTIONS.find((o) => o.value === key)?.css;
}

export function readAppearance(config: Record<string, unknown> | null | undefined): BlockAppearance {
  const raw = config?.__appearance as BlockAppearance | undefined;
  return raw && typeof raw === "object" ? raw : {};
}

export function appearanceToStyle(a: BlockAppearance): CSSProperties {
  const style: CSSProperties = {};
  const ff = familyCss(a.font_family);
  if (ff) style.fontFamily = ff;
  if (a.font_scale && a.font_scale !== 1) style.fontSize = `${a.font_scale}em`;
  if (a.text_align) style.textAlign = a.text_align as CSSProperties["textAlign"];
  if (a.text_color) style.color = a.text_color;
  if (a.bg_color) style.background = a.bg_color;
  if (a.padding_y) style.paddingTop = style.paddingBottom = a.padding_y;
  if (a.padding_x) style.paddingLeft = style.paddingRight = a.padding_x;
  if (a.min_height) style.minHeight = a.min_height;
  if (a.max_width) {
    style.maxWidth = a.max_width;
    style.marginLeft = "auto";
    style.marginRight = "auto";
  }
  if (a.radius) style.borderRadius = a.radius;
  return style;
}

export function hasAppearance(a: BlockAppearance): boolean {
  return Object.values(a).some((v) => v !== undefined && v !== "" && v !== 0);
}