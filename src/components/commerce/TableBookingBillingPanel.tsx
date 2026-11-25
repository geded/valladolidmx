/** Cobro del servicio «Reservar mesa» — solo Administración. Arranca apagado (gratis). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { getTableBookingPortal, setTableBookingBilling } from "@/lib/commerce/table-booking.functions";
import { meridaToday } from "@/lib/commerce/table-booking";

export function TableBookingBillingPanel({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getTableBookingPortal);
  const setFn = useServerFn(setTableBookingBilling);
  const key = ["admin", "table-billing", businessId];
  const q = useQuery({ queryKey: key, queryFn: () => getFn({ data: { businessId, date: meridaToday() } }) });
  const m = useMutation({
    mutationFn: (enabled: boolean) => setFn({ data: { businessId, enabled, mode: enabled ? "por_persona" : "gratis" } }),
    onSuccess: async () => { toast.success("Cobro actualizado"); await qc.invalidateQueries({ queryKey: key }); },
    onError: () => toast.error("No se pudo cambiar el cobro"),
  });
  if (!q.data) return null;
  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">Reservar mesa · cobro del servicio</p>
          <p className="text-muted-foreground">
            {q.data.configured ? "El restaurante ya configuró sus mesas." : "El restaurante aún no configura sus mesas en su Portal."}{" "}
            {q.data.billing.enabled ? "Cobro por persona activado (se aplica en la Etapa 3)." : "Gratis por ahora."}
          </p>
        </div>
        <Switch checked={q.data.billing.enabled} disabled={m.isPending} onCheckedChange={(v) => m.mutate(v)} aria-label="Cobrar el servicio de reservar mesa" />
      </div>
    </div>
  );
}
