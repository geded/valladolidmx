/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: comunidades. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function ComunidadesGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx="9" cy="7.8" r="2.8" />
      <path d="M3.6 19.6a5.4 5.4 0 0 1 10.8 0" />
      <circle cx="16.8" cy="9.4" r="2.2" />
      <path d="M14.8 19.6a4.4 4.4 0 0 1 5.8-4.2" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M4 22h1.6v-1.2h1.6V22h1.6" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
