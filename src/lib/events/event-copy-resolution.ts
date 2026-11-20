/**
 * Puente entre la composición publicada del Experience Builder y los
 * textos de sección de la ficha Premium de evento.
 *
 * Módulo PURO. No decide diseño ni estructura: la autoridad visual sigue
 * siendo `EventPremiumSurface`. Fail-closed: sin composición, sin bloque o
 * con campos vacíos se devuelven los textos aprobados vigentes.
 */
import type { CompositionNode, CompositionTree } from "@/lib/experience-builder/composition-tree";
import {
  EVENT_PREMIUM_COPY_DEFAULTS,
  resolveEventPremiumCopy,
  type EventPremiumCopy,
} from "@/components/surfaces/event-premium-copy";

export { EVENT_PREMIUM_BLOCK_TYPE } from "@/components/surfaces/event-premium-copy";

/** Primer nodo del tipo indicado en el árbol (recorrido en profundidad). */
function findFirstNodeByType(tree: CompositionTree, type: string): CompositionNode | null {
  const stack: CompositionNode[] = [...tree.root.children];
  while (stack.length) {
    const current = stack.shift()!;
    if (current.type === type) return current;
    if (current.children) stack.unshift(...current.children);
  }
  return null;
}

/**
 * Resuelve los textos editables de la ficha de evento desde el árbol
 * publicado. `null` en cualquier eslabón ⇒ textos aprobados por defecto.
 */
export function resolveEventPremiumCopyFromTree(
  tree: CompositionTree | null | undefined,
  blockType: string,
): EventPremiumCopy {
  if (!tree || !tree.root || !Array.isArray(tree.root.children)) {
    return EVENT_PREMIUM_COPY_DEFAULTS;
  }
  const node = findFirstNodeByType(tree, blockType);
  if (!node) return EVENT_PREMIUM_COPY_DEFAULTS;
  return resolveEventPremiumCopy((node.config ?? {}) as Record<string, unknown>);
}
