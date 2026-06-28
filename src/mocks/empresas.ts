/**
 * mocks/empresas.ts — Empresas teaser placeholder Fase 0.
 * En Fase 4 se reemplazan por el Motor de Visibilidad Inteligente.
 */
import type { BusinessTeaser } from "@/types/entities";

export const EMPRESAS_MOCK: readonly BusinessTeaser[] = [
  { id: "55555555-aaaa-4aaa-8aaa-000000000001", slug: "hacienda-selva-maya", name: "Hacienda Selva Maya", category_slug: "hoteles", destination_slug: "valladolid", tagline: "Hacienda henequenera restaurada con cenote propio.", palette: "selva" },
  { id: "55555555-aaaa-4aaa-8aaa-000000000002", slug: "cocina-de-doña-elsa", name: "Cocina de Doña Elsa", category_slug: "restaurantes", destination_slug: "valladolid", tagline: "Recados, panuchos y relleno negro en mesa de barrio.", palette: "atardecer" },
  { id: "55555555-aaaa-4aaa-8aaa-000000000003", slug: "manglar-expediciones", name: "Manglar Expediciones", category_slug: "tours", destination_slug: "rio-lagartos", tagline: "Recorridos guiados por la reserva y la noche bioluminiscente.", palette: "cenote" },
  { id: "55555555-aaaa-4aaa-8aaa-000000000004", slug: "taller-de-bordado-uayma", name: "Taller de Bordado Uayma", category_slug: "cultura", destination_slug: "uayma", tagline: "Aprende hipil y punto de cruz con maestras locales.", palette: "territorio" },
];
