import { Link, createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/cms/destinos/")({
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
      headerActions={
        <Link
          to="/cms/destinos/nueva"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
        >
          + Nuevo destino
        </Link>
      }
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
        {
          key: "acciones",
          header: "",
          render: (r) => (
            <Link
              to="/cms/destinos/$destinationId/editar"
              params={{ destinationId: r.id }}
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