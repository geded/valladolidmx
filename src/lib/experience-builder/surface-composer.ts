/**
 * Experience Builder · Surface Composer (US-R3 · Sub-ola 2.6).
 *
 * Motor declarativo para componer superficies nuevas usando exclusivamente
 * bloques `vmx.kit.*` (Surface Kit). Es la "máquina que hace páginas":
 * en lugar de escribir un módulo React por cada tipo (Event, Hotel,
 * Experience, ...), se declara una lista tipada de bloques neutros y el
 * Composer produce un `CompositionTree` listo para el Studio, el
 * `CompositionRenderer` y para guardarse como semilla/template.
 *
 * Reglas Sub-ola 2.6:
 *  - Sólo acepta bloques `vmx.kit.*` (whitelist). Cualquier otro type
 *    lanza — así garantizamos que "extender ≠ reemplazar" y que
 *    Business/Product no se ven afectados.
 *  - No toca `CompositionRenderer`, `preview-registry`, `block-library`
 *    ni ningún tipo `vmx.business.*` / `vmx.product.*`.
 *  - El árbol resultante es idéntico en forma al que produce el Studio,
 *    de modo que puede persistirse como composición o marcarse como
 *    template (`eb_mark_composition_as_template`) sin transformaciones
 *    extra.
 *  - ViewModel-only: el Composer no conoce entidades. Recibe `config`
 *    plano para cada bloque, exactamente como lo escribiría el editor.
 */
import { KIT_BLOCK_CONTRACTS } from "./kit-blocks";
import {
  EMPTY_TREE,
  newNodeId,
  type CompositionNode,
  type CompositionTree,
} from "./composition-tree";

/** Set de tipos permitidos (derivado del contrato Kit, no hardcoded). */
const KIT_TYPES: ReadonlySet<string> = new Set(
  KIT_BLOCK_CONTRACTS.map((c) => c.type),
);

/** Devuelve la versión declarada por el contrato, o "1.0.0" como fallback. */
function versionFor(type: string): string {
  const c = KIT_BLOCK_CONTRACTS.find((x) => x.type === type);
  return c?.version ?? "1.0.0";
}

/** Especificación mínima de un bloque a componer. */
export interface KitBlockSpec {
  /** Tipo `vmx.kit.*` (se valida contra la whitelist). */
  readonly type: string;
  /** Config plano, tal como el Studio lo persiste. */
  readonly config?: Record<string, unknown>;
  /** Marcar oculto en producción (visible en el editor). */
  readonly hidden?: boolean;
  /** Id estable opcional (útil para semillas deterministas). */
  readonly id?: string;
}

/** Composer inmutable — encadenable, sin efectos secundarios. */
export class SurfaceComposer {
  private constructor(
    private readonly _nodes: readonly CompositionNode[],
    private readonly _chrome: CompositionTree["chrome"],
  ) {}

  /** Crea un composer vacío. */
  static create(): SurfaceComposer {
    return new SurfaceComposer([], undefined);
  }

  /**
   * Agrega un bloque `vmx.kit.*` al final del árbol.
   * Lanza si `type` no pertenece al Surface Kit — evita filtraciones de
   * `vmx.business.*` / `vmx.product.*` en composiciones nuevas.
   */
  add(spec: KitBlockSpec): SurfaceComposer {
    if (!KIT_TYPES.has(spec.type)) {
      throw new Error(
        `SurfaceComposer: el tipo "${spec.type}" no es un bloque vmx.kit.*. ` +
          `Sub-ola 2.6 sólo admite bloques del Surface Kit; extender ≠ reemplazar.`,
      );
    }
    const node: CompositionNode = {
      id: spec.id ?? newNodeId(),
      type: spec.type,
      version: versionFor(spec.type),
      config: spec.config ? { ...spec.config } : {},
      ...(spec.hidden ? { hidden: true } : {}),
    };
    return new SurfaceComposer([...this._nodes, node], this._chrome);
  }

  /** Atajo: agrega varios bloques en orden. */
  addAll(specs: readonly KitBlockSpec[]): SurfaceComposer {
    return specs.reduce<SurfaceComposer>((acc, s) => acc.add(s), this);
  }

  /** Configura el chrome (header/footer/seo) — opcional. */
  withChrome(chrome: CompositionTree["chrome"]): SurfaceComposer {
    return new SurfaceComposer(this._nodes, chrome);
  }

  /** Cuenta de bloques agregados (útil en tests/UI). */
  get length(): number {
    return this._nodes.length;
  }

  /** Serializa a un `CompositionTree` canónico. */
  build(): CompositionTree {
    if (this._nodes.length === 0 && !this._chrome) return EMPTY_TREE;
    return {
      root: { children: [...this._nodes] },
      ...(this._chrome ? { chrome: this._chrome } : {}),
    };
  }
}

/**
 * Valida que un `CompositionTree` fue construido exclusivamente con
 * bloques `vmx.kit.*` (ignora chrome). Útil como regresión y como
 * pre-check antes de guardar una semilla.
 */
export function isKitOnlyTree(tree: CompositionTree): boolean {
  const walk = (nodes?: CompositionNode[]): boolean =>
    (nodes ?? []).every(
      (n) => KIT_TYPES.has(n.type) && walk(n.children),
    );
  return walk(tree.root.children);
}

/** Lista los tipos válidos del Kit (whitelist en vivo del contrato). */
export function listKitTypes(): readonly string[] {
  return [...KIT_TYPES];
}