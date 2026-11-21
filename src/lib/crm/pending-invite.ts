/**
 * CRM Prospectos · Fase 3 · enlace personal pendiente en este dispositivo.
 *
 * Si la persona confirma su correo en otra pestaña, al volver con sesión se
 * le regresa a su enlace para terminar el pase (lo hace
 * `TravelerSignupNotifier`). Sólo guarda el enlace y la fecha; vence en 14 días.
 */
const KEY = "vmx.crm.pendingInvite.v1";
const TTL_MS = 14 * 86_400_000;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function rememberPendingInvite(token: string): void {
  if (typeof window === "undefined" || !TOKEN_RE.test(token)) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ token, at: Date.now() }));
  } catch {
    /* sin almacenamiento: el regreso por la misma pestaña sigue funcionando */
  }
}

export function readPendingInvite(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as { token?: unknown; at?: unknown } | null;
    if (!raw || typeof raw.token !== "string" || !TOKEN_RE.test(raw.token)) return null;
    if (typeof raw.at !== "number" || Date.now() - raw.at > TTL_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return raw.token;
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nada que limpiar */
  }
}
