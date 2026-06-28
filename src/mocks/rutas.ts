/**
 * mocks/rutas.ts — Rutas sugeridas placeholder Fase 0.
 */
import type { SuggestedRoute } from "@/types/entities";

export const RUTAS_MOCK: readonly SuggestedRoute[] = [
  {
    id: "33333333-aaaa-4aaa-8aaa-000000000001",
    slug: "valladolid-ek-balam",
    name: "Cenotes y jaguares",
    duration_days: 3,
    summary: "Tres días entre Valladolid y Ek Balam: cenotes ocultos, mercado local y la acrópolis al amanecer.",
    destination_slugs: ["valladolid", "ek-balam"],
    palette: "selva",
  },
  {
    id: "33333333-aaaa-4aaa-8aaa-000000000002",
    slug: "costa-rosada",
    name: "Costa rosada",
    duration_days: 2,
    summary: "Río Lagartos y Las Coloradas: flamencos, salineras rosadas y atardeceres frente al Golfo.",
    destination_slugs: ["rio-lagartos", "las-coloradas"],
    palette: "atardecer",
  },
  {
    id: "33333333-aaaa-4aaa-8aaa-000000000003",
    slug: "pueblos-coloniales",
    name: "Pueblos coloniales",
    duration_days: 4,
    summary: "Valladolid, Uayma e Izamal: arquitectura, conventos y talleres artesanos.",
    destination_slugs: ["valladolid", "uayma", "izamal"],
    palette: "territorio",
  },
];
