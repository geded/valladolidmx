/**
 * /portal/pagos — vista administrativa por empresa para pagos y visibilidad.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAdminBusinessCommercialStatus,
  listMyBusinesses,
  type AdminBusinessCommercialStatus,
} from "@/lib/portal/portal-reads.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/pagos")({
  component: PortalPaymentsPage,
});

function useActiveBusinessId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setId(window.localStorage.getItem(STORAGE_KEY));
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setId(event.newValue);
    };
    const onCustom = (event: Event) => {
      setId((event as CustomEvent<string>).detail ?? window.localStorage.getItem(STORAGE_KEY));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("portal:active-business-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("portal:active-business-changed", onCustom);
    };
  }, []);
  return id;
}

function PortalPaymentsPage() {
  const activeBusinessId = useActiveBusinessId();
  const fetchBusinesses = useServerFn(listMyBusinesses);
  const fetchCommercialStatus = useServerFn(getAdminBusinessCommercialStatus);

  const { data: businesses = [] } = useQuery({
    queryKey: ["portal", "my-businesses"],
    queryFn: () => fetchBusinesses(),
    staleTime: 60_000,
  });
  const activeBusiness = useMemo(
    () => businesses.find((b) => b.business_id === activeBusinessId) ?? null,
    [businesses, activeBusinessId],
  );

  const statusQuery = useQuery({
    queryKey: ["portal", "admin-commercial-status", activeBusinessId],
    queryFn: () =>
      fetchCommercialStatus({ data: { businessId: activeBusinessId as string } }),
    enabled: Boolean(activeBusinessId && activeBusiness?.role === "admin"),
    staleTime: 30_000,
  });

  if (!activeBusinessId || !activeBusiness) {
    return (
      <EmptyState
        title="Selecciona una empresa"
        body="Elige una empresa en el selector lateral para revisar su configuración comercial."
      />
    );
  }

  if (activeBusiness.role !== "admin") {
    return (
      <EmptyState
        title="Vista reservada a administración"
        body="Los pagos y paquetes de visibilidad se revisan desde una cuenta administradora de la plataforma."
      />
    );
  }

  if (statusQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando pagos y visibilidad…</p>;
  }

  if (statusQuery.isError || !statusQuery.data) {
    return (
      <EmptyState
        title="No pudimos cargar pagos y visibilidad"
        body={
          statusQuery.error instanceof Error
            ? statusQuery.error.message
            : "Error desconocido."
        }
      />
    );
  }

  return <CommercialStatusView data={statusQuery.data} />;
}

function CommercialStatusView({ data }: { data: AdminBusinessCommercialStatus }) {
  const paidVisibilityPackages = data.visibility_packages.filter(
    (pkg) => pkg.payment_status === "paid",
  );
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial · Administración
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Pagos y visibilidad</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.business.display_name} · /{data.business.slug}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Estado de ficha"
          value={data.business.status}
          sub={data.business.verified ? "Verificada" : "No verificada"}
        />
        <MetricCard
          label="Plan de visibilidad"
          value={data.configuration.visibility_plan ?? inferredPlan(data)}
          sub={`${paidVisibilityPackages.length} paquete(s) pagado(s)`}
        />
        <MetricCard
          label="Órdenes pagadas"
          value={data.payments.paid_orders}
          sub={`${data.payments.orders_total} orden(es) vinculadas`}
        />
        <MetricCard
          label="Ingreso pagado"
          value={formatMoney(data.payments.paid_amount, data.payments.currency)}
          sub="Calculado sobre renglones de esta empresa"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Configuración comercial
          </h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <InfoRow label="Productos" value={`${data.configuration.products_total}`} />
            <InfoRow label="Productos publicados" value={`${data.configuration.products_published}`} />
            <InfoRow label="Aceptan pago en línea" value={`${data.configuration.accepts_online_payment}`} />
            <InfoRow
              label="Elegibles para campañas"
              value={`${data.configuration.eligible_for_visibility_campaigns}`}
            />
            <InfoRow
              label="Niveles de visibilidad"
              value={`Standard ${data.configuration.visibility_levels.standard} · Destacado ${data.configuration.visibility_levels.destacado} · Premium ${data.configuration.visibility_levels.premium}`}
            />
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Pagos
          </h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <InfoRow label="Pagadas" value={`${data.payments.paid_orders}`} />
            <InfoRow label="En proceso" value={`${data.payments.processing_orders}`} />
            <InfoRow label="Fallidas" value={`${data.payments.failed_orders}`} />
            <InfoRow label="Sin pago" value={`${data.payments.unpaid_orders}`} />
          </dl>
          <Link
            to="/cms/pagos"
            className="mt-5 inline-flex rounded-md border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
          >
            Ver panel global de pagos
          </Link>
        </div>
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
            No hay paquetes de visibilidad pagados o configurados para esta empresa.
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

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Link to="/portal" className="mt-4 inline-block text-sm text-primary">
        Volver al resumen
      </Link>
    </div>
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