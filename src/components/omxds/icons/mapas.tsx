/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: mapas. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function MapasGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M9 3.8 3.4 6.4v13.8L9 17.6l6 2.6 5.6-2.6V3.8L15 6.4Z" />
      <path d="M9 3.8v13.8" />
      <path d="M15 6.4v13.8" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M10.6 12.6h1.6v-1.2h1.6v1.2" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
