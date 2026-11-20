/**
 * BusinessZoneSelect — Zona o barrio dentro del formulario principal de la
 * empresa, justo debajo de Destino. Permite crear la zona al momento.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { QuickCreateZoneDialog } from "@/components/cms/QuickCreateZoneDialog";
import {
  listZonesForDestination,
  type BusinessZoneOption,
} from "@/lib/cms/business-locations.functions";

interface Props {
  destinationId: string;
  destinationName: string | null;
  value: string;
  onChange: (zoneId: string) => void;
}

export function BusinessZoneSelect({ destinationId, destinationName, value, onChange }: Props) {
  const listFn = useServerFn(listZonesForDestination);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const key = ["cms", "destination-zones", destinationId];
  const zones = useQuery({
    queryKey: key,
    queryFn: () => listFn({ data: { destinationId } }),
    enabled: !!destinationId,
  });

  return (
    <div className="space-y-1.5">
      <label htmlFor="business-zone" className="block text-xs font-medium">
        Zona o barrio
      </label>
      <div className="flex gap-2">
        <select
          id="business-zone"
          value={value}
          disabled={!destinationId}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="">Sin zona</option>
          {(zones.data ?? []).map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          disabled={!destinationId}
          onClick={() => setOpen(true)}
        >
          + Nueva zona
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {destinationId
          ? "Si el barrio no está en la lista, créalo aquí mismo."
          : "Elige primero el destino para ver sus zonas."}
      </p>
      {destinationId ? (
        <QuickCreateZoneDialog
          open={open}
          onOpenChange={setOpen}
          destinationId={destinationId}
          destinationName={destinationName}
          onCreated={(zone) => {
            qc.setQueryData<BusinessZoneOption[]>(key, (prev) =>
              [...(prev ?? []).filter((z) => z.id !== zone.id), zone].sort((a, b) =>
                a.name.localeCompare(b.name, "es"),
              ),
            );
            onChange(zone.id);
          }}
        />
      ) : null}
    </div>
  );
}
