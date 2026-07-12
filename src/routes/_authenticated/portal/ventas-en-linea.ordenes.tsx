/**
 * /portal/ventas-en-linea/ordenes — Mis ventas en línea (CV4.1 · proveedor).
 *
 * El empresario ve las órdenes de venta directa que incluyen productos de
 * su empresa activa, con folio VMX-XXXXXX, estado, monto bruto, comisión
 * de plataforma y neto a recibir. Filtros por fecha y estado.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMyBusinessDirectSaleOrders,
  getMyBusinessDirectSalesSummary,
} from "@/lib/portal/direct-sales-orders.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute(
  "/_authenticated/portal/ventas-en-linea/ordenes",
)({
  component: MyOnlineSalesPage,
});

function useActiveBusinessId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setId(window.localStorage.getItem(STORAGE_KEY));
    const onCustom = (event: Event) => {
      setId((event as CustomEvent<string>).detail ?? null);
    };
    window.addEventListener("portal:active-business-changed", onCustom);
    return () => {
      window.removeEventListener("portal:active-business-changed", onCustom);
    };
  }, []);
  return id;
}

type StatusFilter =
  | "all"
  | "paid"
  | "fulfilled"
  | "refunded"
  | "cancelled"
  | "awaiting_payment";

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Por confirmar",
  paid: "Confirmada",
  fulfilled: "Cumplida",
  refunded: "Reembolsada",
  cancelled: "Cancelada",
};

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function MyOnlineSalesPage() {
  const businessId = useActiveBusinessId();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const listFn = useServerFn(listMyBusinessDirectSaleOrders);
  const summaryFn = useServerFn(getMyBusinessDirectSalesSummary);

  const filters = useMemo(
    () => ({
      businessId: businessId ?? "",
      status,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
    }),
    [businessId, status, from, to],
  );

  const ordersQ = useQuery({
    queryKey: ["portal", "direct-sales", "orders", filters],
    queryFn: () => listFn({ data: { ...filters, limit: 200 } }),
    enabled: Boolean(businessId),
  });

  const summaryQ = useQuery({
    queryKey: ["portal", "direct-sales", "summary", filters],
    queryFn: () => summaryFn({ data: { ...filters, limit: 500 } }),
    enabled: Boolean(businessId),
  });

  if (!businessId) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Selecciona una empresa</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Elige una empresa activa para ver sus ventas en línea.
        </p>
      </div>
    );
  }

  const summary = summaryQ.data;
  const orders = ordersQ.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial · Ventas en línea
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Mis ventas en línea</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Consulta las órdenes de venta directa que incluyen tus experiencias.
          Aquí verás el folio del viaje confirmado, el monto que pagó el
          viajero, la comisión de la plataforma y el neto que recibes.
        </p>
        <div className="mt-3">
          <Link
            to="/portal/ventas-en-linea"
            className="text-xs text-primary underline"
          >
            ← Volver a configuración de ventas
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Órdenes confirmadas"
          value={String(summary?.paid_count ?? 0)}
          hint={`de ${summary?.orders_count ?? 0} totales`}
        />
        <Kpi
          label="Ventas brutas"
          value={
            summary
              ? formatMoney(summary.gross_amount, summary.currency)
              : "—"
          }
        />
        <Kpi
          label="Comisión plataforma"
          value={
            summary
              ? formatMoney(summary.commission_amount, summary.currency)
              : "—"
          }
        />
        <Kpi
          label="Neto a recibir"
          value={
            summary
              ? formatMoney(summary.net_amount, summary.currency)
              : "—"
          }
          highlight
        />
      </section>

      {/* Filtros */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Desde
            </Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Hasta
            </Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Estado
            </Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
            >
              <option value="all">Todas</option>
              <option value="paid">Confirmadas</option>
              <option value="fulfilled">Cumplidas</option>
              <option value="awaiting_payment">Por confirmar</option>
              <option value="refunded">Reembolsadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
                setStatus("all");
              }}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </section>

      {/* Tabla */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Folio</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Experiencia</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">Bruto</th>
                <th className="px-3 py-2 text-right">Comisión</th>
                <th className="px-3 py-2 text-right">Neto</th>
              </tr>
            </thead>
            <tbody>
              {ordersQ.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                    Cargando órdenes…
                  </td>
                </tr>
              ) : ordersQ.error ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-destructive">
                    {ordersQ.error instanceof Error
                      ? ordersQ.error.message
                      : "Error al cargar."}
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    Aún no hay órdenes de venta directa para esta empresa en el
                    rango seleccionado.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={`${o.order_id}-${o.product_title}`} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{o.folio}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDate(o.paid_at ?? o.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          o.status === "paid" || o.status === "fulfilled"
                            ? "default"
                            : o.status === "refunded" || o.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px] uppercase"
                      >
                        {STATUS_LABEL[o.status] ?? o.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{o.product_title ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{o.quantity}</td>
                    <td className="px-3 py-2 text-right">
                      {formatMoney(o.item_subtotal, o.currency)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      −{formatMoney(o.item_commission, o.currency)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {formatMoney(o.item_net, o.currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground">
        El neto mostrado es indicativo; la liquidación se realiza según los
        ciclos operativos de Valladolid.mx. Las comisiones aplicadas
        corresponden al porcentaje configurado al momento de cada venta.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${highlight ? "text-primary" : ""}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}