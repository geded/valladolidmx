/**
 * /admin/anfitriones — Bandeja de solicitudes (E-PS · US-EPS.3 v2)
 *
 * Reclamos de propiedad y registros de negocio pendientes. Al aprobar,
 * activa la membresía de dueño y desbloquea el modo Empresa en el
 * ProfileModeSwitcher del reclamante.
 */
import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ExternalLink, FileText, Loader2, X } from "lucide-react";
import {
  findSimilarBusinesses,
  listHostDirectory,
  adminRemoveHostMembership,
  approveBusinessRegistration,
  approveOwnershipClaim,
  getVerificationDocumentSignedUrl,
  listPendingBusinessRequests,
  publishBusiness,
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
  const decidePub = useServerFn(publishBusiness);
  const signedUrl = useServerFn(getVerificationDocumentSignedUrl);
  const [tab, setTab] = useState<"identity" | "publication" | "claim" | "hosts">("identity");

  const q = useQuery({
    queryKey: ["admin-hosting-inbox"],
    queryFn: () => list(),
  });

  const decide = useMutation({
    mutationFn: async (input: { row: PendingRequestRow; approve: boolean; notes?: string }) => {
      if (input.row.kind === "claim") {
        await approveClaim({
          data: { transfer_id: input.row.ref_id, approve: input.approve, notes: input.notes },
        });
      } else if (input.row.kind === "registration") {
        await approveReg({
          data: { business_id: input.row.business_id, approve: input.approve, notes: input.notes },
        });
      } else {
        await decidePub({
          data: { business_id: input.row.business_id, approve: input.approve, notes: input.notes },
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-hosting-inbox"] }),
  });

  const buckets = useMemo(() => {
    const rows = q.data ?? [];
    return {
      identity: rows.filter((r) => r.kind === "registration"),
      publication: rows.filter((r) => r.kind === "publication"),
      claim: rows.filter((r) => r.kind === "claim"),
    };
  }, [q.data]);

  const visible = tab === "hosts" ? [] : buckets[tab];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Admin · E-PS
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Solicitudes de anfitrión</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dos puertas de aprobación: primero verificamos la identidad del anfitrión, después
          revisamos la ficha antes de publicarla.
        </p>
      </header>

      <div className="mb-6 inline-flex flex-wrap rounded-full border border-border bg-card p-1">
        <TabBtn active={tab === "identity"} onClick={() => setTab("identity")}>
          Identidad ({buckets.identity.length})
        </TabBtn>
        <TabBtn active={tab === "publication"} onClick={() => setTab("publication")}>
          Publicación ({buckets.publication.length})
        </TabBtn>
        <TabBtn active={tab === "claim"} onClick={() => setTab("claim")}>
          Reclamos ({buckets.claim.length})
        </TabBtn>
        <TabBtn active={tab === "hosts"} onClick={() => setTab("hosts")}>
          Anfitriones
        </TabBtn>
      </div>

      {q.isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden /> Cargando…
        </p>
      )}
      {q.error instanceof Error && <p className="text-sm text-destructive">{q.error.message}</p>}
      {tab === "hosts" && <HostDirectory />}
      {tab !== "hosts" && q.data && visible.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No hay solicitudes en esta bandeja.
        </p>
      )}

      <ul className="space-y-3">
        {visible.map((row) => (
          <RequestCard
            key={`${row.kind}-${row.ref_id}`}
            row={row}
            pending={decide.isPending}
            onDecide={(approve, notes) => decide.mutate({ row, approve, notes })}
            onGetDoc={() =>
              signedUrl({ data: { business_id: row.business_id } }).then((r) => r.url)
            }
          />
        ))}
      </ul>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function RequestCard({
  row,
  pending,
  onDecide,
  onGetDoc,
}: {
  row: PendingRequestRow;
  pending: boolean;
  onDecide: (approve: boolean, notes?: string) => void;
  onGetDoc: () => Promise<string | null>;
}) {
  const [notes, setNotes] = useState("");
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const labels: Record<PendingRequestRow["kind"], { text: string; tone: string }> = {
    registration: { text: "Verificación de identidad", tone: "bg-info/15 text-info" },
    publication: { text: "Publicación pendiente", tone: "bg-success/15 text-success" },
    claim: { text: "Reclamo de propiedad", tone: "bg-warning/15 text-warning" },
  };
  const label = labels[row.kind];
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${label.tone}`}
            >
              {label.text}
            </span>
            <span className="text-sm font-medium text-foreground">{row.business_name}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Solicitante: {row.requester_name ?? "—"}{" "}
            {row.requester_email && `(${row.requester_email})`}
          </p>
          {row.notes && <p className="mt-1 text-xs text-muted-foreground">Notas: {row.notes}</p>}
          {row.kind === "registration" && (
            <PossibleDuplicates
              row={row}
              onUseAsReason={(name) =>
                setNotes(
                  `Esta empresa ya existe en Valladolid.mx como «${name}». Reclámala desde «Ya existe mi negocio».`,
                )
              }
            />
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {new Date(row.created_at).toLocaleString("es-MX")}
          </p>

          {row.kind === "registration" && (
            <button
              type="button"
              disabled={loadingDoc}
              onClick={async () => {
                setLoadingDoc(true);
                try {
                  const u = await onGetDoc();
                  setDocUrl(u);
                  if (u) window.open(u, "_blank", "noopener");
                } finally {
                  setLoadingDoc(false);
                }
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              {loadingDoc ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <FileText className="size-3" aria-hidden />
              )}
              Ver documento de verificación
              <ExternalLink className="size-3" aria-hidden />
            </button>
          )}
          {row.kind === "publication" && (
            <a
              href={`/marketplace/${row.business_name}`.toLowerCase()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              Ver ficha propuesta
              <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder={
            row.kind === "publication"
              ? "Notas para el anfitrión (obligatorio si devuelves)…"
              : "Motivo para el solicitante (lo verá si rechazas)…"
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
        />
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => onDecide(false, notes || undefined)}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            <X className="size-3" aria-hidden />
            {row.kind === "publication" ? "Devolver con notas" : "Rechazar"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onDecide(true, notes || undefined)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Check className="size-3" aria-hidden />
            {row.kind === "publication" ? "Publicar" : "Aprobar"}
          </button>
        </div>
      </div>
    </li>
  );
}

function PossibleDuplicates({
  row,
  onUseAsReason,
}: {
  row: PendingRequestRow;
  onUseAsReason: (name: string) => void;
}) {
  const find = useServerFn(findSimilarBusinesses);
  const q = useQuery({
    queryKey: ["admin-similar", row.business_id, row.business_name],
    queryFn: () => find({ data: { name: row.business_name, exclude_id: row.business_id } }),
    staleTime: 60_000,
  });
  const rows = q.data ?? [];
  if (rows.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
      <p className="text-xs font-semibold text-foreground">Posibles repetidas</p>
      <ul className="mt-1 space-y-1">
        {rows.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>
              {b.display_name}
              {b.destination_name ? ` · ${b.destination_name}` : ""}
            </span>
            <button
              type="button"
              onClick={() => onUseAsReason(b.display_name)}
              className="rounded-full border border-border bg-background px-2 py-0.5 hover:bg-accent"
            >
              Usar como motivo de rechazo
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Dueño",
  manager: "Gerente",
  editor: "Editor",
  viewer: "Solo lectura",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  pending: "Por aprobar",
  suspended: "Suspendido",
};

function HostDirectory() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const list = useServerFn(listHostDirectory);
  const remove = useServerFn(adminRemoveHostMembership);
  const [search, setSearch] = useState("");
  const q = useQuery({ queryKey: ["admin-host-directory"], queryFn: () => list() });
  const removeM = useMutation({
    mutationFn: (membership_id: string) => remove({ data: { membership_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-host-directory"] }),
  });
  const openPortal = (businessId: string) => {
    window.localStorage.setItem("valladolidmx.portal.activeBusinessId", businessId);
    window.dispatchEvent(new CustomEvent("portal:active-business-changed", { detail: businessId }));
    void navigate({ to: "/portal" });
  };
  const term = search.trim().toLowerCase();
  const rows = (q.data ?? []).filter(
    (h) =>
      !term ||
      (h.name ?? "").toLowerCase().includes(term) ||
      (h.email ?? "").toLowerCase().includes(term) ||
      h.businesses.some((b) => b.display_name.toLowerCase().includes(term)),
  );
  return (
    <section>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por persona, correo o empresa…"
        className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      {q.isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden /> Cargando…
        </p>
      )}
      {q.error instanceof Error && <p className="text-sm text-destructive">{q.error.message}</p>}
      <p className="mb-3 text-xs text-muted-foreground">
        {rows.length} anfitriones · {rows.reduce((n, h) => n + h.businesses.length, 0)} empresas
        administradas
      </p>
      <ul className="space-y-3">
        {rows.map((h) => (
          <li key={h.user_id} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-medium text-foreground">{h.name ?? h.email ?? "Sin nombre"}</p>
            {h.email && h.name ? <p className="text-xs text-muted-foreground">{h.email}</p> : null}
            <ul className="mt-3 divide-y divide-border">
              {h.businesses.map((b) => (
                <li
                  key={b.membership_id}
                  className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{b.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABEL[b.role] ?? b.role} · {STATUS_LABEL[b.status] ?? b.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openPortal(b.business_id)}
                      className="min-h-[36px] rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground"
                    >
                      Entrar a su Portal
                    </button>
                    <button
                      type="button"
                      disabled={removeM.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Quitar a ${h.name ?? h.email ?? "esta persona"} de ${b.display_name}? La página pública no se borra.`,
                          )
                        )
                          removeM.mutate(b.membership_id);
                      }}
                      className="min-h-[36px] rounded-full border border-border px-3 text-xs text-muted-foreground hover:text-destructive"
                    >
                      Quitar acceso
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
