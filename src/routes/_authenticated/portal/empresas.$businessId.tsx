/**
 * /portal/empresas/$businessId — Vista de detalle por empresa
 * (administración): configuración comercial, paquetes de visibilidad
 * detectados y órdenes/pagos asociados.
 */
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAdminBusinessCommercialStatus,
  type AdminBusinessCommercialStatus,
} from "@/lib/portal/portal-reads.functions";

export const Route = createFileRoute("/_authenticated/portal/empresas/$businessId")({
  component: BusinessDetailPage,
});

function BusinessDetailPage() {
  const { businessId } = useParams({ from: "/_authenticated/portal/empresas/$businessId" });
  const fetchStatus = useServerFn(getAdminBusinessCommercialStatus);

  const { data, isLoading, error } = useQuery<AdminBusinessCommercialStatus>({
    queryKey: ["portal", "admin-commercial-status", businessId],
    queryFn: () => fetchStatus({ data: { businessId } }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando detalle de empresa…</p>;
  }
  if (error || !data) {
    return (
      <div className="max-w-2xl space-y-3">
        <h1 className="text-2xl font-semibold">No pudimos cargar la empresa</h1>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Error desconocido."}
        </p>
        <Link to="/portal/empresas" className="text-sm text-primary">
          ← Volver al listado
        </Link>
      </div>
    );
  }

  const paidPackages = data.visibility_packages.filter((p) => p.payment_status === "paid");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="text-sm">
        <Link to="/portal/empresas" className="text-primary">
          ← Empresas
        </Link>
      </div>

      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Detalle de empresa
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{data.business.display_name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          /{data.business.slug} · {data.business.status}
          {data.business.verified ? " · verificada" : ""}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Plan de visibilidad"
          value={data.configuration.visibility_plan ?? inferredPlan(data)}
          sub={`${paidPackages.length} paquete(s) pagado(s)`}
        />
        <MetricCard
          label="Productos publicados"
          value={`${data.configuration.products_published}/${data.configuration.products_total}`}
          sub={`${data.configuration.accepts_online_payment} aceptan pago en línea`}
        />
        <MetricCard
          label="Órdenes pagadas"
          value={data.payments.paid_orders}
          sub={`${data.payments.orders_total} orden(es) totales`}
        />
        <MetricCard
          label="Ingreso pagado"
          value={formatMoney(data.payments.paid_amount, data.payments.currency)}
          sub="Suma de renglones pagados"
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Configuración comercial
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <InfoRow label="Productos" value={`${data.configuration.products_total}`} />
          <InfoRow label="Publicados" value={`${data.configuration.products_published}`} />
          <InfoRow label="Aceptan pago en línea" value={`${data.configuration.accepts_online_payment}`} />
          <InfoRow
            label="Elegibles para campañas"
            value={`${data.configuration.eligible_for_visibility_campaigns}`}
          />
          <InfoRow
            label="Niveles de visibilidad"
            value={`Standard ${data.configuration.visibility_levels.standard} · Destacado ${data.configuration.visibility_levels.destacado} · Premium ${data.configuration.visibility_levels.premium}`}
          />
          <InfoRow
            label="Publicada"
            value={data.business.published_at ? new Date(data.business.published_at).toLocaleDateString("es-MX") : "No publicada"}
          />
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Paquetes de visibilidad detectados
          </h2>
        </div>
        {data.visibility_packages.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium">Paquete</th>
                  <th className="px-5 py-3 font-medium">Nivel</th>
                  <th className="px-5 py-3 font-medium">Pago</th>
                  <th className="px-5 py-3 font-medium">Monto</th>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.visibility_packages.map((pkg) => (
                  <tr key={pkg.item_id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium">{pkg.product_name}</td>
                    <td className="px-5 py-3">{pkg.visibility_level ?? "—"}</td>
                    <td className="px-5 py-3">
                      <StatusPill status={pkg.payment_status} />
                    </td>
                    <td className="px-5 py-3">{formatMoney(pkg.amount, pkg.currency)}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {pkg.paid_at ? new Date(pkg.paid_at).toLocaleDateString("es-MX") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            No hay paquetes de visibilidad detectados para esta empresa.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Órdenes y pagos asociados
          </h2>
        </div>
        {data.orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium">Orden</th>
                  <th className="px-5 py-3 font-medium">Pago</th>
                  <th className="px-5 py-3 font-medium">Proveedor</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Renglones</th>
                  <th className="px-5 py-3 font-medium">Pagada</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-mono text-xs">{o.id.slice(0, 8)}…</td>
                    <td className="px-5 py-3">
                      <StatusPill status={o.payment_status} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{o.payment_provider ?? "—"}</td>
                    <td className="px-5 py-3">{formatMoney(o.total_amount, o.currency)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.items_count}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {o.paid_at ? new Date(o.paid_at).toLocaleString("es-MX") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Aún no hay órdenes vinculadas a esta empresa.
          </p>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold capitalize">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "paid"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "processing"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : status === "failed"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium uppercase ${cls}`}>
      {status || "unpaid"}
    </span>
  );
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "MXN",
  }).format(value);
}

function inferredPlan(data: AdminBusinessCommercialStatus): string {
  if (data.configuration.visibility_levels.premium > 0) return "premium";
  if (data.configuration.visibility_levels.destacado > 0) return "destacado";
  return "sin paquete";
}