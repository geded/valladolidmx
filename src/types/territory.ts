/**
 * territory.ts — Jerarquía territorial (alineada con 11.1 y 11.5).
 * País → Estado → Región turística → Destino → Zona.
 * snake_case + UUID. Listo para mapear a Postgres en Fase 1.
 */

export type UUID = string;

export interface Country {
  id: UUID;
  code: string;
  name: string;
}

export interface StateRegion {
  id: UUID;
  country_code: string;
  code: string;
  name: string;
}

export interface TourismRegion {
  id: UUID;
  slug: string;
  name: string;
  country_code: string;
  state_code: string;
  short_description: string;
}

export interface Destination {
  id: UUID;
  region_id?: UUID;
  region_slug: string;
  slug: string;
  name: string;
  tagline: string;
  long_description?: string;
  hero_palette: "territorio" | "selva" | "cenote" | "atardecer";
  /**
   * URL absoluta o import resuelto (ES6 import .jpg). Cuando exista, las
   * tarjetas y micrositios renderizan fotografía real en vez del placeholder
   * gradiente. Listo para sustituirse por activos oficiales de valladolid.mx.
   */
  image_url?: string;
  highlights: readonly string[];
}

export interface DestinationZone {
  id: UUID;
  destination_id: UUID;
  slug: string;
  name: string;
}

export type BreadcrumbCrumb = {
  label: string;
  to?: string;
  params?: Record<string, string>;
};
