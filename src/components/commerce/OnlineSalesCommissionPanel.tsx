/**
 * OnlineSalesCommissionPanel — comisión de Valladolid.mx por tipo de venta
 * en línea (tienda, pedidos para recoger, hoteles). Sólo Administración.
 * Se sugiere al autorizar cada producto; las experiencias conservan su
 * comisión por producto.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getOnlineSalesCommission,
  onlineSalesErrorMessage,
  setOnlineSalesCommission,
} from "@/lib/commerce/business-online-sales.functions";
import { COMMISSION_MODES, type CommissionMode } from "@/lib/commerce/online-sales-rules";

const LABEL: Record<CommissionMode, string> = {
  tienda: "Tienda (artesanías y piezas)",
  pedidos: "Pedidos para recoger",
  reservas: "Hoteles y casas",
};

export function OnlineSalesCommissionPanel() {
  const getFn = useServerFn(getOnlineSalesCommission);
  const setFn = useServerFn(setOnlineSalesCommission);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["online-sales-commission"], queryFn: () => getFn() });
  const [values, setValues] = useState<Record<CommissionMode, string>>({
    tienda: "",
    pedidos: "",
    reservas: "",
  });

  useEffect(() => {
    const c = query.data?.commission;
    if (!c) return;
    setValues({
      tienda: String(c.tienda / 100),
      pedidos: String(c.pedidos / 100),
      reservas: String(c.reservas / 100),
    });
  }, [query.data]);

  const parsed = COMMISSION_MODES.map((m) => Number(values[m]));
  const valid = parsed.every((n) => Number.isFinite(n) && n >= 0 && n <= 100);

  const save = useMutation({
    mutationFn: () =>
      setFn({
        data: {
          tienda: Math.round(Number(values.tienda) * 100),
          pedidos: Math.round(Number(values.pedidos) * 100),
          reservas: Math.round(Number(values.reservas) * 100),
        },
      }),
    onSuccess: async () => {
      toast.success("Comisiones guardadas");
      await queryClient.invalidateQueries({ queryKey: ["online-sales-commission"] });
    },
    onError: (e: Error) => toast.error(onlineSalesErrorMessage(e.message)),
  });

  if (!query.data?.canManage) return null;

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Comisión por tipo de venta
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Se sugiere al autorizar cada producto de una empresa con «Ventas en línea» activada. Las
        experiencias y los tours conservan la comisión que se fija en cada uno.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {COMMISSION_MODES.map((m) => (
          <label key={m} className="text-sm font-medium">
            {LABEL[m]}
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.5"
                value={values[m]}
                onChange={(e) => setValues((v) => ({ ...v, [m]: e.target.value }))}
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={!valid || save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar comisiones"}
        </Button>
      </div>
    </section>
  );
}
