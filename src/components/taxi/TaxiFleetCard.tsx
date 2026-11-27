import { useEffect, useState } from "react";
import { NumericInput } from "@/components/taxi/NumericInput";
import { useLocalFormDraft } from "@/lib/cms/use-local-form-draft";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { saveTaxiFleetSettings } from "@/lib/taxi/taxi.functions";
import { taxiErrorMessage, type TaxiFleet } from "@/lib/taxi/rules";
import { toast } from "@/lib/toast";

/** Tipos de vehículo, espera, paradas y viaje por horas (ida y vuelta). */
export function TaxiFleetCard({ initial }: { initial: TaxiFleet }) {
  const saveFn = useServerFn(saveTaxiFleetSettings);
  const queryClient = useQueryClient();
  const [fleet, setFleet] = useState<TaxiFleet>(initial);
  const draft = useLocalFormDraft<TaxiFleet>({
    key: "taxi-alux.fleet",
    value: fleet,
    isDirty: (v) => JSON.stringify(v) !== JSON.stringify(initial),
    sanitize: (raw) => (raw && typeof raw === "object" && "classes" in raw ? (raw as TaxiFleet) : null),
  });
  useEffect(() => {
    const saved = draft.take(initial);
    if (saved) setFleet(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [busy, setBusy] = useState(false);
  const pesos = (c: number) => c / 100;
  const cents = (v: string) => Math.max(0, Math.round(Number(v) * 100) || 0);
  const int = (v: string) => Math.max(0, Math.round(Number(v)) || 0);
  const set = <K extends keyof TaxiFleet>(k: K, v: TaxiFleet[K]) => setFleet((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      await saveFn({ data: fleet });
      draft.clear();
      toast.success("Vehículos y viajes redondos guardados.");
      await queryClient.invalidateQueries({ queryKey: ["taxi"] });
    } catch (e) {
      toast.error(taxiErrorMessage(e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Car className="size-5 text-primary" /> Vehículos, espera e ida y vuelta</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Como en Uber y DiDi, el precio cambia por tipo de vehículo, no por persona. «Tarifa» es el porcentaje sobre el compacto (100 % = igual). Valores iniciales de prueba: confírmalos con los taxistas.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {fleet.classes.map((c, i) => (
          <div key={c.key} className="rounded-xl border border-border p-3">
            <label htmlFor={`cls-label-${c.key}`} className="text-xs font-medium">Nombre</label>
            <Input id={`cls-label-${c.key}`} value={c.label} onChange={(e) => set("classes", fleet.classes.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className="mt-1" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor={`cls-seats-${c.key}`} className="text-xs font-medium">Pasajeros</label>
                <NumericInput id={`cls-seats-${c.key}`} value={c.seats} onValue={(n) => set("classes", fleet.classes.map((x, j) => j === i ? { ...x, seats: int(String(n)) } : x))} className="mt-1" />
              </div>
              <div>
                <label htmlFor={`cls-mult-${c.key}`} className="text-xs font-medium">Tarifa (%)</label>
                <NumericInput id={`cls-mult-${c.key}`} value={c.multiplier_bps / 100} onValue={(n) => set("classes", fleet.classes.map((x, j) => j === i ? { ...x, multiplier_bps: Math.round(n * 100) || 10000 } : x))} className="mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField id="wait-free" label="Espera gratis al recoger (min)" value={fleet.wait_free_minutes} onChange={(v) => set("wait_free_minutes", int(v))} />
        <NumberField id="wait-rate" label="Espera por minuto ($)" value={pesos(fleet.wait_per_minute_cents)} onChange={(v) => set("wait_per_minute_cents", cents(v))} />
        <NumberField id="max-stops" label="Paradas permitidas" value={fleet.max_stops} onChange={(v) => set("max_stops", Math.min(5, int(v)))} />
        <NumberField id="stop-fee" label="Cargo por parada ($)" value={pesos(fleet.stop_fee_cents)} onChange={(v) => set("stop_fee_cents", cents(v))} />
      </div>
      <div className="mt-4 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Ida y vuelta por horas</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">El taxista lleva, espera y regresa al viajero. Precio por hora (compacto) con km incluidos; el excedente se cobra por km.</p>
          </div>
          <Switch checked={fleet.hourly_enabled} onCheckedChange={(v) => set("hourly_enabled", v)} aria-label="Permitir ida y vuelta" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField id="hour-rate" label="Precio por hora ($)" value={pesos(fleet.hourly_cents)} onChange={(v) => set("hourly_cents", cents(v))} />
          <NumberField id="hour-km" label="Km incluidos por hora" value={fleet.hourly_included_km} onChange={(v) => set("hourly_included_km", int(v))} />
          <NumberField id="hour-min" label="Mínimo de horas" value={fleet.hourly_min_hours} onChange={(v) => set("hourly_min_hours", Math.max(1, int(v)))} />
          <NumberField id="hour-max" label="Máximo de horas" value={fleet.hourly_max_hours} onChange={(v) => set("hourly_max_hours", Math.max(1, int(v)))} />
        </div>
      </div>
      <Button type="button" className="mt-5" disabled={busy} onClick={save}>Guardar vehículos y viajes</Button>
    </section>
  );
}

function NumberField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium">{label}</label>
      <NumericInput id={id} value={value} onValue={(n) => onChange(String(n))} className="mt-1" />
    </div>
  );
}
