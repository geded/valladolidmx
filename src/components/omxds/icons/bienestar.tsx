/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: bienestar. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function BienestarGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M20.2 4.2c0 7.8-4.8 10.8-8.8 10.8a3.9 3.9 0 0 1-3.9-3.9c0-3.9 3.9-6.9 12.7-6.9Z" />
      <path d="M8.6 15c1.6-3.4 3.8-6.2 6.6-8.2" />
      <path d="M3.8 20.2c2-2 4-2 6 0s4 2 6 0 4-2 4.4-1.2" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M4.5 6.4h1.6V5.2h1.6v1.2" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
