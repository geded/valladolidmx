/**
 * Sesión del viajero sin señal (solo lectura).
 *
 * Sin señal, el acceso de la cuenta puede vencer (dura una hora) y no se
 * puede renovar. Antes, Mi Viaje mandaba al viajero a «Iniciar sesión» en
 * pleno destino. Ahora, mientras no haya señal, se reconoce la cuenta
 * guardada en el propio teléfono para mostrar su copia de Mi Viaje; nada se
 * envía al servidor con ella. Al volver la señal, la sesión real la
 * reemplaza o, si ya no es válida, se cierra como siempre.
 */
import type { Session } from "@supabase/supabase-js";

/** Máximo tiempo que se reconoce una sesión vencida sin señal. */
export const OFFLINE_SESSION_GRACE_MS = 45 * 24 * 60 * 60 * 1000;

export function authStorageKey(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;
  try {
    const ref = new URL(supabaseUrl).hostname.split(".")[0];
    return ref ? `sb-${ref}-auth-token` : null;
  } catch {
    return null;
  }
}

export function parseStoredSession(raw: string | null, now = Date.now()): Session | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.user?.id || !parsed.refresh_token) return null;
    const expiresAtMs = typeof parsed.expires_at === "number" ? parsed.expires_at * 1000 : 0;
    if (!expiresAtMs || now - expiresAtMs > OFFLINE_SESSION_GRACE_MS) return null;
    return parsed as Session;
  } catch {
    return null;
  }
}

/** Sesión guardada en el teléfono; sólo debe usarse cuando falta señal. */
export function readStoredSessionWhileOffline(): Session | null {
  try {
    if (typeof window === "undefined") return null;
    const key = authStorageKey(import.meta.env.VITE_SUPABASE_URL as string | undefined);
    if (!key) return null;
    return parseStoredSession(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}
