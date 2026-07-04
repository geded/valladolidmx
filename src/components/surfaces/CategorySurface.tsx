/**
 * CategorySurface — E2 · US-E2.3
 *
 * Contexto complementario para hidratar el bloque oficial
 * `vmx.experience.related-collection` cuando `source: "category"` desde
 * la superficie territorial `/oriente-maya/:destino/:categoria`.
 *
 * No renderiza UI: la superficie completa vive hoy en el route file.
 * Se mantiene independiente por si futuras evoluciones consolidan una
 * plantilla `CategorySurface` (Plantilla Madre Categoría) — el
 * contrato del contexto ya estaría estable.
 */
import { createContext } from "react";
import type { CategoryRelatedDTO } from "@/lib/catalog/category-related.functions";

export interface CategorySurfaceRelatedValue {
  destinationSlug: string;
  categorySlug: string;
  related: CategoryRelatedDTO | null;
}

export const CategorySurfaceRelatedContext =
  createContext<CategorySurfaceRelatedValue | null>(null);

export function CategorySurfaceRelatedProvider({
  value,
  children,
}: {
  value: CategorySurfaceRelatedValue;
  children: React.ReactNode;
}) {
  return (
    <CategorySurfaceRelatedContext.Provider value={value}>
      {children}
    </CategorySurfaceRelatedContext.Provider>
  );
}