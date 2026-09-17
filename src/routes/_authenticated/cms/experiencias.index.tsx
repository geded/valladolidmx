/**
 * /cms/experiencias — Paso 3 del plan "Experiencias: la sección que vende en línea".
 *
 * Vista comercial de Administración sobre los productos vendibles.
 * No sustituye ni duplica el editor editorial de /cms/productos:
 * desde aquí se navega a la ficha comercial y al editor existente.
 */
import { useMemo, useState } from "react";
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
import {
  listCommerceExperiences,
  SELLABLE_PRODUCT_TYPES,
  type CommerceExperienceRow,
} from "@/lib/commerce/experiences-admin.functions";

const TYPE_OPTIONS = SELLABLE_PRODUCT_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

const SELLABLE_OPTIONS = [
  { value: "sellable", label: "Con venta en línea" },
  { value: "not_sellable", label: "Sin venta en línea" },
];

const money = (amount: number | null, currency: string) =>
  amount == null
    ? "—"
    : new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount / 100);

// `products.price_amount` se guarda en unidades enteras (pesos), a diferencia de
// `direct_sale_price_amount`, que se guarda en centavos.
const listPrice = (amount: number | null, currency: string) =>
  amount == null
    ? "—"
    : new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: currency || "MXN",
        maximumFractionDigits: 0,
      }).format(amount);

export const Route = createFileRoute("/_authenticated/cms/experiencias/")({
  head: () => ({
    meta: [
      { title: "Experiencias · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ExperienciasCmsPage,
});

function ExperienciasCmsPage() {
  const options = useCmsTerritoryOptions();
  const { territory } = useCmsTerritory();
  const [businessId, setBusinessId] = useState("");
  const [productType, setProductType] = useState("");
  const [status, setStatus] = useState("");
  const [sellable, setSellable] = useState("");

  const businesses = useMemo(
    () =>
      territory.destinationId
        ? options.businesses.filter((b) => b.destination_id === territory.destinationId)
        : options.businesses,
    [options.businesses, territory.destinationId],
  );

  return (
    <CmsEntityPage<CommerceExperienceRow>
      queryKey="commerce-experiences"
      fn={listCommerceExperiences}
      title="Experiencias"
      description="Estado comercial de lo que puede venderse: publicación, venta en línea, precio, comisión, cupo y ventas recientes."
      rowKey={(r) => r.id}
      extraParams={{
        destinationId: territory.destinationId || null,
        businessId: businessId || null,
        productType: productType || null,
        status: status || null,
        sellable: sellable || "all",
      }}
      filters={
        <>
          <CmsTerritoryBar options={options} />
          <CmsFilterGrid>
            <CmsSelectFilter
              label="Empresa"
              value={businessId}
              onChange={setBusinessId}
              allLabel={territory.destinationId ? "Todas las del destino" : "Todas las empresas"}
              options={businesses.map((b) => ({ value: b.id, label: b.display_name }))}
            />
            <CmsSelectFilter
              label="Tipo"
              value={productType}
              onChange={setProductType}
              allLabel="Todos los tipos"
              options={TYPE_OPTIONS}
            />
            <CmsSelectFilter
              label="Estado de publicación"
              value={status}
              onChange={setStatus}
              allLabel="Todos los estados"
              options={CMS_STATUS_OPTIONS}
            />
            <CmsSelectFilter
              label="Venta en línea"
              value={sellable}
              onChange={setSellable}
              allLabel="Todas"
              options={SELLABLE_OPTIONS}
            />
          </CmsFilterGrid>
        </>
      }
      columns={[
        {
          key: "name",
          header: "Experiencia",
          render: (r) => (
            <div className="min-w-0">
              <span className="block truncate font-medium">{r.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {r.business_name ?? "Sin empresa"} · {r.product_type}
              </span>
            </div>
          ),
        },
        {
          key: "status",
          header: "Publicación",
          render: (r) => <StatusBadge value={r.status} />,
        },
        {
          key: "venta",
          header: "Venta en línea",
          render: (r) => (
            <span
              className={
                r.direct_sale_enabled
                  ? "rounded-pill bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                  : "rounded-pill bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              }
            >
              {r.direct_sale_enabled ? "Autorizada" : "No autorizada"}
            </span>
          ),
        },
        {
          key: "precio",
          header: "Precio",
          render: (r) => (
            <span className="text-xs">
              {r.direct_sale_price_amount != null
                ? money(r.direct_sale_price_amount, r.direct_sale_currency)
                : listPrice(r.price_amount, r.price_currency)}
            </span>
          ),
        },
        {
          key: "comision",
          header: "Comisión",
          render: (r) => (
            <span className="text-xs text-muted-foreground">
              {r.direct_sale_commission_bps == null
                ? "—"
                : `${(r.direct_sale_commission_bps / 100).toFixed(2)} %`}
            </span>
          ),
        },
        {
          key: "cupo",
          header: "Duración · Cupo",
          render: (r) => (
            <span className="text-xs text-muted-foreground">
              {r.duration_minutes ? `${r.duration_minutes} min` : "—"} ·{" "}
              {r.capacity ? `${r.capacity} lugares` : "—"}
            </span>
          ),
        },
        {
          key: "ventas",
          header: "Ventas 30 días",
          render: (r) => (
            <span className="text-xs">
              {r.sold_orders > 0
                ? `${r.sold_orders} · ${money(r.sold_amount, r.direct_sale_currency)}`
                : "—"}
            </span>
          ),
        },
        {
          key: "avisos",
          header: "Avisos",
          render: (r) =>
            r.warnings.length === 0 ? (
              <span className="text-xs text-muted-foreground">Sin avisos</span>
            ) : (
              <span
                className="rounded-pill bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
                title={r.warnings.join(" · ")}
              >
                {r.warnings.length} aviso{r.warnings.length > 1 ? "s" : ""}
              </span>
            ),
        },
        {
          key: "acciones",
          header: "",
          render: (r) => (
            <Link
              to="/cms/experiencias/$productId"
              params={{ productId: r.id }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver ficha
            </Link>
          ),
        },
      ]}
      emptyMessage="No hay experiencias con estos filtros."
    />
  );
}
