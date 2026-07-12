/**
 * Ola A12 · Alux proactivo en ficha de negocio.
 *
 * Tarjeta compacta y no invasiva que aparece al inicio de la ficha
 * pública de un negocio con contexto vivo: distancia real (si el
 * visitante compartió GPS), estado abierto/cerrado (con horario),
 * y — si el viajero está autenticado — señal de cupón activo suyo.
 *
 * Es lectura pura: no reemplaza al concierge flotante, sólo destaca
 * las señales que Alux considera relevantes AHORA para esta ficha.
 * Reporta señal `view_business` a la sesión pública para memoria M3.
 */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, MapPin, Clock, Ticket } from "lucide-react";
import { useVisitorGeolocation } from "@/components/maps/useVisitorGeolocation";
import { computeOpenNow, type BusinessHourRow } from "@/lib/business/open-now";
import { getBusinessHoursPublic } from "@/lib/alux/business-context.functions";
import { logAluxPublicSignal } from "@/lib/alux/public-signals";
import { supabase } from "@/integrations/supabase/client";

export interface AluxContextChipProps {
  businessId: string;
  businessSlug: string;
  businessName: string;
  latitude: number | null;
  longitude: number | null;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m de ti`;
  if (km < 10) return `${km.toFixed(1)} km de ti`;
  return `${Math.round(km)} km de ti`;
}

export function AluxContextChip({
  businessId,
  businessSlug,
  businessName,
  latitude,
  longitude,
}: AluxContextChipProps) {
  const { location } = useVisitorGeolocation(); // sólo lee caché; no fuerza prompt
  const fetchHours = useServerFn(getBusinessHoursPublic);
  const [hours, setHours] = useState<BusinessHourRow[] | null>(null);
  const [hasCoupon, setHasCoupon] = useState(false);

  // 1) Reporta la visita a la memoria pública de Alux (M3).
  useEffect(() => {
    logAluxPublicSignal({
      action: "view_business",
      label: businessName,
      slug: businessSlug,
    });
  }, [businessId, businessName, businessSlug]);

  // 2) Carga horarios públicos.
  useEffect(() => {
    let cancelled = false;
    fetchHours({ data: { businessId } })
      .then((rows) => {
        if (!cancelled) setHours(rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setHours([]);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, fetchHours]);

  // 3) Cupón activo del viajero autenticado (si aplica).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        const { data, error } = await supabase
          .from("traveler_coupons")
          .select("id, status, valid_until")
          .eq("user_id", userData.user.id)
          .eq("business_id", businessId)
          .eq("status", "active")
          .limit(1);
        if (cancelled || error || !data || data.length === 0) return;
        const c = data[0] as { valid_until: string | null };
        if (c.valid_until && new Date(c.valid_until).getTime() < Date.now()) return;
        setHasCoupon(true);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const distanceKm = useMemo(() => {
    if (!location || latitude == null || longitude == null) return null;
    return haversineKm(location, { lat: latitude, lng: longitude });
  }, [location, latitude, longitude]);

  const openNow = useMemo(() => {
    if (!hours) return null;
    return computeOpenNow(hours);
  }, [hours]);

  // Si no hay NINGÚN insight, no renderices ruido.
  const hasAny =
    distanceKm != null ||
    (openNow && openNow.state !== "unknown") ||
    hasCoupon;
  if (!hasAny) return null;

  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm"
      role="note"
      aria-label="Alux · contexto de esta ficha"
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-primary">
        <Sparkles className="h-4 w-4" aria-hidden />
        Alux
      </span>
      <span className="text-primary/40" aria-hidden>·</span>

      {distanceKm != null ? (
        <>
          <span className="inline-flex items-center gap-1.5 text-foreground/80">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {formatDistance(distanceKm)}
          </span>
          {(openNow?.state !== "unknown" || hasCoupon) && (
            <span className="text-primary/30" aria-hidden>·</span>
          )}
        </>
      ) : null}

      {openNow && openNow.state !== "unknown" ? (
        <>
          <span
            className={
              "inline-flex items-center gap-1.5 " +
              (openNow.state === "open"
                ? "text-success"
                : "text-muted-foreground")
            }
          >
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {openNow.label}
          </span>
          {hasCoupon && <span className="text-primary/30" aria-hidden>·</span>}
        </>
      ) : null}

      {hasCoupon ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
          <Ticket className="h-3.5 w-3.5" aria-hidden />
          Tienes cupón activo aquí
        </span>
      ) : null}
    </div>
  );
}