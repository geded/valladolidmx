/**
 * ReviewModerator — UI de moderación de reseñas (Ola 1 · Etapa 5).
 *
 * Render exclusivamente UI. Toda mutación y validación de transición ocurre
 * server-side (`moderateReview`), y el rol `admin` se verifica server-side
 * antes de cualquier escritura. Esta vista respeta 12D (tokens semánticos,
 * jerarquía clara, estados vacíos y de error explícitos).
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBadge } from "@/components/cms/EntityListView";
import {
  getReviewForModeration,
  listReviewModerationHistory,
  moderateReview,
  type ReviewDetail,
  type ModerationHistoryEntry,
} from "@/lib/cms/moderation.functions";

type ContentStatus = ReviewDetail["status"];

const NEXT_ACTIONS: Record<ContentStatus, { to: ContentStatus; label: string; tone?: "default" | "danger" | "primary" }[]> = {
  draft: [
    { to: "in_review", label: "Enviar a revisión" },
    { to: "archived", label: "Archivar", tone: "danger" },
  ],
  in_review: [
    { to: "approved", label: "Aprobar", tone: "primary" },
    { to: "draft", label: "Devolver a borrador" },
    { to: "archived", label: "Rechazar / archivar", tone: "danger" },
  ],
  approved: [
    { to: "published", label: "Publicar", tone: "primary" },
    { to: "draft", label: "Devolver a borrador" },
    { to: "archived", label: "Archivar", tone: "danger" },
  ],
  published: [
    { to: "archived", label: "Retirar / archivar", tone: "danger" },
    { to: "draft", label: "Devolver a borrador" },
  ],
  archived: [{ to: "draft", label: "Restaurar a borrador" }],
};

export function ReviewModerator({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDetail = useServerFn(getReviewForModeration);
  const fetchHistory = useServerFn(listReviewModerationHistory);
  const moderate = useServerFn(moderateReview);

  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const detail = useQuery<ReviewDetail>({
    queryKey: ["cms", "reviews", "detail", id],
    queryFn: () => fetchDetail({ data: { id } }) as Promise<ReviewDetail>,
  });

  const history = useQuery<ModerationHistoryEntry[]>({
    queryKey: ["cms", "reviews", "history", id],
    queryFn: () =>
      fetchHistory({ data: { id } }) as Promise<ModerationHistoryEntry[]>,
  });

  const mutation = useMutation({
    mutationFn: (to: ContentStatus) =>
      moderate({ data: { id, to, notes: notes.trim() || undefined } }),
    onSuccess: async () => {
      setNotes("");
      await qc.invalidateQueries({ queryKey: ["cms", "reviews"] });
      await detail.refetch();
      await history.refetch();
    },
    onError: (e) =>
      setError(e instanceof Error ? e.message : "Error al moderar."),
  });

  if (detail.isLoading) {
    return (
      <p className="mx-auto max-w-3xl text-sm text-muted-foreground">
        Cargando reseña…
      </p>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
        <p className="font-semibold text-destructive">
          No se pudo cargar la reseña.
        </p>
        <p className="mt-1 text-destructive/80">
          {detail.error instanceof Error
            ? detail.error.message
            : "Error desconocido."}
        </p>
      </div>
    );
  }

  const r = detail.data;
  const status = r.status;

  return (
    <section className="mx-auto w-full max-w-3xl">
      <header className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            Ola 1 · Etapa 5 · Moderación
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {r.title ?? "(reseña sin título)"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {r.author_display_name ?? "Anónimo"} · {r.subject_kind ?? "—"} ·{" "}
            {new Date(r.created_at).toLocaleString("es-MX")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Estado actual:</span>
          <StatusBadge value={status} />
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <article className="mt-5 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px]">
            ★ {r.rating ?? "—"}
          </span>
          <span className="uppercase tracking-wider">{r.language ?? "—"}</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
          {r.body ?? "(sin contenido)"}
        </p>
      </article>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold tracking-tight">
          Decisión de moderación
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          La transición se valida server-side contra la máquina oficial
          (Serie 14). Las notas quedan almacenadas en
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-[11px]">
            reviews.metadata.moderation_history
          </code>
          como bitácora append-only por reseña.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Notas de moderación (opcional)
          </label>
          <textarea
            rows={3}
            value={notes}
            maxLength={1000}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Motivo, contexto o referencia interna…"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <p className="text-[11px] text-muted-foreground">
            Máx. 1000 caracteres. Asociadas al usuario actual.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {NEXT_ACTIONS[status].map((action) => {
            const tone =
              action.tone === "primary"
                ? "bg-primary text-primary-foreground hover:opacity-95"
                : action.tone === "danger"
                  ? "border border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10"
                  : "border border-border bg-background hover:bg-accent";
            return (
              <button
                key={action.to}
                type="button"
                disabled={mutation.isPending}
                onClick={() => {
                  setError(null);
                  mutation.mutate(action.to);
                }}
                className={`h-9 rounded-md px-3 text-xs font-medium disabled:opacity-60 ${tone}`}
              >
                {action.label}
              </button>
            );
          })}
          {NEXT_ACTIONS[status].length === 0 && (
            <span className="text-xs text-muted-foreground">
              Sin transiciones disponibles desde este estado.
            </span>
          )}
          <button
            type="button"
            onClick={() => navigate({ to: "/cms/reviews" as never })}
            className="h-9 rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-accent"
          >
            Volver al listado
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">
            Historial de moderación
          </h2>
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            metadata.moderation_history
          </span>
        </header>
        <div className="mt-4 divide-y divide-border text-xs">
          {history.isLoading && (
            <p className="py-2 text-muted-foreground">Cargando historial…</p>
          )}
          {history.data && history.data.length === 0 && (
            <p className="py-2 text-muted-foreground">
              Sin decisiones de moderación registradas aún.
            </p>
          )}
          {history.data?.map((h, idx) => (
            <div
              key={`${h.at}-${idx}`}
              className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                    {h.action}
                  </span>
                  <span className="text-muted-foreground">
                    {h.from_status} → <strong>{h.to_status}</strong>
                  </span>
                </div>
                {h.notes && (
                  <p className="max-w-xl text-muted-foreground">{h.notes}</p>
                )}
              </div>
              <time className="text-muted-foreground">
                {new Date(h.at).toLocaleString()}
              </time>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
