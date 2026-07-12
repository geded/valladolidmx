import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConciergeOrder } from "@/lib/concierge/orders.functions";

interface S { order?: string }

export const Route = createFileRoute("/_authenticated/cuenta/pagos/exito")({
  validateSearch: (s: Record<string, unknown>): S => ({
    order: typeof s.order === "string" ? s.order : undefined,
  }),
  component: ExitoPage,
});

function ExitoPage() {
  const { order } = Route.useSearch();
  const fetchOrder = useServerFn(getConciergeOrder);
  const orderQ = useQuery({
    queryKey: ["concierge-order", order],
    queryFn: () =>
      order ? fetchOrder({ data: { orderId: order } }) : Promise.resolve(null),
    enabled: Boolean(order),
  });

  const folio = orderQ.data?.folio;
  const title = orderQ.data?.editorial_title;

  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Oriente Maya de Yucatán
      </p>
      <h1 className="mt-2 font-serif text-4xl">Tu viaje está confirmado</h1>
      <p className="mt-3 text-base leading-relaxed text-foreground/80">
        {title ? (
          <>
            <strong>{title}</strong> quedó reservado con los anfitriones del
            destino.
          </>
        ) : (
          <>
            Reservamos tu experiencia con los anfitriones del destino.
          </>
        )}{" "}
        Tu concierge te acompañará en cada paso hasta que llegues a Valladolid.
      </p>
      {folio ? (
        <p className="mt-4 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-primary">
          Folio {folio}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/cuenta/mi-viaje"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Ver mi viaje
        </Link>
        <Link
          to="/cuenta/historial"
          search={order ? { highlight: order } : undefined}
          className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Ir a mi historial
        </Link>
      </div>
    </div>
  );
}