import { portalErrorMessage } from "@/lib/portal/error-messages";
/**
 * StayRequestsPanel — solicitudes de hospedaje que el hotel confirma o
 * rechaza dentro de 12 horas (Portal · Ventas en línea).
 * Solo aparece cuando la empresa tiene solicitudes.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { decideStay, listStayRequests, type StayRequestRow } from "@/lib/commerce/stay-requests.functions";

function day(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1),
  );
}

function money(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

function statusLabel(r: StayRequestRow): { text: string; waiting: boolean } {
  const expired = r.confirmBy ? new Date(r.confirmBy).getTime() <= Date.now() : false;
  if (r.stayStatus === "pending_host" && r.orderStatus === "draft")
    return expired ? { text: "Venció sin respuesta", waiting: false } : { text: "Por confirmar", waiting: true };
  if (r.stayStatus === "declined") return { text: "Rechazada", waiting: false };
  if (r.orderStatus === "paid" || r.orderStatus === "fulfilled") return { text: "Pagada", waiting: false };
  if (r.orderStatus === "awaiting_payment") return { text: "Confirmada · por pagar", waiting: false };
  if (r.orderStatus === "cancelled") return { text: "Cancelada", waiting: false };
  return { text: r.orderStatus, waiting: false };
}

function RequestCard({ row, businessId }: { row: StayRequestRow; businessId: string }) {
  const qc = useQueryClient();
  const decide = useServerFn(decideStay);
  const [note, setNote] = useState("");
  const status = statusLabel(row);
  const m = useMutation({
    mutationFn: (accept: boolean) => decide({ data: { orderId: row.orderId, accept, note: note.trim() || undefined } }),
    onSuccess: (res) => {
      toast.success(res.result === "confirmed" ? "Reserva confirmada; el huésped ya puede pagar" : "Solicitud rechazada");
      void qc.invalidateQueries({ queryKey: ["portal", "stay-requests", businessId] });
    },
    onError: (err) => toast.error(portalErrorMessage(err)),
  });

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{row.roomName}</p>
          <p className="text-sm text-muted-foreground">
            {day(row.checkIn)} → {day(row.checkOut)} · {row.nights} {row.nights === 1 ? "noche" : "noches"} ·{" "}
            {row.guests} {row.guests === 1 ? "huésped" : "huéspedes"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Folio {row.folio}
            {row.travelerName ? ` · ${row.travelerName}` : ""} · {money(row.totalCents)}
          </p>
        </div>
        <Badge variant={status.waiting ? "default" : "outline"}>{status.text}</Badge>
      </div>
      {status.waiting ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Responde antes del{" "}
            {row.confirmBy
              ? new Intl.DateTimeFormat("es-MX", {
                  timeZone: "America/Merida",
                  weekday: "long",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(row.confirmBy))
              : ""}{" "}
            (hora de Valladolid).
          </p>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Mensaje para el huésped (opcional)"
            aria-label={`Mensaje para el huésped del folio ${row.folio}`}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => m.mutate(true)} disabled={m.isPending}>
              Confirmar reserva
            </Button>
            <Button size="sm" variant="outline" onClick={() => m.mutate(false)} disabled={m.isPending}>
              No tengo disponibilidad
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function StayRequestsPanel({ businessId }: { businessId: string }) {
  const fetchRequests = useServerFn(listStayRequests);
  const q = useQuery({
    queryKey: ["portal", "stay-requests", businessId],
    queryFn: () => fetchRequests({ data: { businessId } }),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
  const rows = q.data ?? [];
  if (rows.length === 0) return null;
  const waiting = rows.filter((r) => statusLabel(r).waiting).length;

  return (
    <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">Hospedaje</p>
        <h2 className="mt-1 text-xl font-semibold">Solicitudes de reserva</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {waiting > 0
            ? `${waiting} por confirmar. Tienes 12 horas para responder; mientras, las noches quedan apartadas.`
            : "Sin solicitudes pendientes."}
        </p>
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <RequestCard key={r.orderId} row={r} businessId={businessId} />
        ))}
      </ul>
    </section>
  );
}
