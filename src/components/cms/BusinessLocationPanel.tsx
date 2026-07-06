/**
 * BusinessLocationPanel — Captura obligatoria de la ubicación primaria
 * del negocio. Todo negocio debe llevar coordenadas para que el
 * visitante vea distancia/tiempo y para que Alux calcule cercanía.
 *
 * Flujo:
 *  - Carga la ubicación primaria actual (si existe).
 *  - Ofrece "Usar mi ubicación actual" (geolocation del navegador).
 *  - Permite arrastrar el pin o tocar el mapa para ajustar.
 *  - Guarda vía `upsertBusinessPrimaryLocation` (RLS del propio negocio).
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { LocationPickerMap } from "@/components/maps/LocationPickerMap";
import {
  getBusinessPrimaryLocation,
  upsertBusinessPrimaryLocation,
} from "@/lib/cms/business-locations.functions";

const DEFAULT_CENTER = { lat: 20.6896, lng: -88.2019 }; // Valladolid

interface Props {
  businessId: string;
}

export function BusinessLocationPanel({ businessId }: Props) {
  const qc = useQueryClient();
  const readFn = useServerFn(getBusinessPrimaryLocation);
  const saveFn = useServerFn(upsertBusinessPrimaryLocation);

  const current = useQuery({
    queryKey: ["cms", "business", businessId, "primary-location"],
    queryFn: () => readFn({ data: { businessId } }),
  });

  const [lat, setLat] = useState<number>(DEFAULT_CENTER.lat);
  const [lng, setLng] = useState<number>(DEFAULT_CENTER.lng);
  const [address, setAddress] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (current.data) {
      if (current.data.latitude != null) setLat(Number(current.data.latitude));
      if (current.data.longitude != null) setLng(Number(current.data.longitude));
      if (current.data.address_line1) setAddress(current.data.address_line1);
    }
  }, [current.data]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          businessId,
          latitude: lat,
          longitude: lng,
          address_line1: address || null,
        },
      }),
    onSuccess: async () => {
      setDirty(false);
      setMsg("Ubicación guardada.");
      await qc.invalidateQueries({
        queryKey: ["cms", "business", businessId, "primary-location"],
      });
    },
    onError: (e) =>
      setMsg(e instanceof Error ? e.message : "No se pudo guardar la ubicación."),
  });

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMsg("Tu navegador no soporta geolocalización.");
      return;
    }
    setMsg("Obteniendo tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setDirty(true);
        setMsg("Ubicación capturada. Ajusta el pin si es necesario y guarda.");
      },
      (err) => setMsg(err.message || "No pudimos leer tu ubicación."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const hasCoords = current.data?.latitude != null && current.data?.longitude != null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Ubicación en el mapa *</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Marca la ubicación exacta. Se guarda latitud y longitud para calcular
            distancias y tiempos desde el viajero. Es obligatoria para publicar.
          </p>
        </div>
        {!hasCoords ? (
          <span className="inline-flex items-center rounded-md border border-destructive/40 bg-destructive/5 px-2 py-0.5 text-[11px] font-medium text-destructive">
            Falta ubicación
          </span>
        ) : (
          <span className="inline-flex items-center rounded-md border border-emerald-400/40 bg-emerald-500/5 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            Ubicación registrada
          </span>
        )}
      </header>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <LocationPickerMap
            lat={lat}
            lng={lng}
            onChange={(p) => {
              setLat(p.lat);
              setLng(p.lng);
              setDirty(true);
            }}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Toca el mapa o arrastra el pin para ajustar. La aplicación guarda
            latitud y longitud automáticamente.
          </p>
        </div>

        <div className="space-y-3">
          <Button type="button" variant="outline" className="w-full" onClick={useMyLocation}>
            Usar mi ubicación actual
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Latitud
              </label>
              <input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => {
                  setLat(Number(e.target.value));
                  setDirty(true);
                }}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Longitud
              </label>
              <input
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => {
                  setLng(Number(e.target.value));
                  setDirty(true);
                }}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Dirección visible
            </label>
            <input
              type="text"
              value={address}
              placeholder="Calle 39 #197 entre 38 y 40, Centro"
              onChange={(e) => {
                setAddress(e.target.value);
                setDirty(true);
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={!dirty || save.isPending}
            onClick={() => {
              setMsg(null);
              save.mutate();
            }}
          >
            {save.isPending ? "Guardando…" : "Guardar ubicación"}
          </Button>

          {msg ? (
            <p className="text-[11px] text-muted-foreground" role="status">
              {msg}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}