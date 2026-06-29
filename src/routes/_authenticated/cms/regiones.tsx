import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/cms/regiones")({
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
      stage="Ola 1 · Etapa 2 · Lecturas"
      description="Regiones que agrupan los destinos del territorio."
      rowKey={(r) => r.id}
      columns={[
        { key: "name", header: "Nombre", render: (r) => <span className="font-medium">{r.name}</span> },
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
      ]}
    />
  );
}