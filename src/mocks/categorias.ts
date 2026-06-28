/**
 * mocks/categorias.ts — Categorías placeholder Fase 0.
 */
import type { Category } from "@/types/entities";

export const CATEGORIAS_MOCK: readonly Category[] = [
  { id: "22222222-aaaa-4aaa-8aaa-000000000001", slug: "experiencias", name: "Experiencias", description: "Vivencias auténticas con comunidades, cocineros y guías locales.", icon: "Sparkles", palette: "primary" },
  { id: "22222222-aaaa-4aaa-8aaa-000000000002", slug: "hoteles", name: "Hoteles", description: "Desde haciendas restauradas hasta posadas familiares.", icon: "BedDouble", palette: "primary" },
  { id: "22222222-aaaa-4aaa-8aaa-000000000003", slug: "restaurantes", name: "Restaurantes", description: "Cocina yucateca, panuchos, recados y mesa de autor.", icon: "UtensilsCrossed", palette: "atardecer" },
  { id: "22222222-aaaa-4aaa-8aaa-000000000004", slug: "cenotes", name: "Cenotes", description: "Aguas turquesa bajo la selva.", icon: "Droplets", palette: "cenote" },
  { id: "22222222-aaaa-4aaa-8aaa-000000000005", slug: "tours", name: "Tours", description: "Recorridos con expertos del territorio.", icon: "Map", palette: "primary" },
  { id: "22222222-aaaa-4aaa-8aaa-000000000006", slug: "eventos", name: "Eventos", description: "Fiestas, festivales y celebraciones del calendario maya.", icon: "PartyPopper", palette: "atardecer" },
  { id: "22222222-aaaa-4aaa-8aaa-000000000007", slug: "naturaleza", name: "Naturaleza", description: "Manglares, reservas y vida silvestre.", icon: "TreePine", palette: "selva" },
  { id: "22222222-aaaa-4aaa-8aaa-000000000008", slug: "cultura", name: "Cultura", description: "Lengua maya viva, artesanía y memoria histórica.", icon: "Landmark", palette: "primary" },
];
