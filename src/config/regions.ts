/**
 * regions.ts — Catálogo de regiones turísticas (multi-región ready).
 * Hoy sólo existe Oriente Maya; la estructura permite agregar más
 * sin tocar componentes.
 */

import type { TourismRegion } from "@/types/territory";

export const ORIENTE_MAYA: TourismRegion = {
  id: "0b3a3c0c-1f0a-4c8a-9a4e-4a9d8a8e1a01",
  slug: "oriente-maya",
  name: "Oriente Maya",
  country_code: "MX",
  state_code: "YUC",
  short_description:
    "Una ruta cultural y natural por el oriente de Yucatán: ciudades coloniales, cenotes, ruinas mayas y pueblos vivos.",
};

export const TOURISM_REGIONS: readonly TourismRegion[] = [ORIENTE_MAYA];
