/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: artesanias. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function ArtesaniasGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M8.4 21v-3.6l-2.6-2.6a1.7 1.7 0 0 1 2.4-2.4l1.6 1.6V5.2a1.5 1.5 0 0 1 3 0v6" />
      <path d="M13.4 11.2V4.6a1.5 1.5 0 0 1 3 0V13" />
      <rect x="15.4" y="3.2" width="5.4" height="5.4" rx="1" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M16 5.9h4.2M18.1 3.4v5" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
