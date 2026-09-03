import { Link, createFileRoute } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { listEventsCms } from "@/lib/cms/reads.functions";

type Row = {
  id: string;
  slug: string;
  title: string;
  status: string | null;
  destination_id: string | null;
  starts_at: string;
  is_free: boolean;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/cms/eventos/")({
  head: () => ({
    meta: [{ title: "Eventos · CMS Studio" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: EventosCmsPage,
});

function EventosCmsPage() {
  return (
    <CmsEntityPage<Row>
      queryKey="events"
      fn={listEventsCms}
      title="Eventos"
      description="Fiestas, festivales y celebraciones del Oriente Maya."
      rowKey={(r) => r.id}
      headerActions={
        <Link
          to="/cms/eventos/nuevo"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
        >
          + Nuevo evento
        </Link>
      }
      columns={[
        {
          key: "title",
          header: "Título",
          render: (r) => <span className="font-medium">{r.title}</span>,
        },
        {
          key: "slug",
          header: "Slug",
          render: (r) => <code className="text-xs text-muted-foreground">{r.slug}</code>,
        },
        {
          key: "starts_at",
          header: "Inicio",
          render: (r) => (
            <span className="text-xs text-muted-foreground">
              {new Date(r.starts_at).toLocaleString("es-MX", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          ),
        },
        {
          key: "is_free",
          header: "Acceso",
          render: (r) => (
            <span className="text-xs text-muted-foreground">
              {r.is_free ? "Entrada libre" : "De pago"}
            </span>
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
          key: "acciones",
          header: "",
          render: (r) => (
            <Link
              to="/cms/eventos/$eventId/editar"
              params={{ eventId: r.id }}
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
