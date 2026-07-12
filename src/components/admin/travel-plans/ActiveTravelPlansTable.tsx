/**
 * CV1.1 · Tabla de viajes en curso con estados separados y prioridad derivada.
 */
import type { TravelPlanOpsRow } from "@/lib/admin/travel-plans-operations.functions";
import {
  PlanStatusBadge,
  IntentBadge,
  ConciergeStatusBadge,
  ProposalStatusBadge,
  SlaBadge,
  PriorityBadge,
} from "./badges";
import { ShieldCheck } from "lucide-react";

interface Props {
  rows: TravelPlanOpsRow[];
  isLoading: boolean;
  total: number;
  limit: number;
  offset: number;
  onOffset: (o: number) => void;
  onRowClick: (row: TravelPlanOpsRow) => void;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "—";
  }
}

function ReservationCell({
  reservation,
  daysToTrip,
}: {
  reservation: TravelPlanOpsRow["reservation"];
  daysToTrip: number | null;
}) {
  if (!reservation || !reservation.folio || !reservation.is_confirmed) {
    return <span className="text-xs text-muted-foreground">Sin reservación</span>;
  }
  const label =
    daysToTrip == null
      ? "Confirmado"
      : daysToTrip > 0
        ? `Faltan ${daysToTrip} d`
        : daysToTrip === 0
          ? "Llega hoy"
          : `En viaje (+${Math.abs(daysToTrip)}d)`;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex w-fit items-center gap-1 rounded-pill bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
        <ShieldCheck className="h-3 w-3" />
        {reservation.folio}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function ActiveTravelPlansTable({
  rows,
  isLoading,
  total,
  limit,
  offset,
  onOffset,
  onRowClick,
}: Props) {
  if (!isLoading && rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <h3 className="text-lg font-medium">Sin viajes que requieran atención</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando un viajero avance su plan o reciba una propuesta, aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-3">Viajero · Plan</th>
              <th className="p-3">Reservación</th>
              <th className="p-3">Estado plan</th>
              <th className="p-3">Intención</th>
              <th className="p-3">Concierge</th>
              <th className="p-3">Propuesta</th>
              <th className="p-3">SLA</th>
              <th className="p-3">Prioridad</th>
              <th className="p-3">Viaje</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td colSpan={9} className="p-4">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              : rows.map((r) => (
                  <tr
                    key={r.plan_id}
                    onClick={() => onRowClick(r)}
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-accent/40"
                  >
                    <td className="p-3">
                      <p className="font-medium">
                        {r.traveler.display_name}
                        {r.traveler.handle ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            @{r.traveler.handle}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                        {r.title ?? "Sin título"} · {r.items_count} ítem
                        {r.items_count === 1 ? "" : "s"}
                        {r.pending_alux_count > 0
                          ? ` · ${r.pending_alux_count} Alux`
                          : ""}
                      </p>
                    </td>
                    <td className="p-3">
                      <ReservationCell reservation={r.reservation} daysToTrip={r.days_to_trip} />
                    </td>
                    <td className="p-3"><PlanStatusBadge status={r.plan_status} /></td>
                    <td className="p-3"><IntentBadge level={r.intent_level} /></td>
                    <td className="p-3"><ConciergeStatusBadge status={r.concierge.status} /></td>
                    <td className="p-3"><ProposalStatusBadge status={r.proposal.status} /></td>
                    <td className="p-3"><SlaBadge risk={r.sla_risk} /></td>
                    <td className="p-3"><PriorityBadge level={r.priority} /></td>
                    <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                      {fmtDate(r.start_date)}
                      {r.days_to_trip != null ? (
                        <span className="ml-1">
                          ({r.days_to_trip >= 0 ? `+${r.days_to_trip}d` : `${r.days_to_trip}d`})
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
        <span>
          {total === 0
            ? "0 viajes"
            : `Mostrando ${offset + 1}–${Math.min(offset + limit, total)} de ${total}`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => onOffset(Math.max(0, offset - limit))}
            className="rounded-pill border border-border bg-card px-3 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={offset + limit >= total}
            onClick={() => onOffset(offset + limit)}
            className="rounded-pill border border-border bg-card px-3 py-1 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}