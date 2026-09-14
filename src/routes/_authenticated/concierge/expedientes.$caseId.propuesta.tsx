/**
 * /concierge/expedientes/$caseId/propuesta — Estudio de Propuesta.
 * Pantalla propia del equipo Concierge para armar la propuesta del viajero.
 */
import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConciergeCaseFile } from "@/lib/concierge/concierge.functions";
import { ProposalStudio, type StudioCaseFile } from "@/components/concierge/proposal/ProposalStudio";

export const Route = createFileRoute("/_authenticated/concierge/expedientes/$caseId/propuesta")({
  component: ProposalStudioPage,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">Expediente no encontrado.</div>,
  head: () => ({
    meta: [
      { title: "Estudio de Propuesta · Concierge · Valladolid.mx" },
      {
        name: "description",
        content: "Espacio del equipo Concierge para armar la propuesta del viajero.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function ProposalStudioPage() {
  const { caseId } = Route.useParams();
  const fn = useServerFn(getConciergeCaseFile);
  const q = useSuspenseQuery(
    queryOptions({
      queryKey: ["concierge", "case-file", caseId],
      queryFn: () => fn({ data: { caseId } }),
    }),
  );
  const data = q.data as unknown as StudioCaseFile | null;

  if (!data) {
    return <p className="p-6 text-sm text-muted-foreground">Expediente no disponible.</p>;
  }

  const traveler = data.traveler?.display_name ?? "Viajero";
  const plan = data.travel_plan;

  return (
    <section className="mx-auto w-full max-w-[1400px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Concierge Workspace · Estudio de Propuesta
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Propuesta para {traveler}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Expediente {caseId.slice(0, 8).toUpperCase()}
            {plan?.party_size ? ` · ${plan.party_size} personas` : ""}
            {plan?.start_date ? ` · desde ${plan.start_date}` : ""}
            {plan?.end_date ? ` hasta ${plan.end_date}` : ""}
          </p>
        </div>
        <Link
          to="/concierge/expedientes/$caseId"
          params={{ caseId }}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted"
        >
          Volver al expediente
        </Link>
      </div>
      <ProposalStudio data={data} />
    </section>
  );
}
