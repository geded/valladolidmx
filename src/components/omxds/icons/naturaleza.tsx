/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: naturaleza. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function NaturalezaGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M12 21v-7.2" />
      <path d="M4.2 9.6C4.2 6.2 7.7 3.6 12 3.6s7.8 2.6 7.8 6c0 2.3-1.9 4.2-4.2 4.2H8.4c-2.3 0-4.2-1.9-4.2-4.2Z" />
      <path d="M9 21c1-2.2 1.6-3.2 3-3.2s2 1 3 3.2" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path
            d="M9 16.4h1.6v-1.2h1.6v1.2h1.6v-1.2h1.6v1.2"
            stroke={secondary}
            strokeWidth="1.1"
          />
        </g>
      ) : null}
    </g>
  );
}
