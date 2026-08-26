/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: experiencias. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function ExperienciasGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx="12" cy="12" r="8.6" />
      <path d="M15.6 8.4 13.4 13.4 8.4 15.6l2.2-5Z" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path
            d="M7 21.4h1.6v-1.2h1.6v1.2h1.6v-1.2h1.6v1.2"
            stroke={secondary}
            strokeWidth="1.1"
          />
        </g>
      ) : null}
    </g>
  );
}
