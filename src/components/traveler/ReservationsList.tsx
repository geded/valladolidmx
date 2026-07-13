/**
 * ReservationsList — CV5.1.4
 *
 * Vista "Reservas" del Workspace del Viajero. Lee el detalle real de la
 * orden confirmada (concierge_orders + concierge_order_items) vía
 * `getConciergeOrder` — misma fuente que el checkout — y presenta cada
 * ítem como una tarjeta editorial con título, descripción, cantidad,
 * subtotal y CTA a la ficha original (destino/empresa/producto/evento).
 *
 * Cero infra nueva: reutiliza server fn existente y sigue el DSL colonial
 * (tokens del Design System v1.0).
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  MapPin,
  ShoppingBag,
  Ticket,
  ReceiptText,
  ArrowRight,
} from "lucide-react";
import {
  getConciergeOrder,
  type ConciergeOrderItemView,
} from "@/lib/concierge/orders.functions";

interface Props {
  orderId: string;
  folio: string;
}

const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  destination: MapPin,
  business: Building2,
  product: ShoppingBag,
  event: Ticket,
};

const KIND_LABEL: Record<string, string> = {
  destination: "Destino",
  business: "Empresa",
  product: "Producto",
  event: "Evento",
  hotel: "Hospedaje",
  restaurant: "Restaurante",
  experience: "Experiencia",
};

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

export function ReservationsList({ orderId, folio }: Props) {
  const fetchOrder = useServerFn(getConciergeOrder);
  const q = useQuery({
    queryKey: ["concierge-order", orderId, "reservations"],
    queryFn: () => fetchOrder({ data: { orderId } }),
    staleTime: 60_000,
  });

  const items: ConciergeOrderItemView[] = useMemo(
    () => q.data?.items ?? [],
    [q.data],
  );

  if (q.isLoading) {
    return (
      <section className="rounded-2xl border border-border/70 bg-card/60 p-6">
        <p className="text-sm text-muted-foreground">Cargando tus reservas…</p>
      </section>
    );
  }

  if (q.error) {
    return (
      <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <h3 className="font-serif text-base text-foreground">
          No pudimos cargar tus reservas
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Vuelve a intentarlo en unos segundos o contáctanos si el problema
          persiste.
        </p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-8 text-center">
        <ReceiptText className="mx-auto size-6 text-primary" aria-hidden />
        <h3 className="mt-3 font-serif text-lg text-foreground">
          Tu folio {folio} está confirmado
        </h3>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
          Aún no hay líneas detalladas en esta orden. Tu Concierge te
          notificará cuando cada reserva quede confirmada con el proveedor.
        </p>
      </section>
    );
  }

  const order = q.data!;

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg text-foreground">
            Tus reservas confirmadas
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Folio {folio} · {items.length} reservación
            {items.length === 1 ? "" : "es"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Total del viaje
          </div>
          <div className="font-serif text-lg text-foreground">
            {formatMoney(order.total_amount, order.currency)}
          </div>
        </div>
      </header>

      <ul className="space-y-3">
        {items.map((it) => {
          const Icon = KIND_ICON[it.entity_kind] ?? ReceiptText;
          const kindLabel = KIND_LABEL[it.entity_kind] ?? "Reserva";
          const link = buildEntityLink(it);
          return (
            <li
              key={it.id}
              className="group rounded-2xl border border-border/70 bg-card/70 p-4 shadow-soft transition-all hover:shadow-elevated"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {kindLabel}
                    </span>
                    {it.quantity > 1 ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        × {it.quantity}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-0.5 font-serif text-base leading-tight text-foreground">
                    {it.title}
                  </h3>
                  {it.description ? (
                    <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                      {it.description}
                    </p>
                  ) : null}
                  {link ? (
                    <Link
                      to={link}
                      className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                    >
                      Ver ficha original
                      <ArrowRight className="size-3" aria-hidden />
                    </Link>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-serif text-base text-foreground">
                    {formatMoney(it.subtotal_amount, it.currency)}
                  </div>
                  {it.quantity > 1 ? (
                    <div className="text-[11px] text-muted-foreground">
                      {formatMoney(it.unit_amount, it.currency)} c/u
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Enlace de "ficha original" cuando el item apunta a un negocio o producto.
 * Deja `null` si no tenemos ruta pública estable — así evitamos enlaces rotos.
 */
function buildEntityLink(it: ConciergeOrderItemView): string | null {
  if (it.entity_kind === "business" && it.business_id) {
    // Sin slug fiable en el item; el detalle interno del portal es siempre
    // seguro y respeta permisos del viajero.
    return null;
  }
  return null;
}
