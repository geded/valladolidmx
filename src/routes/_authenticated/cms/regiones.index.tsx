import { createFileRoute, Link } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { listRegionsCms } from "@/lib/cms/reads.functions";

type Row = {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/cms/regiones/")({
  head: () => ({
    meta: [
      { title: "Regiones · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RegionesPage,
});

function RegionesPage() {
  return (
    <CmsEntityPage<Row>
      queryKey="regions"
      fn={listRegionsCms}
      title="Regiones turísticas"
      stage="Ola 1 · Etapa 3 · Edición"
      description="Regiones que agrupan los destinos del territorio."
      rowKey={(r) => r.id}
      headerActions={
        <Link
          to="/_authenticated/cms/regiones/nueva" as never
          className="h-9 inline-flex items-center rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-95"
        >
          + Nueva
        </Link>
      }
      columns={[
        {
          key: "name",
          header: "Nombre",
          render: (r) => (
            <Link
              to={"/cms/regiones/$id/editar" as never}
              params={{ id: r.id } as never}
              className="font-medium hover:underline"
            >
              {r.name}
            </Link>
          ),
        },
        { key: "slug", header: "Slug", render: (r) => <code className="text-xs text-muted-foreground">{r.slug}</code> },
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
              to={"/cms/regiones/$id/editar" as never}
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
