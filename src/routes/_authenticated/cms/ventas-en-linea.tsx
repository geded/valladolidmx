/**
 * /_authenticated/cms/ventas-en-linea — Panel admin de comisiones de venta directa.
 *
 * CV4.1 · lado operativo. Muestra órdenes con source_kind='direct_sale',
 * comisiones devengadas por proveedor y neto a liquidar. Export CSV.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  listDirectSaleOrders,
  getDirectSalesSummary,
  type DirectSaleOrderRow,
  type DirectSalesSummary,
} from "@/lib/admin/direct-sales-commissions.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cms/ventas-en-linea")({
  head: () => ({
    meta: [
      { title: "Ventas en línea · CMS Studio · Valladolid.mx" },
      {
        name: "description",
        content:
          "Órdenes con venta directa, comisiones devengadas por proveedor y neto a liquidar.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DirectSalesAdminPage,
});

type StatusFilter =
  | "all"
  | "paid"
  | "fulfilled"
  | "refunded"
  | "cancelled"
  | "awaiting_payment";

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}

const STATUS_LABEL: Record<string, string> = {
  paid: "Pagada",
  fulfilled: "Cumplida",
  refunded: "Reembolsada",
  cancelled: "Cancelada",
  awaiting_payment: "Esperando pago",
  draft: "Borrador",
  expired: "Expirada",
};

function statusTone(status: string): string {
  switch (status) {
    case "paid":
    case "fulfilled":
      return "bg-success/10 text-success border-success/30";
    case "refunded":
      return "bg-warning/10 text-warning-foreground border-warning/30";
    case "cancelled":
    case "expired":
      return "bg-destructive/10 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function toCsv(rows: DirectSaleOrderRow[]): string {
  const header = [
    "folio",
    "fecha_creacion",
    "fecha_pago",
    "estado",
    "viajero",
    "empresa",
    "producto",
    "cantidad",
    "moneda",
    "total",
    "comision",
    "neto_proveedor",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const net = Math.max(0, r.total_amount - r.commission_amount);
    lines.push(
      [
        r.folio,
        r.created_at,
        r.paid_at ?? "",
        r.status,
        JSON.stringify(r.traveler_name ?? ""),
        JSON.stringify(r.business_name ?? ""),
        JSON.stringify(r.product_title ?? ""),
        String(r.quantity),
        r.currency,
        (r.total_amount / 100).toFixed(2),
        (r.commission_amount / 100).toFixed(2),
        (net / 100).toFixed(2),
      ].join(","),
    );
  }
  return lines.join("\n");
}

function DirectSalesAdminPage() {
  const fetchList = useServerFn(listDirectSaleOrders);
  const fetchSummary = useServerFn(getDirectSalesSummary);

  const [status, setStatus] = useState<StatusFilter>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const filters = useMemo(() => {
    const payload: Record<string, unknown> = { status, limit: 200 };
    if (from) payload.from = new Date(from).toISOString();
    if (to) payload.to = new Date(to + "T23:59:59").toISOString();
    if (search.trim()) payload.search = search.trim();
    return payload;
  }, [status, from, to, search]);

  const summaryQ = useQuery({
    queryKey: ["admin", "direct-sales", "summary", filters],
    queryFn: () => fetchSummary({ data: filters }),
    staleTime: 30_000,
  });
  const listQ = useQuery({
    queryKey: ["admin", "direct-sales", "list", filters],
    queryFn: () => fetchList({ data: filters }),
    staleTime: 30_000,
  });

  const summary: DirectSalesSummary | undefined = summaryQ.data;
  const rows: DirectSaleOrderRow[] = listQ.data ?? [];
  const currency = summary?.currency ?? "MXN";

  const downloadCsv = () => {
    const csv = toCsv(rows);
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas-en-linea-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Ventas en línea
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Comisiones de venta directa
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Órdenes donde el visitante compró directo a un proveedor. Se
          reporta el monto bruto cobrado, la comisión de plataforma y el
          neto a liquidar. Todos los montos en centavos convertidos a{" "}
          {currency}.
        </p>
      </header>

      {/* KPIs */}
      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Órdenes pagadas"
          value={summary ? String(summary.paid_orders) : "—"}
          hint={
            summary ? `${summary.total_orders} totales en el periodo` : ""
          }
        />
        <KpiCard
          label="Ventas brutas"
          value={
            summary ? formatMoney(summary.gross_amount, currency) : "—"
          }
        />
        <KpiCard
          label="Comisión plataforma"
          value={
            summary
              ? formatMoney(summary.commission_amount, currency)
              : "—"
          }
          hint={
            summary && summary.gross_amount > 0
              ? `${((summary.commission_amount / summary.gross_amount) * 100).toFixed(1)}% del bruto`
              : ""
          }
        />
        <KpiCard
          label="Neto a proveedores"
          value={
            summary
              ? formatMoney(summary.net_to_providers, currency)
              : "—"
          }
          hint={
            summary && summary.refunded_amount > 0
              ? `Reembolsado: ${formatMoney(summary.refunded_amount, currency)}`
              : ""
          }
        />
      </section>

      {/* Filtros */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Desde
            </label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Hasta
            </label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estado
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">Todos</option>
              <option value="paid">Pagadas</option>
              <option value="fulfilled">Cumplidas</option>
              <option value="refunded">Reembolsadas</option>
              <option value="cancelled">Canceladas</option>
              <option value="awaiting_payment">Esperando pago</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Buscar (folio / viajero)
            </label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="VMX-… o nombre"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              summaryQ.refetch();
              listQ.refetch();
            }}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Actualizar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadCsv}
            disabled={rows.length === 0}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Exportar CSV ({rows.length})
          </Button>
        </div>
      </section>

      {/* Rollup por proveedor */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Por proveedor
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Proveedor</th>
                <th className="px-3 py-2 text-right">Órdenes</th>
                <th className="px-3 py-2 text-right">Bruto</th>
                <th className="px-3 py-2 text-right">Comisión</th>
                <th className="px-3 py-2 text-right">Neto</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.by_business ?? []).map((b) => (
                <tr key={b.business_id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">
                    {b.business_name}
                  </td>
                  <td className="px-3 py-2 text-right">{b.orders_count}</td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(b.gross_amount, b.currency)}
                  </td>
                  <td className="px-3 py-2 text-right text-primary">
                    {formatMoney(b.commission_amount, b.currency)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatMoney(b.net_amount, b.currency)}
                  </td>
                </tr>
              ))}
              {(!summary || summary.by_business.length === 0) && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    {summaryQ.isLoading
                      ? "Cargando…"
                      : "Sin ventas directas en el periodo."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detalle de órdenes */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Detalle de órdenes
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Folio</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Proveedor</th>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Comisión</th>
                <th className="px-3 py-2 text-right">Neto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const net = Math.max(0, r.total_amount - r.commission_amount);
                const when = r.paid_at ?? r.created_at;
                return (
                  <tr key={r.order_id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.folio}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(when).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={statusTone(r.status)}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {r.business_name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.product_title ?? "—"}
                      {r.quantity > 1 ? (
                        <span className="text-muted-foreground">
                          {" "}
                          × {r.quantity}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {formatMoney(r.total_amount, r.currency)}
                    </td>
                    <td className="px-3 py-2 text-right text-primary whitespace-nowrap">
                      {formatMoney(r.commission_amount, r.currency)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      {formatMoney(net, r.currency)}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    {listQ.isLoading
                      ? "Cargando…"
                      : "Sin órdenes de venta directa con estos filtros."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}