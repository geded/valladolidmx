/**
 * push.ts — Adenda 15.10.6.4 · Push Notifications (infraestructura)
 *
 * API de suscripción a Web Push. Registro de un Service Worker
 * dedicado (`/push-sw.js`) en scope acotado `/push/`, aislado del
 * SW de app-shell (`/sw.js`, scope `/`) generado por vite-plugin-pwa.
 *
 * Gobernanza 15.10.6.4 aplicada aquí:
 *  - Cero adopción automática: NADA se suscribe sin llamada explícita
 *    desde una superficie autorizada. Este módulo sólo expone la API.
 *  - Denylist absoluto: los suscriptores no envían payload alguno de
 *    pagos, auth, roles, permissions, tokens o billing.
 *  - Kill switch: `?sw=off`, iframe, dev y preview Lovable bloquean
 *    registro y suscripción. `unsubscribePush()` y `unregisterPushSw()`
 *    revierten el estado completo.
 *  - Observability First: eventos `pwa:push:*` en cada transición.
 *  - No captura mutaciones existentes: es infraestructura pura, no se
 *    integra automáticamente con notificaciones internas.
 *  - Reversibilidad: usuario puede revocar en cualquier momento.
 *
 * VAPID public key opcional vía `VITE_VAPID_PUBLIC_KEY`. Sin key, la
 * capacidad queda inerte (permission puede pedirse, pero `subscribe`
 * lanza — comportamiento intencional para evitar suscripciones rotas).
 */

export const PUSH_SW_PATH = "/push-sw.js" as const;
export const PUSH_SW_SCOPE = "/push/" as const;

export type PushSupport =
  | { supported: true }
  | { supported: false; reason: string };

type PushEvent =
  | "skipped"
  | "sw_registered"
  | "sw_unregistered"
  | "permission_requested"
  | "permission_granted"
  | "permission_denied"
  | "subscribed"
  | "unsubscribed"
  | "error";

function emit(event: PushEvent, detail?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(`pwa:push:${event}`, { detail }));
  } catch {
    /* noop */
  }
}

function isForbiddenContext(): { forbidden: boolean; reason?: string } {
  if (typeof window === "undefined") return { forbidden: true, reason: "ssr" };
  if (!("serviceWorker" in navigator)) return { forbidden: true, reason: "unsupported" };
  if (!("PushManager" in window)) return { forbidden: true, reason: "no-push-manager" };
  if (!("Notification" in window)) return { forbidden: true, reason: "no-notifications" };
  if (!import.meta.env.PROD) return { forbidden: true, reason: "dev" };
  if (window.top !== window.self) return { forbidden: true, reason: "iframe" };
  const { hostname, search } = window.location;
  if (search.includes("sw=off")) return { forbidden: true, reason: "kill-switch" };
  const preview =
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev");
  if (preview) return { forbidden: true, reason: "lovable-preview" };
  return { forbidden: false };
}

export function getPushSupport(): PushSupport {
  const { forbidden, reason } = isForbiddenContext();
  if (forbidden) return { supported: false, reason: reason ?? "unavailable" };
  return { supported: true };
}

export function getPermissionStatus(): NotificationPermission | "unavailable" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unavailable";
  return Notification.permission;
}

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Registra el SW dedicado de push en scope acotado. Idempotente.
 * No solicita permisos ni crea suscripción por sí mismo.
 */
export function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registrationPromise) return registrationPromise;
  registrationPromise = (async () => {
    const { forbidden, reason } = isForbiddenContext();
    if (forbidden) {
      emit("skipped", { reason });
      return null;
    }
    try {
      const reg = await navigator.serviceWorker.register(PUSH_SW_PATH, {
        scope: PUSH_SW_SCOPE,
      });
      emit("sw_registered", { scope: reg.scope });
      return reg;
    } catch (err) {
      emit("error", { phase: "register", message: (err as Error)?.message });
      registrationPromise = null;
      return null;
    }
  })();
  return registrationPromise;
}

export async function unregisterPushServiceWorker(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const targets = regs.filter((r) =>
      (r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "").endsWith(
        PUSH_SW_PATH,
      ),
    );
    if (targets.length === 0) return false;
    await Promise.allSettled(targets.map((r) => r.unregister()));
    registrationPromise = null;
    emit("sw_unregistered", { count: targets.length });
    return true;
  } catch (err) {
    emit("error", { phase: "unregister", message: (err as Error)?.message });
    return false;
  }
}

/**
 * Solicita permiso de notificaciones al usuario. Debe invocarse SOLO
 * como respuesta a una acción explícita del usuario (click de un CTA).
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  const { forbidden, reason } = isForbiddenContext();
  if (forbidden) {
    emit("skipped", { reason });
    return "denied";
  }
  emit("permission_requested");
  const result = await Notification.requestPermission();
  emit(result === "granted" ? "permission_granted" : "permission_denied", { result });
  return result;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function getVapidPublicKey(): string | null {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  return typeof key === "string" && key.length > 0 ? key : null;
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const reg = await registerPushServiceWorker();
  if (!reg) return null;
  try {
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Suscribe al usuario a push. Requiere permiso ya concedido y VAPID
 * public key configurada. No transmite la suscripción a ningún backend
 * automáticamente — el consumidor es responsable de enviarla al
 * endpoint autorizado en una sub-adenda posterior.
 */
export async function subscribePush(): Promise<PushSubscription | null> {
  const { forbidden, reason } = isForbiddenContext();
  if (forbidden) {
    emit("skipped", { reason });
    return null;
  }
  if (Notification.permission !== "granted") {
    emit("skipped", { reason: "no-permission" });
    return null;
  }
  const vapid = getVapidPublicKey();
  if (!vapid) {
    emit("error", { phase: "subscribe", message: "missing-vapid-key" });
    return null;
  }
  const reg = await registerPushServiceWorker();
  if (!reg) return null;
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
    emit("subscribed", { endpoint: sub.endpoint });
    return sub;
  } catch (err) {
    emit("error", { phase: "subscribe", message: (err as Error)?.message });
    return null;
  }
}

export async function unsubscribePush(): Promise<boolean> {
  try {
    const sub = await getCurrentPushSubscription();
    if (!sub) return false;
    const ok = await sub.unsubscribe();
    if (ok) emit("unsubscribed", { endpoint: sub.endpoint });
    return ok;
  } catch (err) {
    emit("error", { phase: "unsubscribe", message: (err as Error)?.message });
    return false;
  }
}

export const __PUSH_INTERNAL__ = {
  PUSH_SW_PATH,
  PUSH_SW_SCOPE,
  emit,
  isForbiddenContext,
};