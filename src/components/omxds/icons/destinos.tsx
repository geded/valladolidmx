/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: destinos. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function DestinosGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M12 21.2s7-6.4 7-11.2a7 7 0 1 0-14 0c0 4.8 7 11.2 7 11.2Z" />
      <circle cx="12" cy="9.8" r="2.6" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path
            d="M7.5 21.6h1.6v-1.2h1.6v1.2h1.6v-1.2h1.6v1.2h1.6"
            stroke={secondary}
            strokeWidth="1.1"
          />
        </g>
      ) : null}
    </g>
  );
}
