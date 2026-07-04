/**
 * useProtectedAction — API pública única para acciones protegidas.
 * (OLA H-01 · Épica 1 · I2)
 *
 * Diseño 100% genérico. NO conoce Mi Viaje, Favoritos ni Concierge.
 * Cualquier componente que necesite ejecutar una acción sujeta a una
 * pre-condición (v1: sesión) la envuelve con este hook.
 *
 * El evaluador de requisitos v1 sólo entiende `authenticated`. Los demás
 * campos de `ProtectedActionRequirements` (rol, permiso, suscripción,
 * perfil completo, verificación de empresa, perfil de viajero) están
 * declarados en el tipo público para que futuras épicas los añadan sin
 * cambiar la firma del hook ni migrar consumidores.
 */
import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PendingActionRegistry } from "./registry";
import { SheetController, type GateCopy } from "./sheet-controller";
import { emitProtectedActionEvent } from "./observability";
import type {
  ProtectedActionKind,
  ProtectedActionMode,
  ProtectedActionRequirements,
} from "./types";

export interface UseProtectedActionConfig<TPayload, TResult> {
  kind: ProtectedActionKind;
  /** Requisitos declarativos. v1 sólo evalúa `authenticated`. */
  requirements?: ProtectedActionRequirements;
  /** Modo (`gate` por defecto). `queue` opt-in para consumidores tipo Mi Viaje. */
  mode?: ProtectedActionMode;
  action: (payload: TPayload) => Promise<TResult>;
  onSuccess?: (result: TResult) => void;
  onError?: (err: unknown) => void;
  /** Copy del Sheet (opcional). */
  gateCopy?: GateCopy;
  /** Sólo para `mode: "queue"`. Persistencia local que NO abre Sheet. */
  queueFallback?: (payload: TPayload) => void;
  /** TTL personalizado (ms). Default 10 min. */
  ttlMs?: number;
  /** Etiqueta corta sin PII para observabilidad ("favorite.toggle:on"). */
  reason?: string;
}

export interface UseProtectedActionResult<TPayload> {
  run: (payload: TPayload) => void;
  pending: boolean;
}

/**
 * Evaluador de requisitos v1. Devuelve la razón faltante o `null` si el
 * usuario los satisface todos. Diseñado para crecer sin romper firma.
 */
function evaluateRequirements(
  requirements: ProtectedActionRequirements | undefined,
  ctx: { authenticated: boolean },
): "authenticated" | null {
  const req = requirements ?? { authenticated: true };
  if (req.authenticated !== false && !ctx.authenticated) return "authenticated";
  // v1: los demás gates no se evalúan todavía. Se ignoran de forma segura
  // para no bloquear al usuario. Futuras épicas los implementan aquí.
  return null;
}

export function useProtectedAction<TPayload = void, TResult = unknown>(
  config: UseProtectedActionConfig<TPayload, TResult>,
): UseProtectedActionResult<TPayload> {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const inflight = useRef(false);

  const run = useCallback(
    (payload: TPayload) => {
      if (inflight.current) return; // anti doble-clic
      const authenticated = !!user;
      const missing = evaluateRequirements(config.requirements, { authenticated });

      // Camino feliz: requisitos satisfechos → ejecutar directo.
      if (!missing) {
        inflight.current = true;
        setPending(true);
        void (async () => {
          try {
            const result = await config.action(payload);
            config.onSuccess?.(result);
          } catch (err) {
            config.onError?.(err);
          } finally {
            inflight.current = false;
            setPending(false);
          }
        })();
        return;
      }

      // v1 sólo sabe pedir "authenticated". Otros gates (futuros) llegan
      // aquí sin evaluador → tratados como no-op seguro (no ejecuta).
      if (missing !== "authenticated") return;

      // Modo queue: no abre Sheet; delega en el fallback local.
      if (config.mode === "queue" && config.queueFallback) {
        try {
          config.queueFallback(payload);
        } finally {
          emitProtectedActionEvent("protected_action.started", {
            actionId: `queue_${Date.now()}`,
            kind: config.kind,
            reason: "queued",
          });
        }
        return;
      }

      // Modo gate: encolar y abrir Sheet.
      const record = PendingActionRegistry.push<TResult>({
        kind: config.kind,
        requirements: config.requirements ?? { authenticated: true },
        execute: () => config.action(payload),
        onSuccess: config.onSuccess,
        onError: config.onError,
        ttlMs: config.ttlMs,
        reason: config.reason,
      });
      SheetController.open({ record, copy: config.gateCopy ?? {} });
      emitProtectedActionEvent("protected_action.gated", {
        actionId: record.id,
        kind: record.kind,
        reason: config.reason,
      });
    },
    // config es reactivo por referencia del consumidor; se resuelve on-call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  return { run, pending };
}
