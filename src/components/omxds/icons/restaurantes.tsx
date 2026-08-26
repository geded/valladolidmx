/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: restaurantes. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function RestaurantesGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M6 3v5.2a2.4 2.4 0 0 0 4.8 0V3" />
      <path d="M8.4 8.6V21" />
      <path d="M17.4 3c1.8 2.4 1.8 6 0 8.2V21" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path
            d="M4 22.2h1.6v-1.3h1.6v1.3h1.6v-1.3h1.6v1.3h1.6"
            stroke={secondary}
            strokeWidth="1.1"
          />
        </g>
      ) : null}
    </g>
  );
}
