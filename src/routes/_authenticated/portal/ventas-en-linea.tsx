/**
 * /portal/ventas-en-linea — Configuración de venta directa por producto (CV4.1).
 *
 * El empresario activa la venta en línea de sus experiencias, define precio,
 * moneda, comisión específica, política de cancelación, términos, anticipación
 * mínima y cupo máximo. Autorización server-side vía `has_business_access`.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import {
  listBusinessProducts,
  updateProductDirectSaleSettings,
  type PortalProduct,
} from "@/lib/portal/business-catalog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DirectSaleBuyButton } from "@/components/commerce/DirectSaleBuyButton";
import { getPaymentsReadyPublic } from "@/lib/payments/public-status.functions";
import {
  listDirectSaleRequests,
  submitDirectSaleRequest,
  cancelDirectSaleRequest,
  DIRECT_SALE_REQUEST_LABEL,
  type DirectSaleRequestRow,
} from "@/lib/commerce/direct-sale-authorizations.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/ventas-en-linea")({
  component: DirectSalesPage,
});

function useActiveBusinessId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setId(window.localStorage.getItem(STORAGE_KEY));
    const onCustom = (event: Event) => {
      setId((event as CustomEvent<string>).detail ?? null);
    };
    window.addEventListener("portal:active-business-changed", onCustom);
    return () => {
      window.removeEventListener("portal:active-business-changed", onCustom);
    };
  }, []);
  return id;
}

function DirectSalesPage() {
  const businessId = useActiveBusinessId();
  const fetchProducts = useServerFn(listBusinessProducts);
  const fetchPayStatus = useServerFn(getPaymentsReadyPublic);

  const payStatusQ = useQuery({
    queryKey: ["payments", "public-status"],
    queryFn: () => fetchPayStatus(),
    staleTime: 60_000,
  });

  const {
    data: products = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["portal", "products", businessId],
    queryFn: () => fetchProducts({ data: { businessId: businessId as string } }),
    enabled: Boolean(businessId),
    staleTime: 30_000,
  });

  const fetchRequests = useServerFn(listDirectSaleRequests);
  const { data: requests = [] } = useQuery({
    queryKey: ["portal", "direct-sale-requests", businessId],
    queryFn: () =>
      fetchRequests({ data: { status: "all", businessId: businessId as string, limit: 200 } }),
    enabled: Boolean(businessId),
    staleTime: 15_000,
  });

  const latestByProduct = useMemo(() => {
    const map = new Map<string, DirectSaleRequestRow>();
    for (const r of requests) if (!map.has(r.product_id)) map.set(r.product_id, r);
    return map;
  }, [requests]);

  if (!businessId) {
    return (
      <EmptyState
        title="Selecciona una empresa"
        body="Elige una empresa activa para configurar sus ventas en línea."
      />
    );
  }

  const enabledCount = products.filter((p) => p.direct_sale_enabled).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Portal Empresarial · Comercial
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Ventas en línea</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Prepara el precio, las políticas y los términos de tus experiencias. La activación de
          la venta en línea y la comisión de la plataforma las autoriza y fija Administración tras
          revisión. Una vez activada, la experiencia se vende directo desde su ficha y llega al
          Concierge como reservación con folio ERL.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{enabledCount} activas</Badge>
          <Badge variant="outline">{products.length} experiencias totales</Badge>
          <Link
            to="/portal/ventas-en-linea/ordenes"
            className="ml-auto rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
          >
            Ver mis ventas →
          </Link>
        </div>
      </header>

      <PaymentsStatusBanner ready={payStatusQ.data?.ready ?? false} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando experiencias…</p>
      ) : error ? (
        <EmptyState
          title="No pudimos cargar tus experiencias"
          body={error instanceof Error ? error.message : "Error desconocido."}
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="Aún no tienes experiencias"
          body="Crea una experiencia desde el Catálogo para poder habilitar su venta directa."
          cta={{ to: "/portal/catalogo", label: "Ir al Catálogo" }}
        />
      ) : (
        <ul className="space-y-4">
          {products.map((p) => (
            <ProductDirectSaleCard
              key={p.id}
              product={p}
              businessId={businessId}
              request={latestByProduct.get(p.id) ?? null}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PaymentsStatusBanner({ ready }: { ready: boolean }) {
  if (ready) {
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm">
        <p className="font-medium text-emerald-700">✓ Pagos activos</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Los viajeros ya pueden completar la compra directa de tus experiencias.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
      <p className="font-medium text-amber-700">⚠ Pagos pendientes de activar</p>
      <p className="mt-1 text-xs text-muted-foreground">
        El botón <strong>Comprar</strong> ya está listo en las fichas de experiencia, pero permanece
        deshabilitado hasta que un administrador cargue las llaves del proveedor de pagos y active
        la plataforma en{" "}
        <Link to="/cms/pagos" className="underline">
          CMS · Pagos
        </Link>
        .
      </p>
    </div>
  );
}

function ProductDirectSaleCard({
  product,
  businessId,
  request,
}: {
  product: PortalProduct;
  businessId: string;
  request: DirectSaleRequestRow | null;
}) {
  const qc = useQueryClient();
  const update = useServerFn(updateProductDirectSaleSettings);

  const [enabled] = useState(product.direct_sale_enabled);
  const [price, setPrice] = useState<string>(
    product.direct_sale_price_amount != null
      ? String((product.direct_sale_price_amount / 100).toFixed(2))
      : "",
  );
  const [currency, setCurrency] = useState(product.direct_sale_currency ?? "MXN");
  const [cancellationPolicy, setCancellationPolicy] = useState(
    product.direct_sale_cancellation_policy ?? "",
  );
  const [terms, setTerms] = useState(product.direct_sale_terms ?? "");
  const [minLeadHours, setMinLeadHours] = useState<string>(
    product.direct_sale_min_lead_hours != null ? String(product.direct_sale_min_lead_hours) : "",
  );
  const [maxQuantity, setMaxQuantity] = useState<string>(
    product.direct_sale_max_quantity != null ? String(product.direct_sale_max_quantity) : "",
  );

  const dirty = useMemo(() => {
    const priceCents = price ? Math.round(Number(price) * 100) : null;
    return (
      priceCents !== product.direct_sale_price_amount ||
      currency !== (product.direct_sale_currency ?? "MXN") ||
      cancellationPolicy !== (product.direct_sale_cancellation_policy ?? "") ||
      terms !== (product.direct_sale_terms ?? "") ||
      (minLeadHours ? Number(minLeadHours) : null) !== product.direct_sale_min_lead_hours ||
      (maxQuantity ? Number(maxQuantity) : null) !== product.direct_sale_max_quantity
    );
  }, [
    price,
    currency,
    cancellationPolicy,
    terms,
    minLeadHours,
    maxQuantity,
    product,
  ]);

  const mutation = useMutation({
    mutationFn: async () => {
      const priceCents = price ? Math.round(Number(price) * 100) : null;
      return update({
        data: {
          productId: product.id,
          enabled: product.direct_sale_enabled,
          priceAmount: priceCents,
          currency: currency || "MXN",
          commissionBps: null,
          cancellationPolicy: cancellationPolicy || null,
          terms: terms || null,
          minLeadHours: minLeadHours ? Number(minLeadHours) : null,
          maxQuantity: maxQuantity ? Number(maxQuantity) : null,
        },
      });
    },
    onSuccess: () => {
      toast.success(enabled ? "Venta en línea activada" : "Venta en línea desactivada");
      qc.invalidateQueries({ queryKey: ["portal", "products", businessId] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Error al guardar";
      const label =
        msg === "direct_sale_price_required"
          ? "Ingresa un precio para activar la venta en línea."
          : msg === "forbidden_direct_sale_authorization_required"
            ? "Sólo Administración puede activar la venta en línea o cambiar la comisión."
            : msg;
      toast.error(label);
    },
  });

  const submit = useServerFn(submitDirectSaleRequest);
  const cancelRequest = useServerFn(cancelDirectSaleRequest);

  const invalidateRequests = () => {
    qc.invalidateQueries({ queryKey: ["portal", "direct-sale-requests", businessId] });
    qc.invalidateQueries({ queryKey: ["portal", "products", businessId] });
  };

  const requestError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : "No se pudo completar la solicitud.";
    const label = msg.includes("direct_sale_price_required")
      ? "Captura y guarda el precio antes de solicitar la venta en línea."
      : msg.includes("direct_sale_request_pending")
        ? "Ya tienes una solicitud en revisión para esta experiencia."
        : msg.includes("direct_sale_already_enabled")
          ? "Esta experiencia ya tiene la venta en línea autorizada."
          : msg;
    toast.error(label);
  };

  const submitMutation = useMutation({
    mutationFn: () => submit({ data: { productId: product.id } }),
    onSuccess: () => {
      toast.success("Solicitud enviada a Administración.");
      invalidateRequests();
    },
    onError: requestError,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelRequest({ data: { requestId: request?.id as string } }),
    onSuccess: () => {
      toast.success("Solicitud retirada.");
      invalidateRequests();
    },
    onError: requestError,
  });

  const pending = request?.status === "pending";

  return (
    <li className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <Badge variant="outline" className="text-[10px] uppercase">
              {product.product_type}
            </Badge>
            <Badge
              variant={product.status === "published" ? "default" : "secondary"}
              className="text-[10px] uppercase"
            >
              {product.status}
            </Badge>
          </div>
          {product.tagline ? (
            <p className="mt-1 text-xs text-muted-foreground">{product.tagline}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={enabled} disabled />
            <span className="font-medium">
              {enabled ? "Venta en línea activa" : "Venta en línea inactiva"}
            </span>
          </label>
          <p className="text-[11px] text-muted-foreground">
            {enabled
              ? "Activada por Administración."
              : "La activa Administración tras revisión."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">
            {request ? (
              <>
                Solicitud: {DIRECT_SALE_REQUEST_LABEL[request.status]}
                {request.decided_at ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    · {new Date(request.decided_at).toLocaleDateString("es-MX")}
                  </span>
                ) : null}
              </>
            ) : (
              "Sin solicitud de venta en línea"
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {request?.decision_note
              ? request.decision_note
              : pending
                ? "Administración revisará el precio y definirá la comisión."
                : enabled
                  ? "La venta en línea está autorizada por Administración."
                  : "Guarda el precio y solicita la autorización de venta en línea."}
          </p>
        </div>
        {enabled ? null : pending ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            Retirar solicitud
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || dirty}
            title={dirty ? "Guarda los cambios antes de solicitar" : undefined}
          >
            {submitMutation.isPending ? "Enviando…" : "Solicitar venta en línea"}
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          label="Precio final al viajero"
          hint="Precio total que el viajero paga (impuestos incluidos)."
        >
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              disabled={!enabled && !dirty}
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-2 text-sm"
            >
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </Field>

        <Field
          label="Comisión de la plataforma"
          hint="La fija Administración al autorizar la venta."
        >
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.5"
              value={
                product.direct_sale_commission_bps != null
                  ? String((product.direct_sale_commission_bps / 100).toFixed(2))
                  : ""
              }
              disabled
              placeholder="Por definir"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </Field>

        <Field label="Anticipación mínima" hint="Horas antes de la actividad.">
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={minLeadHours}
            onChange={(e) => setMinLeadHours(e.target.value)}
            placeholder="Ej. 24"
          />
        </Field>

        <Field label="Cupo máximo por reserva">
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={maxQuantity}
            onChange={(e) => setMaxQuantity(e.target.value)}
            placeholder="Ej. 10"
          />
        </Field>

        <Field
          label="Política de cancelación"
          hint="Se muestra al viajero antes de pagar."
          className="sm:col-span-2 lg:col-span-3"
        >
          <Textarea
            rows={2}
            value={cancellationPolicy}
            onChange={(e) => setCancellationPolicy(e.target.value)}
            placeholder="Ej. Reembolso completo hasta 48 h antes."
          />
        </Field>

        <Field label="Términos adicionales" className="sm:col-span-2 lg:col-span-3">
          <Textarea
            rows={2}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Restricciones, edades, incluye/no incluye…"
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        {dirty ? <p className="text-xs text-amber-600">Cambios sin guardar</p> : null}
        {enabled && price ? (
          <div className="mr-auto flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Vista previa:
            </span>
            <DirectSaleBuyButton
              productName={product.name}
              priceLabel={`${Number(price).toFixed(2)} ${currency}`}
            />
          </div>
        ) : null}
        <Button onClick={() => mutation.mutate()} disabled={!dirty || mutation.isPending}>
          {mutation.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </li>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { to: string; label: string };
}) {
  return (
    <div className="max-w-2xl rounded-lg border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {cta ? (
        <Link
          to={cta.to}
          className="mt-4 inline-flex rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}
