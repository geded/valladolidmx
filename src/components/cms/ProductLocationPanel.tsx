import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationPickerMap } from "@/components/maps/LocationPickerMap";
import { getProductLocation, saveProductLocation } from "@/lib/cms/product-location.functions";

const DEFAULT_CENTER = { lat: 20.6896, lng: -88.2019 };

export function ProductLocationPanel({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const read = useServerFn(getProductLocation);
  const write = useServerFn(saveProductLocation);
  const current = useQuery({
    queryKey: ["cms", "product", productId, "location"],
    queryFn: () => read({ data: { productId } }),
  });
  const [specific, setSpecific] = useState(false);
  const [label, setLabel] = useState("Punto de encuentro");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(DEFAULT_CENTER.lat);
  const [lng, setLng] = useState(DEFAULT_CENTER.lng);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const value = current.data;
    if (!value) return;
    setSpecific(value.mode === "specific");
    setLabel(value.label || "Punto de encuentro");
    setAddress(value.addressLine1 || "");
    if (value.latitude != null) setLat(Number(value.latitude));
    if (value.longitude != null) setLng(Number(value.longitude));
  }, [current.data]);

  const save = useMutation({
    mutationFn: () =>
      write({
        data: {
          productId,
          mode: specific ? "specific" : "inherited",
          label,
          addressLine1: address,
          latitude: lat,
          longitude: lng,
        },
      }),
    onSuccess: async () => {
      setMessage(specific ? "Punto de encuentro guardado." : "La experiencia usa la ubicación principal del negocio.");
      await qc.invalidateQueries({ queryKey: ["cms", "product", productId, "location"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "No se pudo guardar."),
  });

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 size-5 text-primary" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold">Ubicación de la experiencia</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Hereda la ubicación del negocio o registra un punto de encuentro diferente.
          </p>
        </div>
      </div>
      <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={specific}
          onChange={(event) => setSpecific(event.target.checked)}
          className="size-4 accent-primary"
        />
        Usar un punto de encuentro diferente
      </label>
      {!specific ? (
        <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{current.data?.label || "Ubicación principal del negocio"}</p>
          {current.data?.addressLine1 ? <p className="mt-1 text-muted-foreground">{current.data.addressLine1}</p> : null}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <LocationPickerMap lat={lat} lng={lng} onChange={(point) => { setLat(point.lat); setLng(point.lng); }} />
          <div className="space-y-3">
            <label className="block text-xs font-medium">Nombre del punto
              <input value={label} onChange={(event) => setLabel(event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium">Dirección
              <input value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </label>
            <p className="text-xs text-muted-foreground">Toca el mapa o arrastra el pin para ajustar.</p>
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" disabled={save.isPending || current.isLoading} onClick={() => { setMessage(null); save.mutate(); }}>
          {save.isPending ? "Guardando…" : "Guardar ubicación"}
        </Button>
        {message ? <p role="status" className="text-xs text-muted-foreground">{message}</p> : null}
      </div>
    </section>
  );
}