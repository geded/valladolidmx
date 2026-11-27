import { useEffect, useState } from "react";
import { CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Primera etapa: Taxi Alux sólo recoge en Valladolid (hacia cualquier punto del Oriente Maya). */
export function taxiPickupAllowedHere(): boolean {
  try {
    const raw = window.localStorage.getItem("vmx.traveler.location-context.v1");
    if (!raw) return true; // aún no sabemos dónde está: se confirma al abrir el taxi
    const ctx = JSON.parse(raw) as { nearValladolid?: boolean; at?: number };
    if (typeof ctx.nearValladolid !== "boolean") return true;
    if (ctx.at && Date.now() - ctx.at > 6 * 3600_000) return true;
    return ctx.nearValladolid;
  } catch {
    return true;
  }
}

/** Botón «Pedir taxi aquí» que abre Taxi Alux con el destino ya puesto. */
export function TaxiToPlaceButton({ name, lat, lng }: { name: string; lat: number | null | undefined; lng: number | null | undefined }) {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(taxiPickupAllowedHere()), []);
  if (!show || lat == null || lng == null) return null;
  const from = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
  const href = `/taxi?destino=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}&volver=${encodeURIComponent(from)}&volverLabel=${encodeURIComponent(name)}`;
  return (
    <Button asChild variant="outline" size="sm" className="rounded-pill">
      <a href={href}><CarFront className="mr-1.5 size-4" /> Pedir taxi aquí</a>
    </Button>
  );
}
