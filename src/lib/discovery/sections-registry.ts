/**
 * Sections Registry — 15.10.5d.2
 *
 * Single source of truth for public Discovery sections (blocks).
 * Experience Builder MUST consume exclusively this registry — no ad-hoc
 * sections, no per-page duplicates.
 *
 * Parity 1:1 — wires existing canonical section components
 * (src/components/home/*) under a declarative contract.
 */
import type { ComponentType } from "react";
import { Hero } from "@/components/home/Hero";
import { CategoriasSection } from "@/components/home/CategoriasSection";
import { DestinosSection } from "@/components/home/DestinosSection";
import { EmpresasSection } from "@/components/home/EmpresasSection";
import { RutasSection } from "@/components/home/RutasSection";
import { ResenasSection } from "@/components/home/ResenasSection";
import { ArmaTuViajeSection } from "@/components/home/ArmaTuViajeSection";
import { ConsejoAluxSection } from "@/components/home/ConsejoAluxSection";
import { EnVivoSection } from "@/components/home/EnVivoSection";

export type DiscoverySectionKind =
  | "hero"
  | "categorias"
  | "destinos"
  | "empresas"
  | "rutas"
  | "resenas"
  | "arma-tu-viaje"
  | "consejo-alux"
  | "en-vivo";

export interface DiscoverySectionDefinition<TProps = any> {
  kind: DiscoverySectionKind;
  component: ComponentType<TProps>;
  description: string;
  /** Surfaces officially authorized to consume this section. */
  surfaces: readonly string[];
}

export const DISCOVERY_SECTIONS_REGISTRY: Readonly<
  Record<DiscoverySectionKind, DiscoverySectionDefinition>
> = Object.freeze({
  hero: {
    kind: "hero",
    component: Hero as ComponentType<any>,
    description: "Hero principal de superficie pública.",
    surfaces: ["home", "landing"],
  },
  categorias: {
    kind: "categorias",
    component: CategoriasSection as ComponentType<any>,
    description: "Grid de categorías destacadas.",
    surfaces: ["home", "marketplace", "landing"],
  },
  destinos: {
    kind: "destinos",
    component: DestinosSection as ComponentType<any>,
    description: "Grid de destinos destacados.",
    surfaces: ["home", "marketplace", "oriente-maya", "landing"],
  },
  empresas: {
    kind: "empresas",
    component: EmpresasSection as ComponentType<any>,
    description: "Grid de empresas destacadas.",
    surfaces: ["home", "marketplace", "empresas", "landing"],
  },
  rutas: {
    kind: "rutas",
    component: RutasSection as ComponentType<any>,
    description: "Grid de rutas curadas.",
    surfaces: ["home", "experiencias", "arma-tu-viaje", "landing"],
  },
  resenas: {
    kind: "resenas",
    component: ResenasSection as ComponentType<any>,
    description: "Reseñas públicas destacadas.",
    surfaces: ["home", "empresas", "landing"],
  },
  "arma-tu-viaje": {
    kind: "arma-tu-viaje",
    component: ArmaTuViajeSection as ComponentType<any>,
    description: "CTA de planeación de viaje.",
    surfaces: ["home", "arma-tu-viaje", "landing"],
  },
  "consejo-alux": {
    kind: "consejo-alux",
    component: ConsejoAluxSection as ComponentType<any>,
    description: "Consejo Alux destacado.",
    surfaces: ["home", "alux", "landing"],
  },
  "en-vivo": {
    kind: "en-vivo",
    component: EnVivoSection as ComponentType<any>,
    description: "Eventos y momentos en vivo.",
    surfaces: ["home", "eventos", "landing"],
  },
});

export function getDiscoverySection(
  kind: DiscoverySectionKind,
): DiscoverySectionDefinition {
  const def = DISCOVERY_SECTIONS_REGISTRY[kind];
  if (!def) throw new Error(`[discovery/sections] Unknown section kind: ${kind}`);
  return def;
}

export function listDiscoverySectionKinds(): readonly DiscoverySectionKind[] {
  return Object.keys(DISCOVERY_SECTIONS_REGISTRY) as DiscoverySectionKind[];
}

export function listSectionsForSurface(
  surface: string,
): readonly DiscoverySectionDefinition[] {
  return Object.values(DISCOVERY_SECTIONS_REGISTRY).filter((s) =>
    s.surfaces.includes(surface),
  );
}