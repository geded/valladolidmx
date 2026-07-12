import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getConciergeOrder,
  getMyConfirmedTravel,
} from "@/lib/concierge/orders.functions";
import {
  CalendarCheck,
  Compass,
  LifeBuoy,
  MessageCircle,
  Sparkles,
  MapPin,
} from "lucide-react";

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
  const fetchConfirmed = useServerFn(getMyConfirmedTravel);
  const orderQ = useQuery({
    queryKey: ["concierge-order", order],
    queryFn: () =>
      order ? fetchOrder({ data: { orderId: order } }) : Promise.resolve(null),
    enabled: Boolean(order),
  });
  const confirmedQ = useQuery({
    queryKey: ["my-confirmed-travel", order],
    queryFn: () => fetchConfirmed({ data: undefined as never }),
  });

  const orderData = orderQ.data;
  const confirmed = confirmedQ.data;
  const folio = orderData?.folio ?? confirmed?.folio;
  const title =
    orderData?.editorial_title ??
    confirmed?.editorial_title ??
    "Tu viaje al Oriente Maya de Yucatán";
  const destination =
    orderData?.destination_name ?? confirmed?.destination_name ?? null;

  const dateFmt = (iso?: string | null) =>
    iso
      ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : null;
  const startTxt = dateFmt(confirmed?.plan_start_date);
  const endTxt = dateFmt(confirmed?.plan_end_date);
  const dateRange =
    startTxt && endTxt
      ? `${startTxt} – ${endTxt}`
      : startTxt
        ? `Desde el ${startTxt}`
        : "Fechas por confirmar con tu concierge";

  const countdown =
    typeof confirmed?.days_to_trip === "number"
      ? confirmed.days_to_trip > 0
        ? `Faltan ${confirmed.days_to_trip} días para tu llegada`
        : confirmed.days_to_trip === 0
          ? "Hoy comienza tu viaje"
          : "Tu viaje está en curso"
      : null;

  const currencyFmt = (amount?: number | null, currency?: string | null) =>
    typeof amount === "number"
      ? new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: currency ?? "MXN",
          maximumFractionDigits: 0,
        }).format(amount / 100)
      : null;

  const total = currencyFmt(orderData?.total_amount, orderData?.currency);
  const items = orderData?.items ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      {/* Portada editorial */}
      <section className="relative overflow-hidden rounded-3xl border border-success/30 bg-gradient-to-br from-success/15 via-primary/5 to-card p-8 shadow-elevated">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-success/10 blur-3xl" aria-hidden />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-success-foreground/80">
            Bienvenido al Oriente Maya de Yucatán
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Tu viaje está confirmado
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/80">
            <strong>{title}</strong>
            {destination ? (
              <>
                {" "}quedó reservado con los anfitriones de{" "}
                <span className="text-primary">{destination}</span>.
              </>
            ) : (
              <> quedó reservado con los anfitriones del destino.</>
            )}{" "}
            Tu concierge y Alux te acompañarán en cada paso hasta tu llegada.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {folio ? (
              <div className="rounded-xl border border-success/40 bg-background/80 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Folio
                </p>
                <p className="mt-1 font-mono text-sm font-bold tracking-[0.14em] text-foreground">
                  {folio}
                </p>
              </div>
            ) : null}
            <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Fechas
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {dateRange}
              </p>
            </div>
            {confirmed?.party_size ? (
              <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Viajeros
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {confirmed.party_size} viajero
                  {confirmed.party_size === 1 ? "" : "s"}
                </p>
              </div>
            ) : null}
          </div>

          {countdown ? (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" aria-hidden />
              {countdown}
            </p>
          ) : null}
        </div>
      </section>

      {/* Resumen del itinerario */}
      {items.length > 0 ? (
        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="font-serif text-xl">Tu itinerario</h2>
          </div>
          <ul className="divide-y divide-border/60">
            {items.map((it) => (
              <li key={it.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{it.title}</p>
                  {it.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {it.description}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  ×{it.quantity}
                </span>
              </li>
            ))}
          </ul>
          {total ? (
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Inversión total del viaje
              </span>
              <span className="font-semibold text-foreground">{total}</span>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Próximos pasos */}
      <section className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="font-serif text-xl">Próximos pasos</h2>
        <ol className="mt-4 space-y-3 text-sm text-foreground/85">
          <li className="flex gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">1</span>
            <span>
              Recibirás por correo tu <strong>comprobante de viaje</strong> con el folio {folio ?? "de tu reservación"}.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">2</span>
            <span>
              Tu concierge te escribirá para afinar detalles: llegada, preferencias y recomendaciones del Oriente Maya.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">3</span>
            <span>
              Antes de tu llegada recibirás una guía de bienvenida y Alux te acompañará durante todo el viaje.
            </span>
          </li>
        </ol>
      </section>

      {/* Confianza + política */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold">Tu concierge sigue contigo</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Cualquier cambio, duda o preferencia se coordina directamente con tu concierge desde <em>Mi viaje</em>. No estás solo frente a la pantalla.
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold">Cancelación y cambios</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Aplica la política acordada con tu concierge. Guarda tu folio {folio ? <span className="font-mono">{folio}</span> : "de reservación"} para cualquier gestión.
          </p>
        </div>
      </section>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/cuenta/mi-viaje"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <CalendarCheck className="h-4 w-4" aria-hidden />
          Ver el itinerario completo
        </Link>
        <Link
          to="/cuenta/historial"
          search={order ? { highlight: order } : undefined}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
        >
          <MapPin className="h-4 w-4" aria-hidden />
          Ir a mi historial
        </Link>
      </div>
    </div>
  );
}