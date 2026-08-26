/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: compras. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function ComprasGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M5 8h14l-1.2 12.1a1.1 1.1 0 0 1-1.1 1H7.3a1.1 1.1 0 0 1-1.1-1Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path
            d="M8 16.4h1.6v-1.2h1.6v1.2h1.6v-1.2h1.6v1.2"
            stroke={secondary}
            strokeWidth="1.1"
          />
        </g>
      ) : null}
    </g>
  );
}
