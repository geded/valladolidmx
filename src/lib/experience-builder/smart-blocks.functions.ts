/**
 * Experience Builder · Smart Blocks Resolver (Etapa 15.10.8.2,
 * remediado en G8-R1-F1J-HOME-PREMIUM-R2).
 *
 * Envoltorio delgado: toda la lógica (correspondencia contrato ↔ esquema
 * real, elegibilidad pública, URL canónica, firma de medios y caché) vive
 * en `smart-blocks.server.ts`.
 */

import { createServerFn } from "@tanstack/react-start";
import type { SmartBlockQuery } from "./block-contract";
import type { SmartBlockJsonValue, SmartBlockResolveResult } from "./smart-blocks.server";

export type { SmartBlockJsonValue, SmartBlockResolveResult };

/** Resuelve una `SmartBlockQuery` declarativa. Read-only, fail-closed. */
export const resolveSmartBlock = createServerFn({ method: "POST" })
  .inputValidator((data: { query: SmartBlockQuery }) => data)
  .handler(async ({ data }): Promise<SmartBlockResolveResult> => {
    const { resolveSmartBlockQuery } = await import("./smart-blocks.server");
    return resolveSmartBlockQuery(data.query);
  });
