/**
 * /portal/invitaciones/$token — Aceptación de invitación por el
 * destinatario (Ola 3 · Etapa 2).
 *
 * Garantías cubiertas por accept_business_invitation (SECURITY DEFINER):
 *  - sólo el destinatario previsto puede aceptar (match de email);
 *  - una invitación expirada no es reutilizable (se marca expired);
 *  - una invitación aceptada/revocada no es reutilizable (estado != pending).
 */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import {
  acceptInvitation,
  previewInvitation,
  type InvitationPreview,
} from "@/lib/portal/invitations.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute(
  "/_authenticated/portal/invitaciones/$token",
)({
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { token } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchPreview = useServerFn(previewInvitation);
  const accept = useServerFn(acceptInvitation);

  const previewQuery = useQuery<InvitationPreview>({
    queryKey: ["portal", "invitation-preview", token, user?.id],
    queryFn: () => fetchPreview({ data: { token } }),
    enabled: Boolean(user?.id && token),
    staleTime: 0,
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const acceptMutation = useMutation({
    mutationFn: () => accept({ data: { token } }),
    onSuccess: async (res) => {
      if (typeof window !== "undefined" && res?.business_id) {
        window.localStorage.setItem(STORAGE_KEY, res.business_id);
      }
      await queryClient.invalidateQueries({
        queryKey: ["portal", "my-businesses"],
      });
      void navigate({ to: "/portal" });
    },
    onError: (err: unknown) =>
      setErrorMessage(err instanceof Error ? err.message : "Error desconocido"),
  });

  const preview = previewQuery.data;
  const expired =
    preview?.expires_at && new Date(preview.expires_at).getTime() <= Date.now();
  const usable = preview?.found && preview.status === "pending" && !expired;

  useEffect(() => {
    setErrorMessage(null);
  }, [token]);

  return (
    <div className="mx-auto max-w-xl">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial · Invitación
        </p>
        <h1 className="mt-2 text-3xl">Aceptar invitación</h1>
      </header>

      {previewQuery.isLoading && (
        <p className="mt-6 text-sm text-muted-foreground">
          Verificando invitación…
        </p>
      )}

      {previewQuery.isError && (
        <p className="mt-6 text-sm text-destructive">
          No pudimos verificar la invitación.
        </p>
      )}

      {preview && !preview.found && (
        <Notice
          tone="warn"
          title="Esta invitación no es válida para tu cuenta"
          body={`Inicia sesión con la cuenta a la que se envió la invitación. Estás como ${user?.email ?? "—"}.`}
        />
      )}

      {preview && preview.found && preview.status !== "pending" && (
        <Notice
          tone="warn"
          title={`Esta invitación ya está ${preview.status}`}
          body="No puede volver a utilizarse. Pide al propietario una nueva invitación si lo necesitas."
        />
      )}

      {preview && preview.found && preview.status === "pending" && expired && (
        <Notice
          tone="warn"
          title="Esta invitación expiró"
          body="Pide al propietario que emita una nueva."
        />
      )}

      {preview && usable && (
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Has sido invitado a</p>
          <p className="mt-1 text-xl font-semibold">
            {preview.business_name ?? "una empresa"}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Rol propuesto: <span className="font-semibold">{preview.role}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Expira el{" "}
            {new Date(preview.expires_at as string).toLocaleString("es-MX")}
          </p>
          {errorMessage && (
            <p className="mt-3 text-xs text-destructive">{errorMessage}</p>
          )}
          <button
            type="button"
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {acceptMutation.isPending ? "Aceptando…" : "Aceptar invitación"}
          </button>
        </section>
      )}
    </div>
  );
}

function Notice({
  tone,
  title,
  body,
}: {
  tone: "warn" | "info";
  title: string;
  body: string;
}) {
  return (
    <div
      className={[
        "mt-6 rounded-lg border p-5",
        tone === "warn"
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border bg-card",
      ].join(" ")}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}