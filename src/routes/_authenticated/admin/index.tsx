/**
 * /admin — Visión global del Fundador (Adenda 15.10.4 · Fase 1).
 * KPIs globales: empresas, viajeros, concierge, casos, propuestas,
 * cotizaciones, reservas, ventas, sistema.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFounderKpis, type FounderKpis } from "@/lib/admin/founder.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
  head: () => ({
    meta: [
      { title: "Panel Fundador · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminDashboard() {
  const fn = useServerFn(getFounderKpis);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "founder-kpis"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });

  return (
    <div className="max-w-5xl">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Etapa 15.10.4 · Panel Fundador
        </p>
        <h1 className="mt-2 text-3xl">Visión global de la plataforma</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Métricas operativas en tiempo real. Solo accesible para roles de
          gobierno (super administrador y administrador).
        </p>
      </header>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando KPIs…</p>
      ) : error ? (
        <p className="mt-8 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          No pudimos cargar las métricas: {(error as Error).message}
        </p>
      ) : data ? (
        <KpiGrid data={data} />
      ) : null}
    </div>
  );
}

function KpiGrid({ data }: { data: FounderKpis }) {
  const cards: Array<{ label: string; value: string | number; sub?: string }> = [
    { label: "Empresas activas", value: data.businesses.active, sub: `${data.businesses.total} totales` },
    { label: "Viajeros registrados", value: data.travelers.total },
    { label: "Concierge activos", value: data.concierges.active, sub: `${data.concierges.total} con rol` },
    { label: "Casos abiertos", value: data.cases.open, sub: `${data.cases.overdue} vencidos` },
    { label: "Propuestas enviadas", value: data.proposals.sent, sub: `${data.proposals.accepted} aceptadas` },
    { label: "Cotizaciones emitidas", value: data.quotes.submitted, sub: `${data.quotes.total} totales` },
    { label: "Reservas pagadas", value: data.orders.paid, sub: `${data.orders.total} órdenes` },
    {
      label: "Ventas acumuladas",
      value: new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: data.revenue.currency || "MXN",
        maximumFractionDigits: 0,
      }).format((data.revenue.gross_cents ?? 0) / 100),
    },
    { label: "Alertas de sistema", value: data.system.alerts_open },
  ];
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <article key={c.label} className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {c.label}
          </p>
          <p className="mt-2 text-3xl font-semibold">{c.value}</p>
          {c.sub ? <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p> : null}
        </article>
      ))}
      <p className="col-span-full text-[11px] text-muted-foreground">
        Generado: {new Date(data.generated_at).toLocaleString()}
      </p>
    </section>
  );
}