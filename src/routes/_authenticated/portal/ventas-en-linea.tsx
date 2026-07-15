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

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["portal", "products", businessId],
    queryFn: () => fetchProducts({ data: { businessId: businessId as string } }),
    enabled: Boolean(businessId),
    staleTime: 30_000,
  });

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
          Activa la venta directa de tus experiencias: precio final para el viajero,
          moneda, comisión de la plataforma, políticas y anticipación mínima. Sólo
          las experiencias que marques aquí podrán venderse directo desde su ficha
          y desde los recorridos que arme el Concierge en el Oriente Maya de Yucatán.
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
            <ProductDirectSaleCard key={p.id} product={p} businessId={businessId} />
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
        <p className="font-medium text-emerald-700">
          ✓ Pagos activos
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Los viajeros ya pueden completar la compra directa de tus experiencias.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
      <p className="font-medium text-amber-700">
        ⚠ Pagos pendientes de activar
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        El botón <strong>Comprar</strong> ya está listo en las fichas de
        experiencia, pero permanece deshabilitado hasta que un
        administrador cargue las llaves del proveedor de pagos y active la
        plataforma en{" "}
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
}: {
  product: PortalProduct;
  businessId: string;
}) {
  const qc = useQueryClient();
  const update = useServerFn(updateProductDirectSaleSettings);

  const [enabled, setEnabled] = useState(product.direct_sale_enabled);
  const [price, setPrice] = useState<string>(
    product.direct_sale_price_amount != null
      ? String((product.direct_sale_price_amount / 100).toFixed(2))
      : "",
  );
  const [currency, setCurrency] = useState(product.direct_sale_currency ?? "MXN");
  const [commissionPct, setCommissionPct] = useState<string>(
    product.direct_sale_commission_bps != null
      ? String((product.direct_sale_commission_bps / 100).toFixed(2))
      : "10",
  );
  const [cancellationPolicy, setCancellationPolicy] = useState(
    product.direct_sale_cancellation_policy ?? "",
  );
  const [terms, setTerms] = useState(product.direct_sale_terms ?? "");
  const [minLeadHours, setMinLeadHours] = useState<string>(
    product.direct_sale_min_lead_hours != null
      ? String(product.direct_sale_min_lead_hours)
      : "",
  );
  const [maxQuantity, setMaxQuantity] = useState<string>(
    product.direct_sale_max_quantity != null
      ? String(product.direct_sale_max_quantity)
      : "",
  );

  const dirty = useMemo(() => {
    const priceCents = price ? Math.round(Number(price) * 100) : null;
    const commissionBps = commissionPct
      ? Math.round(Number(commissionPct) * 100)
      : null;
    return (
      enabled !== product.direct_sale_enabled ||
      priceCents !== product.direct_sale_price_amount ||
      currency !== (product.direct_sale_currency ?? "MXN") ||
      commissionBps !== product.direct_sale_commission_bps ||
      cancellationPolicy !== (product.direct_sale_cancellation_policy ?? "") ||
      terms !== (product.direct_sale_terms ?? "") ||
      (minLeadHours ? Number(minLeadHours) : null) !==
        product.direct_sale_min_lead_hours ||
      (maxQuantity ? Number(maxQuantity) : null) !==
        product.direct_sale_max_quantity
    );
  }, [
    enabled,
    price,
    currency,
    commissionPct,
    cancellationPolicy,
    terms,
    minLeadHours,
    maxQuantity,
    product,
  ]);

  const mutation = useMutation({
    mutationFn: async () => {
      const priceCents = price ? Math.round(Number(price) * 100) : null;
      const commissionBps = commissionPct
        ? Math.round(Number(commissionPct) * 100)
        : null;
      return update({
        data: {
          productId: product.id,
          enabled,
          priceAmount: priceCents,
          currency: currency || "MXN",
          commissionBps,
          cancellationPolicy: cancellationPolicy || null,
          terms: terms || null,
          minLeadHours: minLeadHours ? Number(minLeadHours) : null,
          maxQuantity: maxQuantity ? Number(maxQuantity) : null,
        },
      });
    },
    onSuccess: () => {
      toast.success(
        enabled ? "Venta en línea activada" : "Venta en línea desactivada",
      );
      qc.invalidateQueries({ queryKey: ["portal", "products", businessId] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Error al guardar";
      const label =
        msg === "direct_sale_price_required"
          ? "Ingresa un precio para activar la venta en línea."
          : msg === "invalid_commission_bps"
            ? "La comisión debe estar entre 0 y 100%."
            : msg;
      toast.error(label);
    },
  });

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
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="font-medium">
            {enabled ? "Venta en línea activa" : "Venta en línea inactiva"}
          </span>
        </label>
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
          hint="Porcentaje que Valladolid.mx retiene por cada venta directa."
        >
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.5"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
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

        <Field
          label="Términos adicionales"
          className="sm:col-span-2 lg:col-span-3"
        >
          <Textarea
            rows={2}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Restricciones, edades, incluye/no incluye…"
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        {dirty ? (
          <p className="text-xs text-amber-600">Cambios sin guardar</p>
        ) : null}
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
        <Button
          onClick={() => mutation.mutate()}
          disabled={!dirty || mutation.isPending}
        >
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