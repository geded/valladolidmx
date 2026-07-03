/**
 * Experience Builder · Route Resolver (US-R3 · Ola 0)
 *
 * Runtime público: dado un `pathname`, devuelve la resolución oficial
 * — redirect activo o composición publicada. Falla cerrada.
 *
 * Reglas vinculantes (R3.10..R3.13, R3.28):
 *  - Los redirects se aplican ANTES de resolver la composición.
 *  - Las cadenas se colapsan (hasta 5 hops) para evitar bucles.
 *  - Nunca lanza excepción hacia el llamador; cualquier error se
 *    traduce a `{ kind: "miss" }` para permitir fallback controlado.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type RouteResolution =
  | {
      kind: "redirect";
      from: string;
      to: string;
      status: 301 | 302 | 307 | 308 | 410;
    }
  | {
      kind: "composition";
      path: string;
      compositionId: string;
      pageKind: string;
    }
  | { kind: "miss"; path: string };

function getPublicClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public client env missing");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function normalizePath(input: string): string {
  if (!input) return "/";
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return `/${trimmed}`;
  return trimmed.length > 1 && trimmed.endsWith("/")
    ? trimmed.replace(/\/+$/, "")
    : trimmed;
}

export const resolvePublicRoute = createServerFn({ method: "GET" })
  .inputValidator((data: { path: string }) => data)
  .handler(async ({ data }): Promise<RouteResolution> => {
    const path = normalizePath(data.path);
    try {
      const client = getPublicClient();
      const { data: rows, error } = await client.rpc("eb_resolve_public_route", {
        _path: path,
      });
      if (error || !rows || rows.length === 0) return { kind: "miss", path };
      const row = rows[0] as {
        resolved_kind: string | null;
        target_path: string;
        is_redirect: boolean;
        http_status: number;
        composition_id: string | null;
      };
      if (row.is_redirect) {
        return {
          kind: "redirect",
          from: path,
          to: row.target_path,
          status: (row.http_status as 301 | 302 | 307 | 308 | 410) ?? 301,
        };
      }
      if (row.composition_id && row.resolved_kind) {
        return {
          kind: "composition",
          path: row.target_path,
          compositionId: row.composition_id,
          pageKind: row.resolved_kind,
        };
      }
      return { kind: "miss", path };
    } catch {
      return { kind: "miss", path };
    }
  });