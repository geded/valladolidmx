/**
 * Experience Builder · Public Reads (Etapa 15.10.3)
 *
 * Lectura pública (sin sesión) de composiciones publicadas. Se utiliza
 * desde rutas públicas como `/` (Home) y respeta:
 *
 *  - CMS First: la Home pública nace de una composición editable
 *    desde el Experience Builder, no de código hardcodeado.
 *  - Read-only: no expone escrituras ni datos de borradores.
 *  - Composition Variants Ready: acepta `variant_key` para que en
 *    etapas futuras se pueda servir una variante distinta de Home
 *    sin modificar la arquitectura del Experience Builder.
 */

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { CompositionTree } from "./composition-tree";

export interface PublishedComposition {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  page_type: string;
  variant_key: string;
  snapshot: CompositionTree;
  revision_id: string;
  revision_number: number;
  published_at: string;
}

function getPublicClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public client env missing");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Devuelve la composición publicada de la Home pública, o `null` si
 * todavía no hay ninguna. Falla cerrada: cualquier error devuelve
 * `null` para que el llamador pueda hacer fallback al Home legacy
 * (Progressive Migration).
 */
export const getPublishedHomeComposition = createServerFn({ method: "GET" })
  .inputValidator((data?: { variant_key?: string }) => data ?? {})
  .handler(async ({ data }): Promise<PublishedComposition | null> => {
    try {
      const client = getPublicClient();
      const { data: rows, error } = await client.rpc("eb_get_published_home", {
        _variant_key: data?.variant_key ?? "default",
      });
      if (error || !rows || rows.length === 0) return null;
      const row = rows[0] as unknown as PublishedComposition;
      return row;
    } catch {
      return null;
    }
  });

/**
 * Devuelve la composición publicada asociada a un slug arbitrario. Se usa
 * para renderizar públicamente cualquier página creada desde el
 * Experience Builder en `/p/<slug>`. Falla cerrada: cualquier error
 * devuelve `null`.
 */
export const getPublishedCompositionBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; variant_key?: string }) => data)
  .handler(async ({ data }): Promise<PublishedComposition | null> => {
    try {
      const client = getPublicClient();
      const { data: rows, error } = await client.rpc("eb_get_published_by_slug", {
        _slug: data.slug,
        _variant_key: data.variant_key ?? "default",
      });
      if (error || !rows || rows.length === 0) return null;
      return rows[0] as unknown as PublishedComposition;
    } catch {
      return null;
    }
  });