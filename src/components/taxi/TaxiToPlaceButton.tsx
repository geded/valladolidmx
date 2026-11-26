import { CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Botón «Pedir taxi aquí» que abre Taxi Alux con el destino ya puesto. */
export function TaxiToPlaceButton({ name, lat, lng }: { name: string; lat: number | null | undefined; lng: number | null | undefined }) {
  if (lat == null || lng == null) return null;
  const href = `/taxi?destino=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}`;
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href}><CarFront className="mr-1.5 size-4" /> Pedir taxi aquí</a>
    </Button>
  );
}
