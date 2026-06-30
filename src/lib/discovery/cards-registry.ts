/**
 * Cards Registry — 15.10.5d.2
 *
 * Single source of truth for public discovery cards.
 * Single Public Component Policy: every public card exists once here.
 * Content over Layout: pages compose cards declaratively via this registry;
 * visual/behavioural unification is enforced by the registry, not by pages.
 *
 * Parity 1:1 — this registry only wires existing canonical card components
 * (src/components/cards/*) under a declarative contract. No visual or
 * functional changes are introduced.
 */
import type { ComponentType } from "react";
import { EmpresaCard } from "@/components/cards/EmpresaCard";
import { DestinoCard } from "@/components/cards/DestinoCard";
import { CategoriaCard } from "@/components/cards/CategoriaCard";
import { ResenaCard } from "@/components/cards/ResenaCard";
import { RutaCard } from "@/components/cards/RutaCard";

export type DiscoveryCardKind =
  | "empresa"
  | "destino"
  | "categoria"
  | "resena"
  | "ruta";

export interface DiscoveryCardDefinition<TProps = any> {
  kind: DiscoveryCardKind;
  component: ComponentType<TProps>;
  description: string;
}

export const DISCOVERY_CARDS_REGISTRY: Readonly<
  Record<DiscoveryCardKind, DiscoveryCardDefinition>
> = Object.freeze({
  empresa: {
    kind: "empresa",
    component: EmpresaCard as ComponentType<any>,
    description: "Teaser de empresa recomendada.",
  },
  destino: {
    kind: "destino",
    component: DestinoCard as ComponentType<any>,
    description: "Teaser de destino territorial.",
  },
  categoria: {
    kind: "categoria",
    component: CategoriaCard as ComponentType<any>,
    description: "Teaser de categoría temática.",
  },
  resena: {
    kind: "resena",
    component: ResenaCard as ComponentType<any>,
    description: "Tarjeta de reseña pública.",
  },
  ruta: {
    kind: "ruta",
    component: RutaCard as ComponentType<any>,
    description: "Tarjeta de ruta curada.",
  },
});

export function getDiscoveryCard(kind: DiscoveryCardKind): DiscoveryCardDefinition {
  const def = DISCOVERY_CARDS_REGISTRY[kind];
  if (!def) throw new Error(`[discovery/cards] Unknown card kind: ${kind}`);
  return def;
}

export function listDiscoveryCardKinds(): readonly DiscoveryCardKind[] {
  return Object.keys(DISCOVERY_CARDS_REGISTRY) as DiscoveryCardKind[];
}