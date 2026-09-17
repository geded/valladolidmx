/**
 * /cms/experiencias/$productId — Ficha comercial de una experiencia.
 *
 * Sólo lectura comercial + accesos al editor editorial existente y a las
 * solicitudes de venta en línea. El calendario y el cupo real llegan en el
 * paso 4 del plan.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatusBadge } from "@/components/cms/EntityListView";
import { getCommerceExperience } from "@/lib/commerce/experiences-admin.functions";
import {
  DIRECT_SALE_REQUEST_LABEL,
  listDirectSaleRequests,
} from "@/lib/commerce/direct-sale-authorizations.functions";

const money = (amount: number | null | undefined, currency: string) =>
  amount == null
    ? "—"
    : new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount / 100);

const date = (value: string | null) =>
  value ? new Date(value).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—";

export const Route = createFileRoute("/_authenticated/cms/experiencias/$productId")({
  head: () => ({
    meta: [
      { title: "Ficha de experiencia · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ExperienciaFichaPage,
});

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-soft">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ExperienciaFichaPage() {
  const { productId } = Route.useParams();
  const getDetail = useServerFn(getCommerceExperience);
  const listRequests = useServerFn(listDirectSaleRequests);

  const detail = useQuery({
    queryKey: ["cms", "commerce-experience", productId],
    queryFn: () => getDetail({ data: { productId } }),
  });

  const requests = useQuery({
    queryKey: ["cms", "commerce-experience-requests", productId],
    queryFn: () => listRequests({ data: { productId, status: "all", limit: 50 } }),
  });

  if (detail.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando ficha…</p>;
  }
  if (detail.isError || !detail.data) {
    return (
      <div className="m-6 rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
        <p className="font-semibold text-destructive">No se pudo cargar la experiencia.</p>
        <p className="mt-1 text-destructive/80">
          {detail.error instanceof Error ? detail.error.message : "Error desconocido."}
        </p>
      </div>
    );
  }

  const d = detail.data;
  const currency = d.direct_sale_currency || d.price_currency;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/cms/experiencias"
            className="text-xs font-medium text-muted-foreground hover:underline"
          >
            ← Experiencias
          </Link>
          <h1 className="mt-1 truncate text-xl font-semibold">{d.name}</h1>
          <p className="text-sm text-muted-foreground">
            {d.business_name ?? "Sin empresa"} · {d.product_type}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={d.status} />
          <Link
            to="/cms/productos/$productId/editar"
            params={{ productId: d.id }}
            className="inline-flex h-9 items-center rounded-md border px-3 text-xs font-semibold hover:bg-muted"
          >
            Editar contenido
          </Link>
        </div>
      </header>

      {d.warnings.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm">
          <p className="font-semibold text-warning">Pendientes antes de vender</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted-foreground">
            {d.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Resumen">
          <dl className="grid grid-cols-2 gap-3">
            <Field label="Modalidad" value={d.conversion_mode} />
            <Field
              label="Venta en línea"
              value={d.direct_sale_enabled ? "Autorizada" : "No autorizada"}
            />
            <Field label="Publicada" value={date(d.published_at)} />
            <Field label="Actualizada" value={date(d.updated_at)} />
            <Field label="Resumen" value={d.tagline ?? "—"} />
            <Field label="Slug" value={<code className="text-xs">{d.slug}</code>} />
          </dl>
        </Card>

        <Card title="Condiciones comerciales">
          <dl className="grid grid-cols-2 gap-3">
            <Field label="Precio de venta" value={money(d.direct_sale_price_amount, currency)} />
            <Field
              label="Precio de ficha"
              value={
                d.price_amount == null
                  ? "—"
                  : new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: d.price_currency || "MXN",
                      maximumFractionDigits: 0,
                    }).format(d.price_amount)
              }
            />

            <Field
              label="Comisión"
              value={
                d.direct_sale_commission_bps == null
                  ? "—"
                  : `${(d.direct_sale_commission_bps / 100).toFixed(2)} %`
              }
            />
            <Field
              label="Anticipación mínima"
              value={d.direct_sale_min_lead_hours ? `${d.direct_sale_min_lead_hours} h` : "—"}
            />
            <Field
              label="Máximo por reserva"
              value={d.direct_sale_max_quantity ? `${d.direct_sale_max_quantity}` : "—"}
            />
            <Field label="Cobro en línea" value={d.accepts_online_payment ? "Sí" : "No"} />
          </dl>
        </Card>

        <Card title="Operación">
          <dl className="grid grid-cols-2 gap-3">
            <Field
              label="Duración"
              value={d.duration_minutes ? `${d.duration_minutes} min` : "—"}
            />
            <Field label="Cupo por salida" value={d.capacity ? `${d.capacity}` : "—"} />
            <Field
              label="Requiere disponibilidad"
              value={d.requires_availability ? "Sí" : "No"}
            />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            El calendario con horarios y bloqueo de lugares llega en el siguiente paso.
          </p>
        </Card>

        <Card title="Políticas">
          <dl className="space-y-3">
            <Field
              label="Cancelación"
              value={d.direct_sale_cancellation_policy ?? "Sin capturar"}
            />
            <Field label="Términos" value={d.direct_sale_terms ?? "Sin capturar"} />
          </dl>
        </Card>
      </div>

      <Card title="Ventas recientes">
        {d.recent_orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay reservaciones.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-1.5 pr-3">Folio</th>
                  <th className="py-1.5 pr-3">Estado</th>
                  <th className="py-1.5 pr-3">Pagada</th>
                  <th className="py-1.5 pr-3">Personas</th>
                  <th className="py-1.5">Importe</th>
                </tr>
              </thead>
              <tbody>
                {d.recent_orders.map((o) => (
                  <tr key={`${o.order_id}-${o.folio}-${o.quantity}`} className="border-t">
                    <td className="py-1.5 pr-3">
                      <Link
                        to="/concierge/reservaciones/$orderId"
                        params={{ orderId: o.order_id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {o.folio ?? "—"}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{o.status}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{date(o.paid_at)}</td>
                    <td className="py-1.5 pr-3">{o.quantity}</td>
                    <td className="py-1.5">{money(o.subtotal_amount, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Historial de autorizaciones">
        {(requests.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin solicitudes registradas.</p>
        ) : (
          <ul className="space-y-2">
            {(requests.data ?? []).map((r) => (
              <li key={r.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{DIRECT_SALE_REQUEST_LABEL[r.status]}</span>
                  <span className="text-xs text-muted-foreground">
                    {date(r.decided_at ?? r.requested_at)}
                  </span>
                </div>
                {r.commission_bps != null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Comisión {(r.commission_bps / 100).toFixed(2)} %
                  </p>
                )}
                {(r.decision_note || r.request_note) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.decision_note ?? r.request_note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/cms/ventas-en-linea"
          className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
        >
          Ir a solicitudes de venta en línea
        </Link>
      </Card>
    </div>
  );
}
