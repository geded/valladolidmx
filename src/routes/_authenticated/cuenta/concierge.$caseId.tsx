/**
 * 14.60.2 — Customer Case File (vista del viajero).
 * Oculta enlaces internos y notas operativas.
 */
import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
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
  return (
    <section>
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Mi expediente Concierge
      </p>
      <h1 className="mt-1 mb-6 text-2xl font-semibold">Detalle del expediente</h1>
      <CaseFileView data={q.data} hideInternal />
    </section>
  );
}