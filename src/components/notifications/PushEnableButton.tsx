/**
 * PushEnableButton — Activación de avisos al celular (Web Push) desde la
 * campana del Centro de Notificaciones.
 *
 * Delta mínimo: reutiliza la infraestructura existente
 * (`src/pwa/push.ts`, `registerPushSubscription`, `setMyNotificationPreference`).
 * No crea superficies, canales ni estados nuevos.
 */
import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getPushSupport,
  getCurrentPushSubscription,
  requestPushPermission,
  subscribePush,
  unsubscribePush,
} from "@/pwa/push";
import {
  getVapidPublicKey,
  registerPushSubscription,
  revokePushSubscription,
} from "@/lib/notifications/push.functions";
import { setMyNotificationPreference } from "@/lib/notifications/preferences.functions";

type State = "checking" | "unsupported" | "off" | "on" | "busy";

function keysOf(sub: PushSubscription): { p256dh: string; auth: string } | null {
  const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  return p256dh && auth ? { p256dh, auth } : null;
}

export function PushEnableButton() {
  const [state, setState] = useState<State>("checking");
  const fetchKey = useServerFn(getVapidPublicKey);
  const register = useServerFn(registerPushSubscription);
  const revoke = useServerFn(revokePushSubscription);
  const setPreference = useServerFn(setMyNotificationPreference);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const support = getPushSupport();
      if (!support.supported) {
        if (alive) setState("unsupported");
        return;
      }
      const sub = await getCurrentPushSubscription();
      if (alive) setState(sub ? "on" : "off");
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function enable() {
    setState("busy");
    try {
      const permission = await requestPushPermission();
      if (permission !== "granted") {
        toast.error("No autorizaste los avisos en este dispositivo.");
        setState("off");
        return;
      }
      const { publicKey } = await fetchKey({});
      if (!publicKey) {
        toast.error("Los avisos al celular no están configurados todavía.");
        setState("off");
        return;
      }
      const sub = await subscribePush(publicKey);
      const keys = sub ? keysOf(sub) : null;
      if (!sub || !keys) {
        toast.error("No se pudo activar el aviso en este dispositivo.");
        setState("off");
        return;
      }
      await register({
        data: {
          endpoint: sub.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: navigator.userAgent,
        },
      });
      await setPreference({
        data: { category: "operational", channel: "push", enabled: true, consent: true },
      });
      toast.success("Avisos activados en este dispositivo.");
      setState("on");
    } catch {
      toast.error("No se pudo activar el aviso en este dispositivo.");
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const sub = await getCurrentPushSubscription();
      if (sub) {
        await revoke({ data: { endpoint: sub.endpoint } });
        await unsubscribePush();
      }
      await setPreference({
        data: { category: "operational", channel: "push", enabled: false, consent: false },
      });
      toast.success("Avisos desactivados en este dispositivo.");
      setState("off");
    } catch {
      toast.error("No se pudo desactivar el aviso.");
      setState("on");
    }
  }

  if (state === "checking") return null;

  if (state === "unsupported") {
    return (
      <p className="border-t px-4 py-3 text-[11px] text-muted-foreground">
        Para recibir avisos al celular, instala la app desde tu navegador y vuelve a entrar.
      </p>
    );
  }

  const busy = state === "busy";
  return (
    <div className="border-t px-4 py-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => void (state === "on" ? disable() : enable())}
        className="flex w-full items-center justify-center gap-2 rounded-pill border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-accent disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <BellRing className="size-3.5" aria-hidden />
        )}
        {state === "on" ? "Desactivar avisos en este celular" : "Activar avisos en este celular"}
      </button>
    </div>
  );
}
