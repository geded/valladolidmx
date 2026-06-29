import { createFileRoute } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { listDestinationsCms } from "@/lib/cms/reads.functions";

type Row = {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  tourism_region_id: string | null;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/cms/destinos")({
  head: () => ({
    meta: [
      { title: "Destinos · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DestinosPage,
});

function DestinosPage() {
  return (
    <CmsEntityPage<Row>
      queryKey="destinations"
      fn={listDestinationsCms}
      title="Destinos"
      stage="Ola 1 · Etapa 2 · Lecturas"
      description="Pueblos, ciudades y enclaves del Oriente Maya."
      rowKey={(r) => r.id}
      columns={[
        { key: "name", header: "Nombre", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "slug", header: "Slug", render: (r) => <code className="text-xs text-muted-foreground">{r.slug}</code> },
        { key: "region", header: "Región", render: (r) => <span className="text-xs text-muted-foreground">{r.tourism_region_id?.slice(0, 8) ?? "—"}</span> },
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