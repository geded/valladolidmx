/**
 * Ola A11 · Helper cliente para reportar señales de acción a Alux público.
 *
 * Uso: `logAluxPublicSignal({ action: "request_directions", label, slug, pathContext })`.
 * Fire-and-forget, silencioso. Sólo emite si existe una sesión pública activa.
 */
export type AluxPublicSignalAction =
  | "view_business"
  | "request_directions"
  | "save_coupon"
  | "view_promotion"
  | "dismiss_suggestion"
  | "save_favorite"
  | "start_review";

const SESSION_STORAGE_KEY = "alux_public_session_key";

function getSessionKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const key = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return key && key.length >= 8 ? key : null;
  } catch {
    return null;
  }
}

function derivePathContext(): { destination?: string | null; category?: string | null } {
  if (typeof window === "undefined") return {};
  const parts = window.location.pathname.split("/").filter(Boolean);
  // /oriente-maya/:destino/:categoria/...
  if (parts[0] === "oriente-maya") {
    return { destination: parts[1] ?? null, category: parts[2] ?? null };
  }
  return {};
}

export function logAluxPublicSignal(input: {
  action: AluxPublicSignalAction;
  label?: string;
  slug?: string;
  pathContext?: { destination?: string | null; category?: string | null };
}): void {
  const sessionKey = getSessionKey();
  if (!sessionKey) return; // sin sesión de chat pública no hay a quién recordarle
  const payload = {
    sessionKey,
    action: input.action,
    label: input.label,
    slug: input.slug,
    pathContext: input.pathContext ?? derivePathContext(),
  };
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon("/api/public/alux/signal", blob);
      return;
    }
    void fetch("/api/public/alux/signal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* noop */
  }
}