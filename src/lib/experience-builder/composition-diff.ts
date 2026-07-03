/**
 * Experience Builder · Diff resumen de composiciones (US-C 15.10.9)
 *
 * Compara dos árboles a nivel de secciones (hijos de `root`) para
 * mostrar al editor qué se añade, modifica, elimina u oculta antes de
 * confirmar la publicación. Trabaja por `id` estable y hashea la
 * configuración de cada sección para detectar cambios de contenido sin
 * descargar diffs profundos.
 */

import type { CompositionNode, CompositionTree } from "./composition-tree";

export type SectionChangeKind = "added" | "removed" | "modified" | "reordered" | "visibility";

export interface SectionChange {
  kind: SectionChangeKind;
  id: string;
  type: string;
  /** Etiqueta legible (display_name del bloque). */
  label: string;
  /** Extra info para `visibility`: si quedó oculto o visible. */
  hidden?: boolean;
  /** Extra info para `reordered`: posición previa → nueva. */
  from?: number;
  to?: number;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
}

function sectionHash(node: CompositionNode): string {
  // Excluye `hidden` (se reporta por separado) y `_src` del i18n para
  // que un cambio de visibilidad o retraducción no aparezca como "modified".
  const { hidden: _hidden, ...rest } = node;
  return canonicalize(rest);
}

export function diffCompositions(
  published: CompositionTree | null,
  draft: CompositionTree,
  labelFor: (type: string) => string,
): SectionChange[] {
  const prev = published?.root?.children ?? [];
  const next = draft?.root?.children ?? [];

  const prevById = new Map(prev.map((n, i) => [n.id, { node: n, index: i }] as const));
  const nextById = new Map(next.map((n, i) => [n.id, { node: n, index: i }] as const));

  const changes: SectionChange[] = [];

  // Added / modified / visibility / reordered
  for (const [id, { node, index }] of nextById) {
    const prior = prevById.get(id);
    const label = labelFor(node.type);
    if (!prior) {
      changes.push({ kind: "added", id, type: node.type, label });
      continue;
    }
    const wasHidden = !!prior.node.hidden;
    const isHidden = !!node.hidden;
    if (wasHidden !== isHidden) {
      changes.push({ kind: "visibility", id, type: node.type, label, hidden: isHidden });
    }
    if (sectionHash(prior.node) !== sectionHash(node)) {
      changes.push({ kind: "modified", id, type: node.type, label });
    } else if (prior.index !== index) {
      changes.push({ kind: "reordered", id, type: node.type, label, from: prior.index, to: index });
    }
  }

  // Removed
  for (const [id, { node }] of prevById) {
    if (!nextById.has(id)) {
      changes.push({ kind: "removed", id, type: node.type, label: labelFor(node.type) });
    }
  }

  return changes;
}