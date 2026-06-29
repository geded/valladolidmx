import { createFileRoute } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { listProductsCms } from "@/lib/cms/reads.functions";

type Row = {
  id: string;
  slug: string;
  name: string;
  product_type: string | null;
  status: string | null;
  business_id: string | null;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/cms/productos")({
  head: () => ({
    meta: [
      { title: "Productos · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProductosPage,
});

function ProductosPage() {
  return (
    <CmsEntityPage<Row>
      queryKey="products"
      fn={listProductsCms}
      title="Productos"
      stage="Ola 1 · Etapa 2 · Lecturas"
      description="Experiencias, hoteles, restaurantes, eventos, tours y más."
      rowKey={(r) => r.id}
      columns={[
        { key: "name", header: "Nombre", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "type", header: "Tipo", render: (r) => <span className="text-xs text-muted-foreground">{r.product_type ?? "—"}</span> },
        { key: "slug", header: "Slug", render: (r) => <code className="text-xs text-muted-foreground">{r.slug}</code> },
        { key: "status", header: "Estado", render: (r) => <StatusBadge value={r.status} /> },
        { key: "updated", header: "Actualizado", render: (r) => <span className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString("es-MX")}</span> },
      ]}
    />
  );
}