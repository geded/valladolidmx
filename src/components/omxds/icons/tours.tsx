/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: tours. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function ToursGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M9 3.4V21" />
      <path d="M9 6.2h8.8L20.4 9 17.8 11.8H9" />
      <path d="M9 14h6.6l2.6 2.8-2.6 2.8" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M4.5 21.6h1.6v-1.2h1.6v1.2h1.6" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
