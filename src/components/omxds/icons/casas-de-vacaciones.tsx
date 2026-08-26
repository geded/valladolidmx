/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: casas-de-vacaciones. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function CasasDeVacacionesGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M3.4 11.2 12 4.2l8.6 7" />
      <path d="M5.8 10v10h12.4V10" />
      <path d="M10 20v-5.2h4V20" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M6.5 12.6h1.6v-1.2h1.6v1.2h1.6" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
