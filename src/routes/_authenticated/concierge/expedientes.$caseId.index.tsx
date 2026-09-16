/**
 * /concierge/expedientes/$caseId — Expediente (migrado 1:1 a 15.10.5c.2).
 */
import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConciergeCaseFile } from "@/lib/concierge/concierge.functions";
import { CaseFileView } from "@/components/concierge/CaseFileView";
import { CaseMessages } from "@/components/concierge/CaseMessages";
import { getConciergeReservationForCase, reservationPaymentLabel } from "@/lib/concierge/orders.functions";

export const Route = createFileRoute("/_authenticated/concierge/expedientes/$caseId/")({
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
  const getReservation = useServerFn(getConciergeReservationForCase);
  const reservation = useQuery({ queryKey: ["concierge", "case-reservation", caseId], queryFn: () => getReservation({ data: { caseId } }) });
  return (
    <section className="mx-auto w-full max-w-[1100px]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Concierge Workspace · Expediente
      </p>
      <h1 className="mt-1 mb-6 text-2xl font-semibold">Detalle del expediente</h1>
      <div className="mb-6">
        <CaseMessages caseId={caseId} internal />
      </div>
      {reservation.data ? (
        <section className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reservación y pago</p><p className="mt-1 font-mono text-lg font-semibold">{reservation.data.folio}</p><p className="mt-1 text-sm text-muted-foreground">{reservationPaymentLabel(reservation.data.payment_provider, reservation.data.paid_at)} · {reservation.data.status}</p></div>
            <div className="text-right"><p className="font-serif text-2xl">{new Intl.NumberFormat("es-MX", { style: "currency", currency: reservation.data.currency }).format(reservation.data.total_amount / 100)}</p><Link to="/concierge/reservaciones/$orderId" params={{ orderId: reservation.data.id }} className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline">Ver reservación completa</Link></div>
          </div>
          {!reservation.data.paid_at ? <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">La propuesta fue aceptada, pero el cobro sigue pendiente.</p> : null}
        </section>
      ) : null}
      <CaseFileView data={q.data} />
    </section>
  );
}
