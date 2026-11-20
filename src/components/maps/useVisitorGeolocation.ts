/**
 * useVisitorGeolocation — Hook cliente para pedir la ubicación del
 * visitante con consentimiento explícito.
 *
 * Estados:
 *  - "idle": no se ha solicitado.
 *  - "prompting": esperando respuesta del usuario / navegador.
 *  - "granted": tenemos coords.
 *  - "denied" / "unavailable": no hay coords, mostrar CTA/fallback.
 *
 * Precisión (corrección 2026-09-20):
 *  - Se pide alta precisión (GPS) y se descarta cualquier lectura con
 *    exactitud peor que ~20 km: esas lecturas provienen de la IP y
 *    colocaban al visitante en una ciudad lejana.
 *  - La caché de sesión expira a los 10 minutos y guarda la exactitud,
 *    para poder mostrar avisos y permitir actualizar la ubicación.
 */
import { useCallback, useEffect, useState } from "react";

export type VisitorLocation = { lat: number; lng: number; accuracy?: number | null };

type Status = "idle" | "prompting" | "granted" | "denied" | "unavailable" | "imprecise";

const STORAGE_KEY = "vmx.visitor.geo.v1";
/** Lecturas peores que esto casi siempre son geolocalización por IP. */
export const MAX_ACCEPTABLE_ACCURACY_M = 20_000;
/** Precisión suficiente para "cómo llegar". */
export const GOOD_ACCURACY_M = 1_000;
const CACHE_TTL_MS = 10 * 60 * 1000;

type CachedLocation = VisitorLocation & { at?: number };

function readCached(): VisitorLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    if (
      typeof parsed?.lat !== "number" ||
      typeof parsed?.lng !== "number" ||
      Math.abs(parsed.lat) > 90 ||
      Math.abs(parsed.lng) > 180
    ) {
      return null;
    }
    if (typeof parsed.at === "number" && Date.now() - parsed.at > CACHE_TTL_MS) return null;
    if (typeof parsed.accuracy === "number" && parsed.accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
      return null;
    }
    return { lat: parsed.lat, lng: parsed.lng, accuracy: parsed.accuracy ?? null };
  } catch {
    return null;
  }
}

export function useVisitorGeolocation() {
  const [location, setLocation] = useState<VisitorLocation | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const cached = readCached();
    if (cached) {
      setLocation(cached);
      setStatus("granted");
    }
  }, []);

  const request = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("prompting");

    const accept = (pos: GeolocationPosition) => {
      const accuracy = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null;
      if (accuracy != null && accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
        // Lectura por IP: no la usamos para calcular cómo llegar.
        setLocation(null);
        setStatus("imprecise");
        try {
          window.sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* noop */
        }
        return;
      }
      const next: VisitorLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy,
      };
      setLocation(next);
      setStatus("granted");
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, at: Date.now() }));
      } catch {
        /* noop */
      }
    };

    const fail = (err: GeolocationPositionError) => {
      setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
    };

    navigator.geolocation.getCurrentPosition(accept, (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        fail(err);
        return;
      }
      // Reintento tolerante (interiores, GPS frío) sin caer en IP lejana.
      navigator.geolocation.getCurrentPosition(accept, fail, {
        enableHighAccuracy: false,
        timeout: 12_000,
        maximumAge: 60_000,
      });
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
  }, []);

  const clear = useCallback(() => {
    setLocation(null);
    setStatus("idle");
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
    }
  }, []);

  const isPrecise = location?.accuracy == null || location.accuracy <= GOOD_ACCURACY_M;

  return { location, status, request, clear, isPrecise };
}
