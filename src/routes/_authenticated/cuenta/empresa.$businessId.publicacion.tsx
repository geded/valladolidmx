/**
 * /cuenta/empresa/:businessId/publicacion — Puerta 2 (owner)
 *
 * Checklist estilo Airbnb: valida que la ficha esté completa antes de
 * permitir enviarla a revisión de publicación.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Check,
  Circle,
  Loader2,
  Send,
} from "lucide-react";
import {
  getBusinessPublishChecklist,
  submitBusinessForReview,
  type PublishChecklist,
} from "@/lib/hosting/hosting.functions";

export const Route = createFileRoute(
  "/_authenticated/cuenta/empresa/$businessId/publicacion",
)({
  head: () => ({
    meta: [
      { title: "Prepara tu ficha para publicar · Valladolid.mx" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PublicacionRoute,
});

function PublicacionRoute() {
  const { businessId } = Route.useParams();
  const qc = useQueryClient();
  const getChecklist = useServerFn(getBusinessPublishChecklist);
  const submit = useServerFn(submitBusinessForReview);

  const q = useQuery({
    queryKey: ["publish-checklist", businessId],
    queryFn: () => getChecklist({ data: { business_id: businessId } }),
  });

  const mutate = useMutation({
    mutationFn: () => submit({ data: { business_id: businessId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publish-checklist", businessId] });
      qc.invalidateQueries({ queryKey: ["my-businesses"] });
    },
  });

  if (q.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-3 animate-spin" aria-hidden /> Cargando…
      </p>
    );
  }
  if (q.error instanceof Error) {
    return <p className="text-sm text-destructive">{q.error.message}</p>;
  }
  const data = q.data as PublishChecklist;

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Publicación
      </p>
      <h1 className="mt-2 text-4xl">Prepara tu ficha para publicar</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Completa los siguientes puntos y envíanos tu ficha a revisión. Un
        administrador la publicará una vez validada.
      </p>

      {data.status === "in_review" && (
        <div className="mt-6 rounded-2xl border border-info/30 bg-info/5 p-4 text-sm">
          <p className="font-medium text-foreground">
            Tu ficha está en revisión
          </p>
          <p className="mt-1 text-muted-foreground">
            Te avisaremos por notificación cuando un administrador la publique
            o te devuelva con comentarios.
          </p>
        </div>
      )}

      {data.status === "published" && (
        <div className="mt-6 rounded-2xl border border-success/30 bg-success/5 p-4 text-sm">
          <p className="font-medium text-foreground">
            Tu ficha está publicada
          </p>
        </div>
      )}

      {data.review_notes && data.status === "draft" && (
        <div className="mt-6 rounded-2xl border border-warning/40 bg-warning/5 p-4 text-sm">
          <p className="font-medium text-foreground">
            Notas del administrador
          </p>
          <p className="mt-1 text-muted-foreground">{data.review_notes}</p>
        </div>
      )}

      <ul className="mt-8 space-y-2">
        <ChecklistRow ok={data.checks.logo} label="Logo cuadrado" />
        <ChecklistRow ok={data.checks.cover} label="Foto de portada" />
        <ChecklistRow
          ok={data.checks.gallery_count >= 3}
          label={`Galería con al menos 3 fotos (${data.checks.gallery_count})`}
        />
        <ChecklistRow
          ok={data.checks.description}
          label="Descripción de al menos 80 caracteres"
        />
        <ChecklistRow ok={data.checks.category} label="Categoría principal" />
        <ChecklistRow ok={data.checks.location} label="Ubicación" />
        <ChecklistRow
          ok={data.checks.contact}
          label="Al menos un canal de contacto público"
        />
      </ul>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          to="/cuenta/anfitrion"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm"
        >
          Volver
        </Link>
        {data.status === "draft" && (
          <button
            type="button"
            disabled={!data.ready || mutate.isPending}
            onClick={() => mutate.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {mutate.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            Enviar a revisión para publicar
            <ArrowRight className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {mutate.error instanceof Error && (
        <p className="mt-3 text-sm text-destructive">{mutate.error.message}</p>
      )}
    </div>
  );
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
        ok
          ? "border-success/30 bg-success/5"
          : "border-border bg-card"
      }`}
    >
      {ok ? (
        <Check className="size-4 text-success" aria-hidden />
      ) : (
        <Circle className="size-4 text-muted-foreground" aria-hidden />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </li>
  );
}