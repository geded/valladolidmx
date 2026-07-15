/**
 * H3·A4 · M2.3.1 · Fase B · Bootstrap del secreto en Vault.
 *
 * Server fn admin-only (super_admin) que copia el valor almacenado en
 * `MEDIA_SIGNATURE_RENEW_HMAC` al Vault interno, para que el scheduler
 * SQL `masu_trigger_renewal` pueda leerlo sin exponerlo en cron/log.
 *
 * Se invoca UNA vez desde una consola admin. Idempotente: si el secreto
 * ya existe, actualiza in-place; jamás retorna el valor.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const bootstrapRenewalSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isSuperAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (roleErr || isSuperAdmin !== true) {
      throw new Error("Forbidden");
    }
    const value = process.env.MEDIA_SIGNATURE_RENEW_HMAC;
    if (!value || value.length < 32) {
      throw new Error("secret_not_configured");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("masu_bootstrap_secret", { _value: value });
    if (error) {
      throw new Error("bootstrap_failed");
    }
    return { ok: true as const, secret_id: data as string };
  });