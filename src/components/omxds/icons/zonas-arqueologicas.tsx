/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: zonas-arqueologicas. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function ZonasArqueologicasGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M2.6 20.4h18.8" />
      <path d="M5.6 20.4v-4.2h12.8v4.2" />
      <path d="M7.8 16.2V12h8.4v4.2" />
      <path d="M10 12V7.8h4V12" />
      <path d="M12 20.4V12" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M6 19.2h1.6V18h1.6v1.2h1.6V18h1.6v1.2" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
