/**
 * /portal/ficha — Ficha pública editable + workflow editorial
 * (Ola 3 · Etapa 3 · Plan 14.30).
 *
 * Permite a owners/editores de la empresa activa:
 *  - Editar campos editoriales (display_name, legal_name, tagline,
 *    description). slug, destino, categoría, status, verified y
 *    published_at quedan reservados al CMS.
 *  - Solicitar revisión (draft → in_review) y retirarla (in_review →
 *    draft). Aprobación/publicación corresponden al CMS Studio.
 *  - Ver el historial de transiciones (content_audit_log) de la ficha.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import {
  getBusinessCard,
  listBusinessAuditLog,
  requestBusinessReview,
  updateBusinessCard,
  withdrawBusinessReview,
  type BusinessAuditEntry,
  type PortalBusinessCard,
} from "@/lib/portal/business-card.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/ficha")({
  component: FichaPage,
});

function useActiveBusinessId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setId(stored);
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setId(e.newValue);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  return id;
}

function FichaPage() {
  const { user } = useAuth();
  const businessId = useActiveBusinessId();
  const queryClient = useQueryClient();

  const fetchCard = useServerFn(getBusinessCard);
  const fetchAudit = useServerFn(listBusinessAuditLog);
  const updateCard = useServerFn(updateBusinessCard);
  const requestReview = useServerFn(requestBusinessReview);
  const withdrawReview = useServerFn(withdrawBusinessReview);

  const cardQuery = useQuery<PortalBusinessCard>({
    queryKey: ["portal", "business-card", businessId, user?.id],
    queryFn: () => fetchCard({ data: { businessId: businessId as string } }),
    enabled: Boolean(businessId && user?.id),
  });

  const auditQuery = useQuery<BusinessAuditEntry[]>({
    queryKey: ["portal", "business-audit", businessId, user?.id],
    queryFn: () =>
      fetchAudit({ data: { businessId: businessId as string, limit: 25 } }),
    enabled: Boolean(businessId && user?.id),
  });

  const [form, setForm] = useState({
    display_name: "",
    legal_name: "",
    tagline: "",
    description: "",
  });
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar valores del servidor al cambiar de empresa o refetch.
  useEffect(() => {
    if (!cardQuery.data) return;
    setForm({
      display_name: cardQuery.data.display_name ?? "",
      legal_name: cardQuery.data.legal_name ?? "",
      tagline: cardQuery.data.tagline ?? "",
      description: cardQuery.data.description ?? "",
    });
    setDirty(false);
  }, [cardQuery.data?.id, cardQuery.data?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = cardQuery.data?.status;
  const isEditable = status === "draft" || status === "in_review" || status === "published" || status === "approved" || status === "archived";

  const saveMutation = useMutation({
    mutationFn: () =>
      updateCard({
        data: {
          businessId: businessId as string,
          patch: {
            display_name: form.display_name,
            legal_name: form.legal_name,
            tagline: form.tagline,
            description: form.description,
          },
        },
      }),
    onSuccess: async () => {
      setFeedback("Cambios guardados.");
      setErrorMessage(null);
      setDirty(false);
      await queryClient.invalidateQueries({
        queryKey: ["portal", "business-card", businessId],
      });
    },
    onError: (err: unknown) => {
      setFeedback(null);
      setErrorMessage(err instanceof Error ? err.message : "Error desconocido");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      requestReview({ data: { businessId: businessId as string } }),
    onSuccess: async () => {
      setFeedback("Ficha enviada a revisión editorial.");
      setErrorMessage(null);
      await queryClient.invalidateQueries({
        queryKey: ["portal", "business-card", businessId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["portal", "business-audit", businessId],
      });
    },
    onError: (err: unknown) =>
      setErrorMessage(err instanceof Error ? err.message : "Error desconocido"),
  });

  const withdrawMutation = useMutation({
    mutationFn: () =>
      withdrawReview({ data: { businessId: businessId as string } }),
    onSuccess: async () => {
      setFeedback("Solicitud de revisión retirada.");
      setErrorMessage(null);
      await queryClient.invalidateQueries({
        queryKey: ["portal", "business-card", businessId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["portal", "business-audit", businessId],
      });
    },
    onError: (err: unknown) =>
      setErrorMessage(err instanceof Error ? err.message : "Error desconocido"),
  });

  if (!businessId) {
    return (
      <EmptyState
        title="Selecciona una empresa"
        body="Elige la empresa activa desde el selector lateral para editar su ficha pública."
      />
    );
  }

  if (cardQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando ficha…</p>;
  }

  if (cardQuery.isError) {
    return (
      <EmptyState
        title="No pudimos cargar la ficha"
        body={
          cardQuery.error instanceof Error
            ? cardQuery.error.message
            : "Error desconocido."
        }
      />
    );
  }

  const card = cardQuery.data;
  if (!card) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial · Ficha pública
        </p>
        <h1 className="mt-2 text-3xl">{card.display_name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge status={card.status} />
          {card.verified && <Badge tone="ok">Verificada</Badge>}
          <span className="text-muted-foreground">/{card.slug}</span>
        </div>
      </header>

      {feedback && (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          {feedback}
        </p>
      )}
      {errorMessage && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </p>
      )}

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Contenido editorial
        </h2>
        <div className="mt-4 grid gap-4">
          <Field
            label="Nombre comercial"
            value={form.display_name}
            onChange={(v) => {
              setForm((p) => ({ ...p, display_name: v }));
              setDirty(true);
            }}
            maxLength={160}
            required
          />
          <Field
            label="Razón social (opcional)"
            value={form.legal_name}
            onChange={(v) => {
              setForm((p) => ({ ...p, legal_name: v }));
              setDirty(true);
            }}
            maxLength={220}
          />
          <Field
            label="Tagline"
            value={form.tagline}
            onChange={(v) => {
              setForm((p) => ({ ...p, tagline: v }));
              setDirty(true);
            }}
            maxLength={220}
          />
          <Field
            label="Descripción"
            value={form.description}
            onChange={(v) => {
              setForm((p) => ({ ...p, description: v }));
              setDirty(true);
            }}
            maxLength={8000}
            multiline
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={
              !isEditable || !dirty || saveMutation.isPending ||
              form.display_name.trim().length < 2
            }
            className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
          </button>

          {status === "draft" && (
            <button
              type="button"
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending || dirty}
              title={dirty ? "Guarda los cambios antes de enviar a revisión" : undefined}
              className="inline-flex rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {reviewMutation.isPending ? "Enviando…" : "Solicitar revisión"}
            </button>
          )}

          {status === "in_review" && (
            <button
              type="button"
              onClick={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending}
              className="inline-flex rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {withdrawMutation.isPending ? "Retirando…" : "Retirar revisión"}
            </button>
          )}
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          La aprobación y publicación las realiza el equipo editorial desde el
          CMS. Los campos slug, destino, categorías, verificación y fecha de
          publicación están reservados.
        </p>
      </section>

      <AuditSection
        loading={auditQuery.isLoading}
        entries={auditQuery.data ?? []}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  maxLength,
  required,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          rows={6}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      )}
      <span className="mt-1 block text-[10px] text-muted-foreground">
        {value.length}/{maxLength}
      </span>
    </label>
  );
}

function StatusBadge({ status }: { status: PortalBusinessCard["status"] }) {
  const tone: "ok" | "warn" | "neutral" = useMemo(() => {
    if (status === "published") return "ok";
    if (status === "in_review" || status === "approved") return "warn";
    return "neutral";
  }, [status]);
  const labels: Record<PortalBusinessCard["status"], string> = {
    draft: "Borrador",
    in_review: "En revisión",
    approved: "Aprobado",
    published: "Publicado",
    archived: "Archivado",
  };
  return <Badge tone={tone}>{labels[status]}</Badge>;
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "neutral";
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-border bg-muted text-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function AuditSection({
  loading,
  entries,
}: {
  loading: boolean;
  entries: BusinessAuditEntry[];
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Historial editorial
      </h2>
      {loading && (
        <p className="mt-3 text-xs text-muted-foreground">Cargando historial…</p>
      )}
      {!loading && entries.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Aún no hay transiciones registradas.
        </p>
      )}
      {entries.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {entries.map((e) => (
            <li key={e.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{e.from_status ?? "—"}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{e.to_status ?? "—"}</span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("es-MX")}
                </span>
              </div>
              {e.notes && (
                <p className="mt-1 text-xs text-muted-foreground">{e.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Portal Empresarial
      </p>
      <h1 className="mt-2 text-2xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}