/**
 * Guard interno para los publicadores del UNC.
 * Sólo staff (admin / super_admin) puede invocar los server-fn de publicación
 * de notificaciones directamente. Otros server-fn corren con la misma sesión
 * (a través de requireSupabaseAuth), por lo que también deben respetar este
 * gate; los publicadores nunca deben exponerse a clientes finales.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

export async function assertUncPublisher(context: Ctx): Promise<void> {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (isAdmin) return;
  const { data: isSuper } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (isSuper) return;
  throw new Error("Forbidden: notification publisher requires staff role");
}

/**
 * Variante para webhooks: además de staff, el dueño registrado del endpoint
 * puede publicar hacia su propio endpoint.
 */
export async function assertWebhookPublisher(
  context: Ctx,
  endpointId: string,
): Promise<void> {
  const { data: endpoint } = await context.supabase
    .from("notification_webhook_endpoints")
    .select("owner_user_id")
    .eq("id", endpointId)
    .maybeSingle();
  if (endpoint?.owner_user_id === context.userId) return;
  await assertUncPublisher(context);
}
