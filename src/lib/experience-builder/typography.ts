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
