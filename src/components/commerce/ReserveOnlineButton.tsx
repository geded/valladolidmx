/**
 * ReserveOnlineButton — Reservación en línea de una experiencia
 * (paso 5 · "Experiencias: la sección que vende en línea").
 *
 * El viajero elige fecha, hora y número de personas; se apartan los
 * lugares con vencimiento y se abre la confirmación del viaje, donde hoy
 * la forma de pago vigente es el efectivo con el concierge.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { es } from "date-fns/locale";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { listAvailableDepartures, startBooking } from "@/lib/commerce/booking.functions";
import { getProductSaleInfo, storeOrderErrorMessage } from "@/lib/commerce/store-orders.functions";
import { maxPurchasable } from "@/lib/commerce/store-catalog";
import {
  calendarDayKey,
  defaultDepartureId,
  groupDeparturesByDay,
} from "@/lib/commerce/booking-calendar";

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function timeLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function availabilityLabel(available: number): string {
  return available === 1 ? "1 lugar" : `${available} lugares`;
}

export function ReserveOnlineButton({
  productId,
  label = "Reservar en línea",
  className,
}: {
  productId: string;
  label?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchDepartures = useServerFn(listAvailableDepartures);
  const reserve = useServerFn(startBooking);
  const fetchSaleInfo = useServerFn(getProductSaleInfo);

  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [departureId, setDepartureId] = useState<string | null>(null);
  const [people, setPeople] = useState(1);
  const [busy, setBusy] = useState(false);

  const departuresQ = useQuery({
    queryKey: ["commerce", "public-departures", productId],
    queryFn: () => fetchDepartures({ data: { productId } }),
    enabled: open,
    staleTime: 60_000,
  });

  const departures = useMemo(() => departuresQ.data ?? [], [departuresQ.data]);

  // Tienda y pedidos para recoger: se compran por piezas, sin fecha.
  const saleInfoQ = useQuery({
    queryKey: ["commerce", "product-sale-info", productId],
    queryFn: () => fetchSaleInfo({ data: { productId } }),
    enabled: open,
    staleTime: 30_000,
  });
  const byPieces = saleInfoQ.data?.mode === "tienda" || saleInfoQ.data?.mode === "pedidos";
  const maxPieces = byPieces
    ? maxPurchasable(saleInfoQ.data?.stock ?? null, saleInfoQ.data?.maxQuantity ?? null)
    : 0;

  const days = useMemo(() => groupDeparturesByDay(departures), [departures]);
  const daysByKey = useMemo(() => new Map(days.map((item) => [item.key, item])), [days]);

  const times = useMemo(
    () => (day ? (daysByKey.get(day)?.departures ?? []) : []),
    [day, daysByKey],
  );

  const selected = departures.find((d) => d.id === departureId) ?? null;
  const maxPeople = selected?.available ?? 10;

  function selectDay(date: Date | undefined) {
    if (!date) return;
    const nextDay = daysByKey.get(calendarDayKey(date));
    if (!nextDay) return;

    setDay(nextDay.key);
    setDepartureId(defaultDepartureId(nextDay.departures));
    if (nextDay.departures.length === 1) {
      const onlyDeparture = nextDay.departures[0];
      if (onlyDeparture) setPeople((current) => Math.min(current, onlyDeparture.available));
    }
  }

  function AvailabilityDayButton(props: React.ComponentProps<typeof CalendarDayButton>) {
    const availability = daysByKey.get(calendarDayKey(props.day.date))?.available;
    const label = availability ? availabilityLabel(availability) : null;

    return (
      <CalendarDayButton
        {...props}
        aria-label={label ? `${props.day.date.getDate()}, ${label} disponibles` : undefined}
        className={
          availability
            ? "min-h-11 rounded-md bg-success/15 text-success hover:bg-success/25 data-[selected-single=true]:bg-success data-[selected-single=true]:text-success-foreground"
            : undefined
        }
      >
        <span className="text-sm font-semibold">{props.day.date.getDate()}</span>
        {availability ? <span className="text-[0.6rem] font-medium">{availability}</span> : null}
      </CalendarDayButton>
    );
  }

  async function handleReserve() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      const res = await reserve({
        data: {
          productId,
          departureId: byPieces ? null : (departureId ?? null),
          quantity: byPieces ? Math.min(people, maxPieces) : people,
          clientRequestId: genId(),
        },
      });
      setOpen(false);
      navigate({ to: "/cuenta/checkout/$orderId", params: { orderId: res.order_id } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      toast.error(
        byPieces
          ? storeOrderErrorMessage(message)
          : message || "No pudimos apartar tus lugares",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle>{byPieces ? "¿Cuántas quieres?" : "Elige tu fecha"}</DialogTitle>
            <DialogDescription>
              {byPieces
                ? "Revisa tu compra y confírmala en el siguiente paso."
                : "Apartamos tus lugares mientras confirmas tu reservación."}
            </DialogDescription>
          </DialogHeader>

          {saleInfoQ.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Buscando…</p>
          ) : byPieces ? (
            maxPieces < 1 ? (
              <div className="space-y-2 py-4 text-sm">
                <p className="font-medium">Agotado por ahora.</p>
                <p className="text-xs text-muted-foreground">
                  Puedes pedir ayuda a tu concierge para saber cuándo vuelve a haber.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Cantidad</p>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setPeople((p) => Math.max(1, p - 1))}>
                    −
                  </Button>
                  <span className="min-w-8 text-center text-sm font-medium">{Math.min(people, maxPieces)}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPeople((p) => Math.min(maxPieces, p + 1))}>
                    +
                  </Button>
                  {saleInfoQ.data?.stock !== null && saleInfoQ.data?.stock !== undefined ? (
                    <span className="text-xs text-muted-foreground">
                      {saleInfoQ.data.stock === 1 ? "Queda 1 pieza" : `Quedan ${saleInfoQ.data.stock} piezas`}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pagas en línea y lo recoges en el local. Muestra tu folio al llegar.
                </p>
              </div>
            )
          ) : departuresQ.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Buscando horarios…</p>
          ) : departures.length === 0 ? (
            <div className="space-y-2 py-4 text-sm">
              <p>Esta experiencia aún no tiene fechas abiertas en línea.</p>
              <p className="text-xs text-muted-foreground">
                Puedes agregarla a Mi Viaje y tu concierge la coordina contigo.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Fecha</p>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-2.5 rounded-sm bg-success/20 ring-1 ring-success/40" />
                    Días disponibles · número de lugares
                  </span>
                </div>
                <Calendar
                  mode="single"
                  locale={es}
                  selected={day ? daysByKey.get(day)?.date : undefined}
                  onSelect={selectDay}
                  defaultMonth={days[0]?.date}
                  startMonth={days[0]?.date}
                  endMonth={days[days.length - 1]?.date}
                  disabled={(date) => !daysByKey.has(calendarDayKey(date))}
                  components={{ DayButton: AvailabilityDayButton }}
                  className="pointer-events-auto mx-auto mt-2 w-full p-0 [--cell-size:clamp(2.5rem,11vw,3rem)]"
                  classNames={{ root: "w-full", month: "w-full", month_grid: "w-full" }}
                />
              </div>

              {day ? (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Horario</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {times.map((t) => (
                      <Button
                        key={t.id}
                        type="button"
                        variant={departureId === t.id ? "default" : "outline"}
                        onClick={() => {
                          setDepartureId(t.id);
                          setPeople((p) => Math.min(p, t.available));
                        }}
                        className="h-auto min-h-11 justify-between px-3 py-2"
                      >
                        <span>{timeLabel(t.starts_at, t.timezone)}</span>
                        <span
                          className={
                            departureId === t.id
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }
                        >
                          {availabilityLabel(t.available)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {departureId ? (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Personas</p>
                  <div className="mt-2 flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPeople((p) => Math.max(1, p - 1))}
                    >
                      −
                    </Button>
                    <span className="min-w-8 text-center text-sm font-medium">{people}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPeople((p) => Math.min(maxPeople, p + 1))}
                    >
                      +
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Máximo {maxPeople} en este horario
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleReserve}
              disabled={busy || (byPieces ? maxPieces < 1 : !departureId)}
            >
              {busy ? (byPieces ? "Preparando…" : "Apartando lugares…") : "Continuar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
