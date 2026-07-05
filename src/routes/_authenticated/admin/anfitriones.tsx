/**
 * /admin/anfitriones — Bandeja de solicitudes (E-PS · US-EPS.3 v2)
 *
 * Reclamos de propiedad y registros de negocio pendientes. Al aprobar,
 * activa la membresía de dueño y desbloquea el modo Empresa en el
 * ProfileModeSwitcher del reclamante.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, X } from "lucide-react";
import {
  approveBusinessRegistration,
  approveOwnershipClaim,
  listPendingBusinessRequests,
  type PendingRequestRow,
} from "@/lib/hosting/hosting.functions";

export const Route = createFileRoute("/_authenticated/admin/anfitriones")({
  head: () => ({
    meta: [
      { title: "Admin · Solicitudes de anfitrión · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminHostingInbox,
});

function AdminHostingInbox() {
  const qc = useQueryClient();
  const list = useServerFn(listPendingBusinessRequests);
  const approveClaim = useServerFn(approveOwnershipClaim);
  const approveReg = useServerFn(approveBusinessRegistration);

  const q = useQuery({
    queryKey: ["admin-hosting-inbox"],
    queryFn: () => list(),
  });

  const decide = useMutation({
    mutationFn: async (input: {
      row: PendingRequestRow;
      approve: boolean;
    }) => {
      if (input.row.kind === "claim") {
        await approveClaim({
          data: { transfer_id: input.row.ref_id, approve: input.approve },
        });
      } else {
        await approveReg({
          data: { business_id: input.row.business_id, approve: input.approve },
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-hosting-inbox"] }),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Admin · E-PS
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">
          Solicitudes de anfitrión
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reclamos de propiedad y registros de negocio pendientes de aprobación.
        </p>
      </header>

      {q.isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden /> Cargando…
        </p>
      )}
      {q.error instanceof Error && (
        <p className="text-sm text-destructive">{q.error.message}</p>
      )}
      {q.data && q.data.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No hay solicitudes pendientes.
        </p>
      )}

      <ul className="space-y-3">
        {(q.data ?? []).map((row) => (
          <li
            key={`${row.kind}-${row.ref_id}`}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    row.kind === "claim"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {row.kind === "claim" ? "Reclamo" : "Registro nuevo"}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {row.business_name}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Solicitante: {row.requester_name ?? "—"}{" "}
                {row.requester_email && `(${row.requester_email})`}
              </p>
              {row.notes && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Notas: {row.notes}
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(row.created_at).toLocaleString("es-MX")}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ row, approve: false })}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                <X className="size-3" aria-hidden /> Rechazar
              </button>
              <button
                type="button"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ row, approve: true })}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Check className="size-3" aria-hidden /> Aprobar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}