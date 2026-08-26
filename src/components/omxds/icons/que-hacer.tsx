/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: que-hacer. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function QueHacerGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M4 6.4h9" />
      <path d="M4 12h6.6" />
      <path d="M4 17.6h6" />
      <path d="M18 21.4s3.4-3.6 3.4-5.9a3.4 3.4 0 1 0-6.8 0c0 2.3 3.4 5.9 3.4 5.9Z" />
      <circle cx="18" cy="15.4" r="1.1" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M4 21.6h1.6v-1.2h1.6v1.2h1.6" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
