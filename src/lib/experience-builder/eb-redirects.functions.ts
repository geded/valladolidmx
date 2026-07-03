/**
 * Experience Builder · Redirects Server Functions (US-R3 · Ola 0)
 *
 * Gestión editorial de redirecciones 301/302/307/308/410 entre rutas
 * públicas. Sólo admin/super_admin/editor. Toda escritura queda
 * auditada por RLS + `has_role`.
 *
 * Contrato R3.10..R3.13. No se usa aún desde UI (Ola siguiente); estas
 * funciones habilitan al Panel de Páginas y al Panel "Redirecciones"
 * del Modo Profesional a listar/crear/desactivar sin código nuevo.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PageRedirect {
  id: string;
  from_path: string;
  to_path: string;
  page_composition_id: string | null;
  reason: string | null;
  active: boolean;
  http_status: number;
  created_at: string;
  updated_at: string;
}

function normalizePath(input: string): string {
  const t = (input ?? "").trim();
  if (!t) return "";
  return t.startsWith("/") ? t : `/${t}`;
}

export const listRedirects = createServerFn({ method: "GET" })
  .inputValidator((d?: { compositionId?: string; onlyActive?: boolean }) => d ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<PageRedirect[]> => {
    let q = context.supabase
      .from("page_redirects")
      .select("id, from_path, to_path, page_composition_id, reason, active, http_status, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (data.compositionId) q = q.eq("page_composition_id", data.compositionId);
    if (data.onlyActive) q = q.eq("active", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as PageRedirect[];
  });

export const createRedirect = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      from_path: string;
      to_path: string;
      page_composition_id?: string | null;
      reason?: string | null;
      http_status?: 301 | 302 | 307 | 308 | 410;
    }) => d,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const from_path = normalizePath(data.from_path);
    const to_path = normalizePath(data.to_path);
    if (!from_path || !to_path) throw new Error("Rutas requeridas");
    if (from_path === to_path) throw new Error("Origen y destino no pueden coincidir");

    // Prevención de ciclos: si to_path ya redirige a algo que apunta a from_path.
    const { data: cycle } = await context.supabase
      .from("page_redirects")
      .select("id")
      .eq("from_path", to_path)
      .eq("to_path", from_path)
      .eq("active", true)
      .maybeSingle();
    if (cycle) throw new Error("Redirect crea un ciclo: revisa el destino");

    // Desactiva cualquier redirect activo previo con el mismo origen.
    await context.supabase
      .from("page_redirects")
      .update({ active: false })
      .eq("from_path", from_path)
      .eq("active", true);

    const { data: inserted, error } = await context.supabase
      .from("page_redirects")
      .insert({
        from_path,
        to_path,
        page_composition_id: data.page_composition_id ?? null,
        reason: data.reason ?? "manual",
        http_status: data.http_status ?? 301,
        active: true,
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted!.id as string };
  });

export const deactivateRedirect = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("page_redirects")
      .update({ active: false, updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });