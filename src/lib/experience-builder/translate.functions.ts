/**
 * Experience Builder · Auto-traducción al guardar (H5 del plan).
 *
 * Server function autenticada que recibe un `CompositionTree` del Studio
 * y devuelve el mismo árbol enriquecido con `node.i18n[locale][path]`
 * para cada campo `translatable: true` cuyo texto base haya cambiado
 * (detectado por `node.i18n._src`).
 *
 * Diseño intencional:
 *  - No escribe en BD. El Studio persiste el árbol devuelto vía
 *    `saveCompositionDraft`. Esto evita permisos especiales y mantiene
 *    el ciclo de guardado bajo control del cliente.
 *  - Falla silenciosa: si falta `LOVABLE_API_KEY`, no hay idiomas
 *    destino, la IA falla o el JSON no parsea, devolvemos el árbol tal
 *    cual con `skipped: true`. Nunca rompe el guardado.
 *  - Idempotente: sólo pide traducción para pares (nodo, path) cuyo
 *    texto base cambió o cuyo idioma destino aún no tiene traducción.
 */

import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { bootstrapBlockLibrary } from "./block-library";
import { collectNodeTranslatables } from "./i18n-overlay";
import type { CompositionNode, CompositionTree } from "./composition-tree";

bootstrapBlockLibrary();

const MODEL = "google/gemini-3-flash-preview";

function flatNodes(tree: CompositionTree): CompositionNode[] {
  const out: CompositionNode[] = [];
  const visit = (nodes: CompositionNode[]) => {
    for (const n of nodes) {
      out.push(n);
      if (n.children && n.children.length > 0) visit(n.children);
    }
  };
  visit(tree.root.children);
  return out;
}

export interface TranslateResult {
  tree: CompositionTree;
  translated: number;
  skipped: boolean;
  reason?: string;
}

export const translateCompositionTree = createServerFn({ method: "POST" })
  .inputValidator((data: { tree: CompositionTree }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<TranslateResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { tree: data.tree, translated: 0, skipped: true, reason: "no-key" };

    // Idiomas activos
    const { data: rows } = await context.supabase
      .from("platform_locales")
      .select("code, is_default, is_active")
      .eq("is_active", true);
    const locales = (rows ?? []) as Array<{ code: string; is_default: boolean }>;
    if (locales.length === 0) return { tree: data.tree, translated: 0, skipped: true, reason: "no-locales" };
    const base = locales.find((l) => l.is_default)?.code ?? "es";
    const targets = locales.map((l) => l.code).filter((c) => c !== base);
    if (targets.length === 0) return { tree: data.tree, translated: 0, skipped: true, reason: "no-targets" };

    // Clon profundo (mutamos i18n directamente sobre el clon).
    const tree: CompositionTree = JSON.parse(JSON.stringify(data.tree));
    const nodes = flatNodes(tree);

    interface NodeJob {
      node: CompositionNode;
      pending: Record<string, { text: string; locales: string[] }>;
    }
    const jobs: NodeJob[] = [];
    for (const node of nodes) {
      const items = collectNodeTranslatables(node);
      if (items.length === 0) continue;
      const i18n = (node.i18n ??= {}) as Record<string, Record<string, string>>;
      const src = (i18n._src ??= {} as Record<string, string>);
      const pending: NodeJob["pending"] = {};
      for (const { path, text } of items) {
        const changed = src[path] !== text;
        const missing = targets.filter((loc) => {
          const v = i18n[loc]?.[path];
          return changed || !v || !v.trim();
        });
        if (missing.length > 0) pending[path] = { text, locales: missing };
      }
      if (Object.keys(pending).length > 0) jobs.push({ node, pending });
    }

    if (jobs.length === 0) {
      return { tree: data.tree, translated: 0, skipped: true, reason: "up-to-date" };
    }

    const localeUnion = Array.from(
      new Set(jobs.flatMap((j) => Object.values(j.pending).flatMap((p) => p.locales))),
    );
    const payload = jobs.map((j, idx) => ({
      id: idx,
      fields: Object.fromEntries(Object.entries(j.pending).map(([path, m]) => [path, m.text])),
    }));

    const system =
      "Eres un traductor profesional para una plataforma turística mexicana. Traduce cada campo del idioma base al idioma destino conservando estrictamente: mayúsculas iniciales, puntuación final, saltos de línea, emojis y nombres propios sin traducir (Valladolid, Oriente Maya, Yucatán, Alux, México, Chichén Itzá, Cenote). Longitud similar al original (±20%). Sin comentarios ni comillas adicionales. Devuelve exclusivamente JSON válido con la forma: {\"results\":[{\"id\":<n>,\"translations\":{\"<locale>\":{\"<path>\":\"<texto>\"}}}]}.";
    const prompt =
      `Idioma base: ${base}. Idiomas destino: ${localeUnion.join(", ")}.\n\n` +
      `Entradas (id → fields por dot.path):\n\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``;

    let raw = "";
    try {
      const provider = createLovableAiGatewayProvider(key);
      const res = await generateText({ model: provider(MODEL), system, prompt });
      raw = res.text ?? "";
    } catch (e) {
      return { tree: data.tree, translated: 0, skipped: true, reason: `ai-error:${(e as Error).message}` };
    }

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { tree: data.tree, translated: 0, skipped: true, reason: "no-json" };
    let parsed: {
      results?: Array<{ id: number; translations?: Record<string, Record<string, string>> }>;
    };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { tree: data.tree, translated: 0, skipped: true, reason: "parse-error" };
    }

    let translated = 0;
    for (const r of parsed.results ?? []) {
      const job = jobs[r.id];
      if (!job) continue;
      const i18n = job.node.i18n as Record<string, Record<string, string>>;
      for (const [loc, fields] of Object.entries(r.translations ?? {})) {
        if (loc === base) continue;
        if (!targets.includes(loc)) continue;
        i18n[loc] ??= {};
        for (const [path, value] of Object.entries(fields ?? {})) {
          if (typeof value === "string" && value.trim()) {
            i18n[loc][path] = value;
            translated++;
          }
        }
      }
      // Sella el hash/valor base para no re-traducir en el próximo save.
      for (const [path, m] of Object.entries(job.pending)) {
        (i18n._src as Record<string, string>)[path] = m.text;
      }
    }

    return { tree, translated, skipped: false };
  });