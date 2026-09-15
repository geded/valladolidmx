import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CmsEntityPage } from "@/components/cms/CmsEntityPage";
import { StatusBadge } from "@/components/cms/EntityListView";
import { CmsTerritoryBar, useCmsTerritoryOptions } from "@/components/cms/CmsTerritoryBar";
import {
  CMS_PRODUCT_TYPE_OPTIONS,
  CMS_STATUS_OPTIONS,
  CmsFilterGrid,
  CmsSelectFilter,
} from "@/components/cms/CmsFilters";
import { useCmsTerritory } from "@/lib/cms/territory-context";
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

export const Route = createFileRoute("/_authenticated/cms/productos/")({
  head: () => ({
    meta: [{ title: "Productos · CMS Studio" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ProductosPage,
});

function ProductosPage() {
  const options = useCmsTerritoryOptions();
  const { territory } = useCmsTerritory();
  const [businessId, setBusinessId] = useState("");
  const [productType, setProductType] = useState("");
  const [status, setStatus] = useState("");

  // Las empresas del selector siguen el destino de trabajo activo.
  const businesses = useMemo(
    () =>
      territory.destinationId
        ? options.businesses.filter((b) => b.destination_id === territory.destinationId)
        : options.businesses,
    [options.businesses, territory.destinationId],
  );

  const businessName = (id: string | null) =>
    id ? (options.businesses.find((b) => b.id === id)?.display_name ?? "—") : "—";

  return (
    <CmsEntityPage<Row>
      queryKey="products"
      fn={listProductsCms}
      title="Productos"
      description="Experiencias, hoteles, restaurantes, eventos, tours y más, por destino y empresa."
      rowKey={(r) => r.id}
      extraParams={{
        destinationId: territory.destinationId || null,
        businessId: businessId || null,
        productType: productType || null,
        status: status || null,
      }}
      filters={
        <>
          <CmsTerritoryBar options={options} />
          <CmsFilterGrid>
            <CmsSelectFilter
              label="Empresa"
              value={businessId}
              onChange={setBusinessId}
              allLabel={
                territory.destinationId ? "Todas las del destino" : "Todas las empresas"
              }
              options={businesses.map((b) => ({ value: b.id, label: b.display_name }))}
            />
            <CmsSelectFilter
              label="Tipo"
              value={productType}
              onChange={setProductType}
              allLabel="Todos los tipos"
              options={CMS_PRODUCT_TYPE_OPTIONS}
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
          to="/cms/productos/nueva"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
        >
          + Nuevo producto
        </Link>
      }
      columns={[
        {
          key: "name",
          header: "Nombre",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        {
          key: "business",
          header: "Empresa",
          render: (r) => (
            <span className="text-xs text-muted-foreground">{businessName(r.business_id)}</span>
          ),
        },
        {
          key: "type",
          header: "Tipo",
          render: (r) => (
            <span className="text-xs text-muted-foreground">{r.product_type ?? "—"}</span>
          ),
        },
        {
          key: "slug",
          header: "Slug",
          render: (r) => <code className="text-xs text-muted-foreground">{r.slug}</code>,
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
