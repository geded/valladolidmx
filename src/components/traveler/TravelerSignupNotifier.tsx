/**
 * Tras iniciar sesión, avisa una vez por dispositivo al servidor. Si la
 * cuenta es un registro nuevo de viajero, la administración recibe el correo
 * «Nuevo viajero registrado» y el monitor registra el paso Anónimo →
 * Identificado. No pinta nada y nunca interrumpe la sesión.
 */
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { registerTravelerSignup } from "@/lib/notifications/traveler-signup-admin.functions";

const CHECKED_KEY = "vmx.signup.checked.v1";
/** Espera a que se importe el viaje armado sin cuenta antes de avisar. */
const SETTLE_MS = 8_000;

function readChecked(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(CHECKED_KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function markChecked(userId: string) {
  try {
    const next = [...readChecked().filter((id) => id !== userId), userId].slice(-10);
    window.localStorage.setItem(CHECKED_KEY, JSON.stringify(next));
  } catch {
    /* sin almacenamiento: el servidor evita correos repetidos */
  }
}

export function TravelerSignupNotifier() {
  const { user, loading } = useAuth();
  const register = useServerFn(registerTravelerSignup);

  useEffect(() => {
    if (loading || !user?.id || typeof window === "undefined") return;
    const userId = user.id;
    if (readChecked().includes(userId)) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await register();
          markChecked(userId);
          if (result.isNew) {
            const { trackIdentified } = await import("@/lib/visitor-intel/session-signals");
            void trackIdentified({
              pathname: window.location.pathname,
              locale: document.documentElement.lang || undefined,
              hadSavedTrip: result.savedItems > 0,
            });
          }
        } catch {
          /* se reintenta en la siguiente visita */
        }
      })();
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [loading, register, user?.id]);

  return null;
}
