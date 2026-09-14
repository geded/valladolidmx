/**
 * 14.60.1 — Concierge Workspace · Vista del viajero (lectura).
 * Lista los expedientes propios del viajero vía concierge_case_list_for_role(traveler).
 */
import {
  createFileRoute,
  ErrorComponent,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Clock3, Headset } from "lucide-react";
import { listConciergeCases, type ConciergeCase } from "@/lib/concierge/concierge.functions";

const CASE_STATUS: Record<string, { label: string; detail: string }> = {
  new: { label: "Recibido", detail: "Esperando revisión del equipo Concierge" },
  triaged: { label: "En revisión", detail: "El equipo está revisando lo que elegiste" },
  in_progress: { label: "Preparando propuesta", detail: "Tu Concierge está coordinando opciones" },
  waiting_business: {
    label: "Consultando disponibilidad",
    detail: "Estamos esperando respuestas para completar tu propuesta",
  },
  waiting_customer: { label: "Necesitamos tu respuesta", detail: "Revisa el expediente y responde" },
  resolved: { label: "Atendido", detail: "Tu solicitud ya fue atendida" },
  closed_won: { label: "Viaje confirmado", detail: "Tu propuesta fue confirmada" },
  closed_lost: { label: "Finalizado", detail: "Este expediente ha finalizado" },
  archived: { label: "Archivado", detail: "Este expediente está archivado" },
};

const SOURCE_LABELS: Record<string, string> = {
  travel_plan: "Mi Viaje",
  marketplace_product: "Experiencia seleccionada",
  manual: "Solicitud al Concierge",
};

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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/cuenta/concierge" && pathname !== "/cuenta/concierge/") {
    return <Outlet />;
  }

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
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Concierge</p>
        <h1 className="mt-1 text-2xl font-semibold">Mis expedientes Concierge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revisa el estado de tus expedientes y las propuestas del equipo Concierge.
        </p>
      </header>

      {q.data.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
          Aún no tienes expedientes Concierge.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {q.data.map((c) => {
            const status = CASE_STATUS[c.status] ?? {
              label: "En seguimiento",
              detail: "Tu Concierge continúa atendiendo esta solicitud",
            };
            return (
              <li key={c.id}>
                <Link
                  to="/cuenta/concierge/$caseId"
                  params={{ caseId: c.id }}
                  className="group block rounded-lg border border-border bg-card p-4 text-sm shadow-soft transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Headset className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                          {status.label}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          Ref. {c.id.slice(0, 8)}
                        </span>
                      </div>
                      <h2 className="mt-3 font-semibold text-foreground">
                        {c.summary ?? "Viaje enviado al Concierge"}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">{status.detail}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-3.5" aria-hidden />
                          Actualizado {new Date(c.updated_at).toLocaleString("es-MX")}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-primary">
                          Ver seguimiento
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </span>
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Origen: {SOURCE_LABELS[c.source] ?? "Solicitud de viaje"}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
