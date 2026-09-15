import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { CmsTerritoryBar, useCmsTerritoryOptions } from "@/components/cms/CmsTerritoryBar";
import {
  CMS_STATUS_OPTIONS,
  CmsFilterGrid,
  CmsSelectFilter,
} from "@/components/cms/CmsFilters";
import { useCmsTerritory } from "@/lib/cms/territory-context";
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
  const options = useCmsTerritoryOptions();
  const { territory } = useCmsTerritory();
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");

  const destinationName = (id: string | null) =>
    id ? (options.destinations.find((d) => d.id === id)?.name ?? "—") : "—";

  return (
    <CmsEntityPage<Row>
      queryKey="events"
      fn={listEventsCms}
      title="Eventos"
      description="Fiestas, festivales y celebraciones del Oriente Maya, por destino y fecha."
      rowKey={(r) => r.id}
      extraParams={{
        destinationId: territory.destinationId || null,
        status: status || null,
        period: period || null,
      }}
      filters={
        <>
          <CmsTerritoryBar options={options} />
          <CmsFilterGrid>
            <CmsSelectFilter
              label="Periodo"
              value={period}
              onChange={setPeriod}
              allLabel="Todas las fechas"
              options={[
                { value: "upcoming", label: "Próximos" },
                { value: "past", label: "Pasados" },
              ]}
            />
            <CmsSelectFilter
              label="Estado de publicación"
              value={status}
              onChange={setStatus}
              allLabel="Todos los estados"
              options={CMS_STATUS_OPTIONS}
            />
          </CmsFilterGrid>
        </>
      }
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
          key: "destination",
          header: "Destino",
          render: (r) => (
            <span className="text-xs text-muted-foreground">
              {destinationName(r.destination_id)}
            </span>
          ),
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
