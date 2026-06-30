/**
 * 14.60.2 — Customer Case File (vista interna concierge/lead).
 */
import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConciergeCaseFile } from "@/lib/concierge/concierge.functions";
import { CaseFileView } from "@/components/concierge/CaseFileView";

export const Route = createFileRoute("/_authenticated/concierge/expedientes/$caseId")({
  component: StaffCasePage,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">Expediente no encontrado.</div>,
  head: () => ({
    meta: [
      { title: "Expediente Concierge · Valladolid.mx" },
      { name: "description", content: "Vista única del expediente Concierge." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function StaffCasePage() {
  const { caseId } = Route.useParams();
  const fn = useServerFn(getConciergeCaseFile);
  const q = useSuspenseQuery(
    queryOptions({
      queryKey: ["concierge", "case-file", caseId],
      queryFn: () => fn({ data: { caseId } }),
    }),
  );
  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 py-10">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Concierge Workspace · Expediente
      </p>
      <h1 className="mt-1 mb-6 text-2xl font-semibold">Customer Case File</h1>
      <CaseFileView data={q.data} />
    </main>
  );
}