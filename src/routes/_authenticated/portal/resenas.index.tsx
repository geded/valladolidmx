/**
 * /portal/resenas — Trust Engine v1 · US-G.6.
 *
 * Bandeja de reseñas para el empresario: lista todas las reseñas de las
 * empresas y productos que administra (cualquier estado), permite
 * responder públicamente, editar y borrar la respuesta.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Star } from "lucide-react";
import {
  listOwnerReviews,
  submitBusinessResponse,
  type OwnerReview,
} from "@/lib/reviews/business-response.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/portal/resenas/")({
  head: () => ({
    meta: [
      { title: "Reseñas · Portal Empresarial" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortalResenasIndex,
});

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={
            n <= value
              ? "h-3.5 w-3.5 fill-amber-500 text-amber-500"
              : "h-3.5 w-3.5 text-muted-foreground/40"
          }
        />
      ))}
    </span>
  );
}

const STATUS_LABEL: Record<OwnerReview["status"], string> = {
  draft: "Borrador",
  in_review: "En moderación",
  approved: "Aprobada",
  published: "Publicada",
  archived: "Archivada",
};

function ReviewCard({ review }: { review: OwnerReview }) {
  const qc = useQueryClient();
  const submitFn = useServerFn(submitBusinessResponse);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.businessResponse ?? "");

  const mutation = useMutation({
    mutationFn: (payload: { response: string }) =>
      submitFn({ data: { reviewId: review.id, response: payload.response } }),
    onSuccess: () => {
      toast.success("Respuesta actualizada.");
      qc.invalidateQueries({ queryKey: ["portal", "owner-reviews"] });
      setEditing(false);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("forbidden")) toast.error("No tienes permiso para responder esta reseña.");
      else if (msg.includes("response_too_long")) toast.error("Máximo 2000 caracteres.");
      else toast.error("No pudimos guardar la respuesta.");
    },
  });

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Stars value={review.rating} />
            {review.title ? <strong>{review.title}</strong> : null}
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            {review.subjectKind === "product" ? "Producto" : "Empresa"}:{" "}
            {review.subjectLabel ?? "—"}
            {review.subjectKind === "product" && review.businessDisplayName
              ? ` · ${review.businessDisplayName}`
              : ""}
          </p>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <p>{STATUS_LABEL[review.status]}</p>
          {review.publishedAt ? (
            <p>{new Date(review.publishedAt).toLocaleDateString()}</p>
          ) : (
            <p>{new Date(review.createdAt).toLocaleDateString()}</p>
          )}
        </div>
      </header>

      {review.body ? (
        <p className="mt-3 whitespace-pre-line text-sm text-foreground">{review.body}</p>
      ) : null}

      <p className="mt-2 text-[11px] text-muted-foreground">
        {review.authorDisplayName ?? "Anónimo"}
        {review.verifiedSource ? ` · ${review.verifiedSource}` : ""}
        {review.visitDate ? ` · visita ${review.visitDate}` : ""}
      </p>

      {/* Response */}
      <section className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-3">
        {editing ? (
          <div className="space-y-2">
            <label className="text-xs font-medium">
              Respuesta pública del negocio ({draft.trim().length}/2000)
            </label>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Agradece la reseña, aporta contexto o corrige información. Se mostrará públicamente firmado por tu empresa."
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setDraft(review.businessResponse ?? "");
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={mutation.isPending || draft.trim().length === 0}
                onClick={() => mutation.mutate({ response: draft })}
              >
                {mutation.isPending ? "Guardando…" : "Publicar respuesta"}
              </Button>
            </div>
          </div>
        ) : review.businessResponse ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Respuesta del negocio
              {review.businessResponseAt
                ? ` · ${new Date(review.businessResponseAt).toLocaleDateString()}`
                : ""}
            </p>
            <p className="whitespace-pre-line text-sm text-foreground">
              {review.businessResponse}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft(review.businessResponse ?? "");
                  setEditing(true);
                }}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={mutation.isPending}
                onClick={() => {
                  if (confirm("¿Borrar la respuesta pública?")) {
                    mutation.mutate({ response: "" });
                  }
                }}
              >
                Borrar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Sin respuesta pública. Responder ayuda a que futuros visitantes confíen en tu empresa.
            </p>
            <Button size="sm" onClick={() => setEditing(true)}>
              Responder
            </Button>
          </div>
        )}
      </section>
    </article>
  );
}

function PortalResenasIndex() {
  const fetchFn = useServerFn(listOwnerReviews);
  const { data: reviews = [], isLoading, error } = useQuery({
    queryKey: ["portal", "owner-reviews"],
    queryFn: () => fetchFn({ data: {} }),
    staleTime: 30_000,
  });

  const [filter, setFilter] = useState<"all" | "pending" | "answered">("all");
  const filtered = useMemo(() => {
    if (filter === "pending") return reviews.filter((r) => !r.businessResponse);
    if (filter === "answered") return reviews.filter((r) => !!r.businessResponse);
    return reviews;
  }, [reviews, filter]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial · Reseñas
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Bandeja de reseñas</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Reseñas de tus empresas y productos. Responde públicamente para reforzar
          la confianza de tus futuros huéspedes.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        {(["all", "pending", "answered"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={
              filter === k
                ? "rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground"
                : "rounded-full border border-border px-3 py-1 text-muted-foreground hover:text-foreground"
            }
          >
            {k === "all" ? "Todas" : k === "pending" ? "Sin responder" : "Respondidas"}
          </button>
        ))}
        <span className="ml-auto text-muted-foreground">
          {reviews.length} total · {reviews.filter((r) => !r.businessResponse).length} pendientes
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando reseñas…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Error"}
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No hay reseñas en esta vista todavía.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </div>
  );
}