/**
 * public-status.functions.ts — Estado público (no autenticado) de la
 * plataforma de pagos. Devuelve únicamente un booleano `ready` para que
 * componentes de venta directa decidan si habilitar el botón "Comprar".
 * Nunca expone los valores de los secretos.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface PublicPaymentsStatus {
  provider: string;
  ready: boolean;
  demoMode: boolean;
}

export const getPaymentsReadyPublic = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicPaymentsStatus> => {
    const provider = (process.env.PAYMENTS_PROVIDER ?? "stripe").toLowerCase();
    const enabled = (process.env.PAYMENTS_ENABLED ?? "").toLowerCase() !== "false";
    let hasKeys = false;
    if (provider === "stripe") {
      hasKeys =
        Boolean(process.env.STRIPE_SECRET_KEY) &&
        Boolean(process.env.STRIPE_WEBHOOK_SECRET);
    }
    // Modo demo: la fuente de verdad es platform_settings.payments.demo_mode
    // (administrable desde /cms/pagos). La env var actúa como fallback
    // cuando la fila aún no existe o la consulta falla.
    const envFallback =
      (process.env.PAYMENTS_DEMO_MODE ?? "true").toLowerCase() !== "false";
    let demoMode = envFallback;
    try {
      const supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_PUBLISHABLE_KEY!,
        {
          auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "payments.demo_mode")
        .maybeSingle();
      if (data && typeof data.value === "boolean") {
        demoMode = data.value;
      }
    } catch {
      // silencioso: usamos envFallback
    }
    return { provider, ready: enabled && hasKeys, demoMode };
  },
);