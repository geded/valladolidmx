/**
 * entities.ts — Entidades de negocio (placeholder Fase 0).
 */

import type { UUID } from "./territory";

export interface Category {
  id: UUID;
  slug: string;
  name: string;
  description: string;
  icon: string;
  palette: "primary" | "selva" | "cenote" | "atardecer";
}

export interface SuggestedRoute {
  id: UUID;
  slug: string;
  name: string;
  duration_days: number;
  summary: string;
  destination_slugs: readonly string[];
  palette: "territorio" | "selva" | "cenote" | "atardecer";
}

export interface Review {
  id: UUID;
  author_name: string;
  author_origin: string;
  rating: number;
  body: string;
  locale: string;
  created_at: string;
}

export interface BusinessTeaser {
  id: UUID;
  slug: string;
  name: string;
  category_slug: string;
  destination_slug: string;
  tagline: string;
  palette: "territorio" | "selva" | "cenote" | "atardecer";
}
