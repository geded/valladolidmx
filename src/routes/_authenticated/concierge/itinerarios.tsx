/**
 * /concierge/itinerarios — Viajes con itinerario armado.
 *
 * Sólo lectura sobre `travel_plans` / `travel_plan_items` con la RLS vigente.
 * Mismo patrón de lista, búsqueda y paginación que Reservaciones.
 */
import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { meridaDate } from "@/lib/time/merida";
import { listConciergeItineraries } from "@/lib/concierge/proposal-studio.functions";

export const Route = createFileRoute("/_authenticated/concierge/itinerarios")({
  component: ItinerariesDeskPage,
  errorComponent: ErrorComponent,
  head: () => ({
    meta: [
      { title: "Itinerarios | Centro Concierge" },
      {
        name: "description",
        content: "Viajes con itinerario armado por el equipo Concierge, día por día.",
      },
      { property: "og:title", content: "Itinerarios | Centro Concierge" },
      {
        property: "og:description",
        content: "Viajes con itinerario armado por el equipo Concierge, día por día.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const PLAN_STATUS: Record<string, string> = {
  draft: "Borrador",
  active: "Activo",
  shared_with_concierge: "Con el Concierge",
  archived: "Archivado",
};

function ItinerariesDeskPage() {
  const list = useServerFn(listConciergeItineraries);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["concierge-itineraries", search, page],
    queryFn: () => list({ data: { search, page, pageSize: 50 } }),
  });
  const data = query.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6 pb-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Central de operaciones
        </p>
        <h1 className="mt-1 font-serif text-3xl">Itinerarios</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Los viajes que ya tienen un plan armado, con sus fechas y cuántas paradas incluyen.
        </p>
      </header>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9"
          placeholder="Buscar por nombre del viaje"
        />
      </div>

      <section className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Viaje</th>
              <th className="p-3">Fechas</th>
              <th className="p-3">Personas</th>
              <th className="p-3">Paradas</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Expediente</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Cargando itinerarios…
                </td>
              </tr>
            ) : data?.rows.length ? (
              data.rows.map((row) => (
                <tr key={row.plan_id} className="border-b border-border/60 last:border-0">
                  <td className="p-3 font-medium">{row.title ?? "Viaje sin nombre"}</td>
                  <td className="p-3 text-muted-foreground">
                    {row.start_date ? meridaDate(row.start_date) : "Sin fecha"}
                    {row.end_date ? ` — ${meridaDate(row.end_date)}` : ""}
                  </td>
                  <td className="p-3 tabular-nums">{row.party_size ?? "—"}</td>
                  <td className="p-3 tabular-nums">{row.items_count}</td>
                  <td className="p-3">
                    {row.status ? (PLAN_STATUS[row.status] ?? row.status) : "—"}
                  </td>
                  <td className="p-3">
                    {row.case_id ? (
                      <Link
                        to="/concierge/expedientes/$caseId"
                        params={{ caseId: row.case_id }}
                        className="text-primary hover:underline"
                      >
                        Abrir expediente
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin expediente</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Todavía no hay viajes con itinerario armado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <nav className="flex items-center justify-between gap-3" aria-label="Paginación">
        <p className="text-xs text-muted-foreground">
          {data ? `${data.total} itinerarios · página ${data.page} de ${pages}` : ""}
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
