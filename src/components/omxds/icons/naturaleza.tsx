/**
 * OMXDS G6-S1 · Universal Tourism Iconography with Yucatecan Textile Accent v1.0
 * Categoría canónica: naturaleza. Símbolo inmutable — no editar sin PCA gobernada.
 *
 * G6-S1-A · D-G6-01 — Alternativa B: ceiba / ya’axché con copa escalonada
 * en tres niveles horizontales (16 / 12 / 7 unidades de ancho, separación
 * negativa ≥ 2.2 u), tronco central continuo y dominante, bifurcación
 * superior mínima y tres raíces tabulares abiertas. Copa horizontal —
 * nunca ovalada. Sin hongo, globo, brócoli, pino ni paisaje.
 */
import type { CategoryGlyphProps } from "@/lib/omxds/category-icon-registry";

export function NaturalezaGlyph({ primary, secondary, textile }: CategoryGlyphProps) {
  return (
    <g stroke={primary} strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* Copa escalonada · nivel 3 (superior, 7 u) */}
      <path d="M8.5 5.4h7" strokeWidth="2.2" />
      {/* Copa escalonada · nivel 2 (medio, 12 u) — separación 2.2 u */}
      <path d="M6 7.6h12" strokeWidth="2.2" />
      {/* Copa escalonada · nivel 1 (inferior, 16 u) — separación 2.2 u */}
      <path d="M4 9.8h16" strokeWidth="2.2" />
      {/* Bifurcación superior mínima bajo la copa */}
      <path d="M12 11.6 10.3 10.2M12 11.6l1.7-1.4" strokeWidth="1.4" />
      {/* Tronco central continuo y dominante */}
      <path d="M12 10.2v9.4" strokeWidth="2" />
      {/* Tres raíces tabulares abiertas */}
      <path d="M12 19.6 8.2 21.4M12 19.6v1.9M12 19.6l3.8 1.8" strokeWidth="1.6" />
      {textile ? (
        <g data-layer="textile" opacity="0.75">
          {/* Acento textil subordinado bajo la copa, flanqueando el tronco */}
          <path
            d="M7.8 12.9h1.2l.8-1.1.8 1.1h.4M13 12.9h.4l.8-1.1.8 1.1h1.2"
            stroke={secondary}
            strokeWidth="1"
          />

        </g>
      ) : null}
    </g>
  );
}
