/**
 * 15.10.4c — Founder Cockpit Composable.
 *
 * Componentes de presentación de los Smart Blocks del Cockpit. Se invocan
 * exclusivamente desde el `composition-renderer` cuando un bloque
 * `vmx.cockpit.*` aparece en una composición. NO se importan en rutas
 * directamente; la composición del Cockpit pasa por el Block Registry.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFounderKpis, type FounderKpis } from "@/lib/admin/founder.functions";
import { listMyNotificationDeliveries } from "@/lib/notifications/notifications.functions";

function CockpitCard({
  title,
  children,
  meta,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {meta ? (
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CockpitKpiGrid({
  title,
  window,
  domain,
}: {
  title: string;
  window: string;
  domain: string;
}) {
  const fn = useServerFn(getFounderKpis);
  const { data, isLoading, error } = useQuery({
    queryKey: ["cockpit", "kpis", window, domain],
    queryFn: () => fn(),
    staleTime: 30_000,
  });

  return (
    <CockpitCard title={title} meta={`${window.toUpperCase()} · ${domain}`}>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando KPIs…</p>
      ) : error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {(error as Error).message}
        </p>
      ) : data ? (
        <KpiCards data={data} />
      ) : null}
    </CockpitCard>
  );
}

function KpiCards({ data }: { data: FounderKpis }) {
  const cards: Array<{ label: string; value: string | number; sub?: string }> = [
    { label: "Empresas activas", value: data.businesses.active, sub: `${data.businesses.total} totales` },
    { label: "Viajeros", value: data.travelers.total },
    { label: "Concierges activos", value: data.concierges.active },
    { label: "Casos abiertos", value: data.cases.open, sub: `${data.cases.overdue} vencidos` },
    { label: "Propuestas enviadas", value: data.proposals.sent, sub: `${data.proposals.accepted} aceptadas` },
    { label: "Cotizaciones", value: data.quotes.submitted },
    { label: "Reservas pagadas", value: data.orders.paid },
    {
      label: "Ventas",
      value: new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: data.revenue.currency || "MXN",
        maximumFractionDigits: 0,
      }).format((data.revenue.gross_cents ?? 0) / 100),
    },
    { label: "Alertas", value: data.system.alerts_open },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <article key={c.label} className="rounded-xl border border-border/60 bg-background p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {c.label}
          </p>
          <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          {c.sub ? <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p> : null}
        </article>
      ))}
    </div>
  );
}

export function CockpitAlerts({ title, limit }: { title: string; limit: number }) {
  const fn = useServerFn(listMyNotificationDeliveries);
  const { data, isLoading, error } = useQuery({
    queryKey: ["cockpit", "alerts", limit],
    queryFn: () => fn({ data: { limit, onlyUnread: true } }),
    staleTime: 30_000,
  });
  const items = (data?.items ?? []) as Array<Record<string, unknown>>;

  return (
    <CockpitCard title={title} meta={`${items.length} sin leer`}>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando alertas…</p>
      ) : error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {(error as Error).message}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin alertas activas.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, limit).map((item, idx) => (
            <li
              key={String(item.id ?? idx)}
              className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
            >
              <p className="font-medium">{String(item.title ?? item.channel ?? "Notificación")}</p>
              <p className="text-xs text-muted-foreground">
                {String(item.body ?? item.payload ?? "")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </CockpitCard>
  );
}

export function CockpitActivityStream({
  title,
  limit,
}: {
  title: string;
  limit: number;
}) {
  // Lectura placeholder; los readers existentes de observability se conectarán
  // en una iteración menor sin tocar el contrato del bloque.
  return (
    <CockpitCard title={title} meta={`últimos ${limit}`}>
      <p className="text-sm text-muted-foreground">
        Flujo de actividad operativa — pendiente de conectarse a los readers de
        observabilidad sin modificar el contrato del bloque.
      </p>
    </CockpitCard>
  );
}