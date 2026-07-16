/**
 * U-VISUAL · V4 — `vmx.experience.map` · Types (render-only).
 *
 * C2.F1 Piloto (Render-Only Block Contracts). Este archivo es la
 * fuente única de tipos del bloque y NO importa Zod. El renderer
 * público y todos los adapters consumen exclusivamente estos tipos.
 *
 * Los schemas Zod de `contract.ts` deben mantenerse equivalentes a
 * estos tipos (enforced por `satisfies z.ZodType<T>` en contract.ts).
 */

export const EXPERIENCE_MAP_CONTRACT_VERSION = "1.0.0" as const;

export type ExperienceMapVariant =
  | "single"
  | "multi"
  | "list-sync"
  | "cluster";

export type ExperienceMapEntityKind =
  | "business"
  | "product"
  | "destination"
  | "event"
  | "promotion";

export interface ExperienceMapPoint {
  id: string;
  kind: ExperienceMapEntityKind;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string | null;
  href?: string | null;
  thumbUrl?: string | null;
  badge?: string | null;
  priceLabel?: string | null;
}

export interface ExperienceMapCapabilities {
  showDistance: boolean;
  showDirections: boolean;
  clustering: boolean;
  syncList: boolean;
  staticFallback: boolean;
  allowInteractiveToggle: boolean;
}

export interface ExperienceMapCenter {
  lat: number;
  lng: number;
  zoom: number;
}

export interface ExperienceMapDTO {
  variant: ExperienceMapVariant;
  heading?: string | null;
  center?: ExperienceMapCenter | null;
  points: ExperienceMapPoint[];
  capabilities: ExperienceMapCapabilities;
  emptyMessage?: string | null;
}