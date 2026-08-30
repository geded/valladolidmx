/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: promociones. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function PromocionesGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M20.4 12.6 12.6 20.4a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1-.6-1.5V4.6A1.6 1.6 0 0 1 4.6 3h8.1a2 2 0 0 1 1.4.6l6.3 6.3a2 2 0 0 1 0 2.7Z" />
      <circle cx="7.6" cy="7.6" r="1.4" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M9 17.4h1.6v-1.2h1.6v1.2h1.6" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
