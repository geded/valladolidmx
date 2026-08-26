/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: pueblos. Símbolo inmutable — no editar sin PCA gobernada.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function PueblosGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M2.8 20.4h18.4" />
      <path d="M3.6 20.4v-6.8l4.8-3.8 4.8 3.8v6.8" />
      <path d="M15.6 20.4V6.6L18.3 4.4 21 6.6v13.8" />
      <path d="M7 20.4v-3.6h2.8v3.6" />
      {textile ? (
        <g data-layer="textile" opacity="0.8">
          <path d="M17 10.4h1.4V9.2h1.4v1.2" stroke={secondary} strokeWidth="1.1" />
        </g>
      ) : null}
    </g>
  );
}
