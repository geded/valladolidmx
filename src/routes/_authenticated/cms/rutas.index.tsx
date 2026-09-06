import { createFileRoute, Link } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { listEditorialRoutesCms } from "@/lib/cms/reads.functions";

type Row = {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  duration_days: number | null;
  region_slug: string | null;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/cms/rutas/")({
  head: () => ({
    meta: [{ title: "Rutas · CMS Studio" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: RutasCmsPage,
});

function RutasCmsPage() {
  return (
    <CmsEntityPage<Row>
      queryKey="editorial-routes"
      fn={listEditorialRoutesCms}
      title="Rutas e itinerarios"
      description="Itinerarios editoriales publicados en /rutas, con paradas enlazadas a fichas reales."
      rowKey={(r) => r.id}
      headerActions={
        <Link
          to={"/cms/rutas/nueva" as never}
          className="h-9 inline-flex items-center rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-95"
        >
          + Nueva
        </Link>
      }
      columns={[
        {
          key: "name",
          header: "Ruta",
          render: (r) => (
            <Link
              to={"/cms/rutas/$id/editar" as never}
              params={{ id: r.id } as never}
              className="font-medium hover:underline"
            >
              {r.name}
            </Link>
          ),
        },
        {
          key: "slug",
          header: "Slug",
          render: (r) => <code className="text-xs text-muted-foreground">{r.slug}</code>,
        },
        {
          key: "days",
          header: "Días",
          render: (r) => (
            <span className="text-xs text-muted-foreground">{r.duration_days ?? "—"}</span>
          ),
        },
        { key: "status", header: "Estado", render: (r) => <StatusBadge value={r.status} /> },
        {
          key: "updated",
          header: "Actualizado",
          render: (r) => (
            <span className="text-xs text-muted-foreground">
              {new Date(r.updated_at).toLocaleDateString("es-MX")}
            </span>
          ),
        },
        {
          key: "actions",
          header: "",
          render: (r) => (
            <Link
              to={"/cms/rutas/$id/editar" as never}
              params={{ id: r.id } as never}
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
