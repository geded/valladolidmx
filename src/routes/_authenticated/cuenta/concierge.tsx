/**
 * 14.60.1 — Concierge Workspace · Vista del viajero (lectura).
 * Lista los expedientes propios del viajero vía concierge_case_list_for_role(traveler).
 */
import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listConciergeCases,
  type ConciergeCase,
} from "@/lib/concierge/concierge.functions";

export const Route = createFileRoute("/_authenticated/cuenta/concierge")({
  component: TravelerConciergePage,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">No encontrado.</div>,
  head: () => ({
    meta: [
      { title: "Mis expedientes Concierge · Valladolid.mx" },
      { name: "description", content: "Expedientes Concierge del viajero." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function TravelerConciergePage() {
  const fn = useServerFn(listConciergeCases);
  const q = useSuspenseQuery(
    queryOptions({
      queryKey: ["concierge", "cases", "traveler"],
      queryFn: () => fn({ data: { scope: "traveler", limit: 50 } }) as Promise<ConciergeCase[]>,
    }),
  );

  return (
    <section>
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Ola 6 · Concierge
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Mis expedientes Concierge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vista de lectura. Próximamente podrás revisar propuestas y aceptar cotizaciones desde aquí.
        </p>
      </header>

      {q.data.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
          Aún no tienes expedientes Concierge.
        </p>
      ) : (
        <ul className="mt-6 grid gap-2">
          {q.data.map((c) => (
            <li key={c.id} className="rounded-md border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground">{c.id.slice(0, 8)}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {c.status}
                </span>
              </div>
              <p className="mt-2 font-medium">{c.summary ?? "Sin resumen"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Origen: {c.source} · Actualizado {new Date(c.updated_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}