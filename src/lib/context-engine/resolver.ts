/**
 * Context Engine — Resolver puro (H-02 · I1).
 *
 * Compone `ResolvedContext` a partir de:
 *   1. declaración de la ruta (`RouteContextDeclaration`)
 *   2. contexto previo (opcional, filtrado por whitelist de herencia)
 *   3. `kindDefaults` de la declaración (fallback)
 *
 * Pura: sin side effects, sin acceso a `window`. Determinística.
 */
import {
  DEFAULT_INHERITANCE_RULES,
  findInheritanceRule,
} from "./inheritance-rules";
import type {
  ContextNode,
  ContextSource,
  InheritanceRule,
  PreviousContext,
  ResolvedContext,
  RouteContextDeclaration,
} from "./types";

type Slot = "region" | "destination" | "category";

function pickSlot(
  slot: Slot,
  nodes: readonly ContextNode[],
): ContextNode | undefined {
  return nodes.find((n) => n.kind === slot);
}

function dedupeByKindSlug(nodes: readonly ContextNode[]): ContextNode[] {
  const seen = new Set<string>();
  const out: ContextNode[] = [];
  for (const n of nodes) {
    const key = `${n.kind}:${n.slug ?? n.href ?? n.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

export interface ResolveOptions {
  readonly declaration: RouteContextDeclaration;
  readonly previous?: PreviousContext;
  readonly rules?: readonly InheritanceRule[];
}

export interface ResolveResult {
  readonly context: ResolvedContext;
  readonly inheritedSlots: readonly Slot[];
  readonly usedFallback: boolean;
}

export function resolveContext(opts: ResolveOptions): ResolveResult {
  const { declaration, previous } = opts;
  const rules = opts.rules ?? DEFAULT_INHERITANCE_RULES;

  const explicitAncestors = declaration.ancestors ?? [];
  const inheritedSlots: Slot[] = [];
  const inheritedNodes: ContextNode[] = [];

  const inheritRequest = declaration.inherit ?? [];
  if (previous && inheritRequest.length > 0) {
    const rule = findInheritanceRule(rules, previous.from.kind, declaration.current.kind);
    if (rule) {
      const pool: readonly ContextNode[] = [previous.from, ...previous.ancestors];
      for (const slot of inheritRequest) {
        if (!rule.slots.includes(slot)) continue;
        // no pisar slots ya declarados por la ruta
        if (pickSlot(slot, explicitAncestors)) continue;
        const found = pickSlot(slot, pool);
        if (found) {
          inheritedNodes.push(found);
          inheritedSlots.push(slot);
        }
      }
    }
  }

  let ancestors: ContextNode[] = dedupeByKindSlug([
    ...inheritedNodes,
    ...explicitAncestors,
  ]);

  let usedFallback = false;
  if (ancestors.length === 0 && declaration.kindDefaults && declaration.kindDefaults.length > 0) {
    ancestors = dedupeByKindSlug([...declaration.kindDefaults]);
    usedFallback = true;
  }

  // orden canónico: region → destination → category → resto por orden dado
  const rank: Record<string, number> = { region: 0, destination: 1, category: 2 };
  ancestors = [...ancestors].sort((a, b) => {
    const ra = rank[a.kind] ?? 99;
    const rb = rank[b.kind] ?? 99;
    return ra - rb;
  });

  const region = pickSlot("region", ancestors);
  const destination = pickSlot("destination", ancestors);
  const category = pickSlot("category", ancestors);
  const parent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : undefined;

  const source: ContextSource = usedFallback
    ? "kind-default"
    : inheritedNodes.length > 0 && explicitAncestors.length > 0
      ? "composed"
      : inheritedNodes.length > 0
        ? "inherited"
        : "route";

  const context: ResolvedContext = {
    current: declaration.current,
    ancestors,
    region,
    destination,
    category,
    parent,
    canonical: declaration.canonical,
    previous,
    related: declaration.related ?? [],
    source,
  };

  return { context, inheritedSlots, usedFallback };
}