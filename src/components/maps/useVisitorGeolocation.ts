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
 * La ubicación se cachea en sessionStorage para no re-solicitarla en
 * cada card durante la misma visita.
 */
import { useCallback, useEffect, useState } from "react";

export type VisitorLocation = { lat: number; lng: number };

type Status = "idle" | "prompting" | "granted" | "denied" | "unavailable";

const STORAGE_KEY = "vmx.visitor.geo.v1";

function readCached(): VisitorLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VisitorLocation;
    if (
      typeof parsed?.lat === "number" &&
      typeof parsed?.lng === "number" &&
      Math.abs(parsed.lat) <= 90 &&
      Math.abs(parsed.lng) <= 180
    ) {
      return parsed;
    }
    return null;
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
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: VisitorLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLocation(next);
        setStatus("granted");
        try {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* noop */
        }
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }, []);

  return { location, status, request };
}