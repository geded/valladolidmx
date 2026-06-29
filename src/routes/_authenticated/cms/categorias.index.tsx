import { createFileRoute } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { listCategoriesCms } from "@/lib/cms/reads.functions";

type Row = {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  sort_order: number | null;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/cms/categorias")({
  head: () => ({
    meta: [
      { title: "Categorías · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CategoriasPage,
});

function CategoriasPage() {
  return (
    <CmsEntityPage<Row>
      queryKey="categories"
      fn={listCategoriesCms}
      title="Categorías"
      stage="Ola 1 · Etapa 2 · Lecturas"
      description="Taxonomía oficial de empresas y productos."
      rowKey={(r) => r.id}
      columns={[
        { key: "order", header: "#", render: (r) => <span className="text-xs text-muted-foreground">{r.sort_order ?? "—"}</span>, className: "w-12" },
        { key: "name", header: "Nombre", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "slug", header: "Slug", render: (r) => <code className="text-xs text-muted-foreground">{r.slug}</code> },
        { key: "status", header: "Estado", render: (r) => <StatusBadge value={r.status} /> },
        { key: "updated", header: "Actualizado", render: (r) => <span className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString("es-MX")}</span> },
      ]}
    />
  );
}