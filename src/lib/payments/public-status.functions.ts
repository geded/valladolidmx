/**
 * public-status.functions.ts — Estado público (no autenticado) de la
 * plataforma de pagos. Devuelve únicamente un booleano `ready` para que
 * componentes de venta directa decidan si habilitar el botón "Comprar".
 * Nunca expone los valores de los secretos.
 */
import { createServerFn } from "@tanstack/react-start";

export interface PublicPaymentsStatus {
  provider: string;
  ready: boolean;
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
    return { provider, ready: enabled && hasKeys };
  },
);