/**
 * Context Engine — Reglas de herencia (H-02 · I1).
 *
 * Whitelist estricta de combinaciones (previousKind, currentKind) que
 * habilitan herencia de contexto. Todo lo no listado NO hereda.
 *
 * Estas reglas son inertes en I1 (nadie las consume en rutas reales);
 * quedan documentadas para el playground y para I3+.
 */
import type { InheritanceRule } from "./types";

export const DEFAULT_INHERITANCE_RULES: readonly InheritanceRule[] = [
  // De una región a una categoría plana → conserva región.
  { from: "region", to: "category", slots: ["region"] },
  // De un destino a una categoría plana → conserva destino y su región.
  { from: "destination", to: "category", slots: ["region", "destination"] },
  // Entre categorías hermanas (hoteles → restaurantes → …) → conserva
  // región/destino heredados sin arrastrar la categoría anterior. Sin
  // esta regla la cadena Destino → Categoría → Categoría pierde el
  // territorio en el segundo salto (hallazgo I5, prueba cruzada).
  { from: "category", to: "category", slots: ["region", "destination"] },
  // De una categoría a un detalle → conserva región/destino/categoría.
  { from: "category", to: "business", slots: ["region", "destination", "category"] },
  { from: "category", to: "product", slots: ["region", "destination", "category"] },
  { from: "category", to: "hotel", slots: ["region", "destination", "category"] },
  { from: "category", to: "restaurant", slots: ["region", "destination", "category"] },
  { from: "category", to: "event", slots: ["region", "destination", "category"] },
  { from: "category", to: "experience", slots: ["region", "destination", "category"] },
  // De un destino directo a un detalle → conserva destino y región.
  { from: "destination", to: "business", slots: ["region", "destination"] },
  { from: "destination", to: "product", slots: ["region", "destination"] },
  { from: "destination", to: "event", slots: ["region", "destination"] },
  { from: "destination", to: "experience", slots: ["region", "destination"] },
  { from: "destination", to: "hotel", slots: ["region", "destination"] },
  { from: "destination", to: "restaurant", slots: ["region", "destination"] },
];

export function findInheritanceRule(
  rules: readonly InheritanceRule[],
  fromKind: string,
  toKind: string,
): InheritanceRule | undefined {
  return rules.find((r) => r.from === fromKind && r.to === toKind);
}