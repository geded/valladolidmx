/**
 * Experience Builder · Composition Tree (Etapa 15.10.2)
 *
 * Modelo canónico del árbol de composición consumido por el Renderer
 * Universal y por el Studio. Es deliberadamente **agnóstico** del tipo
 * de página (Home, Landing, Destino, etc.) — un mismo árbol puede
 * representar cualquier superficie pública futura.
 */

export interface CompositionNode {
  /** Identificador estable dentro del árbol (se genera en el Studio). */
  id: string;
  /** Tipo de bloque registrado en el Block Registry. */
  type: string;
  /** Versión semántica del contrato del bloque. */
  version: string;
  /**
   * Configuración validada contra el `schema` del Block Contract.
   * `any` permite que la estructura cruce la frontera de serialización
   * de `createServerFn` sin perder tipado en su uso de dominio.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
  /**
   * Hijos del bloque (solo aplica a bloques contenedor reconocidos por el
   * Layout Engine). Layout y contenido están desacoplados: cualquier bloque
   * puede ser hijo de cualquier contenedor compatible.
   */
  children?: CompositionNode[];
}

export interface CompositionTree {
  root: {
    children: CompositionNode[];
  };
  chrome?: {
    header?: Record<string, unknown>;
    footer?: Record<string, unknown>;
  };
}

export const EMPTY_TREE: CompositionTree = { root: { children: [] } };

/** Genera un identificador de nodo estable, sin dependencias externas. */
export function newNodeId(): string {
  return `n_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/** Recorrido profundo (mutaciones inmutables) de un árbol. */
export function mapTree(
  tree: CompositionTree,
  fn: (node: CompositionNode) => CompositionNode | null,
): CompositionTree {
  const walk = (nodes: CompositionNode[]): CompositionNode[] =>
    nodes
      .map((n) => {
        const mapped = fn(n);
        if (!mapped) return null;
        return mapped.children
          ? { ...mapped, children: walk(mapped.children) }
          : mapped;
      })
      .filter((n): n is CompositionNode => n !== null);
  return { root: { children: walk(tree.root.children) } };
}

/** Localiza un nodo por id (devuelve referencia + ruta). */
export function findNode(
  tree: CompositionTree,
  id: string,
): CompositionNode | null {
  const stack: CompositionNode[] = [...tree.root.children];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur.id === id) return cur;
    if (cur.children) stack.push(...cur.children);
  }
  return null;
}

/** Inserta un nodo al final del root. */
export function appendToRoot(
  tree: CompositionTree,
  node: CompositionNode,
): CompositionTree {
  return { root: { children: [...tree.root.children, node] } };
}

/** Elimina un nodo por id (recursivamente). */
export function removeNode(
  tree: CompositionTree,
  id: string,
): CompositionTree {
  return mapTree(tree, (n) => (n.id === id ? null : n));
}

/** Duplica un nodo de root (no recursivo en jerarquía profunda en v0). */
export function duplicateRootNode(
  tree: CompositionTree,
  id: string,
): CompositionTree {
  const idx = tree.root.children.findIndex((n) => n.id === id);
  if (idx < 0) return tree;
  const clone = cloneNodeWithNewIds(tree.root.children[idx]);
  const next = [...tree.root.children];
  next.splice(idx + 1, 0, clone);
  return { root: { children: next } };
}

/** Reordena un nodo de root entre posiciones. */
export function moveRootNode(
  tree: CompositionTree,
  from: number,
  to: number,
): CompositionTree {
  const arr = [...tree.root.children];
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return tree;
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item);
  return { root: { children: arr } };
}

/** Actualiza el `config` de un nodo. */
export function updateNodeConfig(
  tree: CompositionTree,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>,
): CompositionTree {
  return mapTree(tree, (n) => (n.id === id ? { ...n, config } : n));
}

function cloneNodeWithNewIds(node: CompositionNode): CompositionNode {
  return {
    ...node,
    id: newNodeId(),
    config: { ...node.config },
    children: node.children?.map(cloneNodeWithNewIds),
  };
}