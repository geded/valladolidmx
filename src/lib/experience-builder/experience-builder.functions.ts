/**
 * Experience Builder · Server Functions (Etapa 15.10.1)
 *
 * Endpoints mínimos de gobernanza:
 *  - listBlockLibrary: lectura del catálogo persistido (editor/admin).
 *  - syncBlockLibrary: sincroniza el catálogo declarado en código a las
 *    tablas `block_definitions` / `block_versions` vía la RPC
 *    `eb_register_block` (admin only). Emite eventos BEA editoriales.
 *
 * En esta etapa NO se entrega editor visual, ni renderer, ni superficies
 * editables. Estos endpoints son la única interfaz operativa del Experience
 * Builder por ahora.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { INITIAL_BLOCK_LIBRARY } from "./block-library";

/** Lista la Block Library persistida (catálogo activo). */
export const listBlockLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("eb_list_block_library");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Sincroniza el catálogo declarado en código a la base.
 * Requiere rol `admin` (verificado por la RPC `eb_register_block`).
 * Cada llamada emite `Block.Registered` o `Block.VersionPublished` en
 * `content_audit_log`.
 */
export const syncBlockLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const results: Array<{ type: string; ok: boolean; error?: string }> = [];

    for (const c of INITIAL_BLOCK_LIBRARY) {
      const { error } = await context.supabase.rpc("eb_register_block", {
        _type: c.type,
        _category: c.category,
        _display_name: c.display_name,
        _description: c.description ?? "",
        _version: c.version,
        _schema: c.schema as never,
        _capabilities: (c.capabilities ?? {}) as never,
        _data_sources: (c.data_sources ?? []) as never,
        _constraints: (c.constraints ?? {}) as never,
        _responsive: (c.responsive ?? {}) as never,
        _i18n: (c.i18n ?? {}) as never,
      });
      results.push({ type: c.type, ok: !error, error: error?.message });
    }

    const failed = results.filter((r) => !r.ok);
    return {
      total: results.length,
      succeeded: results.length - failed.length,
      failed: failed.length,
      details: results,
    };
  });