/**
 * /_authenticated/portal/propiedad — Etapa 6 · 14.40.6
 *
 * Panel de transferencia de propiedad de la empresa activa.
 * Solo el owner actual puede solicitar/cancelar. Los destinatarios
 * aceptan o rechazan desde la sección "Solicitudes recibidas".
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { listMyBusinesses } from "@/lib/portal/portal-reads.functions";
import {
  acceptOwnershipTransfer,
  cancelOwnershipTransfer,
  listBusinessOwnershipTransfers,
  listIncomingOwnershipTransfers,
  rejectOwnershipTransfer,
  requestOwnershipTransfer,
  type OwnershipTransfer,
} from "@/lib/portal/ownership-transfers.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/propiedad")({
  component: PropiedadPage,
});

function PropiedadPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchBusinesses = useServerFn(listMyBusinesses);
  const fetchOutgoing = useServerFn(listBusinessOwnershipTransfers);
  const fetchIncoming = useServerFn(listIncomingOwnershipTransfers);
  const requestFn = useServerFn(requestOwnershipTransfer);
  const cancelFn = useServerFn(cancelOwnershipTransfer);
  const acceptFn = useServerFn(acceptOwnershipTransfer);
  const rejectFn = useServerFn(rejectOwnershipTransfer);

  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    setActiveBusinessId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const { data: businesses = [] } = useQuery({
    queryKey: ["portal", "my-businesses", user?.id],
    queryFn: () => fetchBusinesses(),
    enabled: Boolean(user?.id),
  });

  const active = useMemo(
    () => businesses.find((b) => b.business_id === activeBusinessId) ?? null,
    [businesses, activeBusinessId],
  );
  const isOwner = active?.role === "owner";

  const outgoingQ = useQuery({
    queryKey: ["portal", "ownership", "outgoing", activeBusinessId],
    queryFn: () =>
      fetchOutgoing({ data: { businessId: activeBusinessId as string } }),
    enabled: Boolean(activeBusinessId),
  });

  const incomingQ = useQuery({
    queryKey: ["portal", "ownership", "incoming", user?.id],
    queryFn: () => fetchIncoming(),
    enabled: Boolean(user?.id),
  });

  const [toUserId, setToUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const requestM = useMutation({
    mutationFn: async () => {
      if (!activeBusinessId) throw new Error("no_business");
      const id = toUserId.trim();
      if (!id) throw new Error("Ingresa el ID de usuario destinatario.");
      return requestFn({
        data: {
          businessId: activeBusinessId,
          toUserId: id,
          notes: notes.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      setToUserId("");
      setNotes("");
      setFormError(null);
      qc.invalidateQueries({
        queryKey: ["portal", "ownership", "outgoing", activeBusinessId],
      });
    },
    onError: (e: unknown) =>
      setFormError(e instanceof Error ? translateError(e.message) : "Error"),
  });

  const cancelM = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { transferId: id } }),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["portal", "ownership", "outgoing", activeBusinessId],
      }),
  });

  const acceptM = useMutation({
    mutationFn: (id: string) => acceptFn({ data: { transferId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", "ownership", "incoming"] });
      qc.invalidateQueries({ queryKey: ["portal", "my-businesses"] });
    },
  });

  const rejectM = useMutation({
    mutationFn: (id: string) => rejectFn({ data: { transferId: id } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["portal", "ownership", "incoming"] }),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          Transferencia de propiedad
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La transferencia requiere aceptación explícita del nuevo propietario.
          No modifica productos, promociones, galería, horarios, órdenes ni el
          historial de la empresa.
        </p>
      </header>

      {!active ? (
        <p className="text-sm text-muted-foreground">
          Selecciona una empresa en la barra lateral.
        </p>
      ) : (
        <>
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-base font-semibold">
              Solicitar transferencia
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Empresa activa: <strong>{active.display_name}</strong> · Tu rol:{" "}
              <strong>{active.role}</strong>
            </p>
            {!isOwner ? (
              <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                Solo el propietario actual de la empresa puede iniciar una
                transferencia.
              </p>
            ) : (
              <form
                className="mt-4 grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  requestM.mutate();
                }}
              >
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">
                    ID de usuario destinatario
                  </span>
                  <input
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="uuid del nuevo propietario"
                    value={toUserId}
                    onChange={(e) => setToUserId(e.target.value)}
                    required
                  />
                  <span className="text-[11px] text-muted-foreground">
                    El usuario debe tener cuenta en la plataforma.
                  </span>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Notas (opcional)</span>
                  <textarea
                    className="min-h-[72px] rounded-md border border-border bg-background px-3 py-2 text-sm"
                    maxLength={1000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
                )}
                <div>
                  <button
                    type="submit"
                    disabled={requestM.isPending}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {requestM.isPending
                      ? "Enviando…"
                      : "Solicitar transferencia"}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-base font-semibold">
              Historial de solicitudes (esta empresa)
            </h2>
            <TransferList
              items={outgoingQ.data ?? []}
              currentUserId={user?.id ?? null}
              role="outgoing"
              onCancel={(id) => cancelM.mutate(id)}
              busyId={cancelM.isPending ? cancelM.variables ?? null : null}
            />
          </section>

          <section className="mt-8">
            <h2 className="text-base font-semibold">
              Solicitudes recibidas (cualquier empresa)
            </h2>
            <TransferList
              items={incomingQ.data ?? []}
              currentUserId={user?.id ?? null}
              role="incoming"
              onAccept={(id) => acceptM.mutate(id)}
              onReject={(id) => rejectM.mutate(id)}
              busyId={
                acceptM.isPending
                  ? acceptM.variables ?? null
                  : rejectM.isPending
                    ? rejectM.variables ?? null
                    : null
              }
            />
          </section>
        </>
      )}
    </div>
  );
}

function TransferList({
  items,
  role,
  onCancel,
  onAccept,
  onReject,
  busyId,
}: {
  items: Array<OwnershipTransfer & { business_name?: string | null }>;
  currentUserId: string | null;
  role: "outgoing" | "incoming";
  onCancel?: (id: string) => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  busyId?: string | null;
}) {
  if (!items.length) {
    return (
      <p className="mt-3 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        Sin solicitudes.
      </p>
    );
  }
  return (
    <ul className="mt-3 grid gap-2">
      {items.map((t) => {
        const isBusy = busyId === t.id;
        return (
          <li
            key={t.id}
            className="rounded-md border border-border bg-card p-4 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                {role === "incoming" && t.business_name && (
                  <p className="font-semibold">{t.business_name}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Solicitada {new Date(t.requested_at).toLocaleString()}
                  {" · "}vence {new Date(t.expires_at).toLocaleString()}
                </p>
              </div>
              <StatusPill status={t.status} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {role === "outgoing"
                ? `Destinatario: ${t.to_user_id}`
                : `Solicitada por: ${t.from_user_id}`}
            </p>
            {t.notes && (
              <p className="mt-2 rounded-md bg-muted/40 p-2 text-xs">
                {t.notes}
              </p>
            )}
            {t.status === "pending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {role === "outgoing" && onCancel && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onCancel(t.id)}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                  >
                    Cancelar solicitud
                  </button>
                )}
                {role === "incoming" && onAccept && onReject && (
                  <>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onAccept(t.id)}
                      className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onReject(t.id)}
                      className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function StatusPill({ status }: { status: OwnershipTransfer["status"] }) {
  const map: Record<OwnershipTransfer["status"], string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    cancelled: "bg-muted text-muted-foreground",
    expired: "bg-muted text-muted-foreground",
  };
  const label: Record<OwnershipTransfer["status"], string> = {
    pending: "Pendiente",
    accepted: "Aceptada",
    rejected: "Rechazada",
    cancelled: "Cancelada",
    expired: "Expirada",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}

function translateError(code: string): string {
  if (code.includes("forbidden_only_current_owner"))
    return "Solo el propietario actual puede iniciar una transferencia.";
  if (code.includes("transfer_already_pending"))
    return "Ya existe una solicitud pendiente para esta empresa.";
  if (code.includes("recipient_not_found"))
    return "El usuario destinatario no existe.";
  if (code.includes("invalid_recipient"))
    return "Destinatario inválido.";
  return code;
}