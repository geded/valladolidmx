/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: cultura. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function CulturaGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M12 6.2C10.2 4.6 7.8 3.8 5 3.8v13.6c2.8 0 5.2.8 7 2.4 1.8-1.6 4.2-2.4 7-2.4V3.8c-2.8 0-5.2.8-7 2.4Z" />
      <path d="M12 6.2v13.6" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path
            d="M8 12.4h1.6v-1.4h1.6v1.4M14.8 12.4h1.6v-1.4H18v1.4"
            stroke={secondary}
            strokeWidth="1.1"
          />
        </g>
      ) : null}
    </g>
  );
}
