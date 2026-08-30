/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: hoteles. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function HotelesGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M3 17v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" />
      <path d="M3 17h18" />
      <path d="M4 20v-3" />
      <path d="M20 20v-3" />
      <path d="M6.5 11V8.4a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1V11" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M5 19.3h1.6V18h1.6v1.3h1.6V18h1.6v1.3" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
