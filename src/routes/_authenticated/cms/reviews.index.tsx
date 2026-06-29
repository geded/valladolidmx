import { createFileRoute } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { listReviewsCms } from "@/lib/cms/reads.functions";

type Row = {
  id: string;
  subject_kind: string | null;
  subject_id: string | null;
  author_display_name: string | null;
  rating: number | null;
  title: string | null;
  status: string | null;
  language: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/cms/reviews/")({
  head: () => ({
    meta: [
      { title: "Reseñas · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  return (
    <CmsEntityPage<Row>
      queryKey="reviews"
      fn={listReviewsCms}
      title="Reseñas"
      stage="Ola 1 · Etapa 2 · Lecturas"
      description="Vista de sólo lectura. La moderación llega en Etapa 5."
      rowKey={(r) => r.id}
      columns={[
        { key: "rating", header: "★", render: (r) => <span className="text-xs">{r.rating ?? "—"}</span>, className: "w-12" },
        { key: "title", header: "Título", render: (r) => <span className="font-medium">{r.title ?? "(sin título)"}</span> },
        { key: "author", header: "Autor", render: (r) => <span className="text-xs text-muted-foreground">{r.author_display_name ?? "Anónimo"}</span> },
        { key: "kind", header: "Sujeto", render: (r) => <span className="text-xs text-muted-foreground">{r.subject_kind ?? "—"}</span> },
        { key: "status", header: "Estado", render: (r) => <StatusBadge value={r.status} /> },
        { key: "created", header: "Fecha", render: (r) => <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("es-MX")}</span> },
      ]}
    />
  );
}