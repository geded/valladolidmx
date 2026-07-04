/**
 * ResumeRunner — suscriptor único a `SIGNED_IN` / `SIGNED_OUT` para
 * reanudar acciones protegidas al autenticar y limpiar al cerrar sesión.
 * (OLA H-01 · Épica 1 · I1)
 *
 * I1 (esta entrega): no hay consumidores todavía. El runner queda montado
 * y es no-op mientras el registry esté vacío. NO altera comportamiento
 * observable de ningún componente existente.
 *
 * I2+: cuando `useProtectedAction` (hook) exista, este runner:
 *   - Al `SIGNED_IN`: `takeLast()` → si hay runtime en memoria ejecuta
 *     `execute()` y emite `resumed`/`failed`; si sólo hay record (recarga
 *     u otra pestaña), emite `restored` sin ejecutar.
 *   - Al `SIGNED_OUT`: `clear("signed_out")`.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PendingActionRegistry } from "./registry";
import { emitProtectedActionEvent } from "./observability";

export function ProtectedActionResumeRunner(): null {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        PendingActionRegistry.clear("signed_out");
        return;
      }
      if (event !== "SIGNED_IN") return;

      // Defer al siguiente tick para evitar deadlocks contra el propio
      // AuthProvider (mismo patrón usado en `useAuth`).
      setTimeout(() => {
        emitProtectedActionEvent("protected_action.auth_completed", {
          actionId: "-",
          kind: "-",
        });
        const taken = PendingActionRegistry.takeLast();
        if (!taken) return;
        const { record, runtime } = taken;
        if (!runtime) {
          // Metadato sobreviviente sin payload → recarga o pestaña ajena.
          emitProtectedActionEvent("protected_action.restored", {
            actionId: record.id,
            kind: record.kind,
          });
          return;
        }
        void (async () => {
          try {
            const result = await runtime.execute();
            emitProtectedActionEvent("protected_action.resumed", {
              actionId: record.id,
              kind: record.kind,
            });
            runtime.onSuccess?.(result);
          } catch (err) {
            emitProtectedActionEvent("protected_action.failed", {
              actionId: record.id,
              kind: record.kind,
              errorCode: err instanceof Error ? err.name : "unknown",
            });
            runtime.onError?.(err);
          }
        })();
      }, 0);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
