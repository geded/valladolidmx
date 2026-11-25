import { createClient } from "@supabase/supabase-js";

/** Verifica la sesión enviada como `Authorization: Bearer` en rutas HTTP.
 *  Devuelve el id de la cuenta o una respuesta 401/403 lista para regresar. */
export async function requireRequestUser(
  request: Request,
  opts: { editor?: boolean } = {},
): Promise<{ userId: string } | Response> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!token || token.split(".").length !== 3 || !url || !key) {
    return new Response("Unauthorized", { status: 401 });
  }
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claims, error } = await supabase.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (error || !userId) return new Response("Unauthorized", { status: 401 });
  if (opts.editor) {
    const { data: allowed, error: roleError } = await supabase.rpc("is_editor_or_admin", {
      _user_id: userId,
    });
    if (roleError || !allowed) return new Response("Forbidden", { status: 403 });
  }
  return { userId };
}
