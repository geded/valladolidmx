import { Link, createFileRoute } from "@tanstack/react-router";
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
      headerActions={
        <Link
          to="/cms/productos/nueva"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
        >
          + Nuevo producto
        </Link>
      }
      columns={[
        { key: "name", header: "Nombre", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "type", header: "Tipo", render: (r) => <span className="text-xs text-muted-foreground">{r.product_type ?? "—"}</span> },
        { key: "slug", header: "Slug", render: (r) => <code className="text-xs text-muted-foreground">{r.slug}</code> },
        { key: "status", header: "Estado", render: (r) => <StatusBadge value={r.status} /> },
        { key: "updated", header: "Actualizado", render: (r) => <span className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString("es-MX")}</span> },
        {
          key: "acciones",
          header: "",
          render: (r) => (
            <Link
              to="/cms/productos/$productId/editar"
              params={{ productId: r.id }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Editar →
            </Link>
          ),
        },
      ]}
    />
  );
}