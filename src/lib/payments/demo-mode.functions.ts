/**
 * demo-mode.functions.ts — Server fns admin para el interruptor
 * "Modo demo" de pagos. Fuente de verdad: platform_settings.payments.demo_mode.
 * Sólo super_admin / admin pueden leer el estado admin y modificarlo.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KEY = "payments.demo_mode";

async function assertAdmin(context: {
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  };
  userId: string;
}): Promise<void> {
  const [a, b] = await Promise.all([
    context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    }),
    context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    }),
  ]);
  if (a.error) throw new Error(`role_check_failed: ${a.error.message}`);
  if (b.error) throw new Error(`role_check_failed: ${b.error.message}`);
  if (!a.data && !b.data) throw new Error("forbidden");
}

export const getPaymentsDemoModeAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ enabled: boolean }> => {
    await assertAdmin(
      context as unknown as Parameters<typeof assertAdmin>[0],
    );
    const { data, error } = await context.supabase
      .from("platform_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const enabled =
      typeof data?.value === "boolean" ? data.value : Boolean(data?.value);
    return { enabled };
  });

export const setPaymentsDemoModeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => {
    if (typeof input?.enabled !== "boolean") {
      throw new Error("invalid_input: enabled must be boolean");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<{ enabled: boolean }> => {
    await assertAdmin(
      context as unknown as Parameters<typeof assertAdmin>[0],
    );
    const { error } = await context.supabase.from("platform_settings").upsert(
      {
        key: KEY,
        value: data.enabled,
        is_public: true,
        description:
          "Cuando es true, permite simular compras (demo) aunque el proveedor real de pagos no esté activo.",
        updated_by: context.userId,
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return { enabled: data.enabled };
  });