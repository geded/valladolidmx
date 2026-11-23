import { Link, createFileRoute } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { CmsTerritoryBar, useCmsTerritoryOptions } from "@/components/cms/CmsTerritoryBar";
import { CMS_STATUS_OPTIONS, CmsFilterGrid, CmsSelectFilter } from "@/components/cms/CmsFilters";
import { useCmsTerritory } from "@/lib/cms/territory-context";
import { useCmsListField, useCmsListMemory } from "@/lib/cms/list-memory";
import { missingContentOptions } from "@/lib/cms/missing-content";
import { listBusinessesCms } from "@/lib/cms/reads.functions";

type Row = {
  id: string;
  slug: string;
  display_name: string;
  status: string | null;
  verified: boolean | null;
  destination_id: string | null;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/cms/empresas/")({
  head: () => ({
    meta: [{ title: "Empresas · CMS Studio" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: EmpresasPage,
});

function EmpresasPage() {
  const options = useCmsTerritoryOptions();
  const { territory } = useCmsTerritory();
  const listMemory = useCmsListMemory("businesses.filters");
  const [missing, setMissing] = useCmsListField(listMemory, "missing");
  const [categoryId, setCategoryId] = useCmsListField(listMemory, "categoryId");
  const [status, setStatus] = useCmsListField(listMemory, "status");
  const [verified, setVerified] = useCmsListField(listMemory, "verified");

  const destinationName = (id: string | null) =>
    id ? (options.destinations.find((d) => d.id === id)?.name ?? "—") : "—";

  return (
    <CmsEntityPage<Row>
      queryKey="businesses"
      fn={listBusinessesCms}
      title="Empresas"
      description="Fichas editoriales de empresas locales, por destino y categoría."
      rowKey={(r) => r.id}
      extraParams={{
        destinationId: territory.destinationId || null,
        categoryId: categoryId || null,
        status: status || null,
        missing: missing || null,
        verified: verified || null,
      }}
      filters={
        <>
          <CmsTerritoryBar options={options} />
          <CmsFilterGrid>
            <CmsSelectFilter
              label="Categoría"
              value={categoryId}
              onChange={setCategoryId}
              allLabel="Todas las categorías"
              options={options.categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <CmsSelectFilter
              label="Estado de publicación"
              value={status}
              onChange={setStatus}
              allLabel="Todos los estados"
              options={CMS_STATUS_OPTIONS}
            />
            <CmsSelectFilter
              label="Le falta"
              value={missing}
              onChange={setMissing}
              allLabel="Ver todas"
              options={missingContentOptions("businesses")}
            />
            <CmsSelectFilter
              label="Verificadas"
              value={verified}
              onChange={setVerified}
              allLabel="Todas"
              options={[
                { value: "yes", label: "Sólo verificadas" },
                { value: "no", label: "Sin verificar" },
              ]}
            />
          </CmsFilterGrid>
        </>
      }
      headerActions={
        <Link
          to="/cms/empresas/nueva"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
        >
          + Nueva empresa
        </Link>
      }
      columns={[
        {
          key: "name",
          header: "Nombre",
          render: (r) => <span className="font-medium">{r.display_name}</span>,
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
          header: "Dirección web",
          render: (r) => <code className="text-xs text-muted-foreground">{r.slug}</code>,
        },
        {
          key: "verified",
          header: "Verificada",
          render: (r) => (
            <span className="text-xs text-muted-foreground">{r.verified ? "Sí" : "No"}</span>
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
              to="/cms/empresas/$businessId/editar"
              params={{ businessId: r.id }}
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
