/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: rutas. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function RutasGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx="5.4" cy="18.2" r="2.4" />
      <circle cx="18.6" cy="5.8" r="2.4" />
      <path d="M7.6 16.6c3.4-1.6 2.4-4.6 4.8-5.8s3.6-.6 4.6-2.4" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M9 21.8h1.6v-1.2h1.6v1.2h1.6" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
