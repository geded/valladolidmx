/**
 * 14.60.2 — Customer Case File (vista del viajero).
 * Oculta enlaces internos y notas operativas.
 */
import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConciergeCaseFile } from "@/lib/concierge/concierge.functions";
import { CaseFileView } from "@/components/concierge/CaseFileView";

export const Route = createFileRoute("/_authenticated/cuenta/concierge/$caseId")({
  component: TravelerCasePage,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">Expediente no encontrado.</div>,
  head: () => ({
    meta: [
      { title: "Mi expediente Concierge · Valladolid.mx" },
      { name: "description", content: "Tu expediente con el concierge humano." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function TravelerCasePage() {
  const { caseId } = Route.useParams();
  const fn = useServerFn(getConciergeCaseFile);
  const q = useSuspenseQuery(
    queryOptions({
      queryKey: ["concierge", "case-file", "traveler", caseId],
      queryFn: () => fn({ data: { caseId } }),
    }),
  );
  const status =
    (q.data as { case?: { status?: string } } | null)?.case?.status ?? "";
  const isClosed = ["closed_won", "closed_lost", "archived"].includes(status);
  return (
    <section>
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Mi expediente Concierge
      </p>
      <div className="mt-1 mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Detalle del expediente</h1>
        {isClosed ? (
          <Link
            to="/cuenta/concierge/$caseId/evaluar"
            params={{ caseId }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Evaluar este caso
          </Link>
        ) : null}
      </div>
      <CaseFileView data={q.data} hideInternal />
    </section>
  );
}