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
  // Siempre visible: la pantalla del taxi explica si no hay salida desde
  // donde está la persona (ocultarlo en silencio confundía).
  if (lat == null || lng == null) return null;
  const base = `/taxi?destino=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}&volverLabel=${encodeURIComponent(name)}`;
  // La página de regreso se toma al tocar: en el HTML del servidor no existe
  // y la hidratación no corrige atributos, por eso antes llegaba vacía.
  const withReturn = (e: { currentTarget: HTMLAnchorElement }) => {
    e.currentTarget.href = `${base}&volver=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  };
  return (
    <Button asChild variant="outline" size="sm" className="rounded-pill">
      <a href={base} onPointerDown={withReturn} onClick={withReturn}><CarFront className="mr-1.5 size-4" /> Pedir taxi aquí</a>
    </Button>
  );
}
