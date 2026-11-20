/**
 * Puente entre la composición publicada del Experience Builder y los
 * textos de sección de la ficha Premium de empresa (hoteles, restaurantes
 * y casas de vacaciones).
 *
 * Módulo PURO. No decide diseño ni estructura: la autoridad visual sigue
 * siendo `BusinessSurface`. Fail-closed: sin composición, sin bloque o con
 * campos vacíos se devuelven los textos aprobados vigentes.
 */
import type { CompositionNode, CompositionTree } from "@/lib/experience-builder/composition-tree";
import {
  BUSINESS_PREMIUM_COPY_DEFAULTS,
  resolveBusinessPremiumCopy,
  type BusinessPremiumCopy,
} from "@/components/surfaces/business-premium-copy";

export { BUSINESS_PREMIUM_BLOCK_TYPE } from "@/components/surfaces/business-premium-copy";

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
 * Resuelve los textos editables de la ficha de empresa desde el árbol
 * publicado. `null` en cualquier eslabón ⇒ textos aprobados por defecto.
 */
export function resolveBusinessPremiumCopyFromTree(
  tree: CompositionTree | null | undefined,
  blockType: string,
): BusinessPremiumCopy {
  if (!tree || !tree.root || !Array.isArray(tree.root.children)) {
    return BUSINESS_PREMIUM_COPY_DEFAULTS;
  }
  const node = findFirstNodeByType(tree, blockType);
  if (!node) return BUSINESS_PREMIUM_COPY_DEFAULTS;
  return resolveBusinessPremiumCopy((node.config ?? {}) as Record<string, unknown>);
}
