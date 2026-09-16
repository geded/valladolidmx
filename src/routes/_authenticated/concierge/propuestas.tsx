/**
 * /concierge/propuestas — Todas las propuestas del Centro Concierge.
 *
 * Sólo lectura: reutiliza `listConciergeProposals` (RLS vigente) y el mismo
 * patrón de lista, filtros y paginación de Reservaciones. No crea estados.
 */
import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { meridaDate } from "@/lib/time/merida";
import { listConciergeProposals } from "@/lib/concierge/concierge.functions";

export const Route = createFileRoute("/_authenticated/concierge/propuestas")({
  component: ProposalsDeskPage,
  errorComponent: ErrorComponent,
  head: () => ({
    meta: [
      { title: "Propuestas | Centro Concierge" },
      {
        name: "description",
        content: "Propuestas enviadas, aceptadas y por ajustar del Centro Concierge.",
      },
      { property: "og:title", content: "Propuestas | Centro Concierge" },
      {
        property: "og:description",
        content: "Propuestas enviadas, aceptadas y por ajustar del Centro Concierge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  viewed: "Vista",
  accepted: "Aceptada",
  rejected: "Rechazada",
  withdrawn: "Retirada",
  superseded: "Reemplazada",
  expired: "Vencida",
};

const money = (cents: number, currency = "MXN") =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    cents / 100,
  );

function ProposalsDeskPage() {
  const list = useServerFn(listConciergeProposals);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["concierge-proposals", search, status, page],
    queryFn: () => list({ data: { search, status, page, pageSize: 50 } }),
  });
  const data = query.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6 pb-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Central de operaciones
        </p>
        <h1 className="mt-1 font-serif text-3xl">Propuestas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Qué se le propuso a cada viajero, en qué versión va y si ya quedó pagada.
        </p>
      </header>

      <section className="space-y-3" aria-label="Filtros">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            placeholder="Buscar por resumen de la propuesta"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Todos los estados</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Viajero</th>
              <th className="p-3">Propuesta</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Enviada</th>
              <th className="p-3">Reservación</th>
              <th className="p-3 text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Cargando propuestas…
                </td>
              </tr>
            ) : data?.rows.length ? (
              data.rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0">
                  <td className="p-3">
                    <Link
                      to="/concierge/expedientes/$caseId"
                      params={{ caseId: row.case_id }}
                      className="font-semibold text-primary hover:underline"
                    >
                      {row.traveler_name ?? "Viajero sin nombre registrado"}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {row.case_summary ?? "Sin resumen del expediente"}
                    </p>
                  </td>
                  <td className="p-3">
                    <span className="text-sm">Versión {row.version}</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.items_count} partidas
                    </p>
                  </td>
                  <td className="p-3">{STATUS_LABEL[row.status] ?? row.status}</td>
                  <td className="p-3 text-muted-foreground">
                    {row.sent_at ? meridaDate(row.sent_at) : "Sin enviar"}
                  </td>
                  <td className="p-3">
                    {row.order_folio ? (
                      <span className="font-mono text-xs">
                        {row.order_folio}
                        {row.order_paid_at ? " · pagada" : " · por cobrar"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin reservación</span>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {money(row.total_amount_cents, row.currency)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No hay propuestas con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <nav className="flex items-center justify-between gap-3" aria-label="Paginación">
        <p className="text-xs text-muted-foreground">
          {data ? `${data.total} propuestas · página ${data.page} de ${pages}` : ""}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </nav>
    </div>
  );
}
