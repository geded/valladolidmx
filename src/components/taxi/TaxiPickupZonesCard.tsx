import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTaxiPickupAdmin, saveTaxiPickupZones } from "@/lib/taxi/taxi.functions";
import { toast } from "@/lib/toast";

/** Administración: destinos desde donde ya pueden salir taxis (la llegada es libre). */
export function TaxiPickupZonesCard() {
  const qc = useQueryClient();
  const loadFn = useServerFn(getTaxiPickupAdmin);
  const saveFn = useServerFn(saveTaxiPickupZones);
  const q = useQuery({ queryKey: ["taxi", "pickup-admin"], queryFn: () => loadFn() });
  const [selected, setSelected] = useState<string[]>([]);
  const [radius, setRadius] = useState(30);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data) { setSelected(q.data.selected); setRadius(q.data.radiusKm); }
  }, [q.data]);

  async function save() {
    setBusy(true);
    try {
      await saveFn({ data: { slugs: selected, radiusKm: radius } });
      toast.success("Destinos de salida guardados.");
      await qc.invalidateQueries({ queryKey: ["taxi"] });
    } catch {
      toast.error("No se pudieron guardar los destinos de salida.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h2 className="text-base font-semibold">Destinos desde donde salen taxis</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Marca dónde ya hay taxistas para recoger. Desde esos destinos el viajero puede ir a cualquier lugar del Oriente Maya.
        Fuera de ellos no verá el botón «Pedir taxi aquí».
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(q.data?.destinations ?? []).map((d) => (
          <label key={d.slug} className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={selected.includes(d.slug)}
              onChange={(e) => setSelected((c) => (e.target.checked ? [...c, d.slug] : c.filter((s) => s !== d.slug)))}
            />
            {d.name}
          </label>
        ))}
      </div>
      <label className="mt-4 block text-xs font-medium" htmlFor="taxi-radius">Distancia de recogida alrededor de cada destino (km)</label>
      <Input id="taxi-radius" type="number" inputMode="numeric" min={3} max={80} value={radius} onChange={(e) => setRadius(Math.min(80, Math.max(3, Number(e.target.value) || 3)))} className="mt-1 h-11 w-32" />
      <Button type="button" className="mt-4" disabled={busy || q.isLoading} onClick={save}>Guardar destinos de salida</Button>
    </section>
  );
}
