/**
 * CaseItineraryPanel — Itinerario del viaje y ajuste del itinerario aprobado.
 *
 * Delta mínimo sobre el expediente existente: sólo agrega visibilidad del
 * plan armado y la conciliación entre lo aprobado y lo cobrado. No modifica
 * CaseFileView ni el Estudio de Propuesta.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { meridaClock, meridaDate } from "@/lib/time/merida";
import {
  getCaseItinerary,
  getCaseAdjustmentSummary,
  createItineraryAdjustmentCharge,
  registerItineraryCreditNote,
  applyProposalScheduleToPlan,
  aluxScheduleCaseItinerary,
} from "@/lib/concierge/proposal-studio.functions";


const money = (cents: number, currency = "MXN") =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(cents / 100);

const KIND_LABEL: Record<string, string> = {
  destination: "Destino",
  business: "Empresa",
  product: "Experiencia",
  event: "Evento",
  route: "Ruta",
  place: "Lugar",
  note: "Nota",
};

export function CaseItineraryPanel({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const itineraryFn = useServerFn(getCaseItinerary);
  const summaryFn = useServerFn(getCaseAdjustmentSummary);
  const chargeFn = useServerFn(createItineraryAdjustmentCharge);
  const creditFn = useServerFn(registerItineraryCreditNote);
  const applyFn = useServerFn(applyProposalScheduleToPlan);


  const itinerary = useQuery({
    queryKey: ["concierge", "case-itinerary", caseId],
    queryFn: () => itineraryFn({ data: { caseId } }),
  });
  const summary = useQuery({
    queryKey: ["concierge", "case-adjustment", caseId],
    queryFn: () => summaryFn({ data: { caseId } }),
  });

  const [amount, setAmount] = useState("");

  const charge = useMutation({
    mutationFn: (cents: number) =>
      chargeFn({ data: { caseId, amountCents: cents, title: "Ajuste de itinerario" } }),
    onSuccess: () => {
      toast.success("Cobro complementario creado. Ya aparece en Reservaciones.");
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["concierge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const credit = useMutation({
    mutationFn: (cents: number) => creditFn({ data: { caseId, amountCents: cents } }),
    onSuccess: () => {
      toast.success("Saldo a favor registrado en el historial del expediente.");
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["concierge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const plan = itinerary.data;
  type Stop = NonNullable<typeof plan>["stops"][number];
  /** -1 agrupa las paradas que todavía no tienen día asignado. */
  const days = new Map<number, Stop[]>();
  for (const stop of plan?.stops ?? []) {
    const day = stop.day_index ?? -1;
    const list = days.get(day) ?? [];
    list.push(stop);
    days.set(day, list);
  }
  const applySchedule = useMutation({
    mutationFn: (proposalId: string) => applyFn({ data: { proposalId } }),
    onSuccess: (r) => {
      toast.success(`Horarios aplicados al viaje (${r.applied} paradas).`);
      void queryClient.invalidateQueries({ queryKey: ["concierge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const diff = summary.data?.difference_cents ?? 0;
  const currency = summary.data?.currency ?? "MXN";
  const parsedAmount = Math.round(Number(amount.replace(/[^\d.]/g, "")) * 100);

  return (
    <div className="mb-6 space-y-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Itinerario del viaje
        </h2>
        {itinerary.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Cargando itinerario…</p>
        ) : plan ? (
          <>
            <p className="mt-1 font-serif text-xl">{plan.title ?? "Viaje sin nombre"}</p>
            <p className="text-sm text-muted-foreground">
              {plan.start_date ? meridaDate(plan.start_date) : "Sin fecha de inicio"}
              {plan.end_date ? ` — ${meridaDate(plan.end_date)}` : ""}
              {plan.party_size ? ` · ${plan.party_size} personas` : ""}
            </p>
            {plan.scheduled_count === 0 && plan.stops.length ? (
              <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                <p className="font-medium">Este viaje todavía no tiene día ni hora asignados.</p>
                <p className="mt-1 text-muted-foreground">
                  Por eso se ve igual que la propuesta: son las mismas paradas, pero sin agenda. Los
                  días y horas se capturan en el Estudio de Propuesta y luego se aplican al viaje.
                </p>
                {plan.latest_proposal_id && plan.proposal_scheduled_count > 0 ? (
                  <Button
                    className="mt-3"
                    size="sm"
                    disabled={applySchedule.isPending}
                    onClick={() => applySchedule.mutate(plan.latest_proposal_id as string)}
                  >
                    Aplicar horarios de la propuesta al viaje
                  </Button>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    La propuesta tampoco tiene día ni hora: captúralos primero en el Estudio de
                    Propuesta.
                  </p>
                )}
              </div>
            ) : null}
            {days.size ? (
              <div className="mt-4 space-y-4">
                {[...days.entries()]
                  .sort((a, b) => a[0] - b[0])
                  .map(([day, stops]) => (
                    <div key={day}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {day < 0 ? "Sin día asignado" : `Día ${day + 1}`}
                      </p>

                      <ul className="mt-2 space-y-2">
                        {stops.map((stop) => (
                          <li
                            key={stop.id}
                            className="rounded-md border border-border/60 bg-background p-3"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <p className="text-sm font-medium">
                                {stop.title ?? KIND_LABEL[stop.item_kind] ?? "Parada"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {stop.starts_at_local
                                  ? meridaClock(stop.starts_at_local)
                                  : "Sin hora"}
                                {stop.duration_minutes ? ` · ${stop.duration_minutes} min` : ""}
                              </p>
                            </div>
                            {stop.notes ? (
                              <p className="mt-1 text-xs text-muted-foreground">{stop.notes}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                El viaje todavía no tiene paradas cargadas.
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Este expediente todavía no tiene un viaje con itinerario.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ajustar el itinerario aprobado
        </h2>
        {summary.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Calculando…</p>
        ) : summary.data ? (
          <>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Aprobado al viajero</dt>
                <dd className="font-serif text-lg">
                  {money(summary.data.approved_cents, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Ya cobrado</dt>
                <dd className="font-serif text-lg">{money(summary.data.paid_cents, currency)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Por cobrar abierto</dt>
                <dd className="font-serif text-lg">
                  {money(summary.data.pending_cents, currency)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-sm">
              {diff > 0
                ? `Falta cobrar ${money(diff, currency)} para cubrir lo aprobado.`
                : diff < 0
                  ? `Hay ${money(-diff, currency)} cobrados de más: registra el saldo a favor.`
                  : "Lo aprobado y lo cobrado coinciden."}
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="block text-xs text-muted-foreground">
                  Importe del ajuste (pesos)
                </span>
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 w-40"
                />
              </label>
              <Button
                disabled={!Number.isFinite(parsedAmount) || parsedAmount <= 0 || charge.isPending}
                onClick={() => charge.mutate(parsedAmount)}
              >
                Crear cobro complementario
              </Button>
              <Button
                variant="outline"
                disabled={!Number.isFinite(parsedAmount) || parsedAmount <= 0 || credit.isPending}
                onClick={() => credit.mutate(parsedAmount)}
              >
                Registrar saldo a favor
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              El cobro complementario nace con su propio folio del día y no toca el pago original.
              El saldo a favor queda anotado en el historial; no se devuelve dinero automáticamente.
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
}
