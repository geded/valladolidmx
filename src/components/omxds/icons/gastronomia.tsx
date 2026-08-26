/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: gastronomia. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function GastronomiaGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx="10.6" cy="12" r="7.2" />
      <circle cx="10.6" cy="12" r="3.4" />
      <ellipse cx="19.6" cy="6.4" rx="1.7" ry="2.6" />
      <path d="M19.6 9V20" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M4.6 21.8h1.6v-1.2h1.6v1.2h1.6" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
