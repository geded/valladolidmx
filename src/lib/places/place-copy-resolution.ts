/**
 * G8-Q2D-C · Puente entre la composición publicada del Experience Builder y
 * los textos de sección de la ficha de Lugar y Atractivo.
 *
 * Módulo PURO. No decide diseño ni estructura: la autoridad visual sigue
 * siendo `PlacePremiumSurface`. Fail-closed: sin composición, sin bloque o
 * con campos vacíos se devuelven los textos aprobados vigentes.
 */
import type { CompositionNode, CompositionTree } from "@/lib/experience-builder/composition-tree";
import {
  PLACE_PREMIUM_COPY_DEFAULTS,
  resolvePlacePremiumCopy,
  type PlacePremiumCopy,
} from "@/components/place-premium/place-premium-copy";

export { PLACE_PREMIUM_BLOCK_TYPE } from "@/components/place-premium/place-premium-config";

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
 * Resuelve los textos editables de la ficha desde el árbol publicado.
 * `null` en cualquier eslabón ⇒ textos aprobados por defecto.
 */
export function resolvePlacePremiumCopyFromTree(
  tree: CompositionTree | null | undefined,
  blockType: string,
): PlacePremiumCopy {
  if (!tree || !tree.root || !Array.isArray(tree.root.children)) {
    return PLACE_PREMIUM_COPY_DEFAULTS;
  }
  const node = findFirstNodeByType(tree, blockType);
  if (!node) return PLACE_PREMIUM_COPY_DEFAULTS;
  return resolvePlacePremiumCopy((node.config ?? {}) as Record<string, unknown>);
}
