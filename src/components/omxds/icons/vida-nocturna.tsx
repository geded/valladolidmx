/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: vida-nocturna. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function VidaNocturnaGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M20.4 14.6A8.6 8.6 0 0 1 9.4 3.6 8.6 8.6 0 1 0 20.4 14.6Z" />
      <path d="M16.6 4.4 17.3 6l1.6.7-1.6.7-.7 1.6-.7-1.6L14.3 6.7 15.9 6Z" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M4.4 21.8H6v-1.2h1.6v1.2h1.6" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
