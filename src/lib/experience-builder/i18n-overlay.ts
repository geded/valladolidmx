/**
 * Experience Builder · i18n overlay (H3 del plan de auto-traducción).
 *
 * Utilidades puras (importables en cliente y servidor) para:
 *  - Recolectar campos traducibles de un nodo según su `BlockContract`.
 *  - Aplicar traducciones almacenadas en `node.i18n` sobre `node.config`
 *    devolviendo una copia con los valores del idioma solicitado.
 *
 * El almacenamiento vive INLINE en el árbol (`node.i18n`) para que la
 * migración sea totalmente aditiva y retrocompatible.
 */

import type { BlockFieldSchema, BlockSchema } from "./block-contract";
import { getBlock } from "./block-registry";
import type { CompositionNode } from "./composition-tree";

function isTranslatableLeaf(field: BlockFieldSchema): boolean {
  return (field.type === "text" || field.type === "rich_text") && field.translatable === true;
}

function walk(
  schema: BlockSchema,
  value: unknown,
  prefix: string,
  out: (path: string, text: string) => void,
) {
  if (!value || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  for (const [key, field] of Object.entries(schema)) {
    const v = obj[key];
    const p = prefix ? `${prefix}.${key}` : key;
    if (isTranslatableLeaf(field)) {
      if (typeof v === "string" && v.trim()) out(p, v);
    } else if (field.type === "object" && field.fields) {
      walk(field.fields, v, p, out);
    } else if (field.type === "list" && field.item && Array.isArray(v)) {
      v.forEach((item, i) => {
        const item_field = field.item!;
        if (item_field.type === "object" && item_field.fields) {
          walk(item_field.fields, item, `${p}.${i}`, out);
        } else if (isTranslatableLeaf(item_field)) {
          if (typeof item === "string" && item.trim()) out(`${p}.${i}`, item);
        }
      });
    }
  }
}

export interface Translatable {
  path: string;
  text: string;
}

/** Devuelve la lista plana de campos traducibles con valor no vacío. */
export function collectNodeTranslatables(node: CompositionNode): Translatable[] {
  const contract = getBlock(node.type);
  if (!contract) return [];
  const items: Translatable[] = [];
  walk(contract.schema, node.config ?? {}, "", (path, text) => items.push({ path, text }));
  return items;
}

function setByPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur: unknown = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const raw = parts[i];
    const next = parts[i + 1];
    const isIdx = /^\d+$/.test(raw);
    const k: string | number = isIdx ? Number(raw) : raw;
    const container = cur as Record<string | number, unknown> | unknown[];
    let child = (container as Record<string | number, unknown>)[k];
    if (child == null || typeof child !== "object") {
      child = /^\d+$/.test(next) ? [] : {};
      (container as Record<string | number, unknown>)[k] = child;
    }
    cur = child;
  }
  const last = parts[parts.length - 1];
  const isIdx = /^\d+$/.test(last);
  (cur as Record<string | number, unknown>)[isIdx ? Number(last) : last] = value;
}

/**
 * Devuelve una copia del nodo con `config` sobreescrito por las
 * traducciones almacenadas para el `locale` indicado. Si no hay
 * traducciones aplicables, retorna el nodo original.
 */
export function applyI18nToNode(node: CompositionNode, locale: string): CompositionNode {
  const i18n = node.i18n;
  if (!i18n) return node;
  const overlay = i18n[locale];
  if (!overlay) return node;
  const entries = Object.entries(overlay).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  );
  if (entries.length === 0) return node;
  // Clonado profundo mínimo del config para no mutar el original.
  const config = JSON.parse(JSON.stringify(node.config ?? {})) as Record<string, unknown>;
  for (const [path, value] of entries) setByPath(config, path, value);
  return { ...node, config: config as CompositionNode["config"] };
}