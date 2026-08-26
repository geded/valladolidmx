/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: eventos. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function EventosGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2.4" />
      <path d="M3 10.2h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path
            d="M6.5 17.4h1.8v-1.4h1.8v1.4h1.8v-1.4h1.8v1.4h1.8"
            stroke={secondary}
            strokeWidth="1.1"
          />
        </g>
      ) : null}
    </g>
  );
}
