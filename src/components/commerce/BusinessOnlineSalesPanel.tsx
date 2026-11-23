/**
 * BusinessOnlineSalesPanel — interruptor «Ventas en línea» de una empresa.
 *
 * CMS (`variant="admin"`): sólo lo ve Administración; activa la venta, qué
 * vende y por dónde. Portal (`variant="portal"`): la empresa ve si la tiene
 * activada, sin poder cambiarla. Experiencias no dependen de este interruptor.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StoreProductsPanel } from "@/components/commerce/StoreProductsPanel";
import { BusinessRatesCalendar } from "@/components/commerce/RatesCalendar";
import {
  getBusinessOnlineSales,
  onlineSalesErrorMessage,
  setBusinessOnlineSales,
} from "@/lib/commerce/business-online-sales.functions";
import {
  ONLINE_SALES_CHANNELS,
  ONLINE_SALES_CHANNEL_LABEL,
  ONLINE_SALES_MODES,
  ONLINE_SALES_MODE_LABEL,
  type OnlineSalesChannel,
  type OnlineSalesMode,
} from "@/lib/commerce/online-sales-rules";

const COMMISSION_LABEL: Record<string, string> = {
  tienda: "Tienda",
  pedidos: "Pedidos",
  reservas: "Hoteles",
};

const LATER_OPTIONS = [
  "Envío a domicilio",
  "Reserva inmediata con pago al momento",
  "Calendario de Booking o Airbnb",
];

function pct(bps: number): string {
  return `${(bps / 100).toLocaleString("es-MX", { maximumFractionDigits: 2 })} %`;
}

export function BusinessOnlineSalesPanel({
  businessId,
  variant,
}: {
  businessId: string;
  variant: "admin" | "portal";
}) {
  const getFn = useServerFn(getBusinessOnlineSales);
  const setFn = useServerFn(setBusinessOnlineSales);
  const queryClient = useQueryClient();
  const queryKey = ["business-online-sales", businessId];
  const query = useQuery({ queryKey, queryFn: () => getFn({ data: { businessId } }) });

  const [enabled, setEnabled] = useState(false);
  const [modes, setModes] = useState<OnlineSalesMode[]>([]);
  const [channels, setChannels] = useState<OnlineSalesChannel[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!query.data) return;
    setEnabled(query.data.enabled);
    setModes(query.data.modes);
    setChannels(query.data.channels);
    setNote(query.data.note ?? "");
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => setFn({ data: { businessId, enabled, modes, channels, ...(note.trim() ? { note: note.trim() } : {}) } }),
    onSuccess: async () => {
      toast.success(enabled ? "Venta en línea activada" : "Venta en línea apagada");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(onlineSalesErrorMessage(e.message)),
  });

  if (query.isLoading) return null;
  if (query.isError || !query.data) return null;
  const state = query.data;

  if (variant === "portal") {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Ventas en línea</p>
        {state.enabled ? (
          <>
            <h2 className="mt-2 text-xl">Tu empresa vende en línea</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Valladolid.mx activó la venta en línea para:{" "}
              {state.modes.map((m) => ONLINE_SALES_MODE_LABEL[m].title).join(", ")}.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Por: {state.channels.map((c) => ONLINE_SALES_CHANNEL_LABEL[c]).join(" · ")}.
            </p>
            {state.modes.includes("reservas") ? (
              <div className="mt-4">
                <BusinessRatesCalendar businessId={businessId} kind="noches" />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h2 className="mt-2 text-xl">Aún no vendes en línea tus productos</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tus precios se muestran como referencia y el concierge cotiza. Las experiencias se
              siguen vendiendo como siempre. Si quieres vender en línea, pídelo al equipo de
              Valladolid.mx.
            </p>
          </>
        )}
      </section>
    );
  }

  if (!state.canManage) return null;

  const toggle = <T extends string>(list: T[], value: T, on: boolean): T[] =>
    on ? Array.from(new Set([...list, value])) : list.filter((v) => v !== value);
  const missing = enabled && (modes.length === 0 || channels.length === 0);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Ventas en línea · solo administrador
          </p>
          <h2 className="mt-2 text-2xl">Vender en línea en esta empresa</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Apagada, todo sigue como hoy: precio de referencia y el concierge cotiza. Las
            experiencias se venden siempre, sin este interruptor. Al apagarla, lo ya vendido se
            conserva.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Activar venta en línea" />
          {enabled ? "Activada" : "Apagada"}
        </label>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-semibold">Qué vende</legend>
          <ul className="mt-2 space-y-3">
            {ONLINE_SALES_MODES.map((m) => (
              <li key={m}>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={modes.includes(m)}
                    onCheckedChange={(v) => setModes((cur) => toggle(cur, m, v === true))}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">{ONLINE_SALES_MODE_LABEL[m].title}</span>
                    <span className="block text-xs text-muted-foreground">{ONLINE_SALES_MODE_LABEL[m].hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold">Por dónde se vende</legend>
          <ul className="mt-2 space-y-3">
            {ONLINE_SALES_CHANNELS.map((c) => (
              <li key={c}>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={channels.includes(c)}
                    onCheckedChange={(v) => setChannels((cur) => toggle(cur, c, v === true))}
                    className="mt-0.5"
                  />
                  <span className="font-medium">{ONLINE_SALES_CHANNEL_LABEL[c]}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-semibold">Entrega y reservas</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Recoger en el local · Reserva con confirmación del hotel · Calendario manual.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Más adelante: {LATER_OPTIONS.join(" · ")}.
          </p>
        </fieldset>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <p className="font-medium">Comisión de Valladolid.mx por tipo</p>
        <p className="mt-1 text-muted-foreground">
          {(["tienda", "pedidos", "reservas"] as const)
            .map((m) => `${COMMISSION_LABEL[m]}: ${pct(state.commission[m])}`)
            .join(" · ")}
          . Se cambia en «Ventas en línea» del CMS.
        </p>
      </div>

      <label className="mt-5 block text-sm font-medium">
        Nota interna (opcional)
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={600}
          rows={2}
          className="mt-1"
          placeholder="Ej. Piloto acordado con el dueño el 23 de noviembre."
        />
      </label>

      {missing ? (
        <p className="mt-3 text-sm text-destructive">Elige al menos qué vende y por dónde antes de activarla.</p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending || missing}>
          {save.isPending ? "Guardando…" : "Guardar ventas en línea"}
        </Button>
      </div>

      {state.enabled && state.modes.includes("pedidos") ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Pedidos para recoger:</span> toda la carta con precio se
          puede pedir y pagar en su página. Para que algo no se venda, márcalo como no disponible en la carta.
        </p>
      ) : null}
      {state.enabled && state.modes.includes("tienda") ? (
        <div className="mt-4">
          <StoreProductsPanel businessId={businessId} />
        </div>
      ) : null}
      {state.enabled && state.modes.includes("reservas") ? (
        <div className="mt-4">
          <BusinessRatesCalendar businessId={businessId} kind="noches" />
        </div>
      ) : null}
    </section>
  );
}
