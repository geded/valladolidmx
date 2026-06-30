/**
 * /cuenta/concierge/:caseId/evaluar — Evaluación post-cierre del turista.
 * Sólo accesible si el caso pertenece al usuario autenticado y está cerrado.
 * La autorización efectiva vive en la RPC `cc_case_evaluate`.
 */
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConciergeCase } from "@/lib/concierge/concierge.functions";
import { ccCaseEvaluate } from "@/lib/concierge/cc.functions";

export const Route = createFileRoute("/_authenticated/cuenta/concierge/$caseId/evaluar")({
  component: EvaluarCasoPage,
  head: () => ({
    meta: [
      { title: "Evaluar mi caso · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const CLOSED = new Set(["closed_won", "closed_lost", "archived"]);

function EvaluarCasoPage() {
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const fetchCase = useServerFn(getConciergeCase);
  const evaluate = useServerFn(ccCaseEvaluate);

  const { data: row, isLoading } = useQuery({
    queryKey: ["cc", "case", caseId],
    queryFn: () => fetchCase({ data: { caseId } }),
  });

  const [rating, setRating] = useState<number>(5);
  const [nps, setNps] = useState<string>("");
  const [comment, setComment] = useState<string>("");

  const submit = useMutation({
    mutationFn: () =>
      evaluate({
        data: {
          caseId,
          rating,
          nps: nps ? Number(nps) : null,
          comment: comment.trim() || null,
        },
      }),
    onSuccess: () => navigate({ to: "/cuenta/concierge/$caseId", params: { caseId } }),
  });

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>;

  const status = (row as { status?: string } | null)?.status ?? "";
  if (!CLOSED.has(status)) {
    return (
      <section className="mx-auto max-w-2xl p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Evaluación no disponible</h1>
        <p className="text-sm text-muted-foreground">
          Solo puedes evaluar este caso cuando esté cerrado. Estado actual: <code>{status || "desconocido"}</code>.
        </p>
        <Link to="/cuenta/concierge/$caseId" params={{ caseId }} className="text-sm text-primary hover:underline">
          ← Volver al caso
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl p-6 space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Cierre del caso
        </p>
        <h1 className="mt-1 text-2xl font-semibold">¿Cómo fue tu experiencia?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu evaluación alimenta las métricas internas de calidad y ayuda a mejorar el servicio.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
        className="space-y-5 rounded-lg border bg-card p-5"
      >
        <div>
          <label className="text-sm font-medium">Calificación general</label>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setRating(n)}
                className={[
                  "h-10 w-10 rounded-md border text-sm font-semibold transition-colors",
                  rating === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="nps" className="text-sm font-medium">
            ¿Qué tan probable es que nos recomiendes? (0–10, opcional)
          </label>
          <input
            id="nps"
            type="number"
            min={0}
            max={10}
            value={nps}
            onChange={(e) => setNps(e.target.value)}
            className="mt-2 w-32 rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="comment" className="text-sm font-medium">Comentario (opcional)</label>
          <textarea
            id="comment"
            rows={4}
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Cuéntanos lo mejor y lo que podemos mejorar."
          />
        </div>

        {submit.isError ? (
          <p className="text-xs text-destructive">
            {submit.error instanceof Error ? submit.error.message : "Error al enviar la evaluación"}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Link
            to="/cuenta/concierge/$caseId"
            params={{ caseId }}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submit.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {submit.isPending ? "Enviando…" : "Enviar evaluación"}
          </button>
        </div>
      </form>
    </section>
  );
}