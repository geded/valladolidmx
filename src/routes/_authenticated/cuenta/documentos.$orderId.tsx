/**
 * /cuenta/documentos/$orderId — CV5.1.5
 *
 * Vista imprimible del voucher o recibo del viaje confirmado.
 * Usa `getConciergeOrder` (misma fuente que Reservas/Checkout) y presenta
 * un documento editorial pensado para el diálogo de impresión del
 * navegador (Ctrl/Cmd+P → Guardar como PDF).
 */
import { useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Printer, ArrowLeft } from "lucide-react";
import {
  getConciergeOrder,
  type ConciergeOrderItemView,
} from "@/lib/concierge/orders.functions";

const searchSchema = z.object({
  doc: z.enum(["voucher", "recibo"]).default("voucher"),
});

export const Route = createFileRoute("/_authenticated/cuenta/documentos/$orderId")({
  validateSearch: (s) => searchSchema.parse(s),
  component: DocumentoRoute,
});

function DocumentoRoute() {
  const { orderId } = Route.useParams();
  const { doc } = Route.useSearch();
  const navigate = useNavigate();
  const fetchOrder = useServerFn(getConciergeOrder);

  const q = useQuery({
    queryKey: ["concierge-order", orderId, "document", doc],
    queryFn: () => fetchOrder({ data: { orderId } }),
    staleTime: 60_000,
  });

  useEffect(() => {
    document.title =
      doc === "voucher"
        ? "Voucher · Valladolid.mx"
        : "Recibo · Valladolid.mx";
  }, [doc]);

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-muted-foreground">
        Preparando tu documento…
      </div>
    );
  }
  if (q.error || !q.data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-serif text-xl text-foreground">
          No pudimos cargar este documento
        </h1>
        <button
          type="button"
          onClick={() => navigate({ to: "/cuenta/mi-viaje", search: { vista: "documentos" } })}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver a Mi Viaje
        </button>
      </div>
    );
  }

  const order = q.data;
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => navigate({ to: "/cuenta/mi-viaje", search: { vista: "documentos" } })}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Mi Viaje
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft hover:shadow-elevated"
        >
          <Printer className="size-4" aria-hidden />
          Imprimir / Guardar PDF
        </button>
      </div>

      {doc === "voucher" ? (
        <VoucherDocument order={order} />
      ) : (
        <ReciboDocument order={order} />
      )}
    </div>
  );
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency || "MXN",
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function DocShell({
  eyebrow,
  children,
  order,
}: {
  eyebrow: string;
  children: React.ReactNode;
  order: { folio: string; destination_name: string | null; editorial_title: string | null };
}) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-8 shadow-soft print:border-0 print:shadow-none">
      <header className="border-b border-border/60 pb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-serif text-2xl leading-tight text-foreground">
          {order.editorial_title ??
            (order.destination_name
              ? `Tu viaje al ${order.destination_name}`
              : "Tu viaje al Oriente Maya")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Folio <strong className="text-foreground">{order.folio}</strong>
          {" · "}Valladolid.mx · Oriente Maya de Yucatán
        </p>
      </header>
      <div className="pt-6">{children}</div>
      <footer className="mt-8 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
        Documento generado por Valladolid.mx · Este comprobante no requiere firma.
        Cualquier duda con tu concierge: concierge@valladolid.mx
      </footer>
    </article>
  );
}

function VoucherDocument({
  order,
}: {
  order: {
    folio: string;
    paid_at: string | null;
    destination_name: string | null;
    editorial_title: string | null;
    editorial_summary: string | null;
    items: ConciergeOrderItemView[];
  };
}) {
  return (
    <DocShell eyebrow="Voucher de viaje" order={order}>
      {order.editorial_summary ? (
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          {order.editorial_summary}
        </p>
      ) : null}
      <dl className="mb-6 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Confirmado
          </dt>
          <dd className="font-serif text-base text-foreground">
            {formatDate(order.paid_at)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Destino
          </dt>
          <dd className="font-serif text-base text-foreground">
            {order.destination_name ?? "Oriente Maya"}
          </dd>
        </div>
      </dl>

      <h2 className="font-serif text-base text-foreground">
        Reservaciones incluidas
      </h2>
      <ul className="mt-3 divide-y divide-border/60">
        {order.items.map((it) => (
          <li key={it.id} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="font-serif text-[15px] text-foreground">
                  {it.title}
                </p>
                {it.description ? (
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {it.description}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right text-[12px] text-muted-foreground">
                {it.quantity > 1 ? `× ${it.quantity}` : ""}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-[12px] text-muted-foreground">
        Presenta este voucher o comparte tu folio en cada experiencia. Los
        proveedores del Oriente Maya reconocen tu folio como confirmación.
      </p>
    </DocShell>
  );
}

function ReciboDocument({
  order,
}: {
  order: {
    folio: string;
    paid_at: string | null;
    destination_name: string | null;
    editorial_title: string | null;
    currency: string;
    subtotal_amount: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    items: ConciergeOrderItemView[];
  };
}) {
  const totals = useMemo(
    () => [
      { label: "Subtotal", amount: order.subtotal_amount },
      { label: "Descuento", amount: -order.discount_amount },
      { label: "Impuestos", amount: order.tax_amount },
    ],
    [order],
  );
  return (
    <DocShell eyebrow="Recibo de pago" order={order}>
      <dl className="mb-6 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Fecha de pago
          </dt>
          <dd className="font-serif text-base text-foreground">
            {formatDate(order.paid_at)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Moneda
          </dt>
          <dd className="font-serif text-base text-foreground uppercase">
            {order.currency}
          </dd>
        </div>
      </dl>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="py-2">Concepto</th>
            <th className="py-2 text-right">Cant.</th>
            <th className="py-2 text-right">Unitario</th>
            <th className="py-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className="border-b border-border/40 align-top">
              <td className="py-3 font-serif text-[14px] text-foreground">
                {it.title}
              </td>
              <td className="py-3 text-right text-muted-foreground">
                {it.quantity}
              </td>
              <td className="py-3 text-right text-muted-foreground">
                {formatMoney(it.unit_amount, it.currency)}
              </td>
              <td className="py-3 text-right font-serif text-foreground">
                {formatMoney(it.subtotal_amount, it.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 ml-auto w-full max-w-xs space-y-1.5 text-sm">
        {totals
          .filter((t) => t.amount !== 0)
          .map((t) => (
            <div
              key={t.label}
              className="flex items-center justify-between text-muted-foreground"
            >
              <span>{t.label}</span>
              <span>{formatMoney(Math.abs(t.amount), order.currency)}</span>
            </div>
          ))}
        <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
          <span className="font-serif text-base text-foreground">Total pagado</span>
          <span className="font-serif text-lg text-foreground">
            {formatMoney(order.total_amount, order.currency)}
          </span>
        </div>
      </div>
    </DocShell>
  );
}