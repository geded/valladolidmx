/**
 * HostSettlementsPanel — Estado de cuenta por anfitrión.
 *
 * Paso 7 del plan "Experiencias: la sección que vende en línea".
 * Se monta dentro de /cms/ventas-en-linea (autoridad existente),
 * sin crear una pantalla paralela.
 */
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Download, RefreshCw } from "lucide-react";
import {
  getHostSettlements,
  type HostSettlementRow,
  type HostSettlementsResult,
} from "@/lib/commerce/settlements.functions";

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

const SOURCE_LABEL: Record<string, string> = {
  direct_sale: "Reserva en línea",
  concierge_proposal: "Arma tu Viaje",
};

const METHOD_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

function toCsv(result: HostSettlementsResult): string {
  const header = [
    "empresa",
    "folio",
    "fecha_pago",
    "origen",
    "forma_pago",
    "concepto",
    "cantidad",
    "moneda",
    "importe",
    "comision",
    "neto_anfitrion",
  ];
  const lines = [header.join(",")];
  for (const row of result.rows) {
    for (const l of row.lines) {
      lines.push(
        [
          JSON.stringify(row.business_name),
          l.folio,
          l.paid_at ?? "",
          SOURCE_LABEL[l.source_kind] ?? l.source_kind,
          METHOD_LABEL[l.payment_method] ?? l.payment_method,
          JSON.stringify(l.title),
          String(l.quantity),
          l.currency,
          (l.gross_amount / 100).toFixed(2),
          (l.commission_amount / 100).toFixed(2),
          (l.net_amount / 100).toFixed(2),
        ].join(","),
      );
    }
  }
  return lines.join("\n");
}

export function HostSettlementsPanel() {
  const fetchSettlements = useServerFn(getHostSettlements);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const filters = useMemo(() => {
    const payload: Record<string, unknown> = { sourceKind: "all" };
    if (from) payload.from = new Date(from).toISOString();
    if (to) payload.to = new Date(to + "T23:59:59").toISOString();
    return payload;
  }, [from, to]);

  const q = useQuery({
    queryKey: ["admin", "host-settlements", filters],
    queryFn: () => fetchSettlements({ data: filters }),
    staleTime: 30_000,
  });

  const result = q.data;
  const currency = result?.currency ?? "MXN";

  const download = () => {
    if (!result) return;
    const blob = new Blob(["\uFEFF" + toCsv(result)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liquidaciones-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Liquidaciones a anfitriones</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Reservaciones ya pagadas por periodo: lo vendido, la comisión de la plataforma y lo
            que se le paga a cada anfitrión, separando efectivo y tarjeta.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted-foreground">
            Desde
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 h-9 w-[150px]"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Hasta
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 h-9 w-[150px]"
            />
          </label>
          <Button variant="outline" size="sm" onClick={() => q.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={download}
            disabled={!result || result.rows.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> Descargar
          </Button>
        </div>
      </header>

      {q.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>
      ) : q.isError ? (
        <p className="mt-6 text-sm text-destructive">
          No se pudo cargar el estado de cuenta. Esta sección es exclusiva de Administración.
        </p>
      ) : !result || result.rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No hay reservaciones pagadas en el periodo seleccionado.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Reservaciones pagadas" value={String(result.totals.orders_count)} />
            <Kpi label="Vendido" value={money(result.totals.gross_amount, currency)} />
            <Kpi label="Comisión plataforma" value={money(result.totals.commission_amount, currency)} />
            <Kpi label="A pagar a anfitriones" value={money(result.totals.net_amount, currency)} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Cobrado en efectivo {money(result.totals.cash_amount, currency)} · con tarjeta{" "}
            {money(result.totals.card_amount, currency)}
            {result.totals.refunded_amount > 0 ? (
              <> · reembolsado y descontado {money(result.totals.refunded_amount, currency)}</>
            ) : null}
          </p>

          <div className="mt-5 space-y-3">
            {result.rows.map((row) => (
              <SettlementCard
                key={row.business_id}
                row={row}
                open={open === row.business_id}
                onToggle={() =>
                  setOpen((prev) => (prev === row.business_id ? null : row.business_id))
                }
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function SettlementCard({
  row,
  open,
  onToggle,
}: {
  row: HostSettlementRow;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background">
      <button
        type="button"
        onClick={onToggle}
        className="ring-focus flex w-full flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-medium">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {row.business_name}
          <Badge variant="outline">{row.orders_count} reservaciones</Badge>
        </span>
        <span className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Vendido {money(row.gross_amount, row.currency)}
          </span>
          <span className="text-muted-foreground">
            Comisión {money(row.commission_amount, row.currency)}
          </span>
          <span className="font-semibold">A pagar {money(row.net_amount, row.currency)}</span>
        </span>
      </button>

      {open ? (
        <div className="overflow-x-auto border-t border-border px-4 py-3">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Folio</th>
                <th className="py-2 pr-3">Pagada</th>
                <th className="py-2 pr-3">Origen</th>
                <th className="py-2 pr-3">Forma de pago</th>
                <th className="py-2 pr-3">Concepto</th>
                <th className="py-2 pr-3 text-right">Importe</th>
                <th className="py-2 pr-3 text-right">Comisión</th>
                <th className="py-2 text-right">Neto</th>
              </tr>
            </thead>
            <tbody>
              {row.lines.map((l, i) => (
                <tr key={`${l.order_id}-${i}`} className="border-t border-border/60">
                  <td className="py-2 pr-3">
                    <Link
                      to="/concierge/reservaciones/$orderId"
                      params={{ orderId: l.order_id }}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {l.folio}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {l.paid_at
                      ? new Date(l.paid_at).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="py-2 pr-3">{SOURCE_LABEL[l.source_kind] ?? l.source_kind}</td>
                  <td className="py-2 pr-3">
                    {METHOD_LABEL[l.payment_method] ?? l.payment_method}
                  </td>
                  <td className="py-2 pr-3">
                    {l.title}
                    {l.quantity > 1 ? ` · ${l.quantity}` : ""}
                  </td>
                  <td className="py-2 pr-3 text-right">{money(l.gross_amount, l.currency)}</td>
                  <td className="py-2 pr-3 text-right text-muted-foreground">
                    {money(l.commission_amount, l.currency)}
                  </td>
                  <td className="py-2 text-right font-medium">
                    {money(l.net_amount, l.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
