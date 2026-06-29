/**
 * /portal/invitaciones — Gestión de invitaciones de la empresa activa
 * (Ola 3 · Etapa 2). Sólo owners pueden crear/revocar; RLS de
 * `invitations` impone la restricción server-side.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { listMyBusinesses } from "@/lib/portal/portal-reads.functions";
import {
  createBusinessInvitation,
  listBusinessInvitations,
  revokeBusinessInvitation,
  type PortalInvitation,
} from "@/lib/portal/invitations.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/invitaciones/")({
  component: InvitationsPage,
});

function readActiveBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function InvitationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchBusinesses = useServerFn(listMyBusinesses);
  const fetchInvitations = useServerFn(listBusinessInvitations);
  const createInv = useServerFn(createBusinessInvitation);
  const revokeInv = useServerFn(revokeBusinessInvitation);

  const { data: businesses = [] } = useQuery({
    queryKey: ["portal", "my-businesses", user?.id],
    queryFn: () => fetchBusinesses(),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  const activeBusinessId = readActiveBusinessId();
  const active = useMemo(
    () => businesses.find((b) => b.business_id === activeBusinessId) ?? null,
    [businesses, activeBusinessId],
  );
  const isOwner = active?.role === "owner";

  const invitationsQuery = useQuery({
    queryKey: ["portal", "invitations", activeBusinessId],
    queryFn: () =>
      fetchInvitations({ data: { businessId: activeBusinessId as string } }),
    enabled: Boolean(activeBusinessId && isOwner),
    staleTime: 30_000,
  });

  const invitations: PortalInvitation[] = invitationsQuery.data ?? [];

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "business_owner" | "admin">(
    "editor",
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createInv({
        data: { businessId: activeBusinessId as string, email, role },
      }),
    onSuccess: () => {
      setEmail("");
      setFormError(null);
      queryClient.invalidateQueries({
        queryKey: ["portal", "invitations", activeBusinessId],
      });
    },
    onError: (err: unknown) =>
      setFormError(err instanceof Error ? err.message : "Error desconocido"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeInv({ data: { invitationId: id } }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["portal", "invitations", activeBusinessId],
      }),
  });

  if (!activeBusinessId || !active) {
    return (
      <Empty title="Sin empresa seleccionada" body="Elige una empresa en el selector lateral para administrar sus invitaciones." />
    );
  }
  if (!isOwner) {
    return (
      <Empty
        title="No tienes permisos"
        body={`Necesitas rol propietario en ${active.display_name} para gestionar invitaciones.`}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial · Invitaciones
        </p>
        <h1 className="mt-2 text-3xl">{active.display_name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invita a colaboradores con un enlace personal. Sólo el destinatario
          podrá aceptar la invitación, una sola vez, antes de su expiración.
        </p>
      </header>

      <section className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Nueva invitación
        </h2>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email) return;
            createMutation.mutate();
          }}
        >
          <input
            type="email"
            required
            placeholder="correo@ejemplo.com"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as typeof role)
            }
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="editor">Editor</option>
            <option value="admin">Manager</option>
            <option value="business_owner">Propietario</option>
          </select>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {createMutation.isPending ? "Enviando…" : "Crear"}
          </button>
        </form>
        {formError && (
          <p className="mt-2 text-xs text-destructive">{formError}</p>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Vigencia por defecto: 7 días. El enlace se genera al crear la
          invitación.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Invitaciones ({invitations.length})
        </h2>
        <ul className="mt-3 grid gap-2">
          {invitations.map((inv) => {
            const link =
              typeof window !== "undefined"
                ? `${window.location.origin}/portal/invitaciones/${inv.token}`
                : `/portal/invitaciones/${inv.token}`;
            const expired = new Date(inv.expires_at).getTime() <= Date.now();
            const effectiveStatus =
              inv.status === "pending" && expired ? "expired" : inv.status;
            return (
              <li
                key={inv.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{inv.email}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Rol: {inv.role} · Expira:{" "}
                      {new Date(inv.expires_at).toLocaleString("es-MX")}
                    </p>
                    {effectiveStatus === "pending" && (
                      <code className="mt-2 block truncate rounded bg-muted px-2 py-1 text-[11px]">
                        {link}
                      </code>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
                    <span
                      className={[
                        "rounded-full px-2 py-1",
                        effectiveStatus === "pending"
                          ? "bg-primary/10 text-primary"
                          : effectiveStatus === "accepted"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground",
                      ].join(" ")}
                    >
                      {effectiveStatus}
                    </span>
                    {inv.status === "pending" && !expired && (
                      <button
                        type="button"
                        onClick={() => revokeMutation.mutate(inv.id)}
                        className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"
                      >
                        Revocar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {invitations.length === 0 && (
            <li className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No has emitido invitaciones para esta empresa.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="text-2xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}