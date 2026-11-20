import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { CmsTerritoryBar, useCmsTerritoryOptions } from "@/components/cms/CmsTerritoryBar";
import { useCmsTerritory } from "@/lib/cms/territory-context";
import { listZonesCms } from "@/lib/cms/reads.functions";

type Row = {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  destination_id: string | null;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/cms/zonas/")({
  head: () => ({
    meta: [{ title: "Zonas · CMS Studio" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ZonasPage,
});

function ZonasPage() {
  const options = useCmsTerritoryOptions();
  const { territory } = useCmsTerritory();
  const destinationId = territory.destinationId;

  const destinationNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of options.destinations) map.set(d.id, d.name);
    return map;
  }, [options.destinations]);

  const destinationName = destinationId ? (destinationNames.get(destinationId) ?? null) : null;

  return (
    <CmsEntityPage<Row>
      queryKey="zones"
      fn={listZonesCms}
      title="Zonas de destino"
      description={
        destinationName
          ? `Barrios y sub-áreas de ${destinationName}.`
          : "Elige arriba el destino con el que vas a trabajar para ver y agregar sus barrios y sub-áreas."
      }
      rowKey={(r) => r.id}
      extraParams={{ destinationId: destinationId || null }}
      filters={<CmsTerritoryBar options={options} />}
      emptyMessage={
        destinationName
          ? `${destinationName} todavía no tiene zonas registradas.`
          : "Elige un destino para ver sus zonas."
      }
      headerActions={
        destinationId ? (
          <Link
            to={"/cms/zonas/nueva" as never}
            className="h-9 inline-flex items-center rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-95"
          >
            + Nueva zona en {destinationName ?? "este destino"}
          </Link>
        ) : (
          <span
            className="h-9 inline-flex items-center rounded-md border border-border px-3 text-xs font-medium text-muted-foreground"
            title="Elige primero el destino de trabajo"
          >
            Elige un destino para agregar zonas
          </span>
        )
      }
      columns={[
        {
          key: "name",
          header: "Nombre",
          render: (r) => (
            <Link
              to={"/cms/zonas/$id/editar" as never}
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
          key: "dest",
          header: "Destino",
          render: (r) => (
            <span className="text-xs text-muted-foreground">
              {(r.destination_id && destinationNames.get(r.destination_id)) ?? "—"}
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
          key: "actions",
          header: "",
          render: (r) => (
            <Link
              to={"/cms/zonas/$id/editar" as never}
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
