/**
 * /concierge/preguntas — Mensajes de viajeros sin responder.
 *
 * Sólo lectura sobre `concierge_case_notes` (visibilidad con el viajero)
 * con la RLS vigente. Ordena por antigüedad de la pregunta.
 */
import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meridaDateTime } from "@/lib/time/merida";
import { listConciergePendingQuestions } from "@/lib/concierge/concierge.functions";

export const Route = createFileRoute("/_authenticated/concierge/preguntas")({
  component: PendingQuestionsPage,
  errorComponent: ErrorComponent,
  head: () => ({
    meta: [
      { title: "Preguntas sin responder | Centro Concierge" },
      {
        name: "description",
        content: "Mensajes de viajeros que siguen esperando respuesta del equipo Concierge.",
      },
      { property: "og:title", content: "Preguntas sin responder | Centro Concierge" },
      {
        property: "og:description",
        content: "Mensajes de viajeros que siguen esperando respuesta del equipo Concierge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function PendingQuestionsPage() {
  const list = useServerFn(listConciergePendingQuestions);
  const query = useQuery({
    queryKey: ["concierge-pending-questions"],
    queryFn: () => list({ data: undefined as never }),
  });
  const rows = query.data ?? [];

  return (
    <div className="space-y-6 pb-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Central de operaciones
        </p>
        <h1 className="mt-1 font-serif text-3xl">Preguntas sin responder</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Viajeros que escribieron y todavía esperan respuesta. Los más antiguos van primero.
        </p>
      </header>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando mensajes…</p>
      ) : rows.length ? (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.case_id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {row.traveler_name ?? "Viajero sin nombre registrado"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Preguntó el {meridaDateTime(row.asked_at)}
                </p>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{row.body}</p>
              <Link
                to="/concierge/expedientes/$caseId"
                params={{ caseId: row.case_id }}
                className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
              >
                Responder en el expediente
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No hay preguntas pendientes. Todo el mundo ya tuvo respuesta.
        </p>
      )}
    </div>
  );
}
