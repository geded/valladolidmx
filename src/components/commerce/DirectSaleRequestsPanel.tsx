/**
 * DirectSaleRequestsPanel — Administración: solicitudes de venta en línea.
 *
 * Paso 2 del plan "Experiencias: la sección que vende en línea".
 * Lista las solicitudes de las empresas, permite autorizar (fijando comisión),
 * rechazar con motivo y retirar una autorización vigente. Historial visible.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  listDirectSaleRequests,
  decideDirectSaleRequest,
  revokeDirectSaleAuthorization,
  DIRECT_SALE_REQUEST_LABEL,
  type DirectSaleRequestRow,
  type DirectSaleRequestStatus,
} from "@/lib/commerce/direct-sale-authorizations.functions";

const FILTERS: Array<{ value: "all" | DirectSaleRequestStatus; label: string }> = [
  { value: "pending", label: "En revisión" },
  { value: "approved", label: "Autorizadas" },
  { value: "rejected", label: "No autorizadas" },
  { value: "revoked", label: "Retiradas" },
  { value: "all", label: "Historial completo" },
];

function money(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

function tone(status: DirectSaleRequestStatus): string {
  switch (status) {
    case "approved":
      return "bg-success/10 text-success border-success/30";
    case "pending":
      return "bg-warning/10 text-warning-foreground border-warning/30";
    case "rejected":
    case "revoked":
      return "bg-destructive/10 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function DirectSaleRequestsPanel() {
  const qc = useQueryClient();
  const fetchRequests = useServerFn(listDirectSaleRequests);
  const [status, setStatus] = useState<"all" | DirectSaleRequestStatus>("pending");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin", "direct-sale-requests", status],
    queryFn: () => fetchRequests({ data: { status, limit: 200 } }),
    staleTime: 15_000,
  });

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "direct-sale-requests"] });
    qc.invalidateQueries({ queryKey: ["admin", "direct-sales"] });
  };

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Solicitudes de venta en línea</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Las empresas preparan precio y políticas y solicitan la venta en línea. Aquí
            Administración autoriza, fija la comisión o retira la autorización. Cada decisión queda
            en el historial.
          </p>
        </div>
        {status === "pending" ? (
          <Badge variant="secondary">{pendingCount} en revisión</Badge>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`rounded-pill border px-3 py-1.5 text-xs font-medium transition ${
              status === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Cargando solicitudes…</p>
      ) : requests.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          No hay solicitudes en esta vista.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {requests.map((r) => (
            <RequestRow key={r.id} request={r} onDone={invalidate} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RequestRow({
  request,
  onDone,
}: {
  request: DirectSaleRequestRow;
  onDone: () => void;
}) {
  const decide = useServerFn(decideDirectSaleRequest);
  const revoke = useServerFn(revokeDirectSaleAuthorization);
  const [commission, setCommission] = useState<string>(
    request.commission_bps != null ? String(request.commission_bps / 100) : "12",
  );
  const [note, setNote] = useState<string>("");

  const fail = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "No se pudo registrar la decisión.");

  const approve = useMutation({
    mutationFn: () =>
      decide({
        data: {
          requestId: request.id,
          approve: true,
          commissionBps: Math.round(Number(commission) * 100),
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Venta en línea autorizada.");
      onDone();
    },
    onError: fail,
  });

  const reject = useMutation({
    mutationFn: () =>
      decide({
        data: {
          requestId: request.id,
          approve: false,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Solicitud rechazada.");
      onDone();
    },
    onError: fail,
  });

  const revokeM = useMutation({
    mutationFn: () =>
      revoke({
        data: {
          productId: request.product_id,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Autorización retirada.");
      onDone();
    },
    onError: fail,
  });

  const busy = approve.isPending || reject.isPending || revokeM.isPending;
  const commissionValid = Number(commission) >= 0 && Number(commission) <= 100;

  return (
    <li className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{request.product_name ?? "Experiencia"}</h3>
            {request.product_type ? (
              <Badge variant="outline" className="text-[10px] uppercase">
                {request.product_type}
              </Badge>
            ) : null}
            <Badge variant="outline" className={`text-[10px] ${tone(request.status)}`}>
              {DIRECT_SALE_REQUEST_LABEL[request.status]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {request.business_name ?? "Empresa"} · Precio propuesto{" "}
            {money(request.proposed_price_amount, request.currency)} · Solicitada el{" "}
            {new Date(request.requested_at).toLocaleDateString("es-MX")}
          </p>
          {request.request_note ? (
            <p className="mt-1 text-xs italic text-muted-foreground">“{request.request_note}”</p>
          ) : null}
          {request.decided_at ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Decisión: {new Date(request.decided_at).toLocaleDateString("es-MX")}
              {request.commission_bps != null
                ? ` · Comisión ${(request.commission_bps / 100).toFixed(2)}%`
                : ""}
              {request.decision_note ? ` · ${request.decision_note}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      {request.status === "pending" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Comisión (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Motivo o comentario
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcional al autorizar; recomendado al rechazar"
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => reject.mutate()}
              disabled={busy}
              className="whitespace-nowrap"
            >
              Rechazar
            </Button>
            <Button
              onClick={() => approve.mutate()}
              disabled={busy || !commissionValid}
              className="whitespace-nowrap"
            >
              Autorizar
            </Button>
          </div>
        </div>
      ) : request.direct_sale_enabled ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Motivo para retirar
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. incumplimiento de políticas"
              className="mt-1"
            />
          </div>
          <Button variant="outline" onClick={() => revokeM.mutate()} disabled={busy}>
            Retirar autorización
          </Button>
        </div>
      ) : null}
    </li>
  );
}
