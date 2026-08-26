/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: cenotes. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function CenotesGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <ellipse cx="12" cy="7.6" rx="7.2" ry="3.4" />
      <path d="M5.4 13c2.2 1.6 4.4 1.6 6.6 0s4.4-1.6 6.6 0" />
      <path d="M6.4 17.4c1.9 1.4 3.7 1.4 5.6 0s3.7-1.4 5.6 0" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path
            d="M7 21.6h1.6v-1.2h1.6v1.2h1.6v-1.2h1.6v1.2"
            stroke={secondary}
            strokeWidth="1.1"
          />
        </g>
      ) : null}
    </g>
  );
}
